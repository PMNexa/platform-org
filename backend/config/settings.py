"""Django settings for platform-org.

Standalone multi-tenancy module: Organization + OrgMembership, own
Postgres database. No User table of its own and no dependency on
platform-auth's - see platform_org/models/org_membership.py and
platform_org/authentication.py for how it stays decoupled while still
knowing "who" is making a request.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-secret-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
    "corsheaders",
    "platform_org",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"


def _database_config_from_url(url: str) -> dict:
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    import urllib.parse as up

    parsed = up.urlparse(url)
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/"),
        "USER": parsed.username,
        "PASSWORD": parsed.password,
        "HOST": parsed.hostname,
        "PORT": parsed.port or 5432,
    }


_database_url = os.environ.get("DATABASE_URL")
if _database_url:
    DATABASES = {"default": _database_config_from_url(_database_url)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Same JWT_SECRET env var name platform-auth uses - tokens it issues must
# verify here for platform_org's own standalone JWTBearerAuthentication
# to work. When imported into a host that also has platform-auth
# installed, the host's own authentication class takes over instead (see
# platform_org/authentication.py's own docstring) and this setting is
# unused.
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-insecure-jwt-secret")

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["platform_org.authentication.JWTBearerAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "EXCEPTION_HANDLER": "core_api.exceptions.platform_exception_handler",
}
