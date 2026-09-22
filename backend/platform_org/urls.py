from rest_framework.routers import SimpleRouter

from core_api.registry import register_model_endpoint
from platform_org.models import Organization
from platform_org.views import OrganizationViewSet

# trailing_slash=False - keeps the exact "orgs" path platform-org-frontend
# already calls (no trailing slash); DRF's router defaults to "orgs/",
# which would 404 (or redirect, depending on APPEND_SLASH) against the
# frontend's existing fetch("/api/v1/orgs").
router = SimpleRouter(trailing_slash=False)
router.register("orgs", OrganizationViewSet, basename="orgs")

# See core_api.registry's own docstring - lets a relation field's schema
# (e.g. a future org-scoped resource) tell the frontend where to fetch
# Organization's own rows from for a picker.
register_model_endpoint(Organization, "/api/v1/orgs")

urlpatterns = router.urls
