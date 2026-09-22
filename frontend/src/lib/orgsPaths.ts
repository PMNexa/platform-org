import { OrgsRouter } from "./orgsRouter";

/**
 * Shared by `index.ts` (public `ORGS_PATH`/`ORGS_NEW_PATH`/`orgsEditPath`
 * exports) and `routes/*.tsx` (internal post-action navigation) - one
 * computation, not two, so a route file and the paths a host wires it up
 * with can never drift apart. Just `OrgsRouter.paths` (see
 * `orgsRouter.ts`) - the router already computes this from the same
 * `"/api/v1/orgs"` base URL its `List`/`Create`/`Edit` use.
 */
export const ORGS_PATHS = OrgsRouter.paths;
