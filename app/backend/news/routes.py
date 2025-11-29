"""
API routes for the News Dashboard feature.
Provides endpoints for managing user news preferences and fetching personalized news.
"""

import asyncio
import logging
import os
from typing import Any, Optional

from azure.cosmos.aio import CosmosClient
from quart import Blueprint, current_app, jsonify, request

from config import (
    CONFIG_KNOWLEDGEBASE_CLIENT_WITH_WEB,
    CONFIG_NEWS_CACHE_CONTAINER,
    CONFIG_NEWS_DASHBOARD_ENABLED,
    CONFIG_NEWS_PREFERENCES_CONTAINER,
    CONFIG_OPENAI_CLIENT,
)
from decorators import authenticated
from error import error_response

from .models import NewsPreferences
from .scheduler import NewsScheduler, refresh_single_topic
from .service import NewsService

logger = logging.getLogger(__name__)

news_bp = Blueprint("news", __name__, url_prefix="/api/user")

# Global scheduler instance
_news_scheduler: Optional[NewsScheduler] = None


def _get_news_service() -> NewsService:
    """Get configured NewsService instance."""
    openai_client = current_app.config.get(CONFIG_OPENAI_CLIENT)
    # Read model and deployment from environment variables (same as app.py)
    chatgpt_model = os.environ.get("AZURE_OPENAI_CHATGPT_MODEL", "gpt-4o-mini")
    chatgpt_deployment = os.environ.get("AZURE_OPENAI_CHATGPT_DEPLOYMENT")
    preferences_container = current_app.config.get(CONFIG_NEWS_PREFERENCES_CONTAINER)
    cache_container = current_app.config.get(CONFIG_NEWS_CACHE_CONTAINER)
    knowledgebase_client = current_app.config.get(CONFIG_KNOWLEDGEBASE_CLIENT_WITH_WEB)

    return NewsService(
        openai_client=openai_client,
        chatgpt_model=chatgpt_model,
        chatgpt_deployment=chatgpt_deployment,
        preferences_container=preferences_container,
        cache_container=cache_container,
        knowledgebase_client=knowledgebase_client,
    )


def _check_news_enabled() -> tuple[Any, int] | None:
    """Check if news dashboard is enabled. Returns error response if not."""
    if not current_app.config.get(CONFIG_NEWS_DASHBOARD_ENABLED, False):
        return jsonify({"error": "News dashboard is not enabled"}), 400
    return None


@news_bp.get("/news-preferences")
@authenticated
async def get_news_preferences(auth_claims: dict[str, Any]):
    """
    Get the current user's news preferences (search terms).

    Returns:
        JSON with search_terms array and updated_at timestamp
    """
    error = _check_news_enabled()
    if error:
        return error

    user_oid = auth_claims.get("oid")
    if not user_oid:
        return jsonify({"error": "User OID not found"}), 401

    try:
        service = _get_news_service()
        preferences = await service.get_preferences(user_oid)

        return jsonify(
            {
                "searchTerms": preferences.search_terms,
                "updatedAt": preferences.updated_at,
                "maxTerms": NewsPreferences.MAX_SEARCH_TERMS,
            }
        )
    except Exception as e:
        logger.exception("Error getting news preferences")
        return error_response(e, "/api/user/news-preferences")


