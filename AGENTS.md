# platform-org

Standalone multi-tenancy module: `Organization` + `OrgMembership`, own
Postgres database. Second of the `platform-*` family (after
`platform-auth`), following the same "own backend, own frontend, both
packaged for a host to import" pattern.

No source-level dependency on platform-auth or any other MODULE — see
`backend/platform_org/models/org_membership.py` and
`backend/platform_org/authentication.py` for exactly how it stays
decoupled while still knowing "who" is making a request (a JWT `sub`
claim, verified against a shared `JWT_SECRET` — no User table, no
cross-module DB or Python import). **`platform-core` is the one real
dependency**: this repo used to vendor its own copy of `core_api`
(errors/exceptions/utils), but now depends on platform-core's for real
(see its own AGENTS.md's `BaseSerializer`/`BaseViewSet` section) - `pip
install -e` a checkout of `apps/platform-core/backend` alongside this
package (`apps/main`'s `docker-compose.yml` does this; this repo's own
`Dockerfile` does too, see below).

## Backend (`backend/`)

Django 5.2 + Django REST Framework, matching platform-auth's byte-
identical wire-contract conventions: `{code, message, field_errors}`
error shape.

- `platform_org/models/organization.py` — `Organization` (id, name, slug
  unique).
- `platform_org/models/org_membership.py` — `OrgMembership` (org FK,
  `user_id` — a bare `UUIDField`, **not** a ForeignKey; see that file's
  own docstring for why). `role` is the member's say within the org
  (`OrgRole`: owner / admin / member - owners manage everything incl.
  other owners and deleting the org, admins rename it and manage non-owner
  members and invitations, members take part); what a user may do with
  each RESOURCE is still platform-auth's RBAC:
  `OrganizationViewSet.scope_field = "id"` makes an org an RBAC scope, so
  an RBAC role can be held within one org (see platform-auth's AGENTS.md).
  The org role is checked in this module's own views, on top.
- `platform_org/models/org_invitation.py` - `OrgInvitation`: org, email,
  role (admin/member), secret `token` (the accept link), status
  (pending/accepted/declined; revoking deletes it), 14-day `expires_at`.
- `platform_org/directory.py` - who a user id is. No User table here, so
  the host names a lookup in `PLATFORM_ORG_USER_DIRECTORY` (ids ->
  `{name, email}`; `apps/main` points it at platform-auth's users). It
  gives members their name/email and tells whose email an invitation is
  for. Unset: members have no name/email, and an invitation can only be
  accepted when `request.user` has an `email` itself.
- `platform_org/membership.py` - the active-membership lookups every view
  scopes by (only `status=active` rows count).
- `platform_org/authentication.py` — `JWTBearerAuthentication`: decodes a
  JWT with the shared `JWT_SECRET`, resolves to a lightweight
  `ActorStub(id=..., is_authenticated=True)` — no DB lookup at all. When
  imported into a host that also has `platform-auth` installed (e.g.
  `apps/main`), the host's own `DEFAULT_AUTHENTICATION_CLASSES`
  (`platform_auth.authentication.ActorAuthentication`, which resolves a
  real `User` row) takes over instead — this module's views only ever
  read `request.user.id`, so which one resolved it is invisible to them.
- `platform_org/views/organizations.py` — `OrganizationViewSet`, a real
  `core_api.viewsets.BaseViewSet` (see platform-core's own AGENTS.md),
  not a hand-rolled `APIView` like the very first version of this
  endpoint was. `GET/POST /api/v1/orgs` (list orgs the caller has a
  membership in / create a new org, caller becomes its first member) come
  from `ModelViewSet`'s standard actions - `get_queryset` scopes both to
  the caller, `perform_create` derives `slug` server-side from `name`
  (uniqueness-suffixed on collision, never supplied by the caller) and
  creates the first `OrgMembership`. Routed via `SimpleRouter(trailing_
  slash=False)` in `urls.py` to keep the exact `/api/v1/orgs` path (no
  trailing slash) the frontend already calls. `search_fields = ["name"]`
  is what makes `?q=` (`core_api.filters.QParamSearchFilter`) actually
  filter anything - DRF's `SearchFilter` silently no-ops without it, no
  error anywhere, which looks exactly like a frontend bug instead of a
  one-line gap here (found this the hard way via a real browser check
  against `platform-org-frontend`'s search box before this line existed).
- `OrganizationSerializer`/`OrgMembershipSerializer` (`serializers/`) are
  `core_api.serializers.BaseSerializer` subclasses - `GET /api/v1/orgs`
  supports `?include[]=memberships` (sideloads each org's `OrgMembership`
  rows, deferred by default), `?exclude[]=slug` etc., `?filter{name}=
  value`/`?filter{name.icontains}=value`, and `?sort=-name`. The two
  serializer modules reference each other (`Organization.memberships` ↔
  `OrgMembership.org`) via a deferred-import function, not a plain
  module-level import - see `organization.py`'s own docstring for exactly
  why (a naive fix looks like it works and still deadlocks).
- `views/members.py` - `OrgMembershipViewSet`, `/api/v1/org-members`:
  members of every org the caller belongs to (`?filter{org}=`), each
  with `name`/`email`/`is_me`. GET/PATCH(`role`)/DELETE only - you join
  by accepting an invitation or creating the org. Owners change any role
  (incl. making someone owner), admins change/remove non-owners, anyone
  removes themselves (leaves). The last owner can't leave, be removed or
  be demoted.
- `views/invitations.py` - `OrgInvitationViewSet`, `/api/v1/org-invitations`
  (GET/POST/DELETE): an org's owners/admins list, create (`{org, email,
  role}`; one pending per email) and revoke invitations; members see none.
  `org-invitations/token/<token>/public` needs no sign-in (the join
  page): org, email, and `has_account` (host setting
  `PLATFORM_ORG_ACCOUNT_EXISTS`) + `signup_page`
  (`PLATFORM_ORG_SIGNUP_PAGE`), so a newcomer is sent to sign up.
  Invitee side, plain views scoped by the caller's email:
  `org-invitations/received`, `org-invitations/token/<token>` (preview,
  with `for_me`/`already_member`), `.../accept`, `.../decline` - the
  email must match; the token alone isn't enough. `urls.py` lists these
  before the router, whose `org-invitations/<pk>` would swallow them.
- `OrganizationViewSet` lists only ACTIVE memberships' orgs, annotates
  `my_role`; the creator's membership is `owner`; rename needs
  owner/admin, delete needs owner. `OrganizationSerializer` leaves off
  the `memberships`/`invitations` relations (own endpoints; the org page
  shows them in its own panel instead of generic tabs).
- Migration 0003 makes each existing org's first member its owner, and
  gives `role` a `db_default` so the previous release (still running
  during a deploy) can insert memberships.
- Every route requires authentication (`DEFAULT_PERMISSION_CLASSES:
  IsAuthenticated`) — there's no public endpoint in this module at all,
  unlike platform-auth's login/signup.

Also an **importable pip package**: `pyproject.toml` packages
`platform_org` as an importable unit (no longer `core_api` too - see
above).

## Frontend (`frontend/`)

React + Vite + TypeScript, also an **npm package**
(`"name": "platform-org-frontend"`, `exports` → `src/index.ts`). A real
**frontend** dependency on `platform-core` now too (`file:../../
platform-core/frontend`), not just the backend's `core_api` dependency
above — see below.

`OrgsScreen`/`OrgsCreateScreen`/`OrgsEditScreen` (all exported, alongside
`ORGS_PATH`/`ORGS_NEW_PATH`/`orgsEditPath`) are thin wrappers around
`platform-core`'s `CrudListScreen`/`CrudCreateScreen`/`CrudEditScreen` -
`lib/orgsCrudConfig.ts`'s `createOrgsCrudConfig(accessToken)` is the one
place that builds the `CrudConfig<Organization>` all three share
(columns: `name` sortable, `slug`; the one editable field:
`name` - `slug` is server-derived, never a form field). None of the
three own auth state of their own — unlike `platform-auth-frontend`'s
screens (which own the login flow and so reasonably own a token store),
this package is a pure *consumer* of a session another module already
created; every screen takes `accessToken` as a plain **prop**, same as
before this rewrite. The host is responsible for capturing that token
(e.g. from `platform-auth-frontend`'s `LoginScreen`/`SignupScreen`
`onSuccess` callback, which returns a `Session`) and passing it down.

**Why route through `platform-core` instead of the hand-rolled
list+form this screen used to have**: `OrganizationViewSet` is a real
`BaseViewSet` (see above) - `DataTable`'s `?page=`/`?sort=`/`?q=`
contract already matches it exactly, so there was no server-side reason
to keep a bespoke fetch-and-render loop on the frontend once
`platform-core` had a generic one. `lib/orgsCrudConfig.ts`
routes both `DataTable`'s `fetcher` and the CRUD `api` calls through
`apiFetch` (this package's own Bearer-token wrapper, `lib/api/
client.ts`) rather than `platform-core`'s plain-`fetch` defaults, since
every route here requires authentication — `fetcher` just hands `apiFetch`
the full URL `DataTable` already built (query string and all); `apiFetch`
treats its `path` argument as opaque, so no re-parsing needed.
`react-hook-form`/`zod`/`@hookform/resolvers` were removed as
dependencies once the hand-rolled create form went away — `platform-core`'s
`CrudCreateScreen`/`CrudEditScreen` use plain `useState` (native
`required` is the only validation - see platform-core's own AGENTS.md).

### Routes — `createOrgsRoutes(basePath)`

Orgs use `platform-core`'s generic `crud-list.tsx`/`crud-new.tsx`/
`crud-edit.tsx`; the org page and the invitation pages are this
package's own route files (see "Membership screens"). `src/orgsRoutes.ts`
exports `createOrgsRoutes(basePath)` from the main `"."` entry (no
`"./routes"` subpath) - `createCrudRoutes("/api/v1/orgs")` wrapped in
`platform-core`'s `prefixRoutes(basePath, ...)`. The host picks the
mount: `apps/main` calls `...createOrgsRoutes("platform-org")`, giving
`/platform-org/orgs[/new|/:id/edit]`. Browser-safe plain route-config
objects (no `@react-router/dev`) - see `platform-core`'s AGENTS.md on
why route builders exported from `"."` must stay that way.

### Membership screens

`OrgMembersPanel` (members + role selects + remove/leave, pending
invitations with copy-link/revoke, "Invite member" modal - it shows the
link to send, no email is sent), `InvitationsScreen` (invitations sent
to me: accept/decline) and `AcceptInvitationScreen` (the link's landing
page) - router-free screens taking `accessToken` (API calls: axios,
`lib/api.ts`). `createOrgsRoutes` mounts them: the orgs' `detailFile` is
`routes/org-detail.tsx` (platform-core's `CrudDetailScreen` + the
panel), plus `<basePath>/invitations` and `<basePath>/invitations/:token/accept`.
The link an org manager copies is `<basePath>/invitations/:token`, from
`createOrgsPublicRoutes(basePath)` - mount it OUTSIDE the host's
session gate: it works signed out and redirects to the host's signup
(`?email=&next=`, when the backend says the email has no account) or to
`invitations/:token/accept`.
These route files import `react-router` (so it's a dependency, same
version as main, deduped by the host). Known gap: the generic detail
header shows Edit/Delete to plain members too (the schema's `can` is
per resource, not per row) - the API refuses with 403.

### Sidebar entries — `createOrgsNavItems(basePath)`

`src/orgsNav.tsx`, also from `"."`: one "Organizations" sidebar group
(its own inline icon) for the host's AppShell - "My organizations"
(`permission: "orgs.view"`; an org's page manages its members and
invitations) and "Invitations" (no permission - they're addressed to my
email).
Pass the SAME `basePath` as `createOrgsRoutes` - `apps/main` does
`...createOrgsNavItems("platform-org")` in `app-shell.tsx`'s `NAV_ITEMS`.

## Running locally

```
cd backend && source .venv/bin/activate && pip install -r requirements.txt -e ../../platform-core/backend && python manage.py runserver
cd frontend && npm run dev   # paste a token issued elsewhere to exercise OrgsScreen
```

The standalone `Dockerfile` now builds from the **repo root**, not this
directory, since it needs `apps/platform-core/backend` alongside its own
files:
```
docker build -f apps/platform-org/backend/Dockerfile -t platform-org-backend .
```
