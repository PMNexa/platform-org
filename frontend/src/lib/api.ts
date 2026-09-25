import axios from "axios";
import type { AxiosRequestConfig } from "axios";

/**
 * No token store of its own - the host passes the session's access token
 * in. Paths are where a host mounts `platform_org.urls` (`api/v1/`).
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";
const API = "/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiRequest<T>(path: string, accessToken: string, config?: AxiosRequestConfig): Promise<T> {
  const url = `${API_BASE_URL}${API}${path}`;
  try {
    const response = await axios.request<T>({
      url,
      ...config,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...config?.headers },
    });
    return (response.status === 204 ? undefined : response.data) as T;
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    if (!error.response) throw new ApiError(error.message || "Network request failed", 0);
    const { status, data } = error.response;
    const body = data as { message?: unknown; field_errors?: Record<string, string[]> } | null;
    const message = body?.field_errors
      ? Object.values(body.field_errors).flat().join(" ")
      : typeof body?.message === "string"
        ? body.message
        : `Request to ${url} failed with status ${status}`;
    throw new ApiError(message, status);
  }
}

export type OrgRole = "owner" | "admin" | "member";
/** Roles an invitation can carry - ownership is handed over on the members list. */
export type InvitationRole = Exclude<OrgRole, "owner">;

export const ROLE_LABELS: Record<OrgRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };

export function canManage(role: OrgRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export interface OrgSummary {
  id: string;
  name: string;
  my_role: OrgRole | null;
}

export interface Member {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  role: OrgRole;
  joined_at: string;
  /** The signed-in user's own row. */
  is_me: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  role: InvitationRole;
  token: string;
  status: "pending" | "accepted" | "declined";
  expires_at: string;
}

/** An invitation as its addressee sees it. */
export interface ReceivedInvitation extends Omit<Invitation, "status"> {
  status: Invitation["status"];
  expired: boolean;
  org: { id: string; name: string };
  invited_by: { id: string; name: string | null; email: string | null };
  /** Only on the by-token read: whether it's addressed to the signed-in account. */
  for_me?: boolean;
  already_member?: boolean;
}

interface Page<T> {
  items: T[];
}

const ALL = { page_size: 100 };

export function getOrg(accessToken: string, orgId: string): Promise<OrgSummary> {
  return apiRequest<OrgSummary>(`/orgs/${orgId}`, accessToken);
}

export async function listMembers(accessToken: string, orgId: string): Promise<Member[]> {
  const body = await apiRequest<Page<Member>>("/org-members", accessToken, { params: { "filter{org}": orgId, ...ALL } });
  return body.items;
}

export function changeRole(accessToken: string, memberId: string, role: OrgRole): Promise<Member> {
  return apiRequest<Member>(`/org-members/${memberId}`, accessToken, { method: "PATCH", data: { role } });
}

export function removeMember(accessToken: string, memberId: string): Promise<void> {
  return apiRequest<void>(`/org-members/${memberId}`, accessToken, { method: "DELETE" });
}

export async function listPendingInvitations(accessToken: string, orgId: string): Promise<Invitation[]> {
  const body = await apiRequest<Page<Invitation>>("/org-invitations", accessToken, {
    params: { "filter{org}": orgId, "filter{status}": "pending", ...ALL },
  });
  return body.items;
}

export function createInvitation(
  accessToken: string,
  input: { org: string; email: string; role: InvitationRole },
): Promise<Invitation> {
  return apiRequest<Invitation>("/org-invitations", accessToken, { method: "POST", data: input });
}

export function revokeInvitation(accessToken: string, invitationId: string): Promise<void> {
  return apiRequest<void>(`/org-invitations/${invitationId}`, accessToken, { method: "DELETE" });
}

export async function listReceivedInvitations(accessToken: string): Promise<ReceivedInvitation[]> {
  const body = await apiRequest<Page<ReceivedInvitation>>("/org-invitations/received", accessToken);
  return body.items;
}

export function getInvitation(accessToken: string, token: string): Promise<ReceivedInvitation> {
  return apiRequest<ReceivedInvitation>(`/org-invitations/token/${encodeURIComponent(token)}`, accessToken);
}

/** What anyone holding an invitation link may know - no sign-in needed. */
export interface PublicInvitation {
  email: string;
  role: InvitationRole;
  open: boolean;
  org: { name: string };
  invited_by: { name: string | null };
  /** Whether the invited email has an account; `null` = unknown (or the invitation is closed). */
  has_account: boolean | null;
  /** The host's signup page, if it told the backend (`PLATFORM_ORG_SIGNUP_PAGE`). */
  signup_page: string | null;
}

export async function getPublicInvitation(token: string): Promise<PublicInvitation> {
  const url = `${API_BASE_URL}${API}/org-invitations/token/${encodeURIComponent(token)}/public`;
  try {
    return (await axios.get<PublicInvitation>(url)).data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) throw new ApiError("This invitation link isn't valid.", 404);
    throw error;
  }
}

export function acceptInvitation(accessToken: string, token: string): Promise<{ org: { id: string; name: string } }> {
  return apiRequest(`/org-invitations/token/${encodeURIComponent(token)}/accept`, accessToken, { method: "POST" });
}

export function declineInvitation(accessToken: string, token: string): Promise<void> {
  return apiRequest<void>(`/org-invitations/token/${encodeURIComponent(token)}/decline`, accessToken, { method: "POST" });
}

export function errorMessage(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown);
}
