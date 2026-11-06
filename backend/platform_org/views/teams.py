"""Teams inside an org - a tree of any depth (a department is a team with
sub-teams) - and who is in each.

`/api/v1/teams`: every org member sees the org's teams; only its owners
and admins create, rename, move or delete one. A team's parent is in the
same org and never the team itself or one of its own sub-teams. Deleting
a team moves its sub-teams up to its parent, and tells other modules
(`core_api.system.team_removed`) - `?instances=archive` asks them to
archive what they filed under the team; the default moves it to the
parent too.

`/api/v1/team-members`: every org member sees the org's team memberships;
owners and admins add (an active org member, once per team), change the
role of (lead / member) and remove them. Anyone can leave a team. They can
also add someone with no account yet - a placeholder (`placeholder_name`),
who can be added to more teams by id, renamed, and later turned into an
account: `POST team-members/<id>/convert {"user_id"}` (an active org
member; every team place and goal of the placeholder moves to them).
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core_api.system import team_changed, team_removed
from core_api.viewsets import BaseViewSet
from platform_org.membership import active_memberships, descendant_ids, member_org_ids, role_in, team_parents
from platform_org.models import MANAGER_ROLES, Organization, Placeholder, Team, TeamMembership
from platform_org.placeholders import convert
from platform_org.serializers import TeamMembershipSerializer, TeamSerializer

MANAGERS_ONLY = "Only an owner or admin of the organization can change its teams."


def _check_manager(org_id, user_id) -> None:
    if role_in(org_id, user_id) not in MANAGER_ROLES:
        raise PermissionDenied(MANAGERS_ONLY)


class TeamViewSet(BaseViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    search_fields = ["name"]
    permission_classes = [IsAuthenticated]
    scope_field = "org_id"

    def get_queryset(self):
        return super().get_queryset().filter(org_id__in=member_org_ids(self.request.user.id)).order_by("position", "name")

    def _resolve_parent(self, org_id, team=None):
        parent_id = self.request.data.get("parent")
        if not parent_id:
            return None
        parent = get_object_or_404(Team.objects.filter(org_id=org_id), id=parent_id)
        if team is not None and (parent.id == team.id or parent.id in descendant_ids(team_parents(org_id), team.id)):
            raise ValidationError({"parent": ["A team can't be part of itself or of one of its own sub-teams."]})
        return parent

    @staticmethod
    def _last_position(org_id, parent) -> int:
        top = Team.objects.filter(org_id=org_id, parent=parent).aggregate(top=Max("position"))["top"]
        return 0 if top is None else top + 1

    def perform_create(self, serializer):
        org_id = self.request.data.get("org")
        if not org_id:
            raise ValidationError({"org": ["This field is required."]})
        org = get_object_or_404(Organization, id=org_id, id__in=member_org_ids(self.request.user.id))
        _check_manager(org.id, self.request.user.id)
        parent = self._resolve_parent(org.id)
        team = serializer.save(org=org, parent=parent, position=self._last_position(org.id, parent))
        team_changed.send(sender=Team, team_id=str(team.id), org_id=str(team.org_id))

    def perform_update(self, serializer):
        team = serializer.instance
        _check_manager(team.org_id, self.request.user.id)
        parent = self._resolve_parent(team.org_id, team) if "parent" in self.request.data else team.parent
        moved = parent != team.parent
        extra = {"position": self._last_position(team.org_id, parent)} if moved else {}
        team = serializer.save(org=team.org, parent=parent, **extra)
        team_changed.send(sender=Team, team_id=str(team.id), org_id=str(team.org_id))

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "instances", OpenApiTypes.STR, enum=["move", "archive"],
                description="What happens to goals filed under the team: move them to its parent team (default) "
                "or archive them.",
            )
        ]
    )
    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        _check_manager(instance.org_id, self.request.user.id)
        instances = self.request.query_params.get("instances", "move")
        if instances not in ("move", "archive"):
            raise ValidationError({"instances": ["Either move or archive."]})
        team_removed.send(
            sender=Team,
            team_id=str(instance.id),
            org_id=str(instance.org_id),
            parent_id=str(instance.parent_id) if instance.parent_id else None,
            instances=instances,
        )
        Team.objects.filter(parent=instance).update(parent=instance.parent)
        org_id = instance.org_id
        instance.delete()
        team_changed.send(sender=Team, team_id=None, org_id=str(org_id))


class TeamMembershipViewSet(BaseViewSet):
    queryset = TeamMembership.objects.all()
    serializer_class = TeamMembershipSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    permission_classes = [IsAuthenticated]
    scope_field = "team__org_id"

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(team__org_id__in=member_org_ids(self.request.user.id))
            .order_by("team_id", "created_at")
        )

    def perform_create(self, serializer):
        team_id = self.request.data.get("team")
        if not team_id:
            raise ValidationError({"team": ["This field is required."]})
        team = get_object_or_404(Team.objects.filter(org_id__in=member_org_ids(self.request.user.id)), id=team_id)
        _check_manager(team.org_id, self.request.user.id)
        data = serializer.validated_data
        name = (data.pop("placeholder_name", "") or "").strip()
        email = (data.pop("placeholder_email", "") or "").strip().lower()
        if name:
            # Someone with no account yet.
            placeholder = Placeholder.objects.create(org_id=team.org_id, name=name, email=email)
            serializer.save(team=team, user_id=placeholder.id)
            return
        user_id = data.get("user_id")
        if not user_id:
            raise ValidationError({"user_id": ["Pick a person, or give the name of someone with no account yet."]})
        is_member = active_memberships().filter(org_id=team.org_id, user_id=user_id).exists()
        if not is_member and not Placeholder.objects.filter(org_id=team.org_id, id=user_id).exists():
            raise ValidationError({"user_id": ["Only a member of the organization can join one of its teams."]})
        if TeamMembership.objects.filter(team=team, user_id=user_id).exists():
            raise ValidationError({"user_id": ["Already in this team."]})
        serializer.save(team=team)

    def perform_update(self, serializer):
        membership = serializer.instance
        _check_manager(membership.team.org_id, self.request.user.id)
        data = serializer.validated_data
        if str(data.get("user_id", membership.user_id)) != str(membership.user_id):
            raise ValidationError({"user_id": ["Remove the membership and add the other person instead."]})
        name = data.pop("placeholder_name", None)
        email = data.pop("placeholder_email", None)
        if name is not None or email is not None:
            placeholder = Placeholder.objects.filter(id=membership.user_id).first()
            if placeholder is None:
                raise ValidationError({"placeholder_name": ["Only a placeholder's name can be changed here."]})
            if name is not None:
                if not name.strip():
                    raise ValidationError({"placeholder_name": ["A name is needed."]})
                placeholder.name = name.strip()
            if email is not None:
                placeholder.email = email.strip().lower()
            placeholder.save(update_fields=["name", "email", "updated_at"])
        serializer.save(team=membership.team)

    def perform_destroy(self, instance):
        if str(instance.user_id) != str(self.request.user.id):
            _check_manager(instance.team.org_id, self.request.user.id)
        instance.delete()

    @extend_schema(
        description="Turn a placeholder (someone added to teams before they had an account) into a member of "
        "the organization: every team they're in, and whatever other modules keep for them (their own goals), "
        "moves to that user, and the placeholder is gone. Owners and admins of the organization.",
        request=inline_serializer("ConvertPlaceholder", {
            "user_id": serializers.UUIDField(help_text="An active member of the team's organization."),
        }),
        responses={200: inline_serializer("ConvertedPlaceholder", {"user_id": serializers.UUIDField()})},
    )
    @action(detail=True, methods=["post"])
    def convert(self, request, pk=None):
        membership = self.get_object()
        _check_manager(membership.team.org_id, request.user.id)
        placeholder = Placeholder.objects.filter(id=membership.user_id, org_id=membership.team.org_id).first()
        if placeholder is None:
            raise ValidationError({"user_id": ["This person already has an account."]})
        user_id = str(request.data.get("user_id") or "")
        try:
            convert(placeholder, user_id)
        except (ValueError, DjangoValidationError) as error:
            raise ValidationError({"user_id": ["Only a member of the organization."]}) from error
        return Response({"user_id": user_id})
