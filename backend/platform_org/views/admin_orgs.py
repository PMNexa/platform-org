"""`/api/v1/all-orgs` - every organization, for the system admin (RBAC
`all-orgs.*`; members don't get it). Lists them with member and
invitation counts; renames one or sets its `limits` (`{"max_members",
"max_goals"}` - integers, 0 = unlimited, missing = the system setting);
and:

- `GET  all-orgs/<id>/members` - its members, with names and emails.
- `POST all-orgs/<id>/transfer-owner` `{user_id}` - makes that user the
  owner (added as a member if they aren't one); current owners become
  admins.
- `DELETE all-orgs/<id>` - deletes it and everything filed under it in
  other modules (`core_api.system.org_removed`).
"""

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core_api.serializers import BaseSerializer
from core_api.system import audit, org_removed
from core_api.viewsets import BaseViewSet
from platform_org.directory import lookup_users
from platform_org.membership import active_memberships
from platform_org.models import AdminOrganization, OrgInvitationStatus, OrgMembership, OrgMembershipStatus, OrgRole

LIMIT_KEYS = ("max_members", "max_goals")


class AdminOrganizationSerializer(BaseSerializer):
    member_count = serializers.IntegerField(read_only=True, default=0)
    pending_invitations = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = AdminOrganization
        fields = ["id", "name", "slug", "member_count", "pending_invitations", "limits", "created_at"]
        read_only_fields = ["slug", "created_at"]

    def validate_limits(self, value):
        if not isinstance(value, dict) or set(value) - set(LIMIT_KEYS):
            raise serializers.ValidationError(f"An object with any of: {', '.join(LIMIT_KEYS)}.")
        for key, limit in value.items():
            if not isinstance(limit, int) or isinstance(limit, bool) or limit < 0:
                raise serializers.ValidationError(f"{key}: a whole number, 0 for unlimited.")
        return value


class AdminOrganizationViewSet(BaseViewSet):
    queryset = AdminOrganization.objects.all()
    serializer_class = AdminOrganizationSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    search_fields = ["name", "slug"]
    permission_classes = [IsAuthenticated]
    mcp_enabled = False

    def get_queryset(self):
        now = timezone.now()
        return (
            super()
            .get_queryset()
            .annotate(
                member_count=Count("memberships", filter=Q(memberships__status=OrgMembershipStatus.ACTIVE), distinct=True),
                pending_invitations=Count(
                    "invitations",
                    filter=Q(invitations__status=OrgInvitationStatus.PENDING, invitations__expires_at__gt=now),
                    distinct=True,
                ),
            )
            .order_by("name")
        )

    def create(self, request, *args, **kwargs):
        raise ValidationError({"name": ["Organizations are created by their members."]})

    def _capabilities(self, request) -> dict:
        return {**super()._capabilities(request), "create": False}

    def perform_update(self, serializer):
        before = {"name": serializer.instance.name, "limits": serializer.instance.limits}
        org = serializer.save()
        audit("org.updated", request=self.request, target_type="organization", target_id=org.id,
              target_label=org.name, before=before, after={"name": org.name, "limits": org.limits})

    def perform_destroy(self, instance):
        with transaction.atomic():
            org_removed.send(sender=AdminOrganization, org_id=str(instance.id))
            audit("org.deleted", request=self.request, target_type="organization", target_id=instance.id,
                  target_label=instance.name)
            instance.delete()

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        org = self.get_object()
        rows = list(OrgMembership.objects.filter(org=org).order_by("joined_at"))
        people = lookup_users([m.user_id for m in rows])
        return Response([
            {
                "user_id": str(m.user_id),
                "name": people.get(str(m.user_id), {}).get("name"),
                "email": people.get(str(m.user_id), {}).get("email"),
                "role": m.role,
                "status": m.status,
                "joined_at": m.joined_at,
            }
            for m in rows
        ])

    @action(detail=True, methods=["post"], url_path="transfer-owner")
    def transfer_owner(self, request, pk=None):
        org = self.get_object()
        user_id = str(request.data.get("user_id") or "")
        if not user_id or not lookup_users([user_id]):
            raise ValidationError({"user_id": ["Pick an existing user."]})
        with transaction.atomic():
            active_memberships().filter(org=org, role=OrgRole.OWNER).exclude(user_id=user_id).update(role=OrgRole.ADMIN)
            membership = OrgMembership.objects.filter(org=org, user_id=user_id).first()
            if membership is None:
                OrgMembership.objects.create(org=org, user_id=user_id, role=OrgRole.OWNER,
                                             status=OrgMembershipStatus.ACTIVE, joined_at=timezone.now())
            else:
                membership.role = OrgRole.OWNER
                membership.status = OrgMembershipStatus.ACTIVE
                membership.save(update_fields=["role", "status", "updated_at"])
        audit("org.owner_transferred", request=request, target_type="organization", target_id=org.id,
              target_label=org.name, new_owner=user_id)
        return Response({"ok": True})
