from core_api.serializers import BaseSerializer, DynamicRelationField

from platform_org.models import OrgMembership


def _organization_serializer():
    # Deferred import - see organization.py's own docstring on why this
    # can't be a module-level import (the two files reference each other).
    from platform_org.serializers.organization import OrganizationSerializer

    return OrganizationSerializer


class OrgMembershipSerializer(BaseSerializer):
    """Only ever reached today via `OrganizationSerializer.memberships`'
    sideload - no standalone endpoint yet. `org` is deferred since a
    membership fetched through its organization already knows which one
    it belongs to; only needed if this serializer ever gets its own
    endpoint.
    """

    org = DynamicRelationField(_organization_serializer)

    class Meta:
        model = OrgMembership
        fields = ["id", "org", "user_id", "status", "joined_at"]
        deferred_fields = ["org"]
