# platform-org-frontend

Screens + route modules for platform-org's `Organization` CRUD
(`OrgsScreen`/`OrgsCreateScreen`/`OrgsEditScreen`), consumed as a `file:`
dependency by `apps/main` - see root `AGENTS.md`'s "Frontend half"
section for the module-packaging convention this follows, and
`src/index.ts`'s own docstring for what this package exports and why.

No standalone dev app of its own (`apps/main` is the only real host) -
`npm run build` here just typechecks (`tsc -b`).
