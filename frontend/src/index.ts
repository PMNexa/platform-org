/**
 * Package entry point - what a consuming app (apps/main) imports.
 *
 * `OrgsScreen` takes an `accessToken` prop rather than owning its own
 * auth state (see its own docstring / lib/api/client.ts's) - it's a pure
 * consumer of a session another module (platform-auth-frontend) created.
 * `ORGS_PATH` is this module's own suggested URL segment, matching the
 * same route-export convention platform-auth-frontend uses.
 */
export { default as OrgsScreen } from "./screens/OrgsScreen";
export const ORGS_PATH = "orgs";
