import { useEffect, useState } from "react";
import { Button, Card, CardBody } from "platform-core";
import {
  ROLE_LABELS,
  acceptInvitation,
  declineInvitation,
  errorMessage,
  getInvitation,
  type ReceivedInvitation,
} from "../lib/api";

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

  const inviter = invitation?.invited_by.name ?? invitation?.invited_by.email ?? "Someone";
  let blocker: string | null = null;
  if (invitation) {
    if (invitation.status === "accepted") blocker = "This invitation has already been accepted.";
    else if (invitation.status === "declined") blocker = "This invitation was declined.";
    else if (invitation.expired) blocker = "This invitation has expired. Ask for a new one.";
    else if (!invitation.for_me)
      blocker = `This invitation was sent to ${invitation.email}. Sign in with that email to accept it.`;
  }

  return (
    <div className="container-tight py-4">
      <Card>
        <CardBody className="text-center py-4">
          {!invitation && !error && <div className="text-secondary">Loading…</div>}
          {!invitation && error && (
            <div className="text-danger" role="alert">
              {error}
            </div>
          )}
          {invitation && (
            <>
              <h2 className="mb-2">Join {invitation.org.name}</h2>
              <p className="text-secondary">
                {inviter} invited you to join <strong>{invitation.org.name}</strong> as{" "}
                {ROLE_LABELS[invitation.role].toLowerCase()}. Members see and work on the organization's goals.
              </p>
              {invitation.already_member ? (
                <>
                  <p>You're already a member.</p>
                  <Button variant="primary" onClick={() => onAccepted?.(invitation.org)}>
                    Open {invitation.org.name}
                  </Button>
                </>
              ) : blocker ? (
                <p className="text-warning mb-0">{blocker}</p>
              ) : (
                <div className="d-flex gap-2 justify-content-center">
                  <Button variant="secondary" outline disabled={busy} onClick={() => void respond(false)}>
                    Decline
                  </Button>
                  <Button variant="primary" disabled={busy} onClick={() => void respond(true)}>
                    Accept invitation
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
