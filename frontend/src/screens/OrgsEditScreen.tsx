import { CrudEditScreen } from "platform-core";
import { createOrgsCrudConfig } from "../lib/orgsCrudConfig";
import type { Organization } from "../lib/api/organizations";

export interface OrgsEditScreenProps {
  accessToken: string;
  /** The org's id - a prop, not read from a router param (same rule `CrudEditScreen` itself follows for the same reason - see platform-core's AGENTS.md). The host reads its own `:id` param and passes it here. */
  id: string;
  onUpdated?: (org: Organization) => void;
  onDeleted?: () => void;
}

/** The edit screen - `platform-core`'s `CrudEditScreen` preconfigured for `Organization`. */
function OrgsEditScreen({ accessToken, id, onUpdated, onDeleted }: OrgsEditScreenProps) {
  return <CrudEditScreen config={createOrgsCrudConfig(accessToken)} id={id} onUpdated={onUpdated} onDeleted={onDeleted} />;
}

export default OrgsEditScreen;
