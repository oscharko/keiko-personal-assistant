"""
Role-based access control for the Ideas Hub module.

Defines roles and permissions for idea management:
- User: Submit ideas, view/edit own ideas
- Reviewer: View all ideas, add comments, change status
- Admin: Full access, configure weights, manage all ideas
"""

import logging
from enum import Enum
from functools import wraps
from typing import Any, Callable

from quart import current_app, jsonify

logger = logging.getLogger(__name__)


class IdeaRole(str, Enum):
    """Roles for Ideas Hub access control."""

    USER = "user"
    REVIEWER = "reviewer"
    ADMIN = "admin"


class IdeaPermission(str, Enum):
    """Permissions for Ideas Hub operations."""

    # Basic permissions
    CREATE_IDEA = "create_idea"
    VIEW_OWN_IDEAS = "view_own_ideas"
    EDIT_OWN_IDEAS = "edit_own_ideas"
    DELETE_OWN_IDEAS = "delete_own_ideas"

    # Reviewer permissions
    VIEW_ALL_IDEAS = "view_all_ideas"
    ADD_COMMENTS = "add_comments"
    CHANGE_STATUS = "change_status"

    # Admin permissions
    EDIT_ALL_IDEAS = "edit_all_ideas"
    DELETE_ALL_IDEAS = "delete_all_ideas"
    CONFIGURE_WEIGHTS = "configure_weights"
    MANAGE_ROLES = "manage_roles"
    VIEW_AUDIT_LOG = "view_audit_log"
    TRIGGER_ANALYSIS = "trigger_analysis"


# Role to permissions mapping
ROLE_PERMISSIONS: dict[IdeaRole, set[IdeaPermission]] = {
    IdeaRole.USER: {
        IdeaPermission.CREATE_IDEA,
        IdeaPermission.VIEW_OWN_IDEAS,
        IdeaPermission.EDIT_OWN_IDEAS,
        IdeaPermission.DELETE_OWN_IDEAS,
    },
    IdeaRole.REVIEWER: {
        IdeaPermission.CREATE_IDEA,
        IdeaPermission.VIEW_OWN_IDEAS,
        IdeaPermission.EDIT_OWN_IDEAS,
        IdeaPermission.DELETE_OWN_IDEAS,
        IdeaPermission.VIEW_ALL_IDEAS,
        IdeaPermission.ADD_COMMENTS,
        IdeaPermission.CHANGE_STATUS,
    },
    IdeaRole.ADMIN: {
        IdeaPermission.CREATE_IDEA,
        IdeaPermission.VIEW_OWN_IDEAS,
        IdeaPermission.EDIT_OWN_IDEAS,
        IdeaPermission.DELETE_OWN_IDEAS,
        IdeaPermission.VIEW_ALL_IDEAS,
        IdeaPermission.ADD_COMMENTS,
        IdeaPermission.CHANGE_STATUS,
        IdeaPermission.EDIT_ALL_IDEAS,
        IdeaPermission.DELETE_ALL_IDEAS,
        IdeaPermission.CONFIGURE_WEIGHTS,
        IdeaPermission.MANAGE_ROLES,
        IdeaPermission.VIEW_AUDIT_LOG,
        IdeaPermission.TRIGGER_ANALYSIS,
    },
}


def get_user_role(auth_claims: dict[str, Any]) -> IdeaRole:
    """
    Determine user's role from authentication claims.

    Checks for role claims in the following order:
    1. Custom 'ideas_role' claim
    2. Azure AD 'roles' claim
    3. Default to USER role

    Args:
        auth_claims: Authentication claims from the token.

    Returns:
        The user's IdeaRole.
    """
    # Check for custom ideas role claim
    ideas_role = auth_claims.get("ideas_role", "").lower()
    if ideas_role in [r.value for r in IdeaRole]:
        return IdeaRole(ideas_role)

    # Check Azure AD roles claim
    roles = auth_claims.get("roles", [])
    if isinstance(roles, list):
        for role in roles:
            role_lower = role.lower()
            if "admin" in role_lower or "ideas.admin" in role_lower:
                return IdeaRole.ADMIN
            if "reviewer" in role_lower or "ideas.reviewer" in role_lower:
                return IdeaRole.REVIEWER

    # Default to user role
    return IdeaRole.USER


