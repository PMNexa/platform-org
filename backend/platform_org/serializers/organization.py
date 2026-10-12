from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from rest_framework import serializers

from core_api.serializers import BaseSerializer

from platform_org.models import Organization, OrgRole


class OrganizationSerializer(BaseSerializer):
    """`slug` is read-only - it's derived from `name` server-side
    (views/organizations.py's `_unique_slug`), never something the caller
    picks. No `Meta.fields` - every model field is emitted.

    `my_role` is the caller's own role in the org (`OrgRole`), annotated
    by the viewset. The `memberships`/`invitations` reverse relations are
    left off: members and invitations have their own endpoints
    (`org-members`, `org-invitations` - only owners/admins see an org's
    invitations), and platform-org-frontend's org page shows them in its
    own panel rather than as generic relation tabs.
    """

    my_role = serializers.ChoiceField(choices=OrgRole.choices, read_only=True, default=None)

    class Meta:
        model = Organization
        extra_kwargs = {
            "name": {"help_text": "The name of your team or company. Its members share the organization's goals."},
            "slug": {"read_only": True, "help_text": "A short name for web addresses. Made from the name for you."},
            "timezone": {
                "label": "Time zone",
                "help_text": "Where the organization's day starts, e.g. Asia/Ho_Chi_Minh or Europe/Berlin - daily and weekly targets count in it. Empty = UTC.",
            },
        }
        # `limits` is the system admin's (all-orgs), not the org's own.
        auto_exclude = ["created_at", "updated_at", "memberships", "invitations", "limits"]

    def validate_timezone(self, value: str) -> str:
        value = (value or "").strip()
        if value:
            try:
                ZoneInfo(value)
            except (ZoneInfoNotFoundError, ValueError):
                raise serializers.ValidationError("Not a time zone - use a name like Asia/Ho_Chi_Minh.") from None
        return value
