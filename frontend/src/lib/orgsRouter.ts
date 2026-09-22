import { createCrudRouter } from "platform-core";
import type { Organization } from "./api/organizations";

/**
 * One resource's worth of wiring (`List`/`Create`/`Edit`, each with
 * `baseUrl` already bound, plus `paths`) built once from just this
 * resource's own base URL - see `createCrudRouter`'s own docstring
 * (platform-core). `OrgsScreen`/`OrgsCreateScreen`/`OrgsEditScreen` are
 * thin wrappers around `.List`/`.Create`/`.Edit`; `orgsPaths.ts`'s own
 * `ORGS_PATHS` is this same router's `.paths` (see that file).
 */
export const OrgsRouter = createCrudRouter<Organization>("/api/v1/orgs");
