import { CrudCreateScreen } from "platform-core";
import { createOrgsCrudConfig } from "../lib/orgsCrudConfig";
import type { Organization } from "../lib/api/organizations";

export interface OrgsCreateScreenProps {
  accessToken: string;
  /** Fires after a successful create - typically the host navigates to `ORGS_PATH`. */
  onCreated?: (org: Organization) => void;
}

/** The create screen - `platform-core`'s `CrudCreateScreen` preconfigured for `Organization` (just `name` - `slug` is server-derived, never a form field). */
function OrgsCreateScreen({ accessToken, onCreated }: OrgsCreateScreenProps) {
  return <CrudCreateScreen config={createOrgsCrudConfig(accessToken)} onCreated={onCreated} />;
}

export default OrgsCreateScreen;
