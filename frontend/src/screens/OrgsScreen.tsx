import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "../lib/api/client";
import { createOrg, listOrgs } from "../lib/api/organizations";
import type { Organization } from "../lib/api/organizations";

const createOrgSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required."),
});

type CreateOrgFormValues = z.infer<typeof createOrgSchema>;

export interface OrgsScreenProps {
  /**
   * No token store of its own (see lib/api/client.ts's own docstring) -
   * the host passes in whatever access token it already has (e.g. from
   * platform-auth-frontend's LoginScreen/SignupScreen `onSuccess`
   * callback), scoped to however long the host's own session lasts.
   */
  accessToken: string;
}

function OrgsScreen({ accessToken }: OrgsScreenProps) {
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateOrgFormValues>({ resolver: zodResolver(createOrgSchema) });

  useEffect(() => {
    let cancelled = false;
    listOrgs(accessToken)
      .then((items) => {
        if (!cancelled) setOrgs(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load organizations.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  async function onSubmit(values: CreateOrgFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const org = await createOrg(accessToken, values.name);
      setOrgs((current) => [...(current ?? []), org]);
      reset();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-4">
      <h1 className="h2 mb-4">Organizations</h1>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Create an organization</h2>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="row g-2 align-items-start">
            <div className="col-auto">
              <input
                type="text"
                placeholder="Organization name"
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
                {...register("name")}
              />
              {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
            </div>
            <div className="col-auto">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
          {submitError && <div className="alert alert-danger mt-3 mb-0">{submitError}</div>}
        </div>
      </div>

      {loadError && <div className="alert alert-danger">{loadError}</div>}
      {orgs === null && !loadError && <p>Loading organizations…</p>}
      {orgs !== null && orgs.length === 0 && <p>You don't belong to any organizations yet.</p>}
      {orgs !== null && orgs.length > 0 && (
        <ul className="list-group">
          {orgs.map((org) => (
            <li key={org.id} className="list-group-item d-flex justify-content-between align-items-center">
              {org.name}
              <span className="text-muted">{org.slug}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OrgsScreen;
