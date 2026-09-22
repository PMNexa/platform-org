import { OrgsRouter } from "../lib/orgsRouter";
import type { Organization } from "../lib/api/organizations";

export interface OrgsCreateScreenProps {
  accessToken: string;
  /** Fires after a successful create - typically the host navigates to `ORGS_PATH`. */
  onCreated?: (org: Organization) => void;
}

/** The create screen - `OrgsRouter.Create` (see `lib/orgsRouter.ts`), schema-driven (`orgsCrudConfig.ts`'s hand-written `name`-only field list is gone - nothing reads it anymore). */
function OrgsCreateScreen(props: OrgsCreateScreenProps) {
  return <OrgsRouter.Create {...props} />;
}

export default OrgsCreateScreen;
