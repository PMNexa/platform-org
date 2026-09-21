"""Bearer-JWT DRF authentication - decodes a token issued by any module
sharing the same JWT_SECRET (e.g. platform-auth) WITHOUT looking up a
User row anywhere - this module has no User table of its own (see
models/org_membership.py's own docstring on "share nothing at the DB
level"). Resolves to a lightweight actor stub exposing only `.id` (the
JWT's `sub` claim), which is all this module's views need.

When platform_org is imported into a host app that ALSO has
platform_auth installed (e.g. apps/main), the host's own
DEFAULT_AUTHENTICATION_CLASSES (platform_auth's ActorAuthentication,
which resolves a real User row) takes over instead - this class is only
exercised when platform_org runs standalone. Either way, this module's
views only ever read `request.user.id`, so which one resolved it is
invisible to them.
"""

from dataclasses import dataclass

import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication

from core_api.errors import Unauthorized


@dataclass
class ActorStub:
    """`is_authenticated` is a fixed `True` (not derived) - DRF's own
    `IsAuthenticated` permission class checks this attribute directly on
    whatever `request.user` is, and this stub is only ever constructed
    after a JWT has already verified successfully.
    """

    id: str
    is_authenticated: bool = True


class JWTBearerAuthentication(BaseAuthentication):
    def authenticate(self, request):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return None

        token = header[len("Bearer "):].strip()
        if not token:
            return None

        try:
            claims = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        except jwt.PyJWTError:
            raise Unauthorized() from None

        actor_id = claims.get("sub")
        if not actor_id:
            raise Unauthorized()

        return (ActorStub(id=actor_id), None)

    def authenticate_header(self, request):
        return "Bearer"
