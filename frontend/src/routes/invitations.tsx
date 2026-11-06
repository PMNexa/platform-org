import { useLocation, useNavigate, useOutletContext } from "react-router";
import InvitationsScreen from "../screens/InvitationsScreen";
import { joinPath, mountPrefix } from "./paths";
import { localeFromMatches, translator } from "platform-core";
import titles from "./titles.messages";

// oxlint-disable-next-line react/only-export-components
export function meta({ matches }: { matches?: readonly unknown[] }) {
  return [{ title: translator(titles, localeFromMatches(matches))("invitations") }];
}

/** Registered by `createOrgsRoutes()` at `<basePath>/invitations`. */
export default function InvitationsRoute() {
  const accessToken = useOutletContext<string>();
  const navigate = useNavigate();
  const prefix = mountPrefix(useLocation().pathname, "invitations");
  return <InvitationsScreen accessToken={accessToken} onAccepted={(org) => navigate(joinPath(prefix, "orgs", org.id))} />;
}
