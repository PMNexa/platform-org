import { OrgsRouter } from "../lib/orgsRouter";
import type { Organization } from "../lib/api/organizations";

export interface OrgsEditScreenProps {
  accessToken: string;
  /** The org's id - a prop, not read from a router param (same rule `CrudEditScreen` itself follows for the same reason - see platform-core's AGENTS.md). The host reads its own `:id` param and passes it here. */
  id: string;
  onUpdated?: (org: Organization) => void;
  onDeleted?: () => void;
}

/** The edit screen - `OrgsRouter.Edit` (see `lib/orgsRouter.ts`), schema-driven (see `OrgsCreateScreen`'s own docstring). */
function OrgsEditScreen(props: OrgsEditScreenProps) {
  return <OrgsRouter.Edit {...props} />;
}

export default OrgsEditScreen;
