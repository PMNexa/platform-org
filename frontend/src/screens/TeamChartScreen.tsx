import { useCallback, useEffect, useMemo, useState, type SubmitEvent } from "react";
import { Avatar, Button, Card, CardBody, DefaultLink, FormControl, FormLabel, FormSelect, Icon, Modal, type LinkComponent } from "platform-core";
import {
  TEAM_ROLE_LABELS,
  addTeamMember,
  canManage,
  changeTeamRole,
  convertPlaceholder,
  createInvitation,
  createTeam,
  deleteTeam,
  errorMessage,
  listMembers,
  listMembershipsOf,
  listMyOrgs,
  listOrgTeams,
  removeTeamMember,
  updatePlaceholder,
  updateTeam,
  type Member,
  type OrgSummary,
  type TeamMember,
  type TeamRole,
  type TeamWithPosition,
} from "../lib/api";

export interface TeamChartScreenProps {
  accessToken: string;
  /** Where a team's own page is (`<teamsPath>/<id>`); the team's name links there when given. */
  teamsPath?: string;
  /** The host router's link - defaults to a plain `<a>`. */
  linkComponent?: LinkComponent;
  /** The absolute accept-page URL for an invitation token - lets a placeholder be invited from the chart. */
  invitationUrl?: (token: string) => string;
}

const ORG_KEY = "platform-org:team-chart-org";

const LINE = "1px solid var(--tblr-border-color-dark, #c8d3e1)";
const STYLES = `
.po-chart{overflow-x:auto;padding:4px 0 12px}
.po-tree{position:relative;display:flex;justify-content:center;margin:0;padding:20px 0 0;list-style:none}
.po-chart>.po-tree{padding-top:0;min-width:max-content}
.po-branch{position:relative;display:flex;flex-direction:column;align-items:center;padding:20px 8px 0}
.po-chart>.po-tree>.po-branch{padding-top:0}
.po-branch::before,.po-branch::after{content:"";position:absolute;top:0;right:50%;width:50%;height:20px;border-top:${LINE}}
.po-branch::after{right:auto;left:50%;border-left:${LINE}}
.po-branch:only-child::before{display:none}
.po-branch:only-child::after{border-top:0;border-radius:0}
.po-branch:first-child::before,.po-branch:last-child::after{border-top:0}
.po-branch:first-child:not(:only-child)::before{border:0}
.po-branch:last-child:not(:only-child)::after{border:0}
.po-branch:last-child:not(:only-child)::before{border-right:${LINE};border-radius:0 6px 0 0}
.po-branch:first-child:not(:only-child)::after{border-radius:6px 0 0 0}
.po-chart>.po-tree>.po-branch::before,.po-chart>.po-tree>.po-branch::after{display:none}
.po-tree .po-tree::before{content:"";position:absolute;top:0;left:50%;height:20px;border-left:${LINE}}
.po-node{position:relative;width:240px;text-align:left;background:var(--tblr-bg-surface,#fff);border:1px solid var(--tblr-border-color,#e6e7e9);border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.po-node.po-org{border-top:3px solid var(--tblr-primary,#206bc4)}
.po-node.po-team{border-top:3px solid var(--tblr-azure,#4299e1)}
.po-node-head{display:flex;align-items:center;gap:4px;padding:8px 8px 4px 12px}
.po-node-name{flex:1;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.po-node-actions{display:flex;opacity:.55}
.po-node:hover .po-node-actions,.po-node:focus-within .po-node-actions{opacity:1}
.po-node-actions .btn{padding:2px;min-height:0;height:24px;width:24px}
.po-node-actions .icon{width:16px;height:16px;margin:0}
.po-people{list-style:none;margin:0;padding:0 8px 2px}
.po-people li{display:flex;align-items:center;gap:6px;padding:3px 4px;border-radius:4px}
.po-people li:hover{background:var(--tblr-bg-surface-secondary,#f6f8fb)}
.po-person{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.po-role{font-size:11px;line-height:16px;padding:0 6px;border-radius:8px;border:1px solid transparent;background:none;color:var(--tblr-secondary,#667382)}
.po-role.po-lead{background:var(--tblr-primary-lt,#e9f0f9);color:var(--tblr-primary,#206bc4);font-weight:600}
button.po-role:hover{border-color:currentColor}
.po-remove{border:0;background:none;padding:0 2px;color:var(--tblr-secondary,#667382);opacity:0;line-height:1}
.po-people li:hover .po-remove,.po-remove:focus{opacity:1}
.po-remove .icon{width:14px;height:14px;margin:0}
.po-node-foot{display:flex;align-items:center;gap:8px;padding:4px 12px 8px;font-size:12px;white-space:nowrap}
.po-link{border:0;background:none;padding:0;color:var(--tblr-primary,#206bc4)}
.po-link:hover{text-decoration:underline}
.po-muted{color:var(--tblr-secondary,#667382)}
.po-tag{font-size:11px;line-height:16px;padding:0 6px;border-radius:8px;background:var(--tblr-bg-surface-tertiary,#eef1f5);color:var(--tblr-secondary,#667382);white-space:nowrap}
.po-placeholder .po-person{font-style:italic}
`;

