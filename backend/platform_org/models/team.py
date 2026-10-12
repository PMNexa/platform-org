from django.db import models

from core_api.utils import TimestampedModel, generate_uuid7
from platform_org.models.organization import Organization


class TeamRole(models.TextChoices):
    """A member's say within ONE team. A lead runs the team's numbers (in
    goalnexa: its targets, and planned targets for the teams under it); a
    member takes part. Who manages the team tree and its members is the
    org's owners and admins (`OrgRole`)."""

    LEAD = "lead", "Lead"
    MEMBER = "member", "Member"


class Team(TimestampedModel):
    """A team inside an org, in a tree of any depth - a department is just
    a team with sub-teams. Only the org's owners and admins change it
    (views/teams.py). Deleting one moves its sub-teams to its parent;
    other modules are told (`core_api.system.team_removed`) so what they
    file under it moves too, or is archived."""

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, db_column="org_id", related_name="teams")
    # SET_NULL, not CASCADE: the view re-parents sub-teams before deleting.
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, db_column="parent_id", related_name="sub_teams"
    )
    name = models.CharField(max_length=255)
    position = models.PositiveIntegerField(default=0, db_default=0)

    class Meta:
        db_table = "team"


class TeamMembership(TimestampedModel):
    """Someone in a team - always an active member of the team's org (a
    user may be in several teams). `user_id` is a bare id, same as
    `OrgMembership.user_id`."""

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, db_column="team_id", related_name="memberships")
    user_id = models.UUIDField()
    role = models.CharField(max_length=16, choices=TeamRole.choices, default=TeamRole.MEMBER, db_default=TeamRole.MEMBER)

    class Meta:
        db_table = "team_membership"
        verbose_name = "team member"
        constraints = [models.UniqueConstraint(fields=["team", "user_id"], name="uq_team_membership_team_user")]
