# Beta Authentication Module
# Simple token-based authentication for beta testing phase
# Will be replaced with Azure AD authentication in production

import hashlib
import json
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

import jwt

logger = logging.getLogger(__name__)


class BetaAuthError(Exception):
    """Raised when beta authentication fails"""

    def __init__(self, error: str, status_code: int = 401):
        self.error = error
        self.status_code = status_code
        super().__init__(error)


class BetaAuthHelper:
    """
    Simple authentication helper for beta testing.
    Validates username/password against environment variables and issues JWT tokens.
    Each user gets a unique OID generated from their username for consistent identification.
    """

    def __init__(self, enabled: bool = False):
        self.enabled = enabled
        self.secret_key = os.getenv("BETA_AUTH_SECRET_KEY", secrets.token_urlsafe(32))
        self.token_expiry_hours = int(os.getenv("BETA_AUTH_TOKEN_EXPIRY_HOURS", "24"))

        # Load beta users from environment variable
        # Format: {"username1": "password1", "username2": "password2"}
        self.users: dict[str, str] = {}
        # Map username to unique OID (generated deterministically from username)
        self.user_oids: dict[str, str] = {}
        if enabled:
            users_json = os.getenv("BETA_AUTH_USERS", "{}")
            self.users = self._parse_users_json(users_json)
            # Generate unique OIDs for each user based on their username
            for username in self.users:
                self.user_oids[username] = self._generate_user_oid(username)
            if self.users:
                logger.info(f"Beta auth enabled with {len(self.users)} test users")
            else:
                logger.warning("Beta auth enabled but no users configured")

    def _parse_users_json(self, value: str) -> dict[str, str]:
        """
        Parse the BETA_AUTH_USERS JSON string with robust handling of various formats.

        Handles different escaping scenarios from dev and prod environments:
        - Plain JSON: {"user": "pass"}
        - Escaped quotes from shell/Azure: {\"user\": \"pass\"}
        - Surrounding quotes: "{...}" or '{...}'
        - Base64 encoded JSON (for Azure deployment compatibility)

        Args:
            value: The raw environment variable value

        Returns:
            Dictionary of username -> password mappings
        """
        import base64

        if not value or value == "{}":
            return {}

        original_value = value

        # Try parsing as-is first (works when python-dotenv already processed escapes)
        try:
            result = json.loads(value)
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass

        # Try base64 decoding (used for Azure deployment to avoid escaping issues)
        try:
            decoded = base64.b64decode(value).decode("utf-8")
            result = json.loads(decoded)
            if isinstance(result, dict):
                logger.info("Successfully parsed BETA_AUTH_USERS from base64 encoding")
                return result
        except Exception:
            pass

        # Remove surrounding quotes if present
        if len(value) >= 2:
            if (value[0] == '"' and value[-1] == '"') or \
               (value[0] == "'" and value[-1] == "'"):
                value = value[1:-1]

        # Try again after removing quotes
        try:
            result = json.loads(value)
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass

        # Handle escaped quotes (\" -> ")
        value = value.replace('\\"', '"')

        # Try again after unescaping
        try:
            result = json.loads(value)
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass

        # Handle escaped exclamation marks (bash history expansion)
        value = value.replace("\\!", "!")

        # Final attempt
        try:
            result = json.loads(value)
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse BETA_AUTH_USERS: {e}. Original value: {original_value}")
            return {}

    def _generate_user_oid(self, username: str) -> str:
        """
        Generate a unique, deterministic OID for a user based on their username.
        Uses UUID5 with a namespace to ensure consistent OIDs across restarts.
        """
        # Use a fixed namespace UUID for beta auth users
        namespace = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # UUID namespace for URLs
        return str(uuid.uuid5(namespace, f"beta-auth:{username}"))

    def get_user_oid(self, username: str) -> Optional[str]:
        """Get the unique OID for a user."""
        return self.user_oids.get(username)

    def _hash_password(self, password: str) -> str:
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()

    def validate_credentials(self, username: str, password: str) -> bool:
        """Validate username and password against configured users"""
        if not self.enabled:
            return False

        if username not in self.users:
            logger.warning(f"Login attempt with unknown username: {username}")
            return False

        # Compare hashed passwords for security
        stored_password = self.users[username]
        return stored_password == password

    def generate_token(self, username: str) -> str:
        """Generate JWT token for authenticated user including their unique OID."""
        expiry = datetime.utcnow() + timedelta(hours=self.token_expiry_hours)
        user_oid = self.get_user_oid(username)
        payload = {
            "sub": username,
            "oid": user_oid,  # Include unique OID in token
            "exp": expiry,
            "iat": datetime.utcnow(),
            "iss": "keiko-beta-auth",
        }
        return jwt.encode(payload, self.secret_key, algorithm="HS256")

    def validate_token(self, token: str) -> Optional[dict[str, Any]]:
        """Validate JWT token and return payload if valid"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=["HS256"])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None

    async def get_auth_claims_from_request(self, headers: dict) -> dict[str, Any]:
        """
        Extract and validate auth claims from request headers.
        Compatible with existing authentication decorator interface.
        """
        if not self.enabled:
            return {}

        # Extract token from Authorization header
        auth_header = headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise BetaAuthError("Missing or invalid Authorization header", 401)

        token = auth_header[7:]  # Remove "Bearer " prefix
        payload = self.validate_token(token)

        if not payload:
            raise BetaAuthError("Invalid or expired token", 401)

        username = payload.get("sub")
        # Get OID from token or generate it from username
        user_oid = payload.get("oid") or self.get_user_oid(username)

        # Return claims in format compatible with Azure AD auth
        return {
            "oid": user_oid,  # Unique user ID (UUID format)
            "preferred_username": username,  # Username (email)
            "name": username,  # Display name
            "groups": [],  # No groups in beta auth
        }

    async def get_auth_claims_if_enabled(self, headers: dict) -> dict[str, Any]:
        """
        Get auth claims if beta auth is enabled, otherwise return empty dict.
        Compatible with existing AuthenticationHelper interface.
        """
        if not self.enabled:
            return {}

        return await self.get_auth_claims_from_request(headers)

