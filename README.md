# platform-org

Multi-tenancy module (`Organization` + `OrgMembership`) for the
GoalNexa/`apps/main` platform architecture. See `AGENTS.md` for the full
design — short version: own backend (Django+DRF), own frontend (React),
both packaged so a host app can import them directly (matching
`platform-auth`'s pattern), no source or DB coupling to any other module.

## Running locally

```
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set JWT_SECRET to match whatever issues your tokens
python manage.py migrate
python manage.py runserver
```

```
cd frontend
npm install
npm run dev
```

## License

platform-org is **source-available** under the [PolyForm Shield License 1.0.0](LICENSE).
You may use, modify and share it for any purpose, including inside your
company, **except** providing a product or service that competes with it or
with the licensor's products. That means no hosting it as a paid service and
no selling it or a modified copy of it. For uses the license doesn't allow,
ask about a commercial license. Contributions are accepted under the
[Contributor License Agreement](CONTRIBUTING.md#contributor-license-agreement).

Versions up to and including commit `5ad3787` were published under the
MIT License, and copies of those versions remain available under MIT. Later
versions are PolyForm Shield only.
