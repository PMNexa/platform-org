import django.db.models.deletion
from django.db import migrations, models

import core_api.utils


class Migration(migrations.Migration):

    dependencies = [
        ("platform_org", "0006_org_timezone"),
    ]

    operations = [
        migrations.CreateModel(
            name="Placeholder",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=core_api.utils.generate_uuid7, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255)),
                ("email", models.EmailField(blank=True, db_default="", default="", max_length=254)),
                (
                    "org",
                    models.ForeignKey(
                        db_column="org_id", on_delete=django.db.models.deletion.CASCADE,
                        related_name="placeholders", to="platform_org.organization",
                    ),
                ),
            ],
            options={"db_table": "placeholder"},
        ),
    ]
