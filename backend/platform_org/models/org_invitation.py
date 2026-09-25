import secrets
from datetime import timedelta

from django.db import models
from django.utils import timezone

from core_api.utils import TimestampedModel, generate_uuid7
from platform_org.models.org_membership import OrgRole
from platform_org.models.organization import Organization

INVITATION_TTL = timedelta(days=14)


class OrgInvitationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"


def _new_token() -> str:
    return secrets.token_urlsafe(32)


def _default_expiry():
    return timezone.now() + INVITATION_TTL


class OrgInvitation(TimestampedModel):
    """An invitation to join `org` as `role`, addressed to an email - this
    module knows no users by email, so it's only ever accepted by a
    signed-in user whose account email matches (see
    views/invitations.py and directory.py). `token` is the secret in the
    accept link an org manager shares; knowing it isn't enough on its
    own, the email must match too. Revoking one deletes it."""

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, db_column="org_id", related_name="invitations")
    email = models.EmailField()
    role = models.CharField(
        max_length=16, choices=[(OrgRole.ADMIN, "Admin"), (OrgRole.MEMBER, "Member")], default=OrgRole.MEMBER
    )
    token = models.CharField(max_length=64, unique=True, default=_new_token, editable=False)
    status = models.CharField(max_length=16, choices=OrgInvitationStatus.choices, default=OrgInvitationStatus.PENDING)
    invited_by = models.UUIDField()
    expires_at = models.DateTimeField(default=_default_expiry)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "org_invitation"
        verbose_name = "invitation"

    @property
    def is_open(self) -> bool:
        return self.status == OrgInvitationStatus.PENDING and self.expires_at > timezone.now()
