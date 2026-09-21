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

MIT — see [LICENSE](LICENSE).
