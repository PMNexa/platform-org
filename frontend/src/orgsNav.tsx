import type { NavEntry } from "platform-core";

/** Tabler Icons "building" (outline, MIT) - inlined, no icon font. */
function OrgsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="icon"
      aria-hidden="true"
    >
      <path d="M3 21l18 0" />
      <path d="M9 8l1 0" />
      <path d="M9 12l1 0" />
      <path d="M9 16l1 0" />
      <path d="M14 8l1 0" />
      <path d="M14 12l1 0" />
      <path d="M14 16l1 0" />
      <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16" />
    </svg>
  );
}

/**
 * platform-org's sidebar entries, for the host's AppShell - pass the SAME
 * `basePath` as `createOrgsRoutes(basePath)`, so the link always points
 * where the routes are mounted (`"platform-org"` -> `/platform-org/orgs`).
 * `permission` is what a host filtering by RBAC checks (platform-auth's
 * `filterNavByPermissions`); a host without RBAC can ignore it. One
 * "Organizations" group: the orgs list (an org's page manages its
 * members and invitations) and the invitations sent to me, which need no
 * permission - they're addressed to my email.
 */
export function createOrgsNavItems(basePath: string): NavEntry[] {
  const prefix = basePath.replace(/^\/+|\/+$/g, "");
  const base = `/${prefix ? `${prefix}/` : ""}`;
  return [
    {
      label: "Organizations",
      icon: <OrgsIcon />,
      children: [
        { label: "My organizations", to: `${base}orgs`, permission: "orgs.view" },
        { label: "Invitations", to: `${base}invitations` },
      ],
    },
  ];
}
