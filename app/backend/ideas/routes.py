"""
API routes for the Ideas Hub module.

This module defines the REST API endpoints for idea submission,
retrieval, update, and deletion. All routes require authentication.
"""

import logging
import os
import time
import uuid
from typing import Any, Optional

from azure.cosmos.aio import CosmosClient
from quart import Blueprint, Response, current_app, jsonify, request

from config import (
    CONFIG_COSMOS_HISTORY_CLIENT,
    CONFIG_CREDENTIAL,
    CONFIG_IDEAS_CONTAINER,
    CONFIG_IDEAS_HUB_ENABLED,
    CONFIG_IDEAS_SCHEDULER,
    CONFIG_IDEAS_SEARCH_INDEX_MANAGER,
    CONFIG_IDEAS_SERVICE,
    CONFIG_OPENAI_CLIENT,
    CONFIG_SEARCH_CLIENT,
)
from decorators import authenticated
from error import error_response

from .models import Idea, IdeaComment, IdeaStatus
from .permissions import (
    IdeaPermission,
    IdeaRole,
    can_delete_idea,
    can_edit_idea,
    can_review_idea,
    can_view_idea,
    get_role_info,
    get_user_role,
    has_permission,
    require_permission,
)
from .scheduler import IdeasScheduler
from .search_index import IdeasSearchIndexManager
from .service import IdeasService

logger = logging.getLogger(__name__)

# Global scheduler instance
_ideas_scheduler: Optional[IdeasScheduler] = None

# Create blueprint with URL prefix
ideas_bp = Blueprint("ideas", __name__, url_prefix="/api/ideas")


def _check_ideas_enabled() -> tuple[Any, int] | None:
    """Check if Ideas Hub is enabled. Returns error response if not."""
    if not current_app.config.get(CONFIG_IDEAS_HUB_ENABLED, False):
        return jsonify({"error": "Ideas Hub is not enabled"}), 400
    return None


def _get_ideas_service():
    """Get the configured IdeasService instance."""
    return current_app.config.get(CONFIG_IDEAS_SERVICE)


def _get_ideas_scheduler() -> IdeasScheduler | None:
    """Get the configured IdeasScheduler instance."""
    return current_app.config.get(CONFIG_IDEAS_SCHEDULER)


def _get_user_id(auth_claims: dict[str, Any]) -> str | None:
    """Extract user ID from auth claims."""
    return auth_claims.get("oid") or auth_claims.get("sub")


@ideas_bp.before_app_serving
async def setup_ideas_module():
    """
    Initialize the Ideas module before the application starts serving.

    Sets up the Cosmos DB containers, Ideas service, and scheduler.
    This runs after chat_history setup, so we reuse the existing connection.
    """
    global _ideas_scheduler

    USE_IDEAS_HUB = os.getenv("USE_IDEAS_HUB", "").lower() == "true"
    USE_CHAT_HISTORY_COSMOS = os.getenv("USE_CHAT_HISTORY_COSMOS", "").lower() == "true"
    AZURE_IDEAS_DATABASE = os.getenv("AZURE_IDEAS_DATABASE")
    AZURE_IDEAS_CONTAINER = os.getenv("AZURE_IDEAS_CONTAINER", "ideas")
    AZURE_IDEAS_AUDIT_CONTAINER = os.getenv("AZURE_IDEAS_AUDIT_CONTAINER", "ideas-audit")

    current_app.config[CONFIG_IDEAS_HUB_ENABLED] = USE_IDEAS_HUB

    if not USE_IDEAS_HUB:
        current_app.logger.info("Ideas Hub is disabled")
        return

    current_app.logger.info("USE_IDEAS_HUB is true, setting up Ideas Hub")

    # Ideas Hub requires chat history cosmos to be enabled (reuses same connection)
    if not USE_CHAT_HISTORY_COSMOS:
        current_app.logger.warning(
            "USE_CHAT_HISTORY_COSMOS must be true for Ideas Hub to work"
        )
        current_app.config[CONFIG_IDEAS_HUB_ENABLED] = False
        return

    try:
        # Reuse the Cosmos DB client from chat history
        cosmos_client: CosmosClient = current_app.config.get(CONFIG_COSMOS_HISTORY_CLIENT)
        if not cosmos_client:
            current_app.logger.error("Cosmos DB client not available from chat history")
            current_app.config[CONFIG_IDEAS_HUB_ENABLED] = False
            return

        # Use the same database as chat history (or specified database)
        cosmos_db = cosmos_client.get_database_client(AZURE_IDEAS_DATABASE)

        # Get containers for ideas and audit
        ideas_container = cosmos_db.get_container_client(AZURE_IDEAS_CONTAINER)
        audit_container = cosmos_db.get_container_client(AZURE_IDEAS_AUDIT_CONTAINER)

        current_app.config[CONFIG_IDEAS_CONTAINER] = ideas_container

        # Get OpenAI client and search client from app config
        openai_client = current_app.config.get(CONFIG_OPENAI_CLIENT)
        search_client = current_app.config.get(CONFIG_SEARCH_CLIENT)
        azure_credential = current_app.config.get(CONFIG_CREDENTIAL)

        # Read model and deployment from environment variables
        chatgpt_model = os.environ.get("AZURE_OPENAI_CHATGPT_MODEL", "gpt-4o-mini")
        chatgpt_deployment = os.environ.get("AZURE_OPENAI_CHATGPT_DEPLOYMENT")
        embedding_model = os.environ.get("AZURE_OPENAI_EMB_MODEL_NAME", "text-embedding-3-large")
        embedding_deployment = os.environ.get("AZURE_OPENAI_EMB_DEPLOYMENT")

        # Initialize Azure AI Search Index Manager for Ideas
        search_index_manager = None
        AZURE_SEARCH_SERVICE = os.environ.get("AZURE_SEARCH_SERVICE")
        if AZURE_SEARCH_SERVICE and azure_credential:
            try:
                search_endpoint = f"https://{AZURE_SEARCH_SERVICE}.search.windows.net"
                search_index_manager = IdeasSearchIndexManager(
                    endpoint=search_endpoint,
                    credential=azure_credential,
                )
                # Create or update the index to ensure schema is current
                current_app.logger.info("Creating/updating Ideas search index...")
                await search_index_manager.create_or_update_index()
            except Exception as e:
                current_app.logger.warning(f"Failed to initialize Ideas search index: {e}")
                search_index_manager = None

        # Store search index manager in app config for cleanup
        current_app.config[CONFIG_IDEAS_SEARCH_INDEX_MANAGER] = search_index_manager

        # Initialize the Ideas service
        ideas_service = IdeasService(
            openai_client=openai_client,
            chatgpt_model=chatgpt_model,
            chatgpt_deployment=chatgpt_deployment,
            embedding_model=embedding_model,
            embedding_deployment=embedding_deployment,
            ideas_container=ideas_container,
            search_client=search_client,
            search_index_manager=search_index_manager,
            audit_container=audit_container,
        )
        current_app.config[CONFIG_IDEAS_SERVICE] = ideas_service

        # Initialize and start the background scheduler (only if enabled)
        ENABLE_IDEAS_SCHEDULER = os.getenv("ENABLE_IDEAS_SCHEDULER", "").lower() == "true"

        if ENABLE_IDEAS_SCHEDULER and openai_client:
            _ideas_scheduler = IdeasScheduler(
                ideas_container=ideas_container,
                openai_client=openai_client,
                chatgpt_model=chatgpt_model,
                chatgpt_deployment=chatgpt_deployment,
                embedding_model=embedding_model,
                embedding_deployment=embedding_deployment,
                search_index_manager=search_index_manager,
            )
            _ideas_scheduler.start()
            current_app.config[CONFIG_IDEAS_SCHEDULER] = _ideas_scheduler
            current_app.logger.info("Ideas background scheduler started")
        else:
            if not ENABLE_IDEAS_SCHEDULER:
                current_app.logger.info("Ideas scheduler disabled (ENABLE_IDEAS_SCHEDULER != true)")
            else:
                current_app.logger.warning("OpenAI client not available - scheduler not started")

        current_app.logger.info(
            f"Ideas Hub initialized with database: {AZURE_IDEAS_DATABASE}, "
            f"ideas container: {AZURE_IDEAS_CONTAINER}, "
            f"audit container: {AZURE_IDEAS_AUDIT_CONTAINER}"
        )

    except Exception as e:
        current_app.logger.error(f"Failed to initialize Ideas Hub: {e}")
        current_app.config[CONFIG_IDEAS_HUB_ENABLED] = False


