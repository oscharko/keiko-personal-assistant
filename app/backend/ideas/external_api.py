"""
External API integration for the Ideas Hub module.

Provides API key authentication and webhook support for external system integration.
"""

import hashlib
import hmac
import logging
import secrets
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class WebhookEvent(str, Enum):
    """Types of webhook events."""

    IDEA_CREATED = "idea.created"
    IDEA_UPDATED = "idea.updated"
    IDEA_DELETED = "idea.deleted"
    STATUS_CHANGED = "status.changed"
    SCORE_UPDATED = "score.updated"
    ANALYSIS_COMPLETE = "analysis.complete"


@dataclass
class WebhookConfig:
    """Configuration for a webhook endpoint."""

    webhook_id: str
    url: str
    secret: str
    events: list[WebhookEvent]
    is_active: bool = True
    created_at: int = field(default_factory=lambda: int(time.time() * 1000))
    last_triggered: int | None = None
    failure_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "webhookId": self.webhook_id,
            "url": self.url,
            "secret": self.secret,
            "events": [e.value for e in self.events],
            "isActive": self.is_active,
            "createdAt": self.created_at,
            "lastTriggered": self.last_triggered,
            "failureCount": self.failure_count,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "WebhookConfig":
        """Create from dictionary."""
        return cls(
            webhook_id=data.get("webhookId", ""),
            url=data.get("url", ""),
            secret=data.get("secret", ""),
            events=[WebhookEvent(e) for e in data.get("events", [])],
            is_active=data.get("isActive", True),
            created_at=data.get("createdAt", int(time.time() * 1000)),
            last_triggered=data.get("lastTriggered"),
            failure_count=data.get("failureCount", 0),
        )


@dataclass
class ApiKey:
    """API key for external client authentication."""

    key_id: str
    key_hash: str
    name: str
    permissions: list[str]
    is_active: bool = True
    created_at: int = field(default_factory=lambda: int(time.time() * 1000))
    last_used: int | None = None
    expires_at: int | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "keyId": self.key_id,
            "keyHash": self.key_hash,
            "name": self.name,
            "permissions": self.permissions,
            "isActive": self.is_active,
            "createdAt": self.created_at,
            "lastUsed": self.last_used,
            "expiresAt": self.expires_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ApiKey":
        """Create from dictionary."""
        return cls(
            key_id=data.get("keyId", ""),
            key_hash=data.get("keyHash", ""),
            name=data.get("name", ""),
            permissions=data.get("permissions", []),
            is_active=data.get("isActive", True),
            created_at=data.get("createdAt", int(time.time() * 1000)),
            last_used=data.get("lastUsed"),
            expires_at=data.get("expiresAt"),
        )


