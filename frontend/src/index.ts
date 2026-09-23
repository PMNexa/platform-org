/**
 * Package entry point - what a consuming app (apps/main) imports.
 *
 * The `Organization` type plus `createOrgsRoutes(basePath)` - `apps/main`
 * owns every actual URL for this resource itself (it calls
 * `createOrgsRoutes` with whatever mount prefix its own `routes.ts`
 * decides; the sidebar nav
 * link and the home page's quick link both use a plain string for the
 * same reason - see their own files), so there's no `ORGS_PATH`/
 * `ORGS_PATHS`/etc to export here anymore.
 *
 * No `OrgsScreen`/`OrgsCreateScreen`/`OrgsEditScreen` either -
 * Organization has no extra per-resource composition (unlike goalnexa's
 * `GoalsEditScreen`/`MetricsEditScreen`) to justify a wrapper; those
 * three screens used to exist but nothing imported them once routing
 * centralized into `platform-core` - dead code, removed rather than
 * left around.
 */
export type { Organization } from "./types";
export { createOrgsRoutes } from "./orgsRoutes";
