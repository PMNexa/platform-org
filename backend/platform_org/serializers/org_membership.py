from core_api.serializers import BaseSerializer

from platform_org.models import OrgMembership


class OrgMembershipSerializer(BaseSerializer):
    """Only ever reached today via `OrganizationSerializer.memberships`'
    sideload - no standalone endpoint yet. No `Meta.fields` - every model
    field is emitted, and the `org` forward relation is auto-added and
    auto-deferred by `BaseSerializer` itself (a membership fetched through
    its organization already knows which one it belongs to; only needed
    if this serializer ever gets its own endpoint).
    """

    class Meta:
        model = OrgMembership
        auto_exclude = ["created_at", "updated_at"]
