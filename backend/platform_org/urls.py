from rest_framework.routers import SimpleRouter

from platform_org.views import OrganizationViewSet

# trailing_slash=False - keeps the exact "orgs" path platform-org-frontend
# already calls (no trailing slash); DRF's router defaults to "orgs/",
# which would 404 (or redirect, depending on APPEND_SLASH) against the
# frontend's existing fetch("/api/v1/orgs").
router = SimpleRouter(trailing_slash=False)
router.register("orgs", OrganizationViewSet, basename="orgs")

urlpatterns = router.urls