type Dialog =
  | { kind: "team"; team: TeamWithPosition | null; parent: string | null }
  | { kind: "delete"; team: TeamWithPosition }
  | { kind: "member"; team: TeamWithPosition }
  | { kind: "person"; membership: TeamMember }
  | null;

function readStoredOrg(): string {
  try {
    return localStorage.getItem(ORG_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Every descendant of `id` (for the parent picker: a team can't move under itself). */
function descendants(children: Map<string | null, TeamWithPosition[]>, id: string): Set<string> {
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    for (const child of children.get(stack.pop()!) ?? []) {
      out.add(child.id);
      stack.push(child.id);
    }
  }
  return out;
}

/**
 * An organization's teams as an org chart: the org on top, each team a
 * card with its lead(s) and members, its sub-teams below. Org owners and
 * admins add, rename, move and delete teams, and add, promote and remove
 * people right on the chart; everyone else sees it read-only (and may
 * leave a team). The API enforces all of it; this only hides what would
 * fail.
 */
function TeamChartScreen({ accessToken, teamsPath, linkComponent: Link = DefaultLink, invitationUrl }: TeamChartScreenProps) {
  const [orgs, setOrgs] = useState<OrgSummary[] | null>(null);
  const [orgId, setOrgId] = useState(readStoredOrg);
  const [teams, setTeams] = useState<TeamWithPosition[]>([]);
  const [memberships, setMemberships] = useState<TeamMember[]>([]);
  const [people, setPeople] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyOrgs(accessToken)
      .then(setOrgs)
      .catch((e) => setError(errorMessage(e)));
  }, [accessToken]);

  const org = orgs?.find((o) => o.id === orgId) ?? orgs?.[0] ?? null;
  const manager = canManage(org?.my_role);

  const refresh = useCallback(async () => {
    if (!org) return;
    const [teamRows, orgPeople] = await Promise.all([listOrgTeams(accessToken, org.id), listMembers(accessToken, org.id)]);
    const rows = await listMembershipsOf(accessToken, teamRows.map((t) => t.id));
    setTeams(teamRows);
    setPeople(orgPeople);
    setMemberships(rows);
    setLoaded(true);
  }, [accessToken, org]);

  useEffect(() => {
    refresh().catch((e) => setError(errorMessage(e)));
  }, [refresh]);

  function pickOrg(id: string) {
    setOrgId(id);
    setLoaded(false);
    try {
      localStorage.setItem(ORG_KEY, id);
    } catch {
      // Private mode: the pick lasts this visit only.
    }
  }

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const children = useMemo(() => {
    const ids = new Set(teams.map((t) => t.id));
    const map = new Map<string | null, TeamWithPosition[]>();
    for (const team of teams) {
      // A parent outside the list (shouldn't happen) puts the team on top.
      const key = team.parent && ids.has(team.parent) ? team.parent : null;
      map.set(key, [...(map.get(key) ?? []), team]);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    return map;
  }, [teams]);

  const byTeam = useMemo(() => {
    const map = new Map<string, TeamMember[]>();
    for (const m of memberships) map.set(m.team, [...(map.get(m.team) ?? []), m]);
    // Leads first, then by name.
    for (const list of map.values())
      list.sort((a, b) => Number(b.role === "lead") - Number(a.role === "lead") || personName(a).localeCompare(personName(b)));
    return map;
  }, [memberships]);

  const inAnyTeam = new Set(memberships.map((m) => m.user_id));
  const unassigned = people.filter((p) => !inAnyTeam.has(p.user_id));
  // People with no account yet, once each (they may be in several teams).
  const placeholders = useMemo(() => {
    const seen = new Map<string, TeamMember>();
    for (const m of memberships) if (m.placeholder && !seen.has(m.user_id)) seen.set(m.user_id, m);
    return [...seen.values()].sort((a, b) => personName(a).localeCompare(personName(b)));
  }, [memberships]);

  function toggle(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderTeam(team: TeamWithPosition) {
    const kids = children.get(team.id) ?? [];
    const rows = byTeam.get(team.id) ?? [];
    const closed = collapsed.has(team.id);
    return (
      <li key={team.id} className="po-branch">
        <div className="po-node po-team">
          <div className="po-node-head">
            <div className="po-node-name" title={team.name}>
              {teamsPath ? <Link to={`${teamsPath}/${team.id}`} className="text-reset">{team.name}</Link> : team.name}
            </div>
            {manager && (
              <div className="po-node-actions">
                <button type="button" className="btn btn-ghost-secondary btn-icon btn-sm" aria-label={`Add a sub-team to ${team.name}`} title="Add sub-team"
                  onClick={() => setDialog({ kind: "team", team: null, parent: team.id })}>
                  <Icon name="plus" />
                </button>
                <button type="button" className="btn btn-ghost-secondary btn-icon btn-sm" aria-label={`Edit ${team.name}`} title="Rename or move"
                  onClick={() => setDialog({ kind: "team", team, parent: team.parent })}>
                  <Icon name="pencil" />
                </button>
                <button type="button" className="btn btn-ghost-secondary btn-icon btn-sm" aria-label={`Delete ${team.name}`} title="Delete"
                  onClick={() => setDialog({ kind: "delete", team })}>
                  <Icon name="trash" />
                </button>
              </div>
            )}
          </div>
          {rows.length > 0 && (
            <ul className="po-people">
              {rows.map((m) => (
                <li key={m.id} className={m.placeholder ? "po-placeholder" : undefined}>
                  <Avatar name={personName(m)} />
                  <span className="po-person" title={m.placeholder ? "No account yet - the team's lead checks in for them" : (m.email ?? undefined)}>
                    {personName(m)}
                    {m.is_me && <span className="po-muted"> (you)</span>}
                  </span>
                  {m.placeholder &&
                    (manager ? (
                      <button type="button" className="po-role" disabled={busy} title="Rename, invite or link to an account"
                        aria-label={`${personName(m)} has no account - rename, invite or link to an account`}
                        onClick={() => setDialog({ kind: "person", membership: m })}>
                        No account
                      </button>
                    ) : (
                      <span className="po-tag">No account</span>
                    ))}
                  {manager ? (
                    <button type="button" className={`po-role${m.role === "lead" ? " po-lead" : ""}`} disabled={busy}
                      title={m.role === "lead" ? "Make a member" : "Make lead"}
                      aria-label={`${personName(m)} is ${TEAM_ROLE_LABELS[m.role]} - make ${m.role === "lead" ? "a member" : "lead"}`}
                      onClick={() => void run(() => changeTeamRole(accessToken, m.id, m.role === "lead" ? "member" : "lead"))}>
                      {TEAM_ROLE_LABELS[m.role]}
                    </button>
                  ) : (
                    m.role === "lead" && <span className="po-role po-lead">Lead</span>
                  )}
                  {(manager || m.is_me) && (
                    <button type="button" className="po-remove" disabled={busy}
                      aria-label={m.is_me ? `Leave ${team.name}` : `Remove ${personName(m)} from ${team.name}`}
                      title={m.is_me ? "Leave" : "Remove"}
                      onClick={() => void run(() => removeTeamMember(accessToken, m.id))}>
                      <Icon name="x" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="po-node-foot">
            {rows.length === 0 && !manager && <span className="po-muted">Nobody yet</span>}
            {manager && (
              <button type="button" className="po-link" onClick={() => setDialog({ kind: "member", team })}>
                + Add member
              </button>
            )}
            {kids.length > 0 && (
              <button type="button" className="po-link ms-auto" aria-expanded={!closed} onClick={() => toggle(team.id)}>
                {closed ? `Show ${kids.length} team${kids.length === 1 ? "" : "s"}` : "Hide teams"}
              </button>
            )}
          </div>
        </div>
        {kids.length > 0 && !closed && <ul className="po-tree">{kids.map(renderTeam)}</ul>}
      </li>
    );
  }

  const top = children.get(null) ?? [];

  return (
    <Card>
      <style href="platform-org-team-chart" precedence="default">{STYLES}</style>
      <CardBody>
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          {orgs && orgs.length > 1 && (
            <FormSelect aria-label="Organization" value={org?.id ?? ""} onChange={(e) => pickOrg(e.target.value)} style={{ maxWidth: 280 }}>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </FormSelect>
          )}
          {manager && (
            <Button variant="primary" size="sm" className="ms-auto" onClick={() => setDialog({ kind: "team", team: null, parent: null })}>
              <Icon name="plus" /> New team
            </Button>
          )}
        </div>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {orgs === null || (org && !loaded) ? (
          <div className="text-secondary">Loading…</div>
        ) : !org ? (
          <p className="text-secondary mb-0">You're not in an organization yet - teams live inside one.</p>
        ) : (
          <div className="po-chart">
            <ul className="po-tree">
              <li className="po-branch">
                <div className="po-node po-org">
                  <div className="po-node-head">
                    <div className="po-node-name" title={org.name}>{org.name}</div>
                  </div>
                  <div className="po-node-foot">
                    <span className="po-muted">
                      {people.length} member{people.length === 1 ? "" : "s"}
                      {unassigned.length > 0 && ` · ${unassigned.length} not in a team`}
                    </span>
                  </div>
                  {top.length === 0 && (
                    <div className="po-node-foot">
                      <span className="po-muted">No teams yet.</span>
                    </div>
                  )}
                </div>
                {top.length > 0 && <ul className="po-tree">{top.map(renderTeam)}</ul>}
              </li>
            </ul>
          </div>
        )}
      </CardBody>
      {org && dialog?.kind === "team" && (
        <TeamDialog
          team={dialog.team}
          parent={dialog.parent}
          teams={teams}
          exclude={dialog.team ? new Set([dialog.team.id, ...descendants(children, dialog.team.id)]) : new Set()}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(name, parent) =>
            void run(() =>
              dialog.team
                ? updateTeam(accessToken, dialog.team.id, { name, parent })
                : createTeam(accessToken, { org: org.id, name, parent }),
            ).then((ok) => ok && setDialog(null))
          }
        />
      )}
      {dialog?.kind === "delete" && (
        <DeleteDialog
          team={dialog.team}
          hasChildren={(children.get(dialog.team.id) ?? []).length > 0}
          busy={busy}
          onClose={() => setDialog(null)}
          onDelete={(instances) =>
            void run(() => deleteTeam(accessToken, dialog.team.id, instances)).then((ok) => ok && setDialog(null))
          }
        />
      )}
      {dialog?.kind === "member" && (
        <MemberDialog
          team={dialog.team}
          candidates={people.filter((p) => !(byTeam.get(dialog.team.id) ?? []).some((m) => m.user_id === p.user_id))}
          placeholders={placeholders.filter((p) => !(byTeam.get(dialog.team.id) ?? []).some((m) => m.user_id === p.user_id))}
          busy={busy}
          onClose={() => setDialog(null)}
          onAdd={(person, role) =>
            void run(() => addTeamMember(accessToken, { team: dialog.team.id, role, ...person })).then((ok) => ok && setDialog(null))
          }
        />
      )}
      {org && dialog?.kind === "person" && (
        <PersonDialog
          membership={dialog.membership}
          members={people}
          canInvite={Boolean(invitationUrl)}
          busy={busy}
          error={error}
          onClose={() => setDialog(null)}
          onRename={(name, email) =>
            void run(() =>
              updatePlaceholder(accessToken, dialog.membership.id, { placeholder_name: name, placeholder_email: email }),
            ).then((ok) => ok && setDialog(null))
          }
          onLink={(userId) =>
            void run(() => convertPlaceholder(accessToken, dialog.membership.id, userId)).then((ok) => ok && setDialog(null))
          }
          onInvite={async (email) => {
            let token = "";
            const ok = await run(async () => {
              // The email first: accepting the invitation then links the placeholder by it.
              await updatePlaceholder(accessToken, dialog.membership.id, { placeholder_email: email });
              token = (await createInvitation(accessToken, { org: org.id, email, role: "member" })).token;
            });
            return ok && invitationUrl ? invitationUrl(token) : null;
          }}
        />
      )}
    </Card>
  );
}

function personName(m: { name: string | null; email: string | null; user_id: string }): string {
  return m.name ?? m.email ?? m.user_id;
}

function TeamDialog({
  team,
  parent,
  teams,
  exclude,
  busy,
  onClose,
  onSave,
}: {
  team: TeamWithPosition | null;
  parent: string | null;
  teams: TeamWithPosition[];
  exclude: Set<string>;
  busy: boolean;
  onClose: () => void;
  onSave: (name: string, parent: string | null) => void;
}) {
  const [name, setName] = useState(team?.name ?? "");
  const [parentId, setParentId] = useState(parent ?? "");
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim()) onSave(name.trim(), parentId || null);
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={team ? `Edit ${team.name}` : "New team"}
      footer={
        <>
          <Button variant="secondary" outline onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" form="po-team-form" disabled={busy || !name.trim()}>
            {team ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <form id="po-team-form" onSubmit={submit}>
        <div className="mb-3">
          <FormLabel htmlFor="po-team-name" required>Name</FormLabel>
          <FormControl id="po-team-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Sales North" />
        </div>
        <div>
          <FormLabel htmlFor="po-team-parent">Part of</FormLabel>
          <FormSelect id="po-team-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">The organization (top level)</option>
            {teams
              .filter((t) => !exclude.has(t.id))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
          </FormSelect>
        </div>
      </form>
    </Modal>
  );
}

function DeleteDialog({
  team,
  hasChildren,
  busy,
  onClose,
  onDelete,
}: {
  team: TeamWithPosition;
  hasChildren: boolean;
  busy: boolean;
  onClose: () => void;
  onDelete: (instances: "move" | "archive") => void;
}) {
  const [instances, setInstances] = useState<"move" | "archive">("move");
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Delete ${team.name}?`}
      footer={
        <>
          <Button variant="secondary" outline onClick={onClose}>Cancel</Button>
          <Button variant="danger" disabled={busy} onClick={() => onDelete(instances)}>Delete team</Button>
        </>
      }
    >
      <p>
        Its members leave the team.
        {hasChildren && " Its sub-teams move up one level."}
      </p>
      <FormLabel htmlFor="po-team-instances">The team's goals</FormLabel>
      <FormSelect id="po-team-instances" value={instances} onChange={(e) => setInstances(e.target.value as "move" | "archive")}>
        <option value="move">{team.parent ? "Move to the team above" : "Move to the organization"}</option>
        <option value="archive">Archive</option>
      </FormSelect>
    </Modal>
  );
}

const NEW_PERSON = "__new__";

type NewPerson = { user_id: string } | { placeholder_name: string; placeholder_email?: string };

function MemberDialog({
  team,
  candidates,
  placeholders,
  busy,
  onClose,
  onAdd,
}: {
  team: TeamWithPosition;
  candidates: Member[];
  placeholders: TeamMember[];
  busy: boolean;
  onClose: () => void;
  onAdd: (person: NewPerson, role: TeamRole) => void;
}) {
  const [pick, setPick] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("member");
  const isNew = pick === NEW_PERSON;
  const ready = isNew ? Boolean(name.trim()) : Boolean(pick);
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    onAdd(isNew ? { placeholder_name: name.trim(), placeholder_email: email.trim() } : { user_id: pick }, role);
  }
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Add to ${team.name}`}
      footer={
        <>
          <Button variant="secondary" outline onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" form="po-member-form" disabled={busy || !ready}>Add</Button>
        </>
      }
    >
      <form id="po-member-form" onSubmit={submit}>
        <div className="mb-3">
          <FormLabel htmlFor="po-member-pick" required>Person</FormLabel>
          <FormSelect id="po-member-pick" autoFocus value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Pick a person…</option>
            {candidates.length > 0 && (
              <optgroup label="Members of the organization">
                {candidates.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name ?? m.email}
                    {m.name && m.email ? ` (${m.email})` : ""}
                  </option>
                ))}
              </optgroup>
            )}
            {placeholders.length > 0 && (
              <optgroup label="No account yet">
                {placeholders.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{personName(m)}</option>
                ))}
              </optgroup>
            )}
            <option value={NEW_PERSON}>+ Someone without an account…</option>
          </FormSelect>
          {!isNew && <small className="form-hint">Not listed? Invite them to the organization, or add them without an account.</small>}
        </div>
        {isNew && (
          <>
            <div className="mb-3">
              <FormLabel htmlFor="po-member-name" required>Name</FormLabel>
              <FormControl id="po-member-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Hana Tran" />
            </div>
            <div className="mb-3">
              <FormLabel htmlFor="po-member-email">Email</FormLabel>
              <FormControl id="po-member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
              <small className="form-hint">
                They take part like anyone else, and the team's lead checks in for them. Link them to an account
                later - or, with an email, they're linked when they accept an invitation sent to it.
              </small>
            </div>
          </>
        )}
        <div>
          <FormLabel htmlFor="po-member-role">Role</FormLabel>
          <FormSelect id="po-member-role" value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
            <option value="member">Member - checks in</option>
            <option value="lead">Lead - also sets the team's targets</option>
          </FormSelect>
        </div>
      </form>
    </Modal>
  );
}

/** A placeholder's own dialog: rename, link to an existing member's account, or invite them by email. */
function PersonDialog({
  membership,
  members,
  canInvite,
  busy,
  error,
  onClose,
  onRename,
  onLink,
  onInvite,
}: {
  membership: TeamMember;
  members: Member[];
  canInvite: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onRename: (name: string, email: string) => void;
  onLink: (userId: string) => void;
  onInvite: (email: string) => Promise<string | null>;
}) {
  const [name, setName] = useState(membership.name ?? "");
  const [email, setEmail] = useState(membership.email ?? "");
  const [account, setAccount] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const who = membership.name ?? "this person";
  return (
    <Modal
      open
      onClose={onClose}
      title={membership.name ?? "No account yet"}
      footer={<Button variant="secondary" outline onClick={onClose}>Close</Button>}
    >
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <p className="text-secondary">
        {who} has no account yet: the team's lead checks in for them. Once they have one, link it - their team
        places and goals, with every check-in, become theirs.
      </p>
      <form
        className="mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onRename(name.trim(), email.trim());
        }}
      >
        <div className="row g-2 align-items-end">
          <div className="col-sm-5">
            <FormLabel htmlFor="po-person-name" required>Name</FormLabel>
            <FormControl id="po-person-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="col-sm-5">
            <FormLabel htmlFor="po-person-email">Email</FormLabel>
            <FormControl id="po-person-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
          </div>
          <div className="col-sm-2">
            <Button type="submit" variant="secondary" outline disabled={busy || !name.trim()}>Save</Button>
          </div>
        </div>
      </form>
      <h4>Link to an account</h4>
      <form
        className="row g-2 align-items-end mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (account) onLink(account);
        }}
      >
        <div className="col-sm-9">
          <FormLabel htmlFor="po-person-account">A member of the organization</FormLabel>
          <FormSelect id="po-person-account" value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">Pick who {who} is…</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name ?? m.email}
                {m.name && m.email ? ` (${m.email})` : ""}
              </option>
            ))}
          </FormSelect>
        </div>
        <div className="col-sm-3">
          <Button type="submit" variant="primary" disabled={busy || !account}>Link</Button>
        </div>
      </form>
      {canInvite && (
        <>
          <h4>Not a member yet? Invite them</h4>
          <form
            className="row g-2 align-items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) return;
              void onInvite(email.trim()).then((link) => {
                setInviteLink(link);
                setCopied(false);
              });
            }}
          >
            <div className="col-sm-9">
              <FormLabel htmlFor="po-person-invite">Their email</FormLabel>
              <FormControl id="po-person-invite" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="col-sm-3">
              <Button type="submit" variant="secondary" outline disabled={busy || !email.trim()}>Invite</Button>
            </div>
          </form>
          {inviteLink && (
            <div className="mt-2">
              <small className="form-hint">
                Send them this link - no email is sent. When they accept it, {who} becomes their account.
              </small>
              <div className="input-group mt-1">
                <input className="form-control" readOnly value={inviteLink} aria-label="Invitation link" />
                <Button variant="secondary" outline onClick={() => void navigator.clipboard.writeText(inviteLink).then(() => setCopied(true))}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

export default TeamChartScreen;
