import { createCrudPaths } from "platform-core";

/**
 * Shared by `index.ts` (public `ORGS_PATH`/`ORGS_NEW_PATH`/`orgsEditPath`
 * exports) and `routes/*.tsx` (internal post-action navigation) - one
 * computation, not two, so a route file and the paths a host wires it up
 * with can never drift apart.
 */
export const ORGS_PATHS = createCrudPaths("orgs");
