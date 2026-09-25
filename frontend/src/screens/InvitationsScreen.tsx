import { useCallback, useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, CardTitle } from "platform-core";
import {
  ROLE_LABELS,
  acceptInvitation,
  declineInvitation,
  errorMessage,
  listReceivedInvitations,
  type ReceivedInvitation,
} from "../lib/api";

export interface InvitationsScreenProps {
  accessToken: string;
  /** Fires after an invitation was accepted - e.g. to open the org. */
  onAccepted?: (org: { id: string; name: string }) => void;
}

/** The invitations sent to the signed-in user's email that are still open: accept or decline each. */
function InvitationsScreen({ accessToken, onAccepted }: InvitationsScreenProps) {
  const [invitations, setInvitations] = useState<ReceivedInvitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listReceivedInvitations(accessToken)
      .then(setInvitations)
      .catch((thrown: unknown) => setError(errorMessage(thrown)));
  }, [accessToken]);

  useEffect(refresh, [refresh]);

  async function respond(invitation: ReceivedInvitation, accept: boolean) {
    setError(null);
    try {
      if (accept) {
        const { org } = await acceptInvitation(accessToken, invitation.token);
        onAccepted?.(org);
      } else {
        await declineInvitation(accessToken, invitation.token);
      }
      refresh();
    } catch (thrown) {
      setError(errorMessage(thrown));
    }
  }

  return (
    <div className="container-xl py-3">
      <div className="mb-3">
        <h2 className="page-title">Invitations</h2>
        <div className="text-secondary">Organizations that invited you to join them.</div>
      </div>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Pending</CardTitle>
        </CardHeader>
        {invitations === null ? (
          <CardBody className="text-secondary">Loading…</CardBody>
        ) : invitations.length === 0 ? (
          <CardBody className="text-secondary">No pending invitations.</CardBody>
        ) : (
          <div className="table-responsive">
            <table className="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Role</th>
                  <th>Invited by</th>
                  <th className="w-1" />
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td>{invitation.org.name}</td>
                    <td>{ROLE_LABELS[invitation.role]}</td>
                    <td className="text-secondary">{invitation.invited_by.name ?? invitation.invited_by.email ?? "—"}</td>
                    <td className="text-nowrap">
                      <div className="d-flex gap-2">
                        <Button variant="primary" onClick={() => void respond(invitation, true)}>
                          Accept
                        </Button>
                        <Button variant="secondary" outline onClick={() => void respond(invitation, false)}>
                          Decline
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default InvitationsScreen;
