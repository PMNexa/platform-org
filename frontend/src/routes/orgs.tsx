import { Link as RouterLink, useOutletContext } from "react-router";
import type { LinkComponentProps } from "platform-core";
import OrgsScreen from "../screens/OrgsScreen";

/**
 * A real react-router route module, living in this package rather than
 * in `apps/main` - the one deliberate exception to this platform's usual
 * "screen packages carry zero react-router dependency" rule (see root
 * AGENTS.md), made because the host explicitly wants org routing owned
 * here, not hand-written per-host. This still isn't `platform-org`
 * inventing its OWN router: `apps/main`'s `routes.ts` still registers
 * the path and still owns the actual URL - via a RELATIVE path into this
 * file, not a bare package import, since react-router's own `route()`
 * resolves `file` with a plain filesystem read relative to the host's
 * `appDirectory`, not real module resolution (see routes.ts's own
 * comment) - this file is just the leaf component React Router renders
 * there.
 *
 * `useOutletContext<string>()` reads the access token `apps/main`'s
 * `app-shell.tsx` layout route already gated on and passed down via
 * `<Outlet context={accessToken} />` - this package still has no token
 * store or session-reading logic of its own, it just reads whatever the
 * host's layout already decided.
 *
 * No `./+types/orgs` import: react-router's typegen only generates
 * `+types` modules for files under `apps/main`'s own `app/` directory -
 * this file lives outside that, so its types are written by hand instead
 * (there's nothing route-specific to type here beyond what `useOutletContext`
 * already gives).
 */
// The standard react-router route-module shape (meta + default
// component) - every route file in this platform's host app does this
// too, just never linted with oxlint there.
// oxlint-disable-next-line react/only-export-components
export function meta() {
  return [{ title: "Organizations" }];
}

function OrgsLink({ to, className, children, ...rest }: LinkComponentProps) {
  return (
    <RouterLink to={`/${to}`} className={className} {...rest}>
      {children}
    </RouterLink>
  );
}

export default function OrgsRoute() {
  const accessToken = useOutletContext<string>();
  return <OrgsScreen accessToken={accessToken} linkComponent={OrgsLink} />;
}
