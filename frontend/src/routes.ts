import { prefix, type RouteConfigEntry } from "@react-router/dev/routes";
import { createCrudRoutes } from "platform-core/routes";

const ORGS_API_PATH = "/api/v1/orgs";

/**
 * platform-org's OWN route list - `apps/main`'s `routes.ts` spreads this
 * directly (`...createOrgsRoutes("platform-org")`), same one-call-per-
 * resource convention `platform-core`'s own `createCrudRoutes` follows.
 * `basePath` is the HOST's own choice, not this package's - `apps/main`
 * owns every actual URL (same rule it already follows for goals/metrics/
 * check-ins), this just builds the three CRUD routes and nests them
 * under whatever prefix the caller passes (`prefix()` - see
 * `createCrudRoutes`'s own docstring on why this, not `route()` +
 * children).
 *
 * Deliberately its own `package.json` `exports` subpath (`"platform-org-
 * frontend/routes"`), not part of the main `"."` entry - same Node-only,
 * never-client-bundled split `platform-core/routes` follows (see its own
 * docstring); this file imports `@react-router/dev/routes`, which must
 * never reach the browser.
 */
export function createOrgsRoutes(basePath: string): RouteConfigEntry[] {
  return prefix(basePath, createCrudRoutes(ORGS_API_PATH));
}
