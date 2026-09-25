"""Who belongs to which org, and with what say - the lookups every view
here scopes by. Only ACTIVE memberships count."""

from platform_org.models import MANAGER_ROLES, OrgMembership, OrgMembershipStatus, OrgRole


def active_memberships():
    return OrgMembership.objects.filter(status=OrgMembershipStatus.ACTIVE)


def member_org_ids(user_id):
    return active_memberships().filter(user_id=user_id).values("org_id")


def managed_org_ids(user_id):
    return active_memberships().filter(user_id=user_id, role__in=MANAGER_ROLES).values("org_id")


def role_in(org_id, user_id) -> str | None:
    return active_memberships().filter(org_id=org_id, user_id=user_id).values_list("role", flat=True).first()


def owner_count(org_id) -> int:
    return active_memberships().filter(org_id=org_id, role=OrgRole.OWNER).count()