@ideas_bp.after_app_serving
async def cleanup_ideas_module():
    """
    Clean up resources when the application stops serving.
    """
    global _ideas_scheduler

    # Stop the scheduler if running
    if _ideas_scheduler:
        _ideas_scheduler.stop()
        _ideas_scheduler = None
        logger.info("Ideas scheduler stopped")

    logger.info("Ideas module cleanup complete")


@ideas_bp.route("/status", methods=["GET"])
async def ideas_status():
    """
    Get the status of the Ideas Hub module.

    No authentication required - used for health checks.

    Returns:
        JSON response with module status information.
    """
    try:
        enabled = current_app.config.get(CONFIG_IDEAS_HUB_ENABLED, False)
        scheduler = _get_ideas_scheduler()

        # Check if scheduler is running by checking if internal scheduler exists
        scheduler_running = False
        if scheduler is not None:
            internal_scheduler = getattr(scheduler, "_scheduler", None)
            if internal_scheduler is not None:
                scheduler_running = getattr(internal_scheduler, "running", False)

        return jsonify({
            "enabled": enabled,
            "scheduler_running": scheduler_running,
            "module": "ideas_hub",
            "version": "1.0.0",
        })
    except Exception as e:
        logger.exception("Error in ideas_status endpoint")
        return jsonify({
            "enabled": False,
            "scheduler_running": False,
            "module": "ideas_hub",
            "version": "1.0.0",
            "error": str(e),
        }), 500


@ideas_bp.route("", methods=["POST"])
@authenticated
async def create_idea(auth_claims: dict[str, Any]):
    """
    Create a new idea.

    Request body should contain:
        - title: Idea title (required)
        - description: Detailed description (required)
        - problemDescription: Problem being solved (optional)
        - expectedBenefit: Expected benefits (optional)
        - affectedProcesses: List of affected processes (optional)
        - targetUsers: List of target user groups (optional)
        - department: Submitter's department (optional)

    Returns:
        JSON response with created idea data.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return jsonify({"error": "User ID not found"}), 401

    try:
        request_json = await request.get_json()

        # Validate required fields
        title = request_json.get("title", "").strip()
        description = request_json.get("description", "").strip()

        if not title:
            return jsonify({"error": "Title is required"}), 400
        if not description:
            return jsonify({"error": "Description is required"}), 400

        # Extract similar ideas if provided
        similar_ideas_data = request_json.get("similarIdeas", [])

        # Create idea object
        current_time = int(time.time() * 1000)
        idea = Idea(
            idea_id=str(uuid.uuid4()),
            submitter_id=user_id,
            title=title,
            description=description,
            problem_description=request_json.get("problemDescription", "").strip(),
            expected_benefit=request_json.get("expectedBenefit", "").strip(),
            affected_processes=request_json.get("affectedProcesses", []),
            target_users=request_json.get("targetUsers", []),
            department=request_json.get("department", "").strip(),
            status=IdeaStatus.SUBMITTED,
            created_at=current_time,
            updated_at=current_time,
            similar_ideas=similar_ideas_data,
        )

        # Get service and create idea
        service = _get_ideas_service()
        if service:
            created_idea = await service.create_idea(idea)
            return jsonify(created_idea.to_dict()), 201
        else:
            # Fallback: return the idea without persistence (for testing)
            logger.warning("Ideas service not configured, returning unsaved idea")
            return jsonify(idea.to_dict()), 201

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.exception("Error creating idea")
        return error_response(e, "/api/ideas")


@ideas_bp.route("/search", methods=["GET"])
@authenticated
async def search_ideas(auth_claims: dict[str, Any]):
    """
    Search ideas using Azure AI Search with full-text and semantic search.

    Query parameters:
        - q: Search query text (searches title, description, summary, tags)
        - page: Page number (default: 1)
        - pageSize: Items per page (default: 20, max: 100)
        - status: Filter by status
        - department: Filter by department
        - myIdeas: Show only user's own ideas (default: false)
        - recommendationClass: Filter by recommendation class
        - useSemantic: Use semantic search (default: true)
        - scoringProfile: Scoring profile (impact-boost, feasibility-boost, balanced-boost)

    Returns:
        JSON response with paginated search results.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return jsonify({"error": "User ID not found"}), 401

    try:
        # Parse query parameters
        search_text = request.args.get("q")
        page = max(1, int(request.args.get("page", 1)))
        page_size = min(100, max(1, int(request.args.get("pageSize", 20))))
        status = request.args.get("status")
        department = request.args.get("department")
        my_ideas = request.args.get("myIdeas", "").lower() == "true"
        recommendation_class = request.args.get("recommendationClass")
        use_semantic = request.args.get("useSemantic", "true").lower() == "true"
        scoring_profile = request.args.get("scoringProfile")

        # Get service and search ideas
        service = _get_ideas_service()
        if service:
            submitter_id = user_id if my_ideas else None
            result = await service.search_ideas(
                search_text=search_text,
                page=page,
                page_size=page_size,
                status=status,
                department=department,
                submitter_id=submitter_id,
                recommendation_class=recommendation_class,
                use_semantic=use_semantic,
                scoring_profile=scoring_profile,
            )
            return jsonify(result.to_dict())
        else:
            # Fallback: return empty list
            return jsonify({
                "ideas": [],
                "totalCount": 0,
                "page": page,
                "pageSize": page_size,
                "hasMore": False,
            })

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.exception("Error searching ideas")
        return error_response(e, "/api/ideas/search")



