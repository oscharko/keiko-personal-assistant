# Beta Authentication Module
# Simple token-based authentication for beta testing phase
# Will be replaced with Azure AD authentication in production

import hashlib
import json
import logging
import os
import secrets
from datetime import datetime, timedelta
from typing import Any, Optional

import jwt
from quart import Request

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
    """

    def __init__(self, enabled: bool = False):
        self.enabled = enabled
        self.secret_key = os.getenv("BETA_AUTH_SECRET_KEY", secrets.token_urlsafe(32))
        self.token_expiry_hours = int(os.getenv("BETA_AUTH_TOKEN_EXPIRY_HOURS", "24"))

        # Load beta users from environment variable
        # Format: {"username1": "password1", "username2": "password2"}
        self.users: dict[str, str] = {}
        if enabled:
            users_json = os.getenv("BETA_AUTH_USERS", "{}")
            try:
                self.users = json.loads(users_json)
                logger.info(f"Beta auth enabled with {len(self.users)} test users")
            except json.JSONDecodeError:
                logger.error("Failed to parse BETA_AUTH_USERS environment variable")
                self.users = {}

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
        """Generate JWT token for authenticated user"""
        expiry = datetime.utcnow() + timedelta(hours=self.token_expiry_hours)
        payload = {
            "sub": username,
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

        # Return claims in format compatible with Azure AD auth
        return {
            "oid": payload.get("sub"),  # User ID
            "preferred_username": payload.get("sub"),  # Username
            "name": payload.get("sub"),  # Display name
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

