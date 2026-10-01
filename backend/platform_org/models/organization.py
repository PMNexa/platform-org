from django.db import models

from core_api.utils import TimestampedModel, generate_uuid7


class Organization(TimestampedModel):
    """`limits` overrides the instance-wide limits for this org - e.g. a
    hosted plan's (`{"max_members": 25, "max_goals": 100}`; a missing key
    means the system setting `limits.<key>`, 0 means unlimited). Set by an
    admin (`AdminOrganizationViewSet`), read through
    `core_api.system.org_limit`."""

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    limits = models.JSONField(default=dict, blank=True, db_default={})

    class Meta:
        db_table = "organization"


class AdminOrganization(Organization):
    """Every organization, as the system admin sees them
    (`/api/v1/all-orgs`) - a proxy, so it's its own RBAC resource
    (`all-orgs.*`, admins only) rather than members' `orgs.*`."""

    class Meta:
        proxy = True
        verbose_name = "organization"
        verbose_name_plural = "all organizations"
