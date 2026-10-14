import { useEffect } from "react";
import { CrudListScreen, SegmentedControl, type LinkComponentProps } from "platform-core";
import { Link as RouterLink, useLocation, useOutletContext, useSearchParams } from "react-router";
import TeamChartScreen from "../screens/TeamChartScreen";

// oxlint-disable-next-line react/only-export-components
export function meta() {
  return [{ title: "Teams" }];
}

function CrudLink({ to, className, children, ...rest }: LinkComponentProps) {
  return (
    <RouterLink to={`/${to}`} className={className} {...rest}>
      {children}
    </RouterLink>
  );
}

type View = "chart" | "list";
const VIEW_KEY = "platform-org:teams-view";

function storedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "chart";
  } catch {
    return "chart";
  }
}

/**
 * The teams page - registered by `createOrgsRoutes()` as the teams'
 * `listFile`: an org chart (`TeamChartScreen` - teams and their people,
 * managed in place) or the generic list. `?view=` picks one; with none,
 * the last pick in this browser (else the chart).
 */
export default function TeamsRoute() {
  const accessToken = useOutletContext<string>();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const basePath = pathname.split("/").filter(Boolean).join("/");
  const asked = params.get("view");
  // The server can't read the remembered pick: render the chart, then
  // switch after hydration (an effect, so both renders agree).
  const view: View = asked === "list" ? "list" : "chart";
  useEffect(() => {
    if (!asked && storedView() === "list") setParams({ view: "list" }, { replace: true });
  }, [asked, setParams]);

  function pick(next: View) {
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Private mode: the URL still carries it.
    }
    setParams({ view: next }, { replace: true });
  }

  return (
    <>
      <div className="d-flex align-items-center mb-3">
        <SegmentedControl
          label="Show teams as"
          options={[
            { value: "chart", label: "Org chart" },
            { value: "list", label: "List" },
          ]}
          value={view}
          onChange={pick}
          variant="secondary"
        />
      </div>
      {view === "chart" ? (
        <TeamChartScreen accessToken={accessToken} teamsPath={basePath} linkComponent={CrudLink} />
      ) : (
        <CrudListScreen
          key={basePath}
          baseUrl="/api/v1/teams"
          basePath={basePath}
          accessToken={accessToken}
          linkComponent={CrudLink}
        />
      )}
    </>
  );
}