@ideas_bp.route("", methods=["GET"])
@authenticated
async def list_ideas(auth_claims: dict[str, Any]):
    """
    List ideas with pagination and filtering.

    Query parameters:
        - page: Page number (default: 1)
        - pageSize: Items per page (default: 20, max: 100)
        - status: Filter by status (optional)
        - department: Filter by department (optional)
        - myIdeas: If true, only show user's own ideas (optional)
        - sortBy: Sort field (default: createdAt)
        - sortOrder: Sort order (asc/desc, default: desc)

    Returns:
        JSON response with paginated idea list.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return jsonify({"error": "User ID not found"}), 401

    try:
        # Parse query parameters
        page = max(1, int(request.args.get("page", 1)))
        page_size = min(100, max(1, int(request.args.get("pageSize", 20))))
        status = request.args.get("status")
        department = request.args.get("department")
        my_ideas = request.args.get("myIdeas", "").lower() == "true"
        sort_by = request.args.get("sortBy", "createdAt")
        sort_order = request.args.get("sortOrder", "desc")

        # Validate sort order
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"

        # Get service and list ideas
        service = _get_ideas_service()
        if service:
            submitter_id = user_id if my_ideas else None
            result = await service.list_ideas(
                page=page,
                page_size=page_size,
                status=status,
                department=department,
                submitter_id=submitter_id,
                sort_by=sort_by,
                sort_order=sort_order,
            )
            return jsonify(result.to_dict())
        else:
            # Fallback: return empty list
            return jsonify({
                "ideas": [],
                "totalCount": 0,
                "page": page,
                "pageSize": page_size,
                "hasMore": False,
            })

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.exception("Error listing ideas")
        return error_response(e, "/api/ideas")


@ideas_bp.route("/<idea_id>", methods=["GET"])
@authenticated
async def get_idea(auth_claims: dict[str, Any], idea_id: str):
    """
    Get a single idea by ID.

    Args:
        idea_id: The unique identifier of the idea.

    Returns:
        JSON response with idea data or 404 if not found.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return jsonify({"error": "User ID not found"}), 401

    try:
        service = _get_ideas_service()
        if service:
            idea = await service.get_idea(idea_id)
            if idea:
                return jsonify(idea.to_dict())
            else:
                return jsonify({"error": "Idea not found"}), 404
        else:
            return jsonify({"error": "Ideas service not configured"}), 500

    except Exception as e:
        logger.exception("Error getting idea")
        return error_response(e, f"/api/ideas/{idea_id}")


@ideas_bp.route("/<idea_id>", methods=["PUT"])
@authenticated
async def update_idea(auth_claims: dict[str, Any], idea_id: str):
    """
    Update an existing idea.

    Only the idea owner can update an idea, and only if it's in an editable state.

    Args:
        idea_id: The unique identifier of the idea.

    Returns:
        JSON response with updated idea data.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return jsonify({"error": "User ID not found"}), 401

    try:
        service = _get_ideas_service()
        if not service:
            return jsonify({"error": "Ideas service not configured"}), 500

        # Get existing idea
        existing_idea = await service.get_idea(idea_id)
        if not existing_idea:
            return jsonify({"error": "Idea not found"}), 404

        # Check permission using RBAC
        if not can_edit_idea(auth_claims, existing_idea.submitter_id):
            return jsonify({"error": "You do not have permission to edit this idea"}), 403

        # Check if idea can be edited
        if not existing_idea.can_be_edited():
            return jsonify({"error": "This idea cannot be edited in its current status"}), 400

        # Parse updates
        request_json = await request.get_json()
        updates = {}

        # Only allow updating specific fields
        allowed_fields = [
            "title", "description", "problemDescription", "expectedBenefit",
            "affectedProcesses", "targetUsers", "department"
        ]

        for field in allowed_fields:
            if field in request_json:
                updates[field] = request_json[field]

        if not updates:
            return jsonify({"error": "No valid fields to update"}), 400

        # Update the idea
        updated_idea = await service.update_idea(idea_id, updates)
        if updated_idea:
            return jsonify(updated_idea.to_dict())
        else:
            return jsonify({"error": "Failed to update idea"}), 500

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.exception("Error updating idea")
        return error_response(e, f"/api/ideas/{idea_id}")


@ideas_bp.route("/<idea_id>", methods=["DELETE"])
@authenticated
async def delete_idea(auth_claims: dict[str, Any], idea_id: str):
    """
    Delete an idea.

    Only the idea owner can delete an idea.

    Args:
        idea_id: The unique identifier of the idea.

    Returns:
        JSON response confirming deletion.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return jsonify({"error": "User ID not found"}), 401

    try:
        service = _get_ideas_service()
        if not service:
            return jsonify({"error": "Ideas service not configured"}), 500

        # Get existing idea
        existing_idea = await service.get_idea(idea_id)
        if not existing_idea:
            return jsonify({"error": "Idea not found"}), 404

        # Check permission using RBAC
        if not can_delete_idea(auth_claims, existing_idea.submitter_id):
            return jsonify({"error": "You do not have permission to delete this idea"}), 403

        # Delete the idea
        deleted = await service.delete_idea(idea_id)
        if deleted:
            return jsonify({"message": "Idea deleted successfully", "ideaId": idea_id})
        else:
            return jsonify({"error": "Failed to delete idea"}), 500

    except Exception as e:
        logger.exception("Error deleting idea")
        return error_response(e, f"/api/ideas/{idea_id}")


