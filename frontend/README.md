# platform-org-frontend

The `Organization` type plus its own suggested URL segments (`ORGS_PATH`/
`ORGS_NEW_PATH`/`orgsEditPath`), consumed as a `file:` dependency by
`apps/main` - see root `AGENTS.md`'s "Frontend half" section for the
module-packaging convention this follows, and `src/index.ts`'s own
docstring for what this package exports and why. No screens/route
modules of its own - `apps/main`'s `routes.ts` registers `/api/v1/orgs`
straight off `platform-core`'s `createCrudRoutes` (Organization has no
extra per-resource composition to justify one, unlike goalnexa's own
`GoalsEditScreen`/`MetricsEditScreen`).

No standalone dev app of its own (`apps/main` is the only real host) -
`npm run build` here just typechecks (`tsc -b`).
