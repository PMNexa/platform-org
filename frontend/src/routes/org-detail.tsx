import { CrudDetailScreen, useResourcePath, type LinkComponentProps } from "platform-core";
import { Link as RouterLink, useLocation, useNavigate, useOutletContext, useParams } from "react-router";
import OrgMembersPanel from "../screens/OrgMembersPanel";
import { joinPath, mountPrefix } from "./paths";

// oxlint-disable-next-line react/only-export-components
export function meta() {
  return [{ title: "Organization" }];
}

function CrudLink({ to, className, children, ...rest }: LinkComponentProps) {
  return (
    <RouterLink to={`/${to}`} className={className} {...rest}>
      {children}
    </RouterLink>
  );
}

/**
 * An org's page - registered by `createOrgsRoutes()` as the orgs'
 * `detailFile`: platform-core's generic detail screen (same props its own
 * `crud-detail.tsx` passes), then the members panel.
 */
export default function OrgDetailRoute() {
  const accessToken = useOutletContext<string>();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const resourcePath = useResourcePath();
  const prefix = mountPrefix(pathname, "orgs");
  const listPath = joinPath(prefix, "orgs");

  return (
    <div key={id}>
      <CrudDetailScreen
        baseUrl="/api/v1/orgs"
        accessToken={accessToken}
        id={id}
        basePath={listPath.slice(1)}
        linkComponent={CrudLink}
        resourcePath={resourcePath}
        onDeleted={() => navigate(listPath)}
      />
      <OrgMembersPanel
        accessToken={accessToken}
        orgId={id}
        invitationUrl={(token) => `${window.location.origin}${joinPath(prefix, "invitations", token)}`}
        onLeft={() => navigate(listPath)}
      />
    </div>
  );
}
