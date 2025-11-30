# Ideas Hub module for Keiko Personal Assistant
# Provides AI-powered idea submission, analysis, and management functionality

from .audit import AuditAction, AuditEntry, AuditLogger
from .export import IdeasExporter
from .external_api import ApiKey, ExternalApiManager, WebhookConfig, WebhookEvent
from .models import (
    Idea,
    IdeaComment,
    IdeaCommentsResponse,
    IdeaEngagement,
    IdeaKPIEstimates,
    IdeaLike,
    IdeaListResponse,
    IdeaStatus,
    RecommendationClass,
    SimilarIdea,
    SimilarIdeasResponse,
)
from .permissions import (
    IdeaPermission,
    IdeaRole,
    can_delete_idea,
    can_edit_idea,
    can_view_idea,
    get_role_info,
    get_user_permissions,
    get_user_role,
    has_permission,
    require_permission,
)
from .routes import ideas_bp
from .scheduler import IdeasScheduler
from .scoring import IdeaScorer, ScoringConfig
from .search_index import (
    EMBEDDING_DIMENSIONS,
    IDEAS_INDEX_NAME,
    IdeasSearchIndexManager,
)

__all__ = [
    "ApiKey",
    "AuditAction",
    "AuditEntry",
    "AuditLogger",
    "EMBEDDING_DIMENSIONS",
    "ExternalApiManager",
    "IDEAS_INDEX_NAME",
    "Idea",
    "IdeaComment",
    "IdeaCommentsResponse",
    "IdeaEngagement",
    "IdeasExporter",
    "IdeaKPIEstimates",
    "IdeaLike",
    "IdeaListResponse",
    "IdeaPermission",
    "IdeaRole",
    "IdeaScorer",
    "IdeasScheduler",
    "IdeaStatus",
    "IdeasSearchIndexManager",
    "RecommendationClass",
    "ScoringConfig",
    "SimilarIdea",
    "SimilarIdeasResponse",
    "WebhookConfig",
    "WebhookEvent",
    "can_delete_idea",
    "can_edit_idea",
    "can_view_idea",
    "get_role_info",
    "get_user_permissions",
    "get_user_role",
    "has_permission",
    "ideas_bp",
    "require_permission",
]

