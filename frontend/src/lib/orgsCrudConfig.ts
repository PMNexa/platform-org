import type { CrudConfig, DataTablePage, LinkComponent } from "platform-core";
import { apiFetch } from "./api/client";
import type { Organization } from "./api/organizations";

/**
 * The one place this package's CRUD screens (`OrgsScreen`/
 * `OrgsCreateScreen`/`OrgsEditScreen` - thin wrappers around
 * `platform-core`'s `CrudListScreen`/`CrudCreateScreen`/`CrudEditScreen`)
 * get their `CrudConfig<Organization>` from. `OrganizationViewSet` is a
 * real `core_api.viewsets.BaseViewSet` (see platform-org's own AGENTS.md
 * and platform-core's `BaseSerializer`/`BaseViewSet` section) - `?page=`/
 * `?sort=`/`?q=` all just work, zero extra backend glue.
 *
 * `api`/`fetcher` both route through `apiFetch` (this package's own
 * Bearer-token fetch wrapper - see `lib/api/client.ts`'s own docstring
 * on why this package holds no token of its own) rather than
 * `platform-core`'s plain-`fetch` defaults, since every route here
 * requires authentication. `fetcher` receives the FULL url `DataTable`
 * already built (`/api/v1/orgs?page=1&sort=name&...`) - `apiFetch`
 * treats its `path` argument as opaque, so passing that straight through
 * works with no re-parsing.
 */
export function createOrgsCrudConfig(accessToken: string, linkComponent?: LinkComponent): CrudConfig<Organization> {
  return {
    resource: "orgs",
    endpoint: "/api/v1/orgs",
    columns: [
      { key: "name", header: "Name", sortable: true },
      { key: "slug", header: "Slug" },
    ],
    fields: [{ key: "name", label: "Name", required: true, autoComplete: "organization" }],
    rowKey: (org) => org.id,
    fetcher: (url) => apiFetch<DataTablePage<Organization>>(url, accessToken),
    api: {
      create: (values) => apiFetch<Organization>("/api/v1/orgs", accessToken, { method: "POST", body: JSON.stringify(values) }),
      read: (id) => apiFetch<Organization>(`/api/v1/orgs/${id}`, accessToken),
      update: (id, values) =>
        apiFetch<Organization>(`/api/v1/orgs/${id}`, accessToken, { method: "PATCH", body: JSON.stringify(values) }),
      remove: (id) => apiFetch<void>(`/api/v1/orgs/${id}`, accessToken, { method: "DELETE" }),
    },
    linkComponent,
  };
}
