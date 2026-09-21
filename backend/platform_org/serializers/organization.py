from rest_framework import serializers


class OrganizationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.SlugField()


class CreateOrganizationSerializer(serializers.Serializer):
    """Just `name` - `slug` is derived from it server-side (views/organizations.py),
    not something the caller picks, so the frontend stays a one-field form.
    """

    name = serializers.CharField(max_length=255)
