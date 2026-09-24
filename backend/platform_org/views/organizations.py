"""/api/v1/orgs - a real BaseViewSet (see core_api.viewsets), replacing
what used to be a hand-rolled APIView with its own GET/POST methods.
Supports the standard ModelViewSet actions (list/create/retrieve/update/
destroy) plus everything BaseViewSet wires in for free: `?sort=`, `?q=`,
`?filter{field}=value`, and (via OrganizationSerializer) `?include[]=
memberships` to sideload each org's memberships instead of leaving that
field off.

Both list and create stay scoped to the calling actor, same as before:
`get_queryset` only returns orgs they're a member of, `perform_create`
makes them the new org's first (active) member.
"""

from datetime import UTC, datetime

from django.utils.text import slugify
from rest_framework.permissions import IsAuthenticated

from core_api.viewsets import BaseViewSet
from platform_org.models import OrgMembership, Organization
from platform_org.serializers import OrganizationSerializer


def _unique_slug(name: str) -> str:
    base = slugify(name) or "org"
    slug = base
    suffix = 1
    while Organization.objects.filter(slug=slug).exists():
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


class OrganizationViewSet(BaseViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    # `QParamSearchFilter` (DRF's own `SearchFilter` under the `?q=` name
    # - see core_api.filters) silently no-ops without this: it's a real
    # DRF requirement, not something `BaseViewSet` can default sensibly
    # per-module. Missing it isn't an error anywhere - `?q=` just filters
    # nothing, which looks exactly like "the frontend's search box is
    # broken" instead of a one-line gap here.
    search_fields = ["name"]
    # Explicit, not relying on the process's DEFAULT_PERMISSION_CLASSES -
    # this module's own standalone settings set that globally, but a host
    # importing this app (e.g. apps/main) may set it to something else
    # (or nothing) for ITS OWN reasons (platform-auth's login/signup need
    # to stay public, so main can't just default every view to
    # IsAuthenticated). Declaring it here makes this view correct
    # regardless of the host's global default.
    permission_classes = [IsAuthenticated]
    # Access scope (core_api/access.py): an org is its own scope - a role
    # held within an org applies to that org's row.
    scope_field = "id"

    def get_queryset(self):
        org_ids = OrgMembership.objects.filter(user_id=self.request.user.id).values_list("org_id", flat=True)
        return super().get_queryset().filter(id__in=org_ids).order_by("name")

    def perform_create(self, serializer):
        name = serializer.validated_data["name"]
        org = serializer.save(slug=_unique_slug(name))
        OrgMembership.objects.create(org=org, user_id=self.request.user.id, joined_at=datetime.now(UTC))
