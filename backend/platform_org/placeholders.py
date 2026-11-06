"""Placeholder people (models/team.py's `Placeholder`): someone in a team
with no account yet, later turned into one.

`convert` moves the placeholder's team places to the user (keeping the
higher role where the user is already in that team), tells other modules
(`core_api.system.person_converted`) so they move what they keep under the
placeholder's id, and deletes it. The user must be an active member of the
placeholder's org. `convert_by_email` does it for every placeholder of an
org with that email - called when someone accepts an invitation.
"""

from django.db import transaction

from core_api.system import person_converted
from platform_org.membership import active_memberships
from platform_org.models import Placeholder, TeamMembership, TeamRole


def placeholder_ids(ids) -> set[str]:
    """Which of `ids` are placeholders."""
    return {str(i) for i in Placeholder.objects.filter(id__in=list(ids)).values_list("id", flat=True)}


def lookup(ids) -> dict[str, dict]:
    """`{id: {"name", "email", "placeholder": True}}` for the placeholders among `ids`."""
    return {
        str(pid): {"name": name, "email": email or None, "placeholder": True}
        for pid, name, email in Placeholder.objects.filter(id__in=list(ids)).values_list("id", "name", "email")
    }


@transaction.atomic
def convert(placeholder: Placeholder, user_id) -> None:
    if not active_memberships().filter(org_id=placeholder.org_id, user_id=user_id).exists():
        raise ValueError("Only a member of the organization.")
    for row in TeamMembership.objects.filter(user_id=placeholder.id):
        existing = TeamMembership.objects.filter(team_id=row.team_id, user_id=user_id).first()
        if existing is None:
            TeamMembership.objects.filter(id=row.id).update(user_id=user_id)
            continue
        if row.role == TeamRole.LEAD and existing.role != TeamRole.LEAD:
            existing.role = TeamRole.LEAD
            existing.save(update_fields=["role", "updated_at"])
        row.delete()
    person_converted.send(
        sender=Placeholder, placeholder_id=str(placeholder.id), user_id=str(user_id), org_id=str(placeholder.org_id)
    )
    placeholder.delete()


def convert_by_email(org_id, email: str, user_id) -> int:
    email = (email or "").strip().lower()
    if not email:
        return 0
    found = list(Placeholder.objects.filter(org_id=org_id, email__iexact=email))
    for placeholder in found:
        convert(placeholder, user_id)
    return len(found)
