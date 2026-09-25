"""Who a user id is - this module has no User table (see
models/org_membership.py), so names and emails come from the host:
`PLATFORM_ORG_USER_DIRECTORY` names a callable taking a list of user ids
and returning `{str(id): {"name": ..., "email": ...}}` (ids it doesn't
know are left out). `apps/main` points it at platform-auth's users.

Unset, members show without a name or email, and an invitation can only
be accepted when `request.user` itself carries an `email` (a real User
does; platform-org's own standalone `ActorStub` doesn't).

`PLATFORM_ORG_ACCOUNT_EXISTS` names a callable taking an email and
returning whether an account uses it - so an invitation link can send
someone without one to sign up (`account_exists`, `None` when unset).
"""

from functools import lru_cache

from django.conf import settings
from django.utils.module_loading import import_string


@lru_cache(maxsize=None)
def _load(path: str):
    return import_string(path)


def lookup_users(user_ids) -> dict[str, dict]:
    path = getattr(settings, "PLATFORM_ORG_USER_DIRECTORY", None)
    ids = list({str(user_id) for user_id in user_ids})
    if not path or not ids:
        return {}
    return _load(path)(ids)


def email_of(user) -> str | None:
    """The signed-in user's email, lower-cased - from the user object when
    it has one, else from the directory."""
    email = getattr(user, "email", None) or lookup_users([user.id]).get(str(user.id), {}).get("email")
    return email.strip().lower() if email else None


def account_exists(email: str) -> bool | None:
    path = getattr(settings, "PLATFORM_ORG_ACCOUNT_EXISTS", None)
    return bool(_load(path)(email)) if path else None
