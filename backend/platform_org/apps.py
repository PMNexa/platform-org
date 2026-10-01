from django.apps import AppConfig


class PlatformOrgConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'platform_org'

    def ready(self):
        from core_api.system import (
            INT,
            SettingDef,
            UsageProvider,
            register_export_provider,
            register_org_limits_source,
            register_setting,
            register_usage_provider,
            user_removed,
        )
        from platform_org.accounts import export, on_user_removed, org_limits, usage

        user_removed.connect(on_user_removed, dispatch_uid="platform_org.user_removed")
        register_usage_provider(UsageProvider("Organizations", usage))
        register_org_limits_source(org_limits)
        register_export_provider("organizations", export)
        register_setting(SettingDef(
            "limits.max_members", "Members per organization", INT, default=0, group="Limits",
            env="LIMIT_MAX_MEMBERS",
            help="Members plus pending invitations. 0: unlimited. An organization's own limit (All organizations) wins.",
        ))