class ExternalApiManager:
    """
    Manages external API integration including API keys and webhooks.

    Provides:
    - API key generation and validation
    - Webhook registration and triggering
    - Signature verification for secure communication
    """

    # Available permissions for API keys
    PERMISSIONS = [
        "ideas:read",
        "ideas:write",
        "ideas:delete",
        "webhooks:manage",
        "export:read",
    ]

    def __init__(self, config_container=None):
        """
        Initialize the external API manager.

        Args:
            config_container: Cosmos DB container for storing API keys and webhooks.
        """
        self.config_container = config_container
        self._api_keys: dict[str, ApiKey] = {}
        self._webhooks: dict[str, WebhookConfig] = {}

    @staticmethod
    def generate_api_key() -> tuple[str, str]:
        """
        Generate a new API key.

        Returns:
            Tuple of (raw_key, key_hash) - raw_key should be shown once to user.
        """
        raw_key = f"ideas_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        return raw_key, key_hash

    @staticmethod
    def hash_key(raw_key: str) -> str:
        """Hash an API key for storage/comparison."""
        return hashlib.sha256(raw_key.encode()).hexdigest()

    @staticmethod
    def generate_webhook_secret() -> str:
        """Generate a secret for webhook signature verification."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def sign_payload(payload: str, secret: str) -> str:
        """
        Create HMAC signature for webhook payload.

        Args:
            payload: JSON payload string.
            secret: Webhook secret.

        Returns:
            HMAC-SHA256 signature.
        """
        return hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()

    @staticmethod
    def verify_signature(payload: str, signature: str, secret: str) -> bool:
        """
        Verify webhook signature.

        Args:
            payload: JSON payload string.
            signature: Provided signature.
            secret: Webhook secret.

        Returns:
            True if signature is valid.
        """
        expected = ExternalApiManager.sign_payload(payload, secret)
        return hmac.compare_digest(expected, signature)

    async def create_api_key(
        self,
        name: str,
        permissions: list[str],
        expires_at: int | None = None,
    ) -> tuple[str, ApiKey]:
        """
        Create a new API key.

        Args:
            name: Descriptive name for the key.
            permissions: List of permission strings.
            expires_at: Optional expiration timestamp.

        Returns:
            Tuple of (raw_key, ApiKey) - raw_key shown once to user.
        """
        raw_key, key_hash = self.generate_api_key()
        key_id = secrets.token_urlsafe(8)

        api_key = ApiKey(
            key_id=key_id,
            key_hash=key_hash,
            name=name,
            permissions=[p for p in permissions if p in self.PERMISSIONS],
            expires_at=expires_at,
        )

        self._api_keys[key_id] = api_key

        if self.config_container:
            await self.config_container.upsert_item({
                "id": f"apikey_{key_id}",
                "type": "api_key",
                **api_key.to_dict(),
            })

        logger.info(f"Created API key: {key_id} ({name})")
        return raw_key, api_key

    async def validate_api_key(self, raw_key: str) -> ApiKey | None:
        """
        Validate an API key.

        Args:
            raw_key: The raw API key to validate.

        Returns:
            ApiKey if valid, None otherwise.
        """
        key_hash = self.hash_key(raw_key)

        # Check in-memory cache
        for api_key in self._api_keys.values():
            if api_key.key_hash == key_hash:
                if not api_key.is_active:
                    return None
                if api_key.expires_at and api_key.expires_at < int(time.time() * 1000):
                    return None
                # Update last used
                api_key.last_used = int(time.time() * 1000)
                return api_key

        # Check database
        if self.config_container:
            query = "SELECT * FROM c WHERE c.type = 'api_key' AND c.keyHash = @hash"
            items = self.config_container.query_items(
                query=query,
                parameters=[{"name": "@hash", "value": key_hash}],
            )
            async for item in items:
                api_key = ApiKey.from_dict(item)
                if not api_key.is_active:
                    return None
                if api_key.expires_at and api_key.expires_at < int(time.time() * 1000):
                    return None
                self._api_keys[api_key.key_id] = api_key
                return api_key

        return None

    def has_permission(self, api_key: ApiKey, permission: str) -> bool:
        """Check if API key has a specific permission."""
        return permission in api_key.permissions

    async def register_webhook(
        self,
        url: str,
        events: list[WebhookEvent],
    ) -> WebhookConfig:
        """
        Register a new webhook endpoint.

        Args:
            url: Webhook URL to call.
            events: List of events to subscribe to.

        Returns:
            WebhookConfig with generated secret.
        """
        webhook_id = secrets.token_urlsafe(8)
        secret = self.generate_webhook_secret()

        webhook = WebhookConfig(
            webhook_id=webhook_id,
            url=url,
            secret=secret,
            events=events,
        )

        self._webhooks[webhook_id] = webhook

        if self.config_container:
            await self.config_container.upsert_item({
                "id": f"webhook_{webhook_id}",
                "type": "webhook",
                **webhook.to_dict(),
            })

        logger.info(f"Registered webhook: {webhook_id} -> {url}")
        return webhook

    async def trigger_webhook(
        self,
        event: WebhookEvent,
        payload: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        Trigger webhooks for an event.

        Args:
            event: The event type.
            payload: Event payload data.

        Returns:
            List of results with webhook_id and success status.
        """
        import json

        results = []
        payload_str = json.dumps(payload)

        for webhook in self._webhooks.values():
            if not webhook.is_active:
                continue
            if event not in webhook.events:
                continue

            signature = self.sign_payload(payload_str, webhook.secret)

            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        webhook.url,
                        content=payload_str,
                        headers={
                            "Content-Type": "application/json",
                            "X-Webhook-Signature": signature,
                            "X-Webhook-Event": event.value,
                        },
                        timeout=10.0,
                    )

                success = response.status_code < 400
                webhook.last_triggered = int(time.time() * 1000)
                if not success:
                    webhook.failure_count += 1

                results.append({
                    "webhookId": webhook.webhook_id,
                    "success": success,
                    "statusCode": response.status_code,
                })

            except Exception as e:
                logger.error(f"Webhook {webhook.webhook_id} failed: {e}")
                webhook.failure_count += 1
                results.append({
                    "webhookId": webhook.webhook_id,
                    "success": False,
                    "error": str(e),
                })

        return results

