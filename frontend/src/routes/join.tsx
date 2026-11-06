import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useT } from "platform-core";
import { errorMessage, getPublicInvitation } from "../lib/api";
import messages from "./messages";
import { joinPath, mountPrefix } from "./paths";
import { localeFromMatches, translator } from "platform-core";
import titles from "./titles.messages";

// oxlint-disable-next-line react/only-export-components
export function meta({ matches }: { matches?: readonly unknown[] }) {
  return [{ title: translator(titles, localeFromMatches(matches))("invitation") }];
}

/**
 * Registered by `createOrgsPublicRoutes()` at `<basePath>/invitations/:token` -
 * the link an org's owner/admin sends. Outside the host's session gate:
 * it asks the backend whether the invited email has an account yet, then
 * sends a newcomer to the host's signup page (email prefilled, `?next=`
 * back) and everyone else to the invitation page (`invitations/:token/accept`),
 * where the host's gate asks them to log in first if needed.
 */
export default function JoinRoute() {
  const t = useT(messages);
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const prefix = mountPrefix(useLocation().pathname, "invitations");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const invitationPath = joinPath(prefix, "invitations", token, "accept");
    getPublicInvitation(token)
      .then((invitation) => {
        if (cancelled) return;
        if (invitation.has_account === false && invitation.signup_page) {
          const query = new URLSearchParams({ email: invitation.email, next: invitationPath });
          navigate(`${invitation.signup_page}?${query}`, { replace: true });
        } else {
          navigate(invitationPath, { replace: true });
        }
      })
      .catch((thrown: unknown) => {
        if (!cancelled) setError(errorMessage(thrown));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, prefix, token]);

  return (
    <div className="container-tight py-5 text-center">
      {error ? (
        <div className="text-danger" role="alert">
          {error}
        </div>
      ) : (
        <div className="text-secondary">{t("openingInvitation")}</div>
      )}
    </div>
  );
}