@news_bp.post("/news-preferences")
@authenticated
async def update_news_preferences(auth_claims: dict[str, Any]):
    """
    Add or update news preferences (search terms).
    When a new term is added, triggers an immediate background refresh for that term only.

    Request body:
        {
            "searchTerms": ["term1", "term2", ...]  // Replace all terms
        }
        OR
        {
            "addTerm": "new term"  // Add single term
        }

    Returns:
        Updated preferences
    """
    error = _check_news_enabled()
    if error:
        return error

    user_oid = auth_claims.get("oid")
    if not user_oid:
        return jsonify({"error": "User OID not found"}), 401

    try:
        request_json = await request.get_json()
        service = _get_news_service()

        # Check if scheduler is enabled (production mode)
        scheduler_enabled = os.getenv("ENABLE_NEWS_SCHEDULER", "").lower() == "true"

        # Get current preferences to detect new terms
        current_prefs = await service.get_preferences(user_oid)
        current_terms_lower = {t.lower() for t in current_prefs.search_terms}

        # Handle adding a single term
        if "addTerm" in request_json:
            term = request_json.get("addTerm", "").strip()
            if not term:
                return jsonify({"error": "Search term cannot be empty"}), 400

            # Check if this is a new term
            is_new_term = term.lower() not in current_terms_lower

            try:
                preferences = await service.add_search_term(user_oid, term)
            except ValueError as ve:
                return jsonify({"error": str(ve)}), 400

            # Trigger background refresh for new term only (production only)
            if is_new_term and scheduler_enabled:
                asyncio.create_task(_refresh_new_topic_background(term))

            return jsonify(
                {
                    "searchTerms": preferences.search_terms,
                    "updatedAt": preferences.updated_at,
                    "maxTerms": NewsPreferences.MAX_SEARCH_TERMS,
                }
            )

        # Handle replacing all terms
        if "searchTerms" in request_json:
            terms = request_json.get("searchTerms", [])

            if not isinstance(terms, list):
                return jsonify({"error": "searchTerms must be an array"}), 400

            if len(terms) > NewsPreferences.MAX_SEARCH_TERMS:
                return (
                    jsonify({"error": f"Maximum of {NewsPreferences.MAX_SEARCH_TERMS} search terms allowed"}),
                    400,
                )

            # Validate and clean terms
            clean_terms = []
            for term in terms:
                if isinstance(term, str) and term.strip():
                    clean_term = term.strip()
                    if clean_term.lower() not in [t.lower() for t in clean_terms]:
                        clean_terms.append(clean_term)

            # Identify new terms
            new_terms = [t for t in clean_terms if t.lower() not in current_terms_lower]

            preferences = NewsPreferences(user_oid=user_oid, search_terms=clean_terms)
            preferences = await service.save_preferences(preferences)

            # Trigger background refresh for new terms only (production only)
            if scheduler_enabled:
                for new_term in new_terms:
                    asyncio.create_task(_refresh_new_topic_background(new_term))

            return jsonify(
                {
                    "searchTerms": preferences.search_terms,
                    "updatedAt": preferences.updated_at,
                    "maxTerms": NewsPreferences.MAX_SEARCH_TERMS,
                }
            )

        return jsonify({"error": "Request must include 'searchTerms' or 'addTerm'"}), 400

    except Exception as e:
        logger.exception("Error updating news preferences")
        return error_response(e, "/api/user/news-preferences")


async def _refresh_new_topic_background(topic: str) -> None:
    """
    Background task to refresh news for a newly added topic.
    This runs asynchronously and doesn't block the API response.
    """
    try:
        cache_container = current_app.config.get(CONFIG_NEWS_CACHE_CONTAINER)
        preferences_container = current_app.config.get(CONFIG_NEWS_PREFERENCES_CONTAINER)
        openai_client = current_app.config.get(CONFIG_OPENAI_CLIENT)
        chatgpt_model = os.environ.get("AZURE_OPENAI_CHATGPT_MODEL", "gpt-4o-mini")
        chatgpt_deployment = os.environ.get("AZURE_OPENAI_CHATGPT_DEPLOYMENT")

        if not all([cache_container, preferences_container, openai_client]):
            logger.warning("Cannot refresh new topic - missing configuration")
            return

        await refresh_single_topic(
            topic=topic,
            cache_container=cache_container,
            preferences_container=preferences_container,
            openai_client=openai_client,
            chatgpt_model=chatgpt_model,
            chatgpt_deployment=chatgpt_deployment,
        )
    except Exception as e:
        logger.error(f"Background refresh for new topic '{topic}' failed: {e}")


