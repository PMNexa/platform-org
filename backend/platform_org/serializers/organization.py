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
        extra_kwargs = {"slug": {"read_only": True}}
        auto_exclude = ["created_at", "updated_at", "memberships", "invitations"]
