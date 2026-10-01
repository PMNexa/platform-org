import { useState } from "react";
import { CrudDetailScreen, useResourcePath, type LinkComponentProps } from "platform-core";
import { Link as RouterLink, useLocation, useNavigate, useOutletContext, useParams } from "react-router";
import AdminOrgPanel from "../screens/AdminOrgPanel";

// oxlint-disable-next-line react/only-export-components
export function meta() {
  return [{ title: "Organization (admin)" }];
}

function CrudLink({ to, className, children, ...rest }: LinkComponentProps) {
  return (
    <RouterLink to={`/${to}`} className={className} {...rest}>
      {children}
    </RouterLink>
  );
}

/** An org on the system admin's "All organizations" page: the generic detail, then `AdminOrgPanel`. */
export default function AdminOrgDetailRoute() {
  const accessToken = useOutletContext<string>();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const resourcePath = useResourcePath();
  const basePath = pathname.split("/").filter(Boolean).slice(0, -1).join("/");
  const [version, setVersion] = useState(0);
  return (
    <div key={id}>
      <CrudDetailScreen
        key={version}
        baseUrl="/api/v1/all-orgs"
        accessToken={accessToken}
        id={id}
        basePath={basePath}
        linkComponent={CrudLink}
        resourcePath={resourcePath}
        onDeleted={() => navigate(`/${basePath}`)}
      />
      <AdminOrgPanel
        accessToken={accessToken}
        orgId={id}
        onChanged={() => setVersion((v) => v + 1)}
        onDeleted={() => navigate(`/${basePath}`)}
      />
    </div>
  );
}
