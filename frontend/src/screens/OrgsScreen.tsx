import { CrudListScreen } from "platform-core";
import type { LinkComponent } from "platform-core";
import { createOrgsCrudConfig } from "../lib/orgsCrudConfig";
import type { Organization } from "../lib/api/organizations";

export interface OrgsScreenProps {
  /**
   * No token store of its own (see lib/api/client.ts's own docstring) -
   * the host passes in whatever access token it already has (e.g. from
   * platform-auth-frontend's LoginScreen/SignupScreen `onSuccess`
   * callback), scoped to however long the host's own session lasts.
   */
  accessToken: string;
  /** Wraps the "New"/per-row "Edit" links - defaults to a plain `<a>` (`CrudListScreen`'s own default) when the host doesn't pass its own router's `Link`. See `ORGS_NEW_PATH`/`orgsEditPath` for the paths these should point at. */
  linkComponent?: LinkComponent;
  onDeleted?: (org: Organization) => void;
}

/** The list screen - `platform-core`'s `CrudListScreen` preconfigured for `Organization`. See `orgsCrudConfig.ts` for the actual API wiring. */
function OrgsScreen({ accessToken, linkComponent, onDeleted }: OrgsScreenProps) {
  return <CrudListScreen config={createOrgsCrudConfig(accessToken, linkComponent)} onDeleted={onDeleted} />;
}

export default OrgsScreen;
