# core_api (errors/exceptions/pagination/filters/uuid7 utils,
# BaseSerializer/BaseViewSet) now comes from the sibling apps/platform-core
# module instead of being vendored here - build this image from the repo
# root, not from this directory:
#   docker build -f apps/platform-org/backend/Dockerfile -t platform-org-backend .
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY apps/platform-core/backend /platform-core

COPY apps/platform-org/backend/requirements.txt apps/platform-org/backend/manage.py ./
COPY apps/platform-org/backend/config ./config
COPY apps/platform-org/backend/platform_org ./platform_org

RUN pip install --no-cache-dir -r requirements.txt -e /platform-core

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
