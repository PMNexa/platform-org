"""GET/POST /api/v1/orgs.

Both actions are scoped to the calling actor: GET lists only orgs they
have a membership in, POST creates a new org and makes them its first
(active) member. No roles/permissions yet - every member is equal for
now, see AGENTS.md for why that's a deliberate, separate follow-up.
"""

from datetime import UTC, datetime

from django.utils.text import slugify
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from platform_org.models import OrgMembership, Organization
from platform_org.serializers import CreateOrganizationSerializer, OrganizationSerializer


def _unique_slug(name: str) -> str:
    base = slugify(name) or "org"
    slug = base
    suffix = 1
    while Organization.objects.filter(slug=slug).exists():
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


class OrganizationsView(APIView):
    # Explicit, not relying on the process's DEFAULT_PERMISSION_CLASSES -
    # this module's own standalone settings set that globally, but a host
    # importing this app (e.g. apps/main) may set it to something else
    # (or nothing) for ITS OWN reasons (platform-auth's login/signup need
    # to stay public, so main can't just default every view to
    # IsAuthenticated). Declaring it here makes this view correct
    # regardless of the host's global default.
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org_ids = OrgMembership.objects.filter(user_id=request.user.id).values_list("org_id", flat=True)
        orgs = Organization.objects.filter(id__in=org_ids).order_by("name")
        return Response({"items": [OrganizationSerializer(org).data for org in orgs]})

    def post(self, request):
        serializer = CreateOrganizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = serializer.validated_data["name"]

        org = Organization.objects.create(name=name, slug=_unique_slug(name))
        OrgMembership.objects.create(org=org, user_id=request.user.id, joined_at=datetime.now(UTC))

        return Response(OrganizationSerializer(org).data, status=201)
