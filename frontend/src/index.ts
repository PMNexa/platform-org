/**
 * Package entry point - what a consuming app (apps/main) imports.
 *
 * `OrgsScreen`/`OrgsCreateScreen`/`OrgsEditScreen` are thin wrappers
 * around `platform-core`'s `CrudListScreen`/`CrudCreateScreen`/
 * `CrudEditScreen` (see `lib/orgsCrudConfig.ts`) - none own auth state of
 * their own (see `OrgsScreen`'s own docstring); all take `accessToken` as
 * a plain prop. `ORGS_PATH`/`ORGS_NEW_PATH`/`orgsEditPath` are this
 * module's own suggested URL segments (`lib/orgsPaths.ts`), matching the
 * same route-export convention `platform-auth-frontend` uses for
 * `BASE_PATH`/`LOGIN_PATH`/`SIGNUP_PATH`.
 *
 * The actual react-router ROUTE MODULES live in `routes/` (`orgs.tsx`/
 * `orgs-new.tsx`/`orgs-edit.tsx` - see each file's own docstring for why
 * this is the one screen package in this platform that isn't
 * react-router-free). NOT exported from this file, and not imported by
 * bare specifier either - a host's `routes.ts` reaches them with a
 * relative filesystem path instead (see its own comment on why); this
 * barrel only carries the plain screens/paths a host wires around them.
 */
export { default as OrgsScreen } from "./screens/OrgsScreen";
export type { OrgsScreenProps } from "./screens/OrgsScreen";

export { default as OrgsCreateScreen } from "./screens/OrgsCreateScreen";
export type { OrgsCreateScreenProps } from "./screens/OrgsCreateScreen";

export { default as OrgsEditScreen } from "./screens/OrgsEditScreen";
export type { OrgsEditScreenProps } from "./screens/OrgsEditScreen";

export type { Organization } from "./lib/api/organizations";

import { ORGS_PATHS } from "./lib/orgsPaths";
export { ORGS_PATHS } from "./lib/orgsPaths";
export const ORGS_PATH = ORGS_PATHS.listPath;
export const ORGS_NEW_PATH = ORGS_PATHS.createPath;
export const orgsEditPath = ORGS_PATHS.editPath;
