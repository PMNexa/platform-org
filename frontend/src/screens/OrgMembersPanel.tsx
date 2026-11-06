import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { Button, Card, CardBody, CardHeader, CardTitle, FormControl, FormLabel, Modal, formatDate, useLocale, useT } from "platform-core";
import {
  canManage,
  changeRole,
  createInvitation,
  errorMessage,
  getOrg,
  listMembers,
  listPendingInvitations,
  removeMember,
  revokeInvitation,
  type Invitation,
  type InvitationRole,
  type Member,
  type OrgRole,
  type OrgSummary,
} from "../lib/api";
import messages from "./OrgMembersPanel.messages";
import roleMessages from "./roles.messages";

export interface OrgMembersPanelProps {
  accessToken: string;
  orgId: string;
  /** The absolute accept-page URL for an invitation token - the host knows where that page is mounted. */
  invitationUrl: (token: string) => string;
  /** Fires after the signed-in user left the org - the host owns navigating away. */
  onLeft?: () => void;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const t = useT(messages);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <Button variant="secondary" outline onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true))}>
      {copied ? t("copied") : (label ?? t("copyLink"))}
    </Button>
  );
}

/** Which roles `mine` may give `member` (empty: can't change it). */
function assignableRoles(mine: OrgRole | null, member: Member): OrgRole[] {
  if (mine === "owner") return ["owner", "admin", "member"];
  if (mine === "admin" && member.role !== "owner") return ["admin", "member"];
  return [];
}

function canRemove(mine: OrgRole | null, member: Member): boolean {
  return !member.is_me && canManage(mine) && (mine === "owner" || member.role !== "owner");
}

/**
 * An org's members and pending invitations, shown under the org's detail
 * page. Everyone sees the members; owners and admins also change roles,
 * remove members, and invite by email - the invitation's accept link is
 * shown to copy and send (no email is sent). Anyone can leave. The API
 * enforces all of it; this only hides what would fail.
 */
