import { useNavigate, useOutletContext } from "react-router";
import { ORGS_PATHS } from "../lib/orgsPaths";
import OrgsCreateScreen from "../screens/OrgsCreateScreen";

/** See `routes/orgs.tsx`'s own docstring for why this file exists here rather than in `apps/main`. */
// oxlint-disable-next-line react/only-export-components
export function meta() {
  return [{ title: "New organization" }];
}

export default function OrgsNewRoute() {
  const accessToken = useOutletContext<string>();
  const navigate = useNavigate();
  return <OrgsCreateScreen accessToken={accessToken} onCreated={() => navigate(`/${ORGS_PATHS.listPath}`)} />;
}
