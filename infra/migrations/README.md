# Migrations

Migrations are immutable, ordered SQL files. Apply them against PostgreSQL in lexical order:

```bash
for migration in infra/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"; done
```

`0001_identity_and_workspaces.sql` creates the Sprint 02 identity and workspace tables. The command requires a reachable PostgreSQL instance; it was not run in the Arena environment because Docker/PostgreSQL is unavailable there.
