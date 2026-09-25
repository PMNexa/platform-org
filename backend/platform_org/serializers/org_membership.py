from rest_framework import serializers

from core_api.serializers import BaseSerializer
from platform_org.directory import lookup_users
from platform_org.models import OrgMembership


def _directory(serializer, user_ids) -> dict[str, dict]:
    """Directory entries cached in the serializer context, which every row
    of a response shares (sideloaded lists too) - a list looks up all its
    rows' users at once, and only ids not seen yet are looked up."""
    cache = serializer.context.setdefault("_org_user_directory", {"known": {}, "asked": set()})
    missing = {str(user_id) for user_id in user_ids} - cache["asked"]
    if missing:
        cache["known"].update(lookup_users(missing))
        cache["asked"] |= missing
    return cache["known"]


class _MemberListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        rows = list(data.all() if hasattr(data, "all") else data)
        _directory(self.child, [row.user_id for row in rows])
        return super().to_representation(rows)


class OrgMembershipSerializer(BaseSerializer):
    """`/api/v1/org-members` - an org's members. Rows are created by
    accepting an invitation (or creating the org), never POSTed; only
    `role` is writable, and who may change it is the viewset's call
    (views/members.py). `name`/`email` come from the host's user
    directory (directory.py), looked up once per response; `is_me` marks
    the caller's own row."""

    name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = OrgMembership
        auto_exclude = ["created_at", "updated_at"]
        read_only_fields = ["user_id", "status", "joined_at"]
        list_serializer_class = _MemberListSerializer
        display_field = "name"

    def _user(self, obj) -> dict:
        return _directory(self, [obj.user_id]).get(str(obj.user_id), {})

    def get_name(self, obj) -> str | None:
        return self._user(obj).get("name")

    def get_email(self, obj) -> str | None:
        return self._user(obj).get("email")

    def get_is_me(self, obj) -> bool:
        request = self.context.get("request")
        return request is not None and str(obj.user_id) == str(getattr(request.user, "id", None))
