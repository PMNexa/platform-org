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


def _placeholders(serializer, ids) -> dict[str, dict]:
    """Placeholder rows cached in the serializer context, like `_directory`."""
    from platform_org.placeholders import lookup

    cache = serializer.context.setdefault("_org_placeholders", {"known": {}, "asked": set()})
    missing = {str(i) for i in ids} - cache["asked"]
    if missing:
        cache["known"].update(lookup(missing))
        cache["asked"] |= missing
    return cache["known"]


class _TeamMemberListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        rows = list(data.all() if hasattr(data, "all") else data)
        ids = [row.user_id for row in rows]
        _placeholders(self.child, ids)
        _directory(self.child, ids)
        return super().to_representation(rows)


class TeamMembershipSerializer(BaseSerializer):
    """`/api/v1/team-members` - who is in a team, and as what (lead or
    member). `team` is set from the request body by the viewset;
    `user_id` must be an active member of the team's org, or one of its
    placeholders (someone with no account yet - `placeholder: true`). To
    add a NEW placeholder, send `placeholder_name` (and maybe
    `placeholder_email`) instead of `user_id`; the same fields on a PATCH
    rename the placeholder in every team. `name`/`email` come from the
    host's user directory (a placeholder's from its own row); `is_me`
    marks the caller's row."""

    name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    is_me = serializers.SerializerMethodField()
    placeholder = serializers.SerializerMethodField(
        help_text="Someone with no account yet. The team's lead checks in for them; link them to an account later."
    )
    placeholder_name = serializers.CharField(
        write_only=True, required=False, max_length=255,
        help_text="Adds (or renames) a person with no account yet - instead of user_id.",
    )
    placeholder_email = serializers.EmailField(
        write_only=True, required=False, allow_blank=True,
        help_text="The placeholder's email, if known: accepting an invitation sent to it links them to that account.",
    )

    class Meta:
        model = TeamMembership
        list_serializer_class = _TeamMemberListSerializer
        auto_exclude = ["created_at", "updated_at"]
        display_field = "name"
        extra_kwargs = {
            "user_id": {
                "required": False,
                "help_text": "The person - a member of the team's organization, or one of its placeholders.",
            },
            "role": {"help_text": "Lead: sets the team's targets. Member: checks in."},
        }

    def _person(self, obj) -> dict:
        """A placeholder's own row, else the host's directory entry."""
        return _placeholders(self, [obj.user_id]).get(str(obj.user_id)) or _directory(self, [obj.user_id]).get(
            str(obj.user_id), {}
        )

    def get_name(self, obj) -> str | None:
        return self._person(obj).get("name")

    def get_email(self, obj) -> str | None:
        return self._person(obj).get("email")

    def get_placeholder(self, obj) -> bool:
        return bool(self._person(obj).get("placeholder"))

    def get_is_me(self, obj) -> bool:
        request = self.context.get("request")
        return request is not None and str(obj.user_id) == str(getattr(request.user, "id", None))
