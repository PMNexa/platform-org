import { apiFetch } from "./client";

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export async function listOrgs(accessToken: string): Promise<Organization[]> {
  const data = await apiFetch<{ items: Organization[] }>("/api/v1/orgs", accessToken);
  return data.items;
}

export async function createOrg(accessToken: string, name: string): Promise<Organization> {
  return apiFetch<Organization>("/api/v1/orgs", accessToken, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