@news_bp.delete("/news-preferences/<term>")
@authenticated
async def delete_news_preference(auth_claims: dict[str, Any], term: str):
    """
    Delete a specific search term from user's preferences.

    Args:
        term: The search term to delete (URL encoded)

    Returns:
        Updated preferences
    """
    error = _check_news_enabled()
    if error:
        return error

    user_oid = auth_claims.get("oid")
    if not user_oid:
        return jsonify({"error": "User OID not found"}), 401

    try:
        service = _get_news_service()

        # URL decode the term
        from urllib.parse import unquote

        decoded_term = unquote(term)

        try:
            preferences = await service.remove_search_term(user_oid, decoded_term)
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 404

        return jsonify(
            {
                "searchTerms": preferences.search_terms,
                "updatedAt": preferences.updated_at,
                "maxTerms": NewsPreferences.MAX_SEARCH_TERMS,
            }
        )

    except Exception as e:
        logger.exception("Error deleting news preference")
        return error_response(e, f"/api/user/news-preferences/{term}")


@news_bp.post("/news/refresh")
@authenticated
async def refresh_news(auth_claims: dict[str, Any]):
    """
    Refresh news for all of the user's search terms.

    Request body (optional):
        {
            "forceRefresh": true  // Bypass cache
        }

    Returns:
        Array of news items with summaries and citations
    """
    error = _check_news_enabled()
    if error:
        return error

    user_oid = auth_claims.get("oid")
    if not user_oid:
        return jsonify({"error": "User OID not found"}), 401

    try:
        request_json = await request.get_json() if request.is_json else {}
        force_refresh = request_json.get("forceRefresh", False)

        service = _get_news_service()
        result = await service.refresh_news(user_oid, force_refresh=force_refresh)

        return jsonify(result.to_dict())

    except Exception as e:
        logger.exception("Error refreshing news")
        return error_response(e, "/api/user/news/refresh")


@news_bp.get("/news")
@authenticated
async def get_cached_news(auth_claims: dict[str, Any]):
    """
    Get cached news for the user's search terms without triggering a refresh.

    Deduplication happens at fetch time (when scheduler runs at night):
    - Articles fetched in the last 24 hours are not fetched again
    - After 24 hours, the tracker resets and new articles are fetched
    - This ensures users see fresh articles every day

    Returns:
        Array of cached news items (may be empty if no cache exists)
    """
    error = _check_news_enabled()
    if error:
        return error

    user_oid = auth_claims.get("oid")
    if not user_oid:
        return jsonify({"error": "User OID not found"}), 401

    try:
        service = _get_news_service()
        preferences = await service.get_preferences(user_oid)

        if not preferences.search_terms:
            return jsonify(
                {
                    "userOid": user_oid,
                    "items": [],
                    "searchedAt": None,
                    "error": "No search terms configured",
                }
            )

        # Get cached items for each term
        all_items = []
        for term in preferences.search_terms:
            cached = await service._get_cached_news(term)
            if cached:
                all_items.extend([item.to_dict() for item in cached.items])

        return jsonify(
            {
                "userOid": user_oid,
                "items": all_items,
                "searchedAt": all_items[0].get("publishedAt") if all_items else None,
                "error": None,
            }
        )

    except Exception as e:
        logger.exception("Error getting cached news")
        return error_response(e, "/api/user/news")


# Configuration keys for Cosmos DB containers
CONFIG_NEWS_COSMOS_CLIENT = "news_cosmos_client"
CONFIG_NEWS_SCHEDULER = "news_scheduler"


