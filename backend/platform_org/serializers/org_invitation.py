from core_api.serializers import BaseSerializer
from platform_org.models import OrgInvitation


class OrgInvitationSerializer(BaseSerializer):
    """`/api/v1/org-invitations` - what an org's owners/admins see and
    create (the viewset only lists invitations of orgs they manage, so
    `token`, the accept link's secret, is theirs to share). `org` is
    resolved from the request body by the viewset, like `OrgMembership.org`
    on org create."""

    class Meta:
        model = OrgInvitation
        auto_exclude = ["created_at", "updated_at"]
        read_only_fields = ["token", "status", "invited_by", "expires_at", "responded_at"]
        display_field = "email"