@ideas_bp.route("/<idea_id>/review", methods=["POST"])
@authenticated
async def review_idea_endpoint(auth_claims: dict[str, Any], idea_id: str):
    """
    Trigger LLM-based review of an idea (Phase 2 - Hybrid Approach).

    This endpoint performs a comprehensive LLM review of the idea, which:
    - Reviews the initial automated scores
    - Provides adjusted impact and feasibility scores
    - Generates a detailed reasoning for the assessment
    - Automatically sets the status to "under_review"

    Only users with REVIEWER or ADMIN role can trigger reviews.

    Args:
        idea_id: The unique identifier of the idea.

    Returns:
        JSON response with reviewed idea data including review scores and reasoning.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return jsonify({"error": "User ID not found"}), 401

    try:
        # Check permission - only reviewers and admins can trigger reviews
        if not can_review_idea(auth_claims):
            return jsonify({"error": "You do not have permission to review ideas"}), 403

        service = _get_ideas_service()
        if not service:
            return jsonify({"error": "Ideas service not configured"}), 500

        # Get existing idea
        existing_idea = await service.get_idea(idea_id)
        if not existing_idea:
            return jsonify({"error": "Idea not found"}), 404

        # Perform LLM review (analysis is done automatically if not yet performed)
        reviewed_idea = await service.review_idea(existing_idea, reviewer_id=user_id)

        # Build update data including analysis fields if they were generated
        update_data = {
            "reviewImpactScore": reviewed_idea.review_impact_score,
            "reviewFeasibilityScore": reviewed_idea.review_feasibility_score,
            "reviewRecommendationClass": reviewed_idea.review_recommendation_class,
            "reviewReasoning": reviewed_idea.review_reasoning,
            "reviewedAt": reviewed_idea.reviewed_at,
            "reviewedBy": reviewed_idea.reviewed_by,
            "status": reviewed_idea.status.value if isinstance(reviewed_idea.status, IdeaStatus) else reviewed_idea.status,
        }

        # Include analysis fields if they were generated during review
        if reviewed_idea.analyzed_at:
            update_data["analyzedAt"] = reviewed_idea.analyzed_at
            update_data["analysisVersion"] = reviewed_idea.analysis_version
            update_data["impactScore"] = reviewed_idea.impact_score
            update_data["feasibilityScore"] = reviewed_idea.feasibility_score
            update_data["recommendationClass"] = reviewed_idea.recommendation_class
            update_data["summary"] = reviewed_idea.summary
            update_data["clusterLabel"] = reviewed_idea.cluster_label
            if reviewed_idea.kpi_estimates:
                update_data["kpiEstimates"] = reviewed_idea.kpi_estimates
            if reviewed_idea.affected_processes:
                update_data["affectedProcesses"] = reviewed_idea.affected_processes
            if reviewed_idea.target_users:
                update_data["targetUsers"] = reviewed_idea.target_users

        # Save the reviewed idea
        updated_idea = await service.update_idea(idea_id, update_data)

        if updated_idea:
            return jsonify(updated_idea.to_dict())
        else:
            return jsonify({"error": "Failed to save review results"}), 500

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.exception("Error reviewing idea")
        return error_response(e, f"/api/ideas/{idea_id}/review")


@ideas_bp.route("/<idea_id>/status", methods=["PATCH"])
@authenticated
async def update_idea_status(auth_claims: dict[str, Any], idea_id: str):
    """
    Update the status of an idea.

    Only users with CHANGE_STATUS permission (REVIEWER or ADMIN) can change status.
    Valid status transitions:
    - UNDER_REVIEW -> APPROVED, REJECTED
    - APPROVED -> IMPLEMENTED
    - Any status -> REJECTED (by admin)

    Request body:
        - status: New status (approved, rejected, implemented)
        - reason: Optional reason for status change

    Args:
        idea_id: The unique identifier of the idea.

    Returns:
        JSON response with updated idea.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    # Check permission to change status
    if not has_permission(auth_claims, IdeaPermission.CHANGE_STATUS):
        return jsonify({"error": "You do not have permission to change idea status"}), 403

    try:
        service = _get_ideas_service()
        if not service:
            return jsonify({"error": "Ideas service not configured"}), 500

        # Get the existing idea
        existing_idea = await service.get_idea(idea_id)
        if not existing_idea:
            return jsonify({"error": "Idea not found"}), 404

        # Parse request body
        request_json = await request.get_json()
        new_status_str = request_json.get("status", "").lower()
        reason = request_json.get("reason", "")

        # Validate new status
        valid_statuses = ["approved", "rejected", "implemented"]
        if new_status_str not in valid_statuses:
            return jsonify({
                "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            }), 400

        # Map string to IdeaStatus enum
        status_map = {
            "approved": IdeaStatus.APPROVED,
            "rejected": IdeaStatus.REJECTED,
            "implemented": IdeaStatus.IMPLEMENTED,
        }
        new_status = status_map[new_status_str]

        # Validate status transition
        current_status = existing_idea.status
        valid_transitions = {
            IdeaStatus.SUBMITTED: [IdeaStatus.REJECTED],  # Can reject without review
            IdeaStatus.UNDER_REVIEW: [IdeaStatus.APPROVED, IdeaStatus.REJECTED],
            IdeaStatus.APPROVED: [IdeaStatus.IMPLEMENTED, IdeaStatus.REJECTED],
            IdeaStatus.REJECTED: [],  # Final state
            IdeaStatus.IMPLEMENTED: [],  # Final state
        }

        # Admins can force any transition except from final states
        role = get_user_role(auth_claims)
        if role == IdeaRole.ADMIN:
            if current_status not in [IdeaStatus.REJECTED, IdeaStatus.IMPLEMENTED]:
                valid_transitions[current_status] = list(status_map.values())

        allowed_transitions = valid_transitions.get(current_status, [])
        if new_status not in allowed_transitions:
            return jsonify({
                "error": f"Cannot transition from '{current_status.value}' to '{new_status.value}'"
            }), 400

        # Update the status
        user_id = _get_user_id(auth_claims)
        updates = {
            "status": new_status.value,
        }

        updated_idea = await service.update_idea(idea_id, updates)
        if updated_idea:
            logger.info(
                f"Status changed for idea {idea_id}: "
                f"{current_status.value} -> {new_status.value} by {user_id}"
                f"{f' (reason: {reason})' if reason else ''}"
            )
            return jsonify(updated_idea.to_dict())
        else:
            return jsonify({"error": "Failed to update idea status"}), 500

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.exception("Error updating idea status")
        return error_response(e, f"/api/ideas/{idea_id}/status")


@ideas_bp.route("/similar", methods=["GET"])
@authenticated
async def find_similar_ideas(auth_claims: dict[str, Any]):
    """
    Find similar ideas based on text content.

    Query parameters:
        - text: Text to search for similar ideas (required)
        - threshold: Similarity threshold 0-1 (default: 0.7)
        - limit: Maximum results (default: 5)

    Returns:
        JSON response with similar ideas and similarity scores.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return jsonify({"error": "User ID not found"}), 401

    try:
        # Get query parameters
        text = request.args.get("text", "").strip()
        if not text:
            return jsonify({"error": "Text parameter is required"}), 400

        threshold = float(request.args.get("threshold", 0.7))
        threshold = max(0.0, min(1.0, threshold))

        limit = int(request.args.get("limit", 5))
        limit = max(1, min(20, limit))

        exclude_id = request.args.get("excludeId")

        service = _get_ideas_service()
        if service:
            result = await service.find_similar_ideas(
                text=text,
                threshold=threshold,
                limit=limit,
                exclude_id=exclude_id,
            )
            return jsonify(result.to_dict())
        else:
            # Fallback: return empty result
            return jsonify({
                "similarIdeas": [],
                "threshold": threshold,
            })

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.exception("Error finding similar ideas")
        return error_response(e, "/api/ideas/similar")


@ideas_bp.route("/role", methods=["GET"])
@authenticated
async def get_current_user_role(auth_claims: dict[str, Any]):
    """
    Get the current user's role and permissions.

    Returns:
        JSON response with role and permissions.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    try:
        role_info = get_role_info(auth_claims)
        return jsonify(role_info)

    except Exception as e:
        logger.exception("Error getting user role")
        return error_response(e, "/api/ideas/role")


@ideas_bp.route("/admin/trigger-analysis", methods=["POST"])
@authenticated
@require_permission(IdeaPermission.TRIGGER_ANALYSIS)
async def trigger_analysis(auth_claims: dict[str, Any]):
    """
    Trigger an immediate analysis job for ideas needing updates.

    Requires ADMIN role with TRIGGER_ANALYSIS permission.

    Returns:
        JSON response with job results.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    try:
        scheduler = _get_ideas_scheduler()
        if not scheduler:
            return jsonify({"error": "Scheduler not configured"}), 500

        results = await scheduler.trigger_analysis()
        return jsonify(results)

    except Exception as e:
        logger.exception("Error triggering analysis")
        return error_response(e, "/api/ideas/admin/trigger-analysis")


@ideas_bp.route("/admin/trigger-rescoring", methods=["POST"])
@authenticated
@require_permission(IdeaPermission.TRIGGER_ANALYSIS)
async def trigger_rescoring(auth_claims: dict[str, Any]):
    """
    Trigger an immediate rescoring job for ideas.

    Requires ADMIN role with TRIGGER_ANALYSIS permission.

    Returns:
        JSON response with job results.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    try:
        scheduler = _get_ideas_scheduler()
        if not scheduler:
            return jsonify({"error": "Scheduler not configured"}), 500

        results = await scheduler.trigger_rescoring()
        return jsonify(results)

    except Exception as e:
        logger.exception("Error triggering rescoring")
        return error_response(e, "/api/ideas/admin/trigger-rescoring")


@ideas_bp.route("/<idea_id>/audit", methods=["GET"])
@authenticated
@require_permission(IdeaPermission.VIEW_AUDIT_LOG)
async def get_idea_audit_trail(auth_claims: dict[str, Any], idea_id: str):
    """
    Get the audit trail for an idea.

    Requires ADMIN role with VIEW_AUDIT_LOG permission.

    Args:
        idea_id: The unique identifier of the idea.

    Query parameters:
        - limit: Maximum number of entries (default: 50)

    Returns:
        JSON response with audit entries.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    try:
        limit = int(request.args.get("limit", 50))
        limit = max(1, min(100, limit))

        service = _get_ideas_service()
        if not service:
            return jsonify({"error": "Ideas service not configured"}), 500

        entries = await service.get_audit_trail(idea_id, limit)
        return jsonify({
            "ideaId": idea_id,
            "entries": entries,
            "count": len(entries),
        })

    except Exception as e:
        logger.exception("Error getting audit trail")
        return error_response(e, f"/api/ideas/{idea_id}/audit")


@ideas_bp.route("/export/csv", methods=["GET"])
@authenticated
async def export_ideas_csv(auth_claims: dict[str, Any]):
    """
    Export ideas to CSV format.

    Query parameters:
        - status: Filter by status (optional)
        - recommendation: Filter by recommendation class (optional)

    Returns:
        CSV file download.
    """
    from quart import Response

    from .export import IdeasExporter

    error = _check_ideas_enabled()
    if error:
        return error

    try:
        service = _get_ideas_service()
        if not service:
            return jsonify({"error": "Ideas service not configured"}), 500

        # Get filter parameters
        status = request.args.get("status")
        recommendation = request.args.get("recommendation")

        # Fetch ideas
        result = await service.list_ideas(
            page=1,
            page_size=1000,
            status=status,
            recommendation_class=recommendation,
        )

        # Export to CSV
        exporter = IdeasExporter()
        csv_content = exporter.export_to_csv(result.ideas)

        # Return as file download
        return Response(
            csv_content,
            mimetype="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=ideas_export.csv"
            },
        )

    except Exception as e:
        logger.exception("Error exporting ideas to CSV")
        return error_response(e, "/api/ideas/export/csv")


@ideas_bp.route("/export/excel", methods=["GET"])
@authenticated
async def export_ideas_excel(auth_claims: dict[str, Any]):
    """
    Export ideas to Excel format.

    Query parameters:
        - status: Filter by status (optional)
        - recommendation: Filter by recommendation class (optional)

    Returns:
        Excel file download.
    """
    from quart import Response

    from .export import IdeasExporter

    error = _check_ideas_enabled()
    if error:
        return error

    try:
        service = _get_ideas_service()
        if not service:
            return jsonify({"error": "Ideas service not configured"}), 500

        # Get filter parameters
        status = request.args.get("status")
        recommendation = request.args.get("recommendation")

        # Fetch ideas
        result = await service.list_ideas(
            page=1,
            page_size=1000,
            status=status,
            recommendation_class=recommendation,
        )

        # Export to Excel
        exporter = IdeasExporter()
        excel_content = exporter.export_to_excel(result.ideas)

        # Return as file download
        return Response(
            excel_content,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=ideas_export.xlsx"
            },
        )

    except Exception as e:
        logger.exception("Error exporting ideas to Excel")
        return error_response(e, "/api/ideas/export/excel")


@ideas_bp.route("/export/report", methods=["GET"])
@authenticated
async def export_ideas_report(auth_claims: dict[str, Any]):
    """
    Export ideas summary report.

    Query parameters:
        - status: Filter by status (optional)
        - recommendation: Filter by recommendation class (optional)

    Returns:
        Text report download.
    """
    from quart import Response

    from .export import IdeasExporter

    error = _check_ideas_enabled()
    if error:
        return error

    try:
        service = _get_ideas_service()
        if not service:
            return jsonify({"error": "Ideas service not configured"}), 500

        # Get filter parameters
        status = request.args.get("status")
        recommendation = request.args.get("recommendation")

        # Fetch ideas
        result = await service.list_ideas(
            page=1,
            page_size=1000,
            status=status,
            recommendation_class=recommendation,
        )

        # Generate report
        exporter = IdeasExporter()
        report_content = exporter.export_summary_report(result.ideas)

        # Return as file download
        return Response(
            report_content,
            mimetype="text/plain",
            headers={
                "Content-Disposition": "attachment; filename=ideas_report.txt"
            },
        )

    except Exception as e:
        logger.exception("Error generating ideas report")
        return error_response(e, "/api/ideas/export/report")


# =============================================================================
# External API Endpoints
# =============================================================================

# Global external API manager instance
_external_api_manager = None


def _get_external_api_manager():
    """Get or create the external API manager instance."""
    global _external_api_manager
    if _external_api_manager is None:
        from .external_api import ExternalApiManager
        _external_api_manager = ExternalApiManager()
    return _external_api_manager


def api_key_required(permission: str):
    """
    Decorator for API key authentication.

    Args:
        permission: Required permission string.
    """
    from functools import wraps

    def decorator(f):
        @wraps(f)
        async def decorated_function(*args, **kwargs):
            # Get API key from header
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing API key"}), 401

            api_key_raw = auth_header[7:]  # Remove "Bearer " prefix
            manager = _get_external_api_manager()
            api_key = await manager.validate_api_key(api_key_raw)

            if not api_key:
                return jsonify({"error": "Invalid API key"}), 401

            if not manager.has_permission(api_key, permission):
                return jsonify({"error": "Insufficient permissions"}), 403

            # Add api_key to kwargs for use in the endpoint
            kwargs["api_key"] = api_key
            return await f(*args, **kwargs)

        return decorated_function
    return decorator


@ideas_bp.route("/external/ideas", methods=["GET"])
@api_key_required("ideas:read")
async def external_list_ideas(api_key):
    """
    External API: List ideas.

    Requires API key with 'ideas:read' permission.

    Query parameters:
        - page: Page number (default: 1)
        - page_size: Items per page (default: 20, max: 100)
        - status: Filter by status

    Returns:
        JSON response with ideas list.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    try:
        page = int(request.args.get("page", 1))
        page_size = min(int(request.args.get("page_size", 20)), 100)
        status = request.args.get("status")

        service = _get_ideas_service()
        if not service:
            return jsonify({"error": "Ideas service not configured"}), 500

        result = await service.list_ideas(
            page=page,
            page_size=page_size,
            status=status,
        )

        return jsonify({
            "ideas": [idea.to_dict() for idea in result.ideas],
            "total": result.total,
            "page": result.page,
            "pageSize": result.page_size,
            "hasMore": result.has_more,
        })

    except Exception as e:
        logger.exception("External API: Error listing ideas")
        return error_response(e, "/api/ideas/external/ideas")


@ideas_bp.route("/external/ideas/<idea_id>", methods=["GET"])
@api_key_required("ideas:read")
async def external_get_idea(idea_id: str, api_key):
    """
    External API: Get a single idea.

    Requires API key with 'ideas:read' permission.

    Args:
        idea_id: The unique identifier of the idea.

    Returns:
        JSON response with idea details.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    try:
        service = _get_ideas_service()
        if not service:
            return jsonify({"error": "Ideas service not configured"}), 500

        idea = await service.get_idea(idea_id)
        if not idea:
            return jsonify({"error": "Idea not found"}), 404

        return jsonify(idea.to_dict())

    except Exception as e:
        logger.exception("External API: Error getting idea")
        return error_response(e, f"/api/ideas/external/ideas/{idea_id}")


@ideas_bp.route("/external/webhooks", methods=["POST"])
@api_key_required("webhooks:manage")
async def external_register_webhook(api_key):
    """
    External API: Register a webhook.

    Requires API key with 'webhooks:manage' permission.

    Request body:
        - url: Webhook URL
        - events: List of event types to subscribe to

    Returns:
        JSON response with webhook configuration (including secret).
    """
    from .external_api import WebhookEvent

    error = _check_ideas_enabled()
    if error:
        return error

    try:
        data = await request.get_json()
        url = data.get("url")
        event_names = data.get("events", [])

        if not url:
            return jsonify({"error": "URL is required"}), 400

        # Parse events
        events = []
        for name in event_names:
            try:
                events.append(WebhookEvent(name))
            except ValueError:
                return jsonify({"error": f"Invalid event: {name}"}), 400

        if not events:
            events = list(WebhookEvent)  # Subscribe to all events

        manager = _get_external_api_manager()
        webhook = await manager.register_webhook(url, events)

        return jsonify({
            "webhookId": webhook.webhook_id,
            "url": webhook.url,
            "secret": webhook.secret,
            "events": [e.value for e in webhook.events],
            "message": "Store the secret securely - it will not be shown again",
        }), 201

    except Exception as e:
        logger.exception("External API: Error registering webhook")
        return error_response(e, "/api/ideas/external/webhooks")


@ideas_bp.route("/external/api-info", methods=["GET"])
async def external_api_info():
    """
    External API: Get API information and available endpoints.

    No authentication required.

    Returns:
        JSON response with API documentation.
    """
    return jsonify({
        "name": "Ideas Hub External API",
        "version": "1.0.0",
        "endpoints": [
            {
                "path": "/api/ideas/external/ideas",
                "method": "GET",
                "description": "List ideas with pagination",
                "permission": "ideas:read",
            },
            {
                "path": "/api/ideas/external/ideas/{id}",
                "method": "GET",
                "description": "Get a single idea by ID",
                "permission": "ideas:read",
            },
            {
                "path": "/api/ideas/external/webhooks",
                "method": "POST",
                "description": "Register a webhook endpoint",
                "permission": "webhooks:manage",
            },
        ],
        "authentication": {
            "type": "Bearer token",
            "header": "Authorization: Bearer <api_key>",
        },
        "webhookEvents": [
            "idea.created",
            "idea.updated",
            "idea.deleted",
            "status.changed",
            "score.updated",
            "analysis.complete",
        ],
        "permissions": [
            "ideas:read",
            "ideas:write",
            "ideas:delete",
            "webhooks:manage",
            "export:read",
        ],
    })


# =============================================================================
# Like Endpoints
# =============================================================================


@ideas_bp.route("/<idea_id>/likes", methods=["POST"])
@authenticated
async def add_like(auth_claims: dict[str, Any], idea_id: str) -> Response:
    """
    Add a like to an idea.

    A user can only like an idea once. Attempting to like an already-liked
    idea will return a 409 Conflict response.

    Args:
        auth_claims: Authentication claims from the decorator.
        idea_id: The unique identifier of the idea.

    Returns:
        JSON response with the created like or error.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return error_response("User ID not found", 401)

    service = _get_ideas_service()
    if not service:
        return error_response("Ideas service not configured", 500)

    # Verify idea exists
    idea = await service.get_idea(idea_id)
    if not idea:
        return error_response("Idea not found", 404)

    # Add the like
    like = await service.add_like(idea_id, user_id)
    if not like:
        return error_response("You have already liked this idea", 409)

    return jsonify({
        "success": True,
        "like": like.to_dict(),
    })


@ideas_bp.route("/<idea_id>/likes", methods=["DELETE"])
@authenticated
async def remove_like(auth_claims: dict[str, Any], idea_id: str) -> Response:
    """
    Remove a like from an idea.

    Args:
        auth_claims: Authentication claims from the decorator.
        idea_id: The unique identifier of the idea.

    Returns:
        JSON response indicating success or failure.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return error_response("User ID not found", 401)

    service = _get_ideas_service()
    if not service:
        return error_response("Ideas service not configured", 500)

    # Verify idea exists
    idea = await service.get_idea(idea_id)
    if not idea:
        return error_response("Idea not found", 404)

    # Remove the like
    removed = await service.remove_like(idea_id, user_id)
    if not removed:
        return error_response("You have not liked this idea", 404)

    return jsonify({
        "success": True,
        "message": "Like removed successfully",
    })


@ideas_bp.route("/<idea_id>/likes", methods=["GET"])
@authenticated
async def get_like_count(auth_claims: dict[str, Any], idea_id: str) -> Response:
    """
    Get the like count for an idea.

    Args:
        auth_claims: Authentication claims from the decorator.
        idea_id: The unique identifier of the idea.

    Returns:
        JSON response with like count and user's like status.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return error_response("User ID not found", 401)

    service = _get_ideas_service()
    if not service:
        return error_response("Ideas service not configured", 500)

    # Verify idea exists
    idea = await service.get_idea(idea_id)
    if not idea:
        return error_response("Idea not found", 404)

    like_count = await service.get_like_count(idea_id)
    user_has_liked = await service.has_user_liked(idea_id, user_id)

    return jsonify({
        "ideaId": idea_id,
        "likeCount": like_count,
        "userHasLiked": user_has_liked,
    })


@ideas_bp.route("/<idea_id>/engagement", methods=["GET"])
@authenticated
async def get_engagement(auth_claims: dict[str, Any], idea_id: str) -> Response:
    """
    Get aggregated engagement metrics for an idea.

    Returns like count, comment count, and user's like status.

    Args:
        auth_claims: Authentication claims from the decorator.
        idea_id: The unique identifier of the idea.

    Returns:
        JSON response with engagement metrics.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return error_response("User ID not found", 401)

    service = _get_ideas_service()
    if not service:
        return error_response("Ideas service not configured", 500)

    # Verify idea exists
    idea = await service.get_idea(idea_id)
    if not idea:
        return error_response("Idea not found", 404)

    engagement = await service.get_idea_engagement(idea_id, user_id)

    return jsonify(engagement.to_dict())


@ideas_bp.route("/engagement/batch", methods=["POST"])
@authenticated
async def get_engagement_batch(auth_claims: dict[str, Any]) -> Response:
    """
    Get aggregated engagement metrics for multiple ideas in a single request.

    This batch endpoint significantly improves performance when loading
    the ideas list by reducing the number of API calls from N to 1.

    Request body:
        ideaIds: List of idea IDs to get engagement for.

    Returns:
        JSON response with engagement metrics for each idea.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return error_response("User ID not found", 401)

    service = _get_ideas_service()
    if not service:
        return error_response("Ideas service not configured", 500)

    try:
        data = await request.get_json()
        idea_ids = data.get("ideaIds", [])

        if not idea_ids:
            return jsonify({"engagements": {}})

        # Limit batch size to prevent abuse
        if len(idea_ids) > 100:
            return error_response("Maximum 100 ideas per batch request", 400)

        # Use optimized bulk query method
        bulk_engagements = await service.get_bulk_engagement(idea_ids, user_id)

        # Convert to dict format for JSON response
        engagements = {
            idea_id: engagement.to_dict()
            for idea_id, engagement in bulk_engagements.items()
        }

        return jsonify({"engagements": engagements})

    except Exception as e:
        logger.exception("Error getting batch engagement")
        return error_response(e, "/api/ideas/engagement/batch")


# =============================================================================
# Comment Endpoints
# =============================================================================


@ideas_bp.route("/<idea_id>/comments", methods=["POST"])
@authenticated
async def create_comment(auth_claims: dict[str, Any], idea_id: str) -> Response:
    """
    Create a new comment on an idea.

    Request body:
        content: The comment text (required).

    Args:
        auth_claims: Authentication claims from the decorator.
        idea_id: The unique identifier of the idea.

    Returns:
        JSON response with the created comment.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return error_response("User ID not found", 401)

    service = _get_ideas_service()
    if not service:
        return error_response("Ideas service not configured", 500)

    # Verify idea exists
    idea = await service.get_idea(idea_id)
    if not idea:
        return error_response("Idea not found", 404)

    # Parse request body
    data = await request.get_json()
    if not data:
        return error_response("Request body is required", 400)

    content = data.get("content", "").strip()
    if not content:
        return error_response("Comment content is required", 400)

    if len(content) > 5000:
        return error_response("Comment content exceeds maximum length of 5000 characters", 400)

    try:
        comment = await service.create_comment(idea_id, user_id, content)
        return jsonify({
            "success": True,
            "comment": comment.to_dict(),
        }), 201
    except ValueError as e:
        return error_response(str(e), 400)


@ideas_bp.route("/<idea_id>/comments", methods=["GET"])
@authenticated
async def list_comments(auth_claims: dict[str, Any], idea_id: str) -> Response:
    """
    List comments for an idea with pagination.

    Query parameters:
        page: Page number (default: 1).
        pageSize: Number of items per page (default: 20, max: 100).
        sortOrder: Sort direction (asc/desc, default: asc).

    Args:
        auth_claims: Authentication claims from the decorator.
        idea_id: The unique identifier of the idea.

    Returns:
        JSON response with paginated comments.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    service = _get_ideas_service()
    if not service:
        return error_response("Ideas service not configured", 500)

    # Verify idea exists
    idea = await service.get_idea(idea_id)
    if not idea:
        return error_response("Idea not found", 404)

    # Parse query parameters
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("pageSize", 20, type=int)
    sort_order = request.args.get("sortOrder", "asc")

    # Validate parameters
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100
    if sort_order not in ("asc", "desc"):
        sort_order = "asc"

    comments_response = await service.list_comments(
        idea_id=idea_id,
        page=page,
        page_size=page_size,
        sort_order=sort_order,
    )

    return jsonify(comments_response.to_dict())


@ideas_bp.route("/<idea_id>/comments/<comment_id>", methods=["GET"])
@authenticated
async def get_comment(
    auth_claims: dict[str, Any], idea_id: str, comment_id: str
) -> Response:
    """
    Get a specific comment.

    Args:
        auth_claims: Authentication claims from the decorator.
        idea_id: The unique identifier of the idea.
        comment_id: The unique identifier of the comment.

    Returns:
        JSON response with the comment.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    service = _get_ideas_service()
    if not service:
        return error_response("Ideas service not configured", 500)

    # Verify idea exists
    idea = await service.get_idea(idea_id)
    if not idea:
        return error_response("Idea not found", 404)

    comment = await service.get_comment(comment_id)
    if not comment:
        return error_response("Comment not found", 404)

    # Verify comment belongs to this idea
    if comment.idea_id != idea_id:
        return error_response("Comment not found", 404)

    return jsonify(comment.to_dict())


@ideas_bp.route("/<idea_id>/comments/<comment_id>", methods=["PUT"])
@authenticated
async def update_comment(
    auth_claims: dict[str, Any], idea_id: str, comment_id: str
) -> Response:
    """
    Update an existing comment.

    Only the comment owner can update their comment.

    Request body:
        content: The new comment text (required).

    Args:
        auth_claims: Authentication claims from the decorator.
        idea_id: The unique identifier of the idea.
        comment_id: The unique identifier of the comment.

    Returns:
        JSON response with the updated comment.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return error_response("User ID not found", 401)

    service = _get_ideas_service()
    if not service:
        return error_response("Ideas service not configured", 500)

    # Verify idea exists
    idea = await service.get_idea(idea_id)
    if not idea:
        return error_response("Idea not found", 404)

    # Verify comment exists and belongs to this idea
    existing_comment = await service.get_comment(comment_id)
    if not existing_comment or existing_comment.idea_id != idea_id:
        return error_response("Comment not found", 404)

    # Parse request body
    data = await request.get_json()
    if not data:
        return error_response("Request body is required", 400)

    content = data.get("content", "").strip()
    if not content:
        return error_response("Comment content is required", 400)

    if len(content) > 5000:
        return error_response("Comment content exceeds maximum length of 5000 characters", 400)

    try:
        updated_comment = await service.update_comment(
            comment_id=comment_id,
            content=content,
            user_id=user_id,
        )
        if not updated_comment:
            return error_response("Comment not found", 404)

        return jsonify({
            "success": True,
            "comment": updated_comment.to_dict(),
        })
    except PermissionError as e:
        return error_response(str(e), 403)
    except ValueError as e:
        return error_response(str(e), 400)


@ideas_bp.route("/<idea_id>/comments/<comment_id>", methods=["DELETE"])
@authenticated
async def delete_comment(
    auth_claims: dict[str, Any], idea_id: str, comment_id: str
) -> Response:
    """
    Delete a comment.

    Only the comment owner or an admin can delete a comment.

    Args:
        auth_claims: Authentication claims from the decorator.
        idea_id: The unique identifier of the idea.
        comment_id: The unique identifier of the comment.

    Returns:
        JSON response indicating success or failure.
    """
    error = _check_ideas_enabled()
    if error:
        return error

    user_id = _get_user_id(auth_claims)
    if not user_id:
        return error_response("User ID not found", 401)

    service = _get_ideas_service()
    if not service:
        return error_response("Ideas service not configured", 500)

    # Verify idea exists
    idea = await service.get_idea(idea_id)
    if not idea:
        return error_response("Idea not found", 404)

    # Verify comment exists and belongs to this idea
    existing_comment = await service.get_comment(comment_id)
    if not existing_comment or existing_comment.idea_id != idea_id:
        return error_response("Comment not found", 404)

    # Check if user is admin
    user_role = get_user_role(user_id)
    is_admin = user_role == IdeaRole.ADMIN

    try:
        deleted = await service.delete_comment(
            comment_id=comment_id,
            user_id=user_id,
            is_admin=is_admin,
        )
        if not deleted:
            return error_response("Comment not found", 404)

        return jsonify({
            "success": True,
            "message": "Comment deleted successfully",
        })
    except PermissionError as e:
        return error_response(str(e), 403)
