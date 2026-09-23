import { createCrudRoutes, prefixRoutes, type RouteEntry } from "platform-core";

const ORGS_API_PATH = "/api/v1/orgs";

/**
 * platform-org's OWN route list - `apps/main`'s `routes.ts` spreads this
 * directly (`...createOrgsRoutes("platform-org")`), same one-call-per-
 * resource convention `platform-core`'s own `createCrudRoutes` follows.
 * `basePath` is the HOST's own choice, not this package's - `apps/main`
 * owns every actual URL (same rule it already follows for goals/metrics/
 * check-ins), this just builds the three CRUD routes and nests them
 * under whatever prefix the caller passes (`prefixRoutes()` - see
 * `createCrudRoutes`'s own docstring on why this, not `route()` +
 * children).
 *
 * Exported from the main `"."` entry (no separate `"./routes"` subpath),
 * same as `platform-core`'s `createCrudRoutes` - browser-safe (plain
 * route-config objects, no `@react-router/dev/routes`/`node:*`), see
 * platform-core's `lib/routes.ts` docstring.
 */
export function createOrgsRoutes(basePath: string): RouteEntry[] {
  return prefixRoutes(basePath, createCrudRoutes(ORGS_API_PATH));
}
