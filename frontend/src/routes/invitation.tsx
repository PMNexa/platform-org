import { useLocation, useNavigate, useOutletContext, useParams } from "react-router";
import AcceptInvitationScreen from "../screens/AcceptInvitationScreen";
import { joinPath, mountPrefix } from "./paths";

// oxlint-disable-next-line react/only-export-components
export function meta() {
  return [{ title: "Invitation" }];
}

/**
 * Registered by `createOrgsRoutes()` at `<basePath>/invitations/:token/accept`
 * - where the invitation link (`join.tsx`) sends the invitee. Inside the
 * host's session-gated layout, so a signed-out invitee logs in (or signs
 * up) first and comes back here (`?next=`).
 */
export default function InvitationRoute() {
  const accessToken = useOutletContext<string>();
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const prefix = mountPrefix(useLocation().pathname, "invitations");
  return (
    <AcceptInvitationScreen
      key={token}
      accessToken={accessToken}
      token={token}
      onAccepted={(org) => navigate(joinPath(prefix, "orgs", org.id))}
      onDeclined={() => navigate(joinPath(prefix, "invitations"))}
    />
  );
}
