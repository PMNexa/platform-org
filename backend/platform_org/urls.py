from django.urls import path

from platform_org.views import OrganizationsView

urlpatterns = [
    path("orgs", OrganizationsView.as_view(), name="orgs"),
]
