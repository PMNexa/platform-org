"""/api/v1/org-members - the members of every org the caller belongs to.
No create: a member joins by accepting an invitation (views/invitations.py)
or by creating the org. `role` is the only writable field.

- owner: changes anyone's role (including making someone owner), removes anyone;
- admin: changes and removes members and admins, never owners;
- member: can only leave (delete their own row).
An org always keeps an owner: the last one can't leave, be removed or be
demoted - make someone else owner first.
"""

from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated

from core_api.viewsets import BaseViewSet
from platform_org.membership import active_memberships, member_org_ids, owner_count, role_in
from platform_org.models import MANAGER_ROLES, OrgMembership, OrgRole
from platform_org.serializers import OrgMembershipSerializer

LAST_OWNER = "An organization needs an owner - make someone else owner first."


class OrgMembershipViewSet(BaseViewSet):
    queryset = OrgMembership.objects.all()
    serializer_class = OrgMembershipSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]
    # Explicit - see OrganizationViewSet's own comment on why.
    permission_classes = [IsAuthenticated]
    scope_field = "org_id"

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(id__in=active_memberships().values("id"), org_id__in=member_org_ids(self.request.user.id))
            .order_by("joined_at")
        )

    def _my_role(self, membership) -> str | None:
        return role_in(membership.org_id, self.request.user.id)

    @transaction.atomic
    def perform_update(self, serializer):
        target = serializer.instance
        new_role = serializer.validated_data.get("role", target.role)
        mine = self._my_role(target)
        if mine not in MANAGER_ROLES:
            raise PermissionDenied("Only an owner or admin can change members' roles.")
        if mine != OrgRole.OWNER and OrgRole.OWNER in (target.role, new_role):
            raise PermissionDenied("Only an owner can change who is an owner.")
        if target.role == OrgRole.OWNER and new_role != OrgRole.OWNER and owner_count(target.org_id) <= 1:
            raise ValidationError({"role": [LAST_OWNER]})
        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        if str(instance.user_id) != str(self.request.user.id):
            mine = self._my_role(instance)
            if mine not in MANAGER_ROLES:
                raise PermissionDenied("Only an owner or admin can remove members.")
            if mine != OrgRole.OWNER and instance.role == OrgRole.OWNER:
                raise PermissionDenied("Only an owner can remove an owner.")
        if instance.role == OrgRole.OWNER and owner_count(instance.org_id) <= 1:
            raise ValidationError({"role": [LAST_OWNER]})
        instance.delete()
