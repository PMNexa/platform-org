"""What happens to a user's org memberships when their account is deleted
(`core_api.system.user_removed`, sent by the host's account admin):

- with `transfer_to`: the new user takes their place in each org - added
  with the same role, or their own role raised to it if already a member;
- without: the memberships end. An org left with no owner promotes its
  longest-standing admin (else member) to owner; an org left with nobody
  at all is deleted.

Registered in apps.py."""

from django.utils import timezone

from platform_org.models import OrgMembership, OrgMembershipStatus, OrgRole, Organization, TeamMembership

RANK = {OrgRole.MEMBER: 0, OrgRole.ADMIN: 1, OrgRole.OWNER: 2}


def on_user_removed(sender, user_id, transfer_to=None, **kwargs):
    # Team places are personal - not handed on.
    TeamMembership.objects.filter(user_id=user_id).delete()
    memberships = list(OrgMembership.objects.filter(user_id=user_id))
    for membership in memberships:
        org_id = membership.org_id
        active = membership.status == OrgMembershipStatus.ACTIVE
        membership.delete()
        if transfer_to and active:
            existing = OrgMembership.objects.filter(org_id=org_id, user_id=transfer_to).first()
            if existing is None:
                OrgMembership.objects.create(
                    org_id=org_id, user_id=transfer_to, role=membership.role, status=OrgMembershipStatus.ACTIVE,
                    joined_at=timezone.now(),
                )
            else:
                if RANK.get(membership.role, 0) > RANK.get(existing.role, 0):
                    existing.role = membership.role
                existing.status = OrgMembershipStatus.ACTIVE
                existing.save(update_fields=["role", "status", "updated_at"])
        _keep_an_owner(org_id)


def _keep_an_owner(org_id):
    active = OrgMembership.objects.filter(org_id=org_id, status=OrgMembershipStatus.ACTIVE)
    if not active.exists():
        Organization.objects.filter(id=org_id).delete()
        return
    if active.filter(role=OrgRole.OWNER).exists():
        return
    heir = active.filter(role=OrgRole.ADMIN).order_by("joined_at").first() or active.order_by("joined_at").first()
    heir.role = OrgRole.OWNER
    heir.save(update_fields=["role", "updated_at"])


def org_limits(org_id: str) -> dict:
    """An org's own limit overrides (`Organization.limits`), for `core_api.system.org_limit`."""
    return Organization.objects.filter(id=org_id).values_list("limits", flat=True).first() or {}


def usage() -> list[dict]:
    from datetime import timedelta

    from platform_org.models import OrgInvitation, OrgInvitationStatus

    now = timezone.now()
    active = OrgMembership.objects.filter(status=OrgMembershipStatus.ACTIVE)
    return [
        {"label": "Organizations", "value": Organization.objects.count()},
        {"label": "Memberships", "value": active.count()},
        {"label": "New organizations, last 30 days",
         "value": Organization.objects.filter(created_at__gte=now - timedelta(days=30)).count()},
        {"label": "Pending invitations", "value": OrgInvitation.objects.filter(
            status=OrgInvitationStatus.PENDING, expires_at__gt=now).count()},
    ]


def export(user_id: str) -> dict:
    from platform_org.models import OrgInvitation

    return {
        "memberships": [
            {"org": m.org.name, "org_id": str(m.org_id), "role": m.role, "status": m.status, "joined_at": m.joined_at}
            for m in OrgMembership.objects.filter(user_id=user_id).select_related("org")
        ],
        "teams": [
            {"team": m.team.name, "team_id": str(m.team_id), "org_id": str(m.team.org_id), "role": m.role}
            for m in TeamMembership.objects.filter(user_id=user_id).select_related("team")
        ],
        "invitations_sent": [
            {"org": i.org.name, "email": i.email, "role": i.role, "status": i.status, "created_at": i.created_at}
            for i in OrgInvitation.objects.filter(invited_by=user_id).select_related("org")
        ],
    }
