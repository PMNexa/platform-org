import { createCrudRoutes, prefixRoutes, routeFilePath, type RouteEntry } from "platform-core";

const ORGS_API_PATH = "/api/v1/orgs";

/**
 * platform-org's OWN route list - `apps/main`'s `routes.ts` spreads this
 * directly (`...createOrgsRoutes("platform-org")`), same one-call-per-
 * resource convention `platform-core`'s own `createCrudRoutes` follows.
 * `basePath` is the HOST's own choice, not this package's - `apps/main`
 * owns every actual URL (same rule it already follows for goals/metrics/
 * check-ins); this nests everything under whatever prefix the caller
 * passes (`prefixRoutes()` - see `createCrudRoutes`'s own docstring on
 * why this, not `route()` + children):
 * - `orgs[/new|/:id|/:id/edit]` - platform-core's generic CRUD screens,
 *   except the org page (`routes/org-detail.tsx`: the generic detail plus
 *   the members panel);
 * - `invitations` - the invitations sent to me;
 * - `invitations/:token/accept` - accept/decline one (the invitation link
 *   itself, `invitations/:token`, is `createOrgsPublicRoutes`').
 * All belong inside the host's session-gated layout (they read the access
 * token from outlet context).
 *
 * Exported from the main `"."` entry (no separate `"./routes"` subpath),
 * same as `platform-core`'s `createCrudRoutes` - browser-safe (plain
 * route-config objects, no `@react-router/dev/routes`/`node:*`, file paths
 * built only when called), see platform-core's `lib/routes.ts` docstring.
 */
export function createOrgsRoutes(basePath: string): RouteEntry[] {
  return prefixRoutes(basePath, [
    ...createCrudRoutes(ORGS_API_PATH, { detailFile: routeFilePath(import.meta.url, "routes/org-detail.tsx") }),
    { id: "platform-org-invitations", path: "invitations", file: routeFilePath(import.meta.url, "routes/invitations.tsx") },
    {
      id: "platform-org-invitation",
      path: "invitations/:token/accept",
      file: routeFilePath(import.meta.url, "routes/invitation.tsx"),
    },
  ]);
}

/**
 * platform-org's pages that must work SIGNED OUT - mount these OUTSIDE the
 * host's session-gated layout, with the same `basePath` as
 * `createOrgsRoutes`: `<basePath>/invitations/:token`, the invitation link
 * (`routes/join.tsx` sends a newcomer to sign up, everyone else on to
 * `invitations/:token/accept`, behind the host's login gate).
 */
export function createOrgsPublicRoutes(basePath: string): RouteEntry[] {
  return prefixRoutes(basePath, [
    { id: "platform-org-join", path: "invitations/:token", file: routeFilePath(import.meta.url, "routes/join.tsx") },
  ]);
}
