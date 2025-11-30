"""
Audit logging for the Ideas Hub module.

Provides comprehensive audit trail for all idea operations including:
- Create, update, delete operations
- Status changes
- Score modifications
- Access events
"""

import logging
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

from azure.cosmos.aio import ContainerProxy

logger = logging.getLogger(__name__)


class AuditAction(str, Enum):
    """Types of auditable actions."""

    # CRUD operations
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"

    # Status changes
    STATUS_CHANGE = "status_change"

    # Score modifications
    SCORE_UPDATE = "score_update"
    KPI_UPDATE = "kpi_update"

    # Analysis events
    ANALYSIS_COMPLETE = "analysis_complete"
    THEME_CLASSIFIED = "theme_classified"

    # Access events
    VIEW = "view"
    EXPORT = "export"

    # Admin actions
    TRIGGER_ANALYSIS = "trigger_analysis"
    TRIGGER_RESCORING = "trigger_rescoring"

    # Engagement actions
    LIKE_ADDED = "like_added"
    LIKE_REMOVED = "like_removed"
    COMMENT_ADDED = "comment_added"
    COMMENT_UPDATED = "comment_updated"
    COMMENT_DELETED = "comment_deleted"


@dataclass
class AuditEntry:
    """
    Represents an audit log entry.

    Attributes:
        audit_id: Unique identifier for the audit entry.
        idea_id: ID of the idea being audited.
        action: The action performed.
        user_id: ID of the user performing the action.
        timestamp: Unix timestamp in milliseconds.
        changes: Dictionary of field changes (old_value, new_value).
        metadata: Additional context information.
    """

    audit_id: str
    idea_id: str
    action: AuditAction
    user_id: str
    timestamp: int
    changes: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_cosmos_item(self) -> dict[str, Any]:
        """Convert to Cosmos DB item format."""
        return {
            "id": self.audit_id,
            "auditId": self.audit_id,
            "ideaId": self.idea_id,
            "action": self.action.value if isinstance(self.action, AuditAction) else self.action,
            "userId": self.user_id,
            "timestamp": self.timestamp,
            "changes": self.changes,
            "metadata": self.metadata,
            "type": "audit_entry",
        }

    @classmethod
    def from_cosmos_item(cls, item: dict[str, Any]) -> "AuditEntry":
        """Create from Cosmos DB item."""
        action_value = item.get("action", "")
        try:
            action = AuditAction(action_value)
        except ValueError:
            action = action_value

        return cls(
            audit_id=item.get("auditId", item.get("id", "")),
            idea_id=item.get("ideaId", ""),
            action=action,
            user_id=item.get("userId", ""),
            timestamp=item.get("timestamp", 0),
            changes=item.get("changes", {}),
            metadata=item.get("metadata", {}),
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "auditId": self.audit_id,
            "ideaId": self.idea_id,
            "action": self.action.value if isinstance(self.action, AuditAction) else self.action,
            "userId": self.user_id,
            "timestamp": self.timestamp,
            "changes": self.changes,
            "metadata": self.metadata,
        }


