/** The host's mount prefix for this module (`"platform-org"`), read off a
 * page's own URL: every page here lives at `<prefix>/orgs/...` or
 * `<prefix>/invitations/...`. */
export function mountPrefix(pathname: string, section: "orgs" | "invitations"): string {
  const segments = pathname.split("/").filter(Boolean);
  const index = segments.lastIndexOf(section);
  return segments.slice(0, index < 0 ? 0 : index).join("/");
}

export function joinPath(...parts: string[]): string {
  return `/${parts.filter(Boolean).join("/")}`;
}
