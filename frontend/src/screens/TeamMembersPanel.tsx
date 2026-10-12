import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { Button, Card, CardBody, CardHeader, CardTitle, FormLabel, FormSelect } from "platform-core";
import {
  TEAM_ROLE_LABELS,
  addTeamMember,
  canManage,
  changeTeamRole,
  errorMessage,
  getOrg,
  getTeam,
  listMembers,
  listTeamMembers,
  removeTeamMember,
  type Member,
  type TeamMember,
  type TeamRole,
} from "../lib/api";

export interface TeamMembersPanelProps {
  accessToken: string;
  teamId: string;
}

/**
 * Who is in a team, shown under the team's page. Everyone in the org sees
 * it; the org's owners and admins add people (picked from the org's
 * members), make them lead or member, and remove them. Anyone can leave.
 * A lead sets the team's targets (and plans the teams under it). The API
 * enforces all of it; this only hides what would fail.
 */
function TeamMembersPanel({ accessToken, teamId }: TeamMembersPanelProps) {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [orgMembers, setOrgMembers] = useState<Member[]>([]);
  const [manager, setManager] = useState(false);
  const [pick, setPick] = useState("");
  const [role, setRole] = useState<TeamRole>("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const team = await getTeam(accessToken, teamId);
    const [rows, org, people] = await Promise.all([
      listTeamMembers(accessToken, teamId),
      getOrg(accessToken, team.org),
      listMembers(accessToken, team.org),
    ]);
    setMembers(rows);
    setManager(canManage(org.my_role));
    setOrgMembers(people);
  }, [accessToken, teamId]);

  useEffect(() => {
    refresh().catch((e) => setError(errorMessage(e)));
  }, [refresh]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function add(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pick) return;
    void run(() => addTeamMember(accessToken, { team: teamId, user_id: pick, role })).then(() => setPick(""));
  }

  const inTeam = new Set((members ?? []).map((m) => m.user_id));
  const candidates = orgMembers.filter((m) => !inTeam.has(m.user_id));

  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle>Team members</CardTitle>
      </CardHeader>
      <CardBody>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {members === null ? (
          <div className="text-secondary">Loading…</div>
        ) : members.length === 0 ? (
          <p className="text-secondary">Nobody in this team yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-vcenter mb-3">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th className="w-1"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      {member.name ?? member.email ?? member.user_id}
                      {member.is_me && <span className="text-secondary"> (you)</span>}
                      {member.email && member.name && <div className="text-secondary small">{member.email}</div>}
                    </td>
                    <td>
                      {manager ? (
                        <FormSelect
                          aria-label={`Role of ${member.name ?? member.email}`}
                          value={member.role}
                          disabled={busy}
                          onChange={(e) => void run(() => changeTeamRole(accessToken, member.id, e.target.value as TeamRole))}
                        >
                          {(Object.keys(TEAM_ROLE_LABELS) as TeamRole[]).map((r) => (
                            <option key={r} value={r}>{TEAM_ROLE_LABELS[r]}</option>
                          ))}
                        </FormSelect>
                      ) : (
                        TEAM_ROLE_LABELS[member.role]
                      )}
                    </td>
                    <td>
                      {(manager || member.is_me) && (
                        <Button
                          variant="danger"
                          outline
                          disabled={busy}
                          onClick={() => void run(() => removeTeamMember(accessToken, member.id))}
                        >
                          {member.is_me ? "Leave" : "Remove"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {manager && (
          <form className="row g-2 align-items-end" onSubmit={add}>
            <div className="col-sm-6">
              <FormLabel htmlFor="team-member-pick">Add someone from the organization</FormLabel>
              <FormSelect id="team-member-pick" value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">{candidates.length ? "Pick a member…" : "Everyone is already in this team"}</option>
                {candidates.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.name ?? m.email}</option>
                ))}
              </FormSelect>
            </div>
            <div className="col-sm-3">
              <FormLabel htmlFor="team-member-role">Role</FormLabel>
              <FormSelect id="team-member-role" value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
                {(Object.keys(TEAM_ROLE_LABELS) as TeamRole[]).map((r) => (
                  <option key={r} value={r}>{TEAM_ROLE_LABELS[r]}</option>
                ))}
              </FormSelect>
            </div>
            <div className="col-auto">
              <Button type="submit" variant="primary" disabled={busy || !pick}>Add</Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

export default TeamMembersPanel;
