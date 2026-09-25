/**
 * Package entry point - what a consuming app (apps/main) imports.
 *
 * Membership: `OrgMembersPanel` (an org's members and invitations - the
 * org page shows it), `InvitationsScreen` (invitations sent to me) and
 * `AcceptInvitationScreen` (an invitation link's landing page), all
 * mounted by `createOrgsRoutes`.
 *
 * The `Organization` type plus `createOrgsRoutes(basePath)` and
 * `createOrgsNavItems(basePath)` (its sidebar entries) - `apps/main`
 * owns every actual URL for this resource itself (it calls
 * `createOrgsRoutes` with whatever mount prefix its own `routes.ts`
 * decides; the sidebar nav
 * link and the home page's quick link both use a plain string for the
 * same reason - see their own files), so there's no `ORGS_PATH`/
 * `ORGS_PATHS`/etc to export here anymore.
 *
 * No `OrgsScreen`/`OrgsCreateScreen`/`OrgsEditScreen` either -
 * Organization has no extra per-resource composition (unlike goalnexa's
 * `GoalsEditScreen`/`MetricsEditScreen`) to justify a wrapper; those
 * three screens used to exist but nothing imported them once routing
 * centralized into `platform-core` - dead code, removed rather than
 * left around.
 */
export type { Organization } from "./types";
export { createOrgsPublicRoutes, createOrgsRoutes } from "./orgsRoutes";
// Its sidebar entries - same `basePath` as `createOrgsRoutes`.
export { createOrgsNavItems } from "./orgsNav";
export { default as OrgMembersPanel } from "./screens/OrgMembersPanel";
export type { OrgMembersPanelProps } from "./screens/OrgMembersPanel";
export { default as InvitationsScreen } from "./screens/InvitationsScreen";
export type { InvitationsScreenProps } from "./screens/InvitationsScreen";
export { default as AcceptInvitationScreen } from "./screens/AcceptInvitationScreen";
export type { AcceptInvitationScreenProps } from "./screens/AcceptInvitationScreen";
export type { Invitation, Member, OrgRole, ReceivedInvitation } from "./lib/api";
