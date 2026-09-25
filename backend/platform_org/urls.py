from django.urls import path
from rest_framework.routers import SimpleRouter

from core_api.registry import register_model_endpoint
from platform_org.models import OrgInvitation, OrgMembership, Organization
from platform_org.views import (
    AcceptInvitationView,
    DeclineInvitationView,
    InvitationByTokenView,
    OrgInvitationViewSet,
    OrgMembershipViewSet,
    OrganizationViewSet,
    PublicInvitationView,
    ReceivedInvitationsView,
)

# trailing_slash=False - keeps the exact "orgs" path platform-org-frontend
# already calls (no trailing slash); DRF's router defaults to "orgs/",
# which would 404 (or redirect, depending on APPEND_SLASH) against the
# frontend's existing fetch("/api/v1/orgs").
router = SimpleRouter(trailing_slash=False)
router.register("orgs", OrganizationViewSet, basename="orgs")
router.register("org-members", OrgMembershipViewSet, basename="org-members")
router.register("org-invitations", OrgInvitationViewSet, basename="org-invitations")

# See core_api.registry's own docstring - lets a relation field's schema
# (e.g. a future org-scoped resource) tell the frontend where to fetch
# Organization's own rows from for a picker.
register_model_endpoint(Organization, "/api/v1/orgs")
register_model_endpoint(OrgMembership, "/api/v1/org-members")
register_model_endpoint(OrgInvitation, "/api/v1/org-invitations")

# The invitee's side (views/invitations.py) - listed before the router's
# routes, whose `org-invitations/<pk>` would otherwise match "received".
urlpatterns = [
    path("org-invitations/received", ReceivedInvitationsView.as_view(), name="org-invitations-received"),
    path("org-invitations/token/<str:token>", InvitationByTokenView.as_view(), name="org-invitation-by-token"),
    path("org-invitations/token/<str:token>/public", PublicInvitationView.as_view(), name="org-invitation-public"),
    path("org-invitations/token/<str:token>/accept", AcceptInvitationView.as_view(), name="org-invitation-accept"),
    path("org-invitations/token/<str:token>/decline", DeclineInvitationView.as_view(), name="org-invitation-decline"),
    *router.urls,
]
