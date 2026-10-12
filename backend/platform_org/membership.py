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


def team_parents(org_id) -> dict:
    """`{team_id: parent_id}` for every team of `org_id`."""
    from platform_org.models import Team

    return dict(Team.objects.filter(org_id=org_id).values_list("id", "parent_id"))


def descendant_ids(parents: dict, team_id) -> set:
    """`team_id`'s sub-teams at any depth (not itself), from `team_parents`."""
    children: dict = {}
    for child, parent in parents.items():
        children.setdefault(parent, []).append(child)
    found, stack = set(), list(children.get(team_id, []))
    while stack:
        current = stack.pop()
        if current not in found:
            found.add(current)
            stack.extend(children.get(current, []))
    return found
