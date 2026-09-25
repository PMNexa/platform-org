"""Invitations to join an org.

`/api/v1/org-invitations` (a BaseViewSet) is the org side: owners and
admins list, create and revoke (delete) the invitations of the orgs they
manage. The accept link they share carries the invitation's `token`.

`GET org-invitations/token/<token>/public` needs no sign-in: where an
invitation link lands first (platform-org-frontend's join page), it says
whether the invited email has an account yet, so the page sends the
invitee to sign up (`PLATFORM_ORG_SIGNUP_PAGE`, the host's signup page)
or to the invitation (log in first). Only the token's holder learns that.

The rest of the invitee side is plain views, scoped by the signed-in
user's email (directory.py's `email_of`), not by org:
- `GET  org-invitations/received` - open invitations sent to my email;
- `GET  org-invitations/token/<token>` - one invitation, for the accept page;
- `POST org-invitations/token/<token>/accept` | `/decline`.
Accepting needs the account's email to match the invitation's - the token
alone isn't enough, so a forwarded link can't be used by someone else.
"""

from datetime import UTC, datetime

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core_api.viewsets import BaseViewSet
from platform_org.directory import account_exists, email_of, lookup_users
from platform_org.membership import managed_org_ids, member_org_ids, role_in
from platform_org.models import (
    MANAGER_ROLES,
    OrgInvitation,
    OrgInvitationStatus,
    OrgMembership,
    OrgMembershipStatus,
    Organization,
    OrgRole,
)
from platform_org.serializers import OrgInvitationSerializer


class OrgInvitationViewSet(BaseViewSet):
    queryset = OrgInvitation.objects.all()
    serializer_class = OrgInvitationSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]
    search_fields = ["email"]
    # Explicit - see OrganizationViewSet's own comment on why.
    permission_classes = [IsAuthenticated]
    scope_field = "org_id"

    def get_queryset(self):
        return super().get_queryset().filter(org_id__in=managed_org_ids(self.request.user.id)).order_by("-created_at")

    def perform_create(self, serializer):
        org_id = self.request.data.get("org")
        if not org_id:
            raise ValidationError({"org": ["This field is required."]})
        org = get_object_or_404(Organization, id=org_id, id__in=member_org_ids(self.request.user.id))
        if role_in(org.id, self.request.user.id) not in MANAGER_ROLES:
            raise PermissionDenied("Only an owner or admin can invite members.")
        email = serializer.validated_data["email"].strip().lower()
        pending = OrgInvitation.objects.filter(
            org=org, email=email, status=OrgInvitationStatus.PENDING, expires_at__gt=timezone.now()
        )
        if pending.exists():
            raise ValidationError({"email": ["This email already has a pending invitation."]})
        serializer.save(org=org, email=email, invited_by=self.request.user.id)


def _describe(invitation: OrgInvitation, directory: dict) -> dict:
    inviter = directory.get(str(invitation.invited_by), {})
    return {
        "id": str(invitation.id),
        "token": invitation.token,
        "email": invitation.email,
        "role": invitation.role,
        "status": invitation.status,
        "expired": invitation.status == OrgInvitationStatus.PENDING and not invitation.is_open,
        "expires_at": invitation.expires_at,
        "org": {"id": str(invitation.org_id), "name": invitation.org.name},
        "invited_by": {"id": str(invitation.invited_by), "name": inviter.get("name"), "email": inviter.get("email")},
    }


class ReceivedInvitationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        email = email_of(request.user)
        if not email:
            return Response({"items": []})
        invitations = list(
            OrgInvitation.objects.select_related("org")
            .filter(email=email, status=OrgInvitationStatus.PENDING, expires_at__gt=timezone.now())
            .exclude(org_id__in=member_org_ids(request.user.id))
            .order_by("-created_at")
        )
        directory = lookup_users(invitation.invited_by for invitation in invitations)
        return Response({"items": [_describe(invitation, directory) for invitation in invitations]})


def _invitation(token: str) -> OrgInvitation:
    return get_object_or_404(OrgInvitation.objects.select_related("org"), token=token)


def _check_addressee(request, invitation: OrgInvitation) -> None:
    email = email_of(request.user)
    if email != invitation.email:
        raise PermissionDenied(
            f"This invitation was sent to {invitation.email}. Sign in with that email to respond to it."
        )
    if not invitation.is_open:
        raise ValidationError({"token": ["This invitation is no longer valid."]})


class InvitationByTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, token):
        invitation = _invitation(token)
        body = _describe(invitation, lookup_users([invitation.invited_by]))
        body["for_me"] = email_of(request.user) == invitation.email
        body["already_member"] = role_in(invitation.org_id, request.user.id) is not None
        return Response(body)


class PublicInvitationView(APIView):
    # No authentication at all: a stale or foreign bearer token must not
    # turn this into a 401.
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, token):
        invitation = _invitation(token)
        inviter = lookup_users([invitation.invited_by]).get(str(invitation.invited_by), {})
        return Response(
            {
                "email": invitation.email,
                "role": invitation.role,
                "open": invitation.is_open,
                "org": {"name": invitation.org.name},
                "invited_by": {"name": inviter.get("name")},
                "has_account": account_exists(invitation.email) if invitation.is_open else None,
                "signup_page": getattr(settings, "PLATFORM_ORG_SIGNUP_PAGE", None),
            }
        )


class AcceptInvitationView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, token):
        invitation = _invitation(token)
        _check_addressee(request, invitation)
        membership, created = OrgMembership.objects.get_or_create(
            org_id=invitation.org_id,
            user_id=request.user.id,
            defaults={"role": invitation.role, "joined_at": datetime.now(UTC)},
        )
        # An old non-active row (suspended, invited) is reactivated with the
        # invitation's role; an active member keeps the role they have.
        if not created and membership.status != OrgMembershipStatus.ACTIVE:
            membership.status = OrgMembershipStatus.ACTIVE
            membership.role = invitation.role
            membership.joined_at = datetime.now(UTC)
            membership.save(update_fields=["status", "role", "joined_at", "updated_at"])
        invitation.status = OrgInvitationStatus.ACCEPTED
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=["status", "responded_at", "updated_at"])
        return Response({"org": {"id": str(invitation.org_id), "name": invitation.org.name}, "role": membership.role})


class DeclineInvitationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        invitation = _invitation(token)
        _check_addressee(request, invitation)
        invitation.status = OrgInvitationStatus.DECLINED
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=["status", "responded_at", "updated_at"])
        return Response(status=204)
