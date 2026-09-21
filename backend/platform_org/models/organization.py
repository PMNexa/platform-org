from django.db import models

from core_api.utils import TimestampedModel, generate_uuid7


class Organization(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)

    class Meta:
        db_table = "organization"
