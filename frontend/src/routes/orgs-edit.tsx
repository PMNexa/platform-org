import { useNavigate, useOutletContext } from "react-router";
import { ORGS_PATHS } from "../lib/orgsPaths";
import OrgsEditScreen from "../screens/OrgsEditScreen";

/** See `routes/orgs.tsx`'s own docstring for why this file exists here rather than in `apps/main`. */
// oxlint-disable-next-line react/only-export-components
export function meta() {
  return [{ title: "Edit organization" }];
}

/**
 * `params` arrives as an ordinary prop regardless of where this file
 * lives - which route matched (and its `:id` segment) is decided by
 * `apps/main`'s `routes.ts`/`route(orgsEditPath(":id"), ...)`, not by
 * this file's location, so react-router still passes it through the
 * normal way. Typed by hand (`{ id: string }`) rather than via a
 * generated `./+types/orgs-edit` import - see `routes/orgs.tsx`'s
 * docstring for why that generated module isn't available here.
 */
export default function OrgsEditRoute({ params }: { params: { id: string } }) {
  const accessToken = useOutletContext<string>();
  const navigate = useNavigate();
  const goToList = () => navigate(`/${ORGS_PATHS.listPath}`);

  return <OrgsEditScreen accessToken={accessToken} id={params.id} onUpdated={goToList} onDeleted={goToList} />;
}