function OrgMembersPanel({ accessToken, orgId, invitationUrl, onLeft }: OrgMembersPanelProps) {
  const t = useT(messages);
  const roleLabel = useT(roleMessages);
  const locale = useLocale();
  const day = (value: string) => formatDate(value, { dateStyle: "medium" }, locale);
  const [org, setOrg] = useState<OrgSummary | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [created, setCreated] = useState<Invitation | null>(null);

  const mine = org?.my_role ?? null;
  const manager = canManage(mine);

  const refresh = useCallback(
    () =>
      getOrg(accessToken, orgId)
        .then((nextOrg) =>
          Promise.all([
            listMembers(accessToken, orgId),
            canManage(nextOrg.my_role) ? listPendingInvitations(accessToken, orgId) : Promise.resolve([]),
          ]).then(([nextMembers, nextInvitations]) => {
            setOrg(nextOrg);
            setMembers(nextMembers);
            setInvitations(nextInvitations);
          }),
        )
        .catch((thrown: unknown) => setError(errorMessage(thrown))),
    [accessToken, orgId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function act(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      await refresh();
    } catch (thrown) {
      setError(errorMessage(thrown));
    }
  }

  function handleRemove(member: Member) {
    const who = member.name ?? member.email ?? t("thisMember");
    if (!window.confirm(t("confirmRemove", { who, org: org?.name ?? t("theOrg") }))) return;
    void act(() => removeMember(accessToken, member.id));
  }

  async function handleLeave(member: Member) {
    if (!window.confirm(t("confirmLeave", { org: org?.name ?? t("thisOrg") }))) return;
    setError(null);
    try {
      await removeMember(accessToken, member.id);
      onLeft?.();
    } catch (thrown) {
      setError(errorMessage(thrown));
    }
  }

  function handleRevoke(invitation: Invitation) {
    if (!window.confirm(t("confirmRevoke", { email: invitation.email }))) return;
    if (created?.id === invitation.id) setCreated(null);
    void act(() => revokeInvitation(accessToken, invitation.id));
  }

  return (
    <>
      {error && (
        <div className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      )}

      <Card className="mt-3">
        <CardHeader>
          <CardTitle>{members ? t("membersCount", { n: members.length }) : t("members")}</CardTitle>
          {manager && (
            <div className="card-actions">
              <Button variant="primary" onClick={() => setInviting(true)}>
                {t("inviteMember")}
              </Button>
            </div>
          )}
        </CardHeader>
        {created && (
          <CardBody className="border-bottom">
            <div className="alert alert-success mb-0" role="status">
              <div className="flex-fill">
                <h4 className="alert-title">{t("invitationCreated", { email: created.email })}</h4>
                <div className="text-secondary mb-2">
                  {t("sendLink", { date: day(created.expires_at) })}
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <code className="flex-fill text-break p-2" style={{ userSelect: "all" }}>
                    {invitationUrl(created.token)}
                  </code>
                  <CopyButton text={invitationUrl(created.token)} />
                </div>
              </div>
            </div>
          </CardBody>
        )}
        {members === null ? (
          <CardBody className="text-secondary">{t("loading")}</CardBody>
        ) : (
          <div className="table-responsive">
            <table className="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>{t("member")}</th>
                  <th>{t("role")}</th>
                  <th>{t("joined")}</th>
                  <th className="w-1" />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const roles = assignableRoles(mine, member);
                  return (
                    <tr key={member.id}>
                      <td>
                        <div>
                          {member.name ?? member.email ?? member.user_id}
                          {member.is_me && <span className="text-secondary">{t("you")}</span>}
                        </div>
                        {member.name && member.email && <div className="text-secondary small">{member.email}</div>}
                      </td>
                      <td>
                        {roles.length > 0 ? (
                          <select
                            className="form-select form-select-sm w-auto"
                            aria-label={t("roleOf", { who: member.name ?? member.email ?? t("memberFallback") })}
                            value={member.role}
                            onChange={(event) => {
                              const role = event.target.value as OrgRole;
                              void act(() => changeRole(accessToken, member.id, role));
                            }}
                          >
                            {roles.map((role) => (
                              <option key={role} value={role}>
                                {roleLabel(role)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          roleLabel(member.role)
                        )}
                      </td>
                      <td className="text-secondary">{day(member.joined_at)}</td>
                      <td className="text-nowrap">
                        {member.is_me ? (
                          <Button variant="danger" outline onClick={() => void handleLeave(member)}>
                            {t("leave")}
                          </Button>
                        ) : (
                          canRemove(mine, member) && (
                            <Button variant="danger" outline onClick={() => handleRemove(member)}>
                              {t("remove")}
                            </Button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {manager && invitations.length > 0 && (
        <Card className="mt-3">
          <CardHeader>
            <CardTitle>{t("pendingInvitations")}</CardTitle>
          </CardHeader>
          <div className="table-responsive">
            <table className="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>{t("email")}</th>
                  <th>{t("role")}</th>
                  <th>{t("expires")}</th>
                  <th className="w-1" />
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => {
                  const expired = new Date(invitation.expires_at) <= new Date();
                  return (
                    <tr key={invitation.id}>
                      <td>{invitation.email}</td>
                      <td>{roleLabel(invitation.role)}</td>
                      <td className={expired ? "text-danger" : "text-secondary"}>
                        {expired ? t("expired") : day(invitation.expires_at)}
                      </td>
                      <td className="text-nowrap">
                        <div className="d-flex gap-2">
                          {!expired && <CopyButton text={invitationUrl(invitation.token)} />}
                          <Button variant="danger" outline onClick={() => handleRevoke(invitation)}>
                            {t("revoke")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <InviteModal
        open={inviting}
        accessToken={accessToken}
        orgId={orgId}
        onClose={() => setInviting(false)}
        onCreated={(invitation) => {
          setInviting(false);
          setCreated(invitation);
          void refresh();
        }}
      />
    </>
  );
}

function InviteModal({
  open,
  accessToken,
  orgId,
  onClose,
  onCreated,
}: {
  open: boolean;
  accessToken: string;
  orgId: string;
  onClose: () => void;
  onCreated: (invitation: Invitation) => void;
}) {
  const t = useT(messages);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t("inviteTitle")}
      footer={
        <>
          <Button variant="secondary" outline onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="primary" form="org-invite-form">
            {t("createInvitation")}
          </Button>
        </>
      }
    >
      {open && <InviteForm accessToken={accessToken} orgId={orgId} onCreated={onCreated} />}
    </Modal>
  );
}

function InviteForm({
  accessToken,
  orgId,
  onCreated,
}: {
  accessToken: string;
  orgId: string;
  onCreated: (invitation: Invitation) => void;
}) {
  const t = useT(messages);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("member");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onCreated(await createInvitation(accessToken, { org: orgId, email, role }));
    } catch (thrown) {
      setError(errorMessage(thrown));
      setSaving(false);
    }
  }

  return (
    <form id="org-invite-form" onSubmit={(event) => void handleSubmit(event)}>
      <fieldset disabled={saving}>
        <div className="mb-3">
          <FormLabel htmlFor="org-invite-email" required>
            {t("email")}
          </FormLabel>
          <FormControl
            id="org-invite-email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <small className="form-hint">{t("emailHint")}</small>
        </div>
        <div className="mb-3">
          <FormLabel htmlFor="org-invite-role">{t("role")}</FormLabel>
          <select
            id="org-invite-role"
            className="form-select form-select-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as InvitationRole)}
          >
            <option value="member">{t("memberOption")}</option>
            <option value="admin">{t("adminOption")}</option>
          </select>
        </div>
        {error && (
          <div className="text-danger" role="alert">
            {error}
          </div>
        )}
      </fieldset>
    </form>
  );
}

export default OrgMembersPanel;
