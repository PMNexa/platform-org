import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, CardTitle } from "platform-core";
import { apiRequest } from "../lib/api";

export interface AdminOrgPanelProps {
  accessToken: string;
  orgId: string;
  /** After a change the detail view above should show. */
  onChanged?: () => void;
  /** After the org was deleted - the host navigates away. */
  onDeleted?: () => void;
}

interface AdminOrg {
  id: string;
  name: string;
  member_count: number;
  pending_invitations: number;
  limits: { max_members?: number; max_goals?: number };
}

interface AdminMember {
  user_id: string;
  name: string | null;
  email: string | null;
  role: string;
  status: string;
  joined_at: string;
}

const LIMITS: { key: "max_members" | "max_goals"; label: string }[] = [
  { key: "max_members", label: "Members (incl. pending invitations)" },
  { key: "max_goals", label: "Goals" },
];

/**
 * The system admin's tools for one organization (`/api/v1/all-orgs/<id>`,
 * platform-org's `AdminOrganizationViewSet`): its members, its own limits
 * (blank = the system setting, 0 = unlimited), handing ownership to
 * someone (an org whose owner left), and deleting it with its goals.
 */
function AdminOrgPanel({ accessToken, orgId, onChanged, onDeleted }: AdminOrgPanelProps) {
  const [org, setOrg] = useState<AdminOrg | null>(null);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [owner, setOwner] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest<AdminOrg>(`/all-orgs/${orgId}`, accessToken),
      apiRequest<AdminMember[]>(`/all-orgs/${orgId}/members`, accessToken),
      apiRequest<{ items: { id: string; name: string; email: string }[] }>("/users?page_size=100&sort=name", accessToken)
        .then((page) => page.items)
        .catch(() => []),
    ])
      .then(([row, rows, everyone]) => {
        if (cancelled) return;
        setOrg(row);
        setMembers(rows);
        setUsers(everyone);
        setLimits(Object.fromEntries(LIMITS.map(({ key }) => [key, row.limits[key] === undefined ? "" : String(row.limits[key])])));
      })
      .catch((thrown: unknown) => !cancelled && setError(thrown instanceof Error ? thrown.message : String(thrown)));
    return () => {
      cancelled = true;
    };
  }, [accessToken, orgId, version]);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(done);
      setVersion((v) => v + 1);
      onChanged?.();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
    } finally {
      setBusy(false);
    }
  }

  if (!org) {
    return (
      <Card className="mt-3">
        <CardBody>{error ? <div className="text-danger">{error}</div> : <div className="text-secondary">Loading…</div>}</CardBody>
      </Card>
    );
  }

  const parsedLimits = Object.fromEntries(
    Object.entries(limits)
      .filter(([, value]) => value.trim() !== "")
      .map(([key, value]) => [key, Number(value)]),
  );
  const badLimit = Object.values(parsedLimits).some((n) => !Number.isInteger(n) || n < 0);
  const candidates = users.length ? users : members.map((m) => ({ id: m.user_id, name: m.name ?? "", email: m.email ?? "" }));

  return (
    <div className="d-flex flex-column gap-3 mt-3">
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <span className="card-subtitle ms-auto text-secondary small">
            {org.member_count} active · {org.pending_invitations} invited
          </span>
        </CardHeader>
        <div className="table-responsive">
          <table className="table table-vcenter card-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id}>
                  <td>
                    {m.name ?? "Unknown user"} <span className="text-secondary">{m.email}</span>
                  </td>
                  <td className="text-capitalize">{m.role}</td>
                  <td className="text-capitalize">{m.status}</td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-secondary">Nobody - give it an owner below, or delete it.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <CardBody className="border-top">
          <label className="form-label" htmlFor="org-owner">Make someone the owner</label>
          <div className="d-flex gap-2">
            <select id="org-owner" className="form-select" value={owner} onChange={(event) => setOwner(event.target.value)}>
              <option value="">Pick a user…</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              disabled={busy || !owner}
              onClick={() =>
                void run(
                  () => apiRequest(`/all-orgs/${orgId}/transfer-owner`, accessToken, { method: "POST", data: { user_id: owner } }),
                  "Ownership transferred - previous owners are now admins.",
                )
              }
            >
              Transfer
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limits</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="row g-2">
            {LIMITS.map(({ key, label }) => (
              <div key={key} className="col-12 col-md-6">
                <label className="form-label" htmlFor={`limit-${key}`}>{label}</label>
                <input
                  id={`limit-${key}`}
                  type="number"
                  min={0}
                  className="form-control"
                  placeholder="System setting"
                  value={limits[key] ?? ""}
                  onChange={(event) => setLimits((prev) => ({ ...prev, [key]: event.target.value }))}
                />
              </div>
            ))}
          </div>
          <small className="form-hint mt-2">Blank: the system-wide limit (System › Settings › Limits). 0: unlimited.</small>
          <Button
            className="mt-3"
            variant="primary"
            disabled={busy || badLimit}
            onClick={() =>
              void run(
                () => apiRequest(`/all-orgs/${orgId}`, accessToken, { method: "PATCH", data: { limits: parsedLimits } }),
                "Limits saved.",
              )
            }
          >
            Save limits
          </Button>
        </CardBody>
      </Card>

      {notice && <div className="alert alert-success mb-0">{notice}</div>}
      {error && <div className="alert alert-danger mb-0" role="alert">{error}</div>}

      <Card className="border-danger">
        <CardHeader>
          <CardTitle>Delete organization</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-secondary">Deletes {org.name}, its memberships and invitations, and every goal and cycle filed under it.</p>
          <label className="form-check">
            <input className="form-check-input" type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} />
            <span className="form-check-label">I understand this can't be undone.</span>
          </label>
          <Button
            variant="danger"
            disabled={busy || !confirm}
            onClick={() =>
              void run(async () => {
                await apiRequest(`/all-orgs/${orgId}`, accessToken, { method: "DELETE" });
                onDeleted?.();
              }, "Deleted.")
            }
          >
            Delete {org.name}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

export default AdminOrgPanel;
