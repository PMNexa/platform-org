from rest_framework import serializers

from core_api.serializers import BaseSerializer
from platform_org.models import Team, TeamMembership
from platform_org.serializers.org_membership import _directory


class TeamSerializer(BaseSerializer):
    """`/api/v1/teams` - an org's teams, a tree (`parent`). `org` and
    `parent` are set from the request body by the viewset (same org; never
    under itself or one of its own sub-teams). `memberships` is left off:
    members are managed at `/api/v1/team-members` (the team page's own
    panel, which picks from the org's members), not as a generic tab whose
    form would ask for a raw user id."""

    class Meta:
        model = Team
        auto_exclude = ["created_at", "updated_at", "memberships"]
        display_field = "name"
        extra_kwargs = {
            "name": {"help_text": "The team or department's name. For example: Sales, or Sales North."},
            "parent": {"help_text": "The team this one is part of - a department, say. Empty = a top-level team."},
            "org": {"help_text": "The organization the team belongs to."},
            "position": {"read_only": True, "help_text": "Order among teams with the same parent, lowest first."},
        }


class TeamMembershipSerializer(BaseSerializer):
    """`/api/v1/team-members` - who is in a team, and as what (lead or
    member). `team` is set from the request body by the viewset;
    `user_id` must be an active member of the team's org. `name`/`email`
    come from the host's user directory; `is_me` marks the caller's row."""

    name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = TeamMembership
        auto_exclude = ["created_at", "updated_at"]
        display_field = "name"
        extra_kwargs = {
            "user_id": {"help_text": "The person - a member of the team's organization."},
            "role": {"help_text": "Lead: sets the team's targets. Member: checks in."},
        }

    def get_name(self, obj) -> str | None:
        return _directory(self, [obj.user_id]).get(str(obj.user_id), {}).get("name")

    def get_email(self, obj) -> str | None:
        return _directory(self, [obj.user_id]).get(str(obj.user_id), {}).get("email")

    def get_is_me(self, obj) -> bool:
        request = self.context.get("request")
        return request is not None and str(obj.user_id) == str(getattr(request.user, "id", None))
