import { useEffect, useState } from "react";
import { Button, Card, CardBody, useT } from "platform-core";
import {
  acceptInvitation,
  declineInvitation,
  errorMessage,
  getInvitation,
  type ReceivedInvitation,
} from "../lib/api";
import messages from "./AcceptInvitationScreen.messages";
import roleMessages from "./roles.messages";

export interface AcceptInvitationScreenProps {
  accessToken: string;
  /** The invitation's token, from the link. */
  token: string;
  /** Fires after accepting (or when already a member) - e.g. to open the org. */
  onAccepted?: (org: { id: string; name: string }) => void;
  /** Fires after declining. */
  onDeclined?: () => void;
}

/**
 * Where an invitation link lands (inside the host's session-gated layout,
 * so the invitee signs in first): who invited them to which org, and
 * Accept / Decline - or why they can't (sent to another email, used,
 * expired).
 */
function AcceptInvitationScreen({ accessToken, token, onAccepted, onDeclined }: AcceptInvitationScreenProps) {
  const t = useT(messages);
  const roles = useT(roleMessages);
  const [invitation, setInvitation] = useState<ReceivedInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getInvitation(accessToken, token)
      .then((result) => !cancelled && setInvitation(result))
      .catch((thrown: unknown) => {
        if (!cancelled) setError(errorMessage(thrown));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, token]);

  async function respond(accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (accept) {
        const { org } = await acceptInvitation(accessToken, token);
        onAccepted?.(org);
      } else {
        await declineInvitation(accessToken, token);
        onDeclined?.();
      }
    } catch (thrown) {
      setError(errorMessage(thrown));
      setBusy(false);
    }
  }

  const inviter = invitation?.invited_by.name ?? invitation?.invited_by.email ?? t("someone");
  let blocker: string | null = null;
  if (invitation) {
    if (invitation.status === "accepted") blocker = t("accepted");
    else if (invitation.status === "declined") blocker = t("declined");
    else if (invitation.expired) blocker = t("expired");
    else if (!invitation.for_me) blocker = t("notForMe", { email: invitation.email });
  }

  return (
    <div className="container-tight py-4">
      <Card>
        <CardBody className="text-center py-4">
          {!invitation && !error && <div className="text-secondary">{t("loading")}</div>}
          {!invitation && error && (
            <div className="text-danger" role="alert">
              {error}
            </div>
          )}
          {invitation && (
            <>
              <h2 className="mb-2">{t("join", { org: invitation.org.name })}</h2>
              <p className="text-secondary">
                {t("invitedYou", { inviter, org: invitation.org.name, role: roles(invitation.role) })}
              </p>
              {invitation.already_member ? (
                <>
                  <p>{t("alreadyMember")}</p>
                  <Button variant="primary" onClick={() => onAccepted?.(invitation.org)}>
                    {t("open", { org: invitation.org.name })}
                  </Button>
                </>
              ) : blocker ? (
                <p className="text-warning mb-0">{blocker}</p>
              ) : (
                <div className="d-flex gap-2 justify-content-center">
                  <Button variant="secondary" outline disabled={busy} onClick={() => void respond(false)}>
                    {t("decline")}
                  </Button>
                  <Button variant="primary" disabled={busy} onClick={() => void respond(true)}>
                    {t("accept")}
                  </Button>
                </div>
              )}
              {error && (
                <div className="text-danger mt-3" role="alert">
                  {error}
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default AcceptInvitationScreen;
