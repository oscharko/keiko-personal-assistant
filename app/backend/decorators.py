import logging
from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar, cast

from quart import abort, current_app, request

from config import CONFIG_AUTH_CLIENT, CONFIG_SEARCH_CLIENT
from core.authentication import AuthError
from core.beta_auth import BetaAuthError
from error import error_response


def authenticated_path(route_fn: Callable[[str, dict[str, Any]], Any]):
    """
    Decorator for routes that request a specific file that might require access control enforcement.
    Supports both Beta Auth and Azure AD authentication.
    """

    @wraps(route_fn)
    async def auth_handler(path=""):
        # Check beta auth first
        beta_auth = current_app.config.get("BETA_AUTH_HELPER")
        if beta_auth and beta_auth.enabled:
            try:
                auth_claims = await beta_auth.get_auth_claims_if_enabled(request.headers)
                # For beta auth, we allow access if the user is authenticated
                # No Azure Search RBAC enforcement in beta mode since we don't have Azure AD tokens
                return await route_fn(path, auth_claims)
            except BetaAuthError as e:
                abort(e.status_code)
            except AuthError:
                abort(403)

        # Fall back to Azure AD auth
        auth_helper = current_app.config[CONFIG_AUTH_CLIENT]
        search_client = current_app.config[CONFIG_SEARCH_CLIENT]
        authorized = False
        try:
            auth_claims = await auth_helper.get_auth_claims_if_enabled(request.headers)
            authorized = await auth_helper.check_path_auth(path, auth_claims, search_client)
        except AuthError:
            abort(403)
        except Exception as error:
            logging.exception("Problem checking path auth %s", error)
            return error_response(error, route="/content")

        if not authorized:
            abort(403)

        return await route_fn(path, auth_claims)

    return auth_handler


_C = TypeVar("_C", bound=Callable[..., Any])


def authenticated(route_fn: _C) -> _C:
    """
    Decorator for routes that might require access control. Unpacks Authorization header information into an auth_claims dictionary
    """

    @wraps(route_fn)
    async def auth_handler(*args, **kwargs):
        # Check beta auth first
        beta_auth = current_app.config.get("BETA_AUTH_HELPER")
        if beta_auth and beta_auth.enabled:
            try:
                auth_claims = await beta_auth.get_auth_claims_if_enabled(request.headers)
                return await route_fn(auth_claims, *args, **kwargs)
            except BetaAuthError as e:
                abort(e.status_code)
            except AuthError:
                abort(403)

        # Fall back to Azure AD auth
        auth_helper = current_app.config[CONFIG_AUTH_CLIENT]
        try:
            auth_claims = await auth_helper.get_auth_claims_if_enabled(request.headers)
        except AuthError:
            abort(403)

        return await route_fn(auth_claims, *args, **kwargs)

    return cast(_C, auth_handler)