def has_permission(
    auth_claims: dict[str, Any],
    permission: IdeaPermission,
) -> bool:
    """
    Check if user has a specific permission.

    Args:
        auth_claims: Authentication claims from the token.
        permission: The permission to check.

    Returns:
        True if user has the permission, False otherwise.
    """
    role = get_user_role(auth_claims)
    permissions = ROLE_PERMISSIONS.get(role, set())
    return permission in permissions


def can_view_idea(
    auth_claims: dict[str, Any],
    idea_submitter_id: str,
) -> bool:
    """
    Check if user can view a specific idea.

    Args:
        auth_claims: Authentication claims from the token.
        idea_submitter_id: The ID of the idea's submitter.

    Returns:
        True if user can view the idea, False otherwise.
    """
    user_id = auth_claims.get("oid") or auth_claims.get("sub")

    # User can view their own ideas
    if user_id == idea_submitter_id:
        return has_permission(auth_claims, IdeaPermission.VIEW_OWN_IDEAS)

    # Otherwise, need VIEW_ALL_IDEAS permission
    return has_permission(auth_claims, IdeaPermission.VIEW_ALL_IDEAS)


def can_edit_idea(
    auth_claims: dict[str, Any],
    idea_submitter_id: str,
) -> bool:
    """
    Check if user can edit a specific idea.

    Args:
        auth_claims: Authentication claims from the token.
        idea_submitter_id: The ID of the idea's submitter.

    Returns:
        True if user can edit the idea, False otherwise.
    """
    user_id = auth_claims.get("oid") or auth_claims.get("sub")

    # User can edit their own ideas
    if user_id == idea_submitter_id:
        return has_permission(auth_claims, IdeaPermission.EDIT_OWN_IDEAS)

    # Otherwise, need EDIT_ALL_IDEAS permission
    return has_permission(auth_claims, IdeaPermission.EDIT_ALL_IDEAS)


def can_delete_idea(
    auth_claims: dict[str, Any],
    idea_submitter_id: str,
) -> bool:
    """
    Check if user can delete a specific idea.

    Args:
        auth_claims: Authentication claims from the token.
        idea_submitter_id: The ID of the idea's submitter.

    Returns:
        True if user can delete the idea, False otherwise.
    """
    user_id = auth_claims.get("oid") or auth_claims.get("sub")

    # User can delete their own ideas
    if user_id == idea_submitter_id:
        return has_permission(auth_claims, IdeaPermission.DELETE_OWN_IDEAS)

    # Otherwise, need DELETE_ALL_IDEAS permission
    return has_permission(auth_claims, IdeaPermission.DELETE_ALL_IDEAS)


def can_review_idea(auth_claims: dict[str, Any]) -> bool:
    """
    Check if user can review ideas (trigger LLM review).

    Only REVIEWER and ADMIN roles can review ideas.

    Args:
        auth_claims: Authentication claims from the token.

    Returns:
        True if user can review ideas, False otherwise.
    """
    role = get_user_role(auth_claims)
    return role in (IdeaRole.REVIEWER, IdeaRole.ADMIN)


def require_permission(permission: IdeaPermission) -> Callable:
    """
    Decorator to require a specific permission for an endpoint.

    Args:
        permission: The required permission.

    Returns:
        Decorator function.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(auth_claims: dict[str, Any], *args, **kwargs):
            if not has_permission(auth_claims, permission):
                role = get_user_role(auth_claims)
                logger.warning(
                    f"Permission denied: {permission.value} "
                    f"for role {role.value}"
                )
                return jsonify({
                    "error": "Permission denied",
                    "required_permission": permission.value,
                }), 403
            return await func(auth_claims, *args, **kwargs)
        return wrapper
    return decorator


def get_user_permissions(auth_claims: dict[str, Any]) -> list[str]:
    """
    Get all permissions for a user.

    Args:
        auth_claims: Authentication claims from the token.

    Returns:
        List of permission names.
    """
    role = get_user_role(auth_claims)
    permissions = ROLE_PERMISSIONS.get(role, set())
    return [p.value for p in permissions]


def get_role_info(auth_claims: dict[str, Any]) -> dict[str, Any]:
    """
    Get role and permission information for a user.

    Args:
        auth_claims: Authentication claims from the token.

    Returns:
        Dictionary with role and permissions.
    """
    role = get_user_role(auth_claims)
    permissions = get_user_permissions(auth_claims)

    return {
        "role": role.value,
        "permissions": permissions,
        "isAdmin": role == IdeaRole.ADMIN,
        "isReviewer": role in (IdeaRole.REVIEWER, IdeaRole.ADMIN),
    }

