import { CrudDetailScreen, useResourcePath, type LinkComponentProps } from "platform-core";
import { Link as RouterLink, useLocation, useNavigate, useOutletContext, useParams } from "react-router";
import TeamMembersPanel from "../screens/TeamMembersPanel";

// oxlint-disable-next-line react/only-export-components
export function meta() {
  return [{ title: "Team" }];
}

function CrudLink({ to, className, children, ...rest }: LinkComponentProps) {
  return (
    <RouterLink to={`/${to}`} className={className} {...rest}>
      {children}
    </RouterLink>
  );
}

/**
 * A team's page - registered by `createOrgsRoutes()` as the teams'
 * `detailFile`: platform-core's generic detail screen (its sub-teams are a
 * tab), then who is in the team.
 */
export default function TeamDetailRoute() {
  const accessToken = useOutletContext<string>();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const resourcePath = useResourcePath();
  const basePath = pathname.split("/").filter(Boolean).slice(0, -1).join("/");

  return (
    <div key={id}>
      <CrudDetailScreen
        baseUrl="/api/v1/teams"
        accessToken={accessToken}
        id={id}
        basePath={basePath}
        linkComponent={CrudLink}
        resourcePath={resourcePath}
        onDeleted={() => navigate(`/${basePath}`)}
      />
      <TeamMembersPanel accessToken={accessToken} teamId={id} />
    </div>
  );
}
