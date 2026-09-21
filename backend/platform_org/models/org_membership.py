from django.db import models

from core_api.utils import TimestampedModel, generate_uuid7
from platform_org.models.organization import Organization


class OrgMembershipStatus(models.TextChoices):
    INVITED = "invited", "Invited"
    ACTIVE = "active", "Active"
    SUSPENDED = "suspended", "Suspended"


class OrgMembership(TimestampedModel):
    """`user_id` is a bare UUIDField, not a ForeignKey - this module shares
    nothing at the DB level with whatever module owns the actual User
    table (platform-auth). The value is trusted to be a real user id
    because it comes from `request.user.id`, resolved by whatever
    authentication class the running process is configured with (see
    authentication.py's own docstring) - not looked up or validated
    against a users table here.
    """

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    # related_name="memberships" - OrganizationSerializer's `memberships`
    # DynamicRelationField reads this reverse accessor by name when
    # sideloaded (see serializers/organization.py).
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, db_column="org_id", related_name="memberships")
    user_id = models.UUIDField()
    status = models.CharField(max_length=16, choices=OrgMembershipStatus.choices, default=OrgMembershipStatus.ACTIVE)
    joined_at = models.DateTimeField()

    class Meta:
        db_table = "org_membership"
        constraints = [
            models.UniqueConstraint(fields=["org", "user_id"], name="uq_org_membership_org_user"),
        ]
