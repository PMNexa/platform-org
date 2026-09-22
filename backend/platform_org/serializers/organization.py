from core_api.serializers import BaseSerializer

from platform_org.models import Organization


class OrganizationSerializer(BaseSerializer):
    """`slug` is read-only - it's derived from `name` server-side
    (views/organizations.py's `_unique_slug`), never something the caller
    picks. No `Meta.fields` - every model field is emitted, and the
    `memberships` reverse relation (`OrgMembership.org`'s `related_name`)
    is auto-added and auto-deferred by `BaseSerializer` itself (it finds
    `OrgMembershipSerializer` via the model registry, no import needed
    here); pass `?include[]=memberships` to sideload the full
    `OrgMembership` rows instead of leaving the field off.
    """

    class Meta:
        model = Organization
        extra_kwargs = {"slug": {"read_only": True}}
        auto_exclude = ["created_at", "updated_at"]
