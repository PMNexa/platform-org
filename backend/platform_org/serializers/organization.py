from core_api.serializers import BaseSerializer, DynamicRelationField

from platform_org.models import Organization


def _org_membership_serializer():
    # Deferred import, not a module-level one - org_membership.py imports
    # OrganizationSerializer back (see its own docstring), and this only
    # actually runs at render time (well after both modules have finished
    # loading), not during Python's initial import pass. A module-level
    # import here would deadlock: whichever of these two files loads
    # first would find the other only partially initialized.
    from platform_org.serializers.org_membership import OrgMembershipSerializer

    return OrgMembershipSerializer


class OrganizationSerializer(BaseSerializer):
    """`slug` is read-only - it's derived from `name` server-side
    (views/organizations.py's `_unique_slug`), never something the caller
    picks. `memberships` is deferred by default (a plain list/retrieve
    stays a single-table query); pass `?include[]=memberships` to sideload
    the full `OrgMembership` rows instead of leaving the field off.
    """

    memberships = DynamicRelationField(_org_membership_serializer, many=True)

    class Meta:
        model = Organization
        fields = ["id", "name", "slug", "memberships"]
        deferred_fields = ["memberships"]
        extra_kwargs = {"slug": {"read_only": True}}