class AuditLogger:
    """
    Handles audit logging for ideas operations.

    Stores audit entries in Cosmos DB for persistence and querying.
    """

    def __init__(
        self,
        audit_container: Optional[ContainerProxy] = None,
    ):
        """
        Initialize the audit logger.

        Args:
            audit_container: Cosmos DB container for audit entries.
                           If None, logs to application logger only.
        """
        self.audit_container = audit_container

    async def log(
        self,
        idea_id: str,
        action: AuditAction,
        user_id: str,
        changes: Optional[dict[str, Any]] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> AuditEntry:
        """
        Log an audit entry.

        Args:
            idea_id: ID of the idea being audited.
            action: The action performed.
            user_id: ID of the user performing the action.
            changes: Dictionary of field changes.
            metadata: Additional context information.

        Returns:
            The created audit entry.
        """
        entry = AuditEntry(
            audit_id=str(uuid.uuid4()),
            idea_id=idea_id,
            action=action,
            user_id=user_id,
            timestamp=int(time.time() * 1000),
            changes=changes or {},
            metadata=metadata or {},
        )

        # Log to application logger
        logger.info(
            f"AUDIT: {action.value} on idea {idea_id} by user {user_id}"
        )

        # Store in Cosmos DB if container is configured
        if self.audit_container:
            try:
                await self.audit_container.upsert_item(entry.to_cosmos_item())
            except Exception as e:
                logger.error(f"Failed to store audit entry: {e}")

        return entry

    async def log_create(
        self,
        idea_id: str,
        user_id: str,
        idea_data: dict[str, Any],
    ) -> AuditEntry:
        """Log idea creation."""
        return await self.log(
            idea_id=idea_id,
            action=AuditAction.CREATE,
            user_id=user_id,
            metadata={"title": idea_data.get("title", "")},
        )

    async def log_update(
        self,
        idea_id: str,
        user_id: str,
        old_values: dict[str, Any],
        new_values: dict[str, Any],
    ) -> AuditEntry:
        """Log idea update with field changes."""
        changes = {}
        for key in new_values:
            if key in old_values and old_values[key] != new_values[key]:
                changes[key] = {
                    "old": old_values[key],
                    "new": new_values[key],
                }

        return await self.log(
            idea_id=idea_id,
            action=AuditAction.UPDATE,
            user_id=user_id,
            changes=changes,
        )

    async def log_delete(
        self,
        idea_id: str,
        user_id: str,
        idea_title: str = "",
    ) -> AuditEntry:
        """Log idea deletion."""
        return await self.log(
            idea_id=idea_id,
            action=AuditAction.DELETE,
            user_id=user_id,
            metadata={"title": idea_title},
        )

    async def log_status_change(
        self,
        idea_id: str,
        user_id: str,
        old_status: str,
        new_status: str,
    ) -> AuditEntry:
        """Log status change."""
        return await self.log(
            idea_id=idea_id,
            action=AuditAction.STATUS_CHANGE,
            user_id=user_id,
            changes={"status": {"old": old_status, "new": new_status}},
        )

    async def log_score_update(
        self,
        idea_id: str,
        user_id: str,
        old_scores: dict[str, float],
        new_scores: dict[str, float],
    ) -> AuditEntry:
        """Log score modification."""
        changes = {}
        for key in new_scores:
            if key in old_scores and old_scores[key] != new_scores[key]:
                changes[key] = {
                    "old": old_scores[key],
                    "new": new_scores[key],
                }

        return await self.log(
            idea_id=idea_id,
            action=AuditAction.SCORE_UPDATE,
            user_id=user_id,
            changes=changes,
        )

    async def log_analysis_complete(
        self,
        idea_id: str,
        analysis_version: str,
    ) -> AuditEntry:
        """Log analysis completion."""
        return await self.log(
            idea_id=idea_id,
            action=AuditAction.ANALYSIS_COMPLETE,
            user_id="system",
            metadata={"analysisVersion": analysis_version},
        )

    async def get_audit_trail(
        self,
        idea_id: str,
        limit: int = 50,
    ) -> list[AuditEntry]:
        """
        Get audit trail for an idea.

        Args:
            idea_id: ID of the idea.
            limit: Maximum number of entries to return.

        Returns:
            List of audit entries, newest first.
        """
        if not self.audit_container:
            return []

        entries: list[AuditEntry] = []

        try:
            query = """
                SELECT * FROM c
                WHERE c.type = 'audit_entry'
                AND c.ideaId = @ideaId
                ORDER BY c.timestamp DESC
                OFFSET 0 LIMIT @limit
            """
            parameters = [
                {"name": "@ideaId", "value": idea_id},
                {"name": "@limit", "value": limit},
            ]

            async for item in self.audit_container.query_items(
                query=query,
                parameters=parameters,
            ):
                entries.append(AuditEntry.from_cosmos_item(item))

        except Exception as e:
            logger.error(f"Error fetching audit trail: {e}")

        return entries

    async def get_user_activity(
        self,
        user_id: str,
        limit: int = 50,
    ) -> list[AuditEntry]:
        """
        Get activity log for a user.

        Args:
            user_id: ID of the user.
            limit: Maximum number of entries to return.

        Returns:
            List of audit entries, newest first.
        """
        if not self.audit_container:
            return []

        entries: list[AuditEntry] = []

        try:
            query = """
                SELECT * FROM c
                WHERE c.type = 'audit_entry'
                AND c.userId = @userId
                ORDER BY c.timestamp DESC
                OFFSET 0 LIMIT @limit
            """
            parameters = [
                {"name": "@userId", "value": user_id},
                {"name": "@limit", "value": limit},
            ]

            async for item in self.audit_container.query_items(
                query=query,
                parameters=parameters,
            ):
                entries.append(AuditEntry.from_cosmos_item(item))

        except Exception as e:
            logger.error(f"Error fetching user activity: {e}")

        return entries