@news_bp.before_app_serving
async def setup_news_clients():
    """
    Initialize news containers using the same Cosmos DB client as chat history.
    Also starts the background scheduler for daily news refresh.
    This runs after chat_history setup, so we reuse the existing connection.
    """
    global _news_scheduler

    USE_NEWS_DASHBOARD = os.getenv("USE_NEWS_DASHBOARD", "").lower() == "true"
    USE_CHAT_HISTORY_COSMOS = os.getenv("USE_CHAT_HISTORY_COSMOS", "").lower() == "true"
    AZURE_CHAT_HISTORY_DATABASE = os.getenv("AZURE_CHAT_HISTORY_DATABASE")
    AZURE_NEWS_PREFERENCES_CONTAINER = os.getenv("AZURE_NEWS_PREFERENCES_CONTAINER", "news-preferences")
    AZURE_NEWS_CACHE_CONTAINER = os.getenv("AZURE_NEWS_CACHE_CONTAINER", "news-cache")

    current_app.config[CONFIG_NEWS_DASHBOARD_ENABLED] = USE_NEWS_DASHBOARD

    if not USE_NEWS_DASHBOARD:
        current_app.logger.info("News dashboard is disabled")
        return

    current_app.logger.info("USE_NEWS_DASHBOARD is true, setting up news containers")

    # News dashboard requires chat history cosmos to be enabled (reuses same connection)
    if not USE_CHAT_HISTORY_COSMOS:
        current_app.logger.warning(
            "USE_CHAT_HISTORY_COSMOS must be true for news dashboard to work"
        )
        current_app.config[CONFIG_NEWS_DASHBOARD_ENABLED] = False
        return

    try:
        # Reuse the Cosmos DB client from chat history
        from config import CONFIG_COSMOS_HISTORY_CLIENT

        cosmos_client: CosmosClient = current_app.config.get(CONFIG_COSMOS_HISTORY_CLIENT)
        if not cosmos_client:
            current_app.logger.error("Cosmos DB client not available from chat history")
            current_app.config[CONFIG_NEWS_DASHBOARD_ENABLED] = False
            return

        # Use the same database as chat history
        cosmos_db = cosmos_client.get_database_client(AZURE_CHAT_HISTORY_DATABASE)

        # Get containers for news preferences and cache
        preferences_container = cosmos_db.get_container_client(AZURE_NEWS_PREFERENCES_CONTAINER)
        cache_container = cosmos_db.get_container_client(AZURE_NEWS_CACHE_CONTAINER)

        current_app.config[CONFIG_NEWS_PREFERENCES_CONTAINER] = preferences_container
        current_app.config[CONFIG_NEWS_CACHE_CONTAINER] = cache_container

        # Initialize and start the background scheduler (only in production/container)
        ENABLE_NEWS_SCHEDULER = os.getenv("ENABLE_NEWS_SCHEDULER", "").lower() == "true"

        if ENABLE_NEWS_SCHEDULER:
            openai_client = current_app.config.get(CONFIG_OPENAI_CLIENT)
            chatgpt_model = os.environ.get("AZURE_OPENAI_CHATGPT_MODEL", "gpt-4o-mini")
            chatgpt_deployment = os.environ.get("AZURE_OPENAI_CHATGPT_DEPLOYMENT")

            if openai_client:
                _news_scheduler = NewsScheduler(
                    preferences_container=preferences_container,
                    cache_container=cache_container,
                    openai_client=openai_client,
                    chatgpt_model=chatgpt_model,
                    chatgpt_deployment=chatgpt_deployment,
                )
                _news_scheduler.start()
                current_app.config[CONFIG_NEWS_SCHEDULER] = _news_scheduler
                current_app.logger.info("News background scheduler started")
            else:
                current_app.logger.warning("OpenAI client not available - scheduler not started")
        else:
            current_app.logger.info("News scheduler disabled (ENABLE_NEWS_SCHEDULER != true)")

        current_app.logger.info(
            f"News dashboard initialized with database: {AZURE_CHAT_HISTORY_DATABASE}, "
            f"preferences container: {AZURE_NEWS_PREFERENCES_CONTAINER}, "
            f"cache container: {AZURE_NEWS_CACHE_CONTAINER}"
        )

    except Exception as e:
        current_app.logger.error(f"Failed to initialize news containers: {e}")
        current_app.config[CONFIG_NEWS_DASHBOARD_ENABLED] = False


@news_bp.after_app_serving
async def shutdown_news_scheduler():
    """Stop the background scheduler when the app shuts down."""
    global _news_scheduler

    if _news_scheduler is not None:
        _news_scheduler.stop()
        _news_scheduler = None
        current_app.logger.info("News background scheduler stopped")
