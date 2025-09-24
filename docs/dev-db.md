Dev Database & Prisma Operations (Windows / PowerShell)
=====================================================

Purpose: Quick reference for setting up and maintaining the local PostgreSQL database and running ad‑hoc SQL with Prisma + PowerShell without hitting common errors (P1000, P1003, quoting issues, collation mismatch).

## 1. Environment Variable

`.env` must contain:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/deep-dashboard?schema=public
```

When running Prisma CLI directly in a *new* PowerShell session, export it if you rely on `--schema` only:

```powershell
$Env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/deep-dashboard?schema=public"
```

Check:

```powershell
$Env:DATABASE_URL
```

## 2. Common Errors

| Code  | Meaning                                                    | Fix |
|-------|------------------------------------------------------------|-----|
| P1000 | Auth failed (wrong password or missing env var)            | Reset password or set `$Env:DATABASE_URL` |
| P1003 | Database does not exist                                    | Create DB (see template0 workaround) |

## 3. Creating Database (Collation Mismatch Workaround)

If `CREATE DATABASE` fails with template1 collation mismatch (PostgreSQL 17 on Windows):

```powershell
"CREATE DATABASE \"deep-dashboard\" WITH TEMPLATE template0 ENCODING 'UTF8';" | npx prisma db execute --stdin --url "postgresql://postgres:postgres@localhost:5432/postgres"
```

## 4. Pushing Schema

```powershell
npx prisma db push
```

This creates tables (`User`, `Account`, `Session`, etc.) in the target database.

## 5. Running Raw SQL (SELECT / UPDATE)

`prisma db execute` is primarily for DDL & mutations; it will show `Script executed successfully.` even for a `SELECT` but **does not print result rows**. Use one of these patterns:

### A. PowerShell Here‑String (recommended)
```powershell
@"
UPDATE "User" SET "woreda"='Godey' WHERE lower("woreda")='gode';
"@ | npx prisma db execute --stdin --url "postgresql://postgres:postgres@localhost:5432/deep-dashboard?schema=public"
```

### B. Single‑Quoted String
```powershell
'UPDATE "User" SET "woreda" = ''Godey'' WHERE lower("woreda") = ''gode'';' | npx prisma db execute --stdin --url "postgresql://postgres:postgres@localhost:5432/deep-dashboard?schema=public"
```

### C. Use psql For Visible Result Sets
Add PostgreSQL `bin` directory to PATH or call full path:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -d deep-dashboard -c "SELECT email, region, woreda FROM \"User\";"
```

## 6. Verifying Data With Prisma (Indirect)

Because `prisma db execute` hides SELECT output, create a temporary script if you need to view rows:

```ts
// scripts/show-users.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const users = await prisma.user.findMany({ select: { email: true, region: true, woreda: true } })
  console.table(users)
}
main().finally(()=>prisma.$disconnect())
```

Run:
```powershell
node scripts/show-users.ts
```

## 7. Canonical Naming Rule

Use only `Godey` (not `Gode`). One‑off normalization SQL:

```powershell
@"
UPDATE "User" SET "woreda"='Godey' WHERE lower("woreda")='gode';
"@ | npx prisma db execute --stdin --url "postgresql://postgres:postgres@localhost:5432/deep-dashboard?schema=public"
```

## 8. Password Reset (If Forgotten)

Temporary `trust` method (edit `pg_hba.conf`), restart service, then:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -d postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

Revert `pg_hba.conf` to `scram-sha-256` and restart again.

## 9. Quick Diagnostic Flow

1. `netstat -ano | Select-String ':5432'` → port listening?
2. `"SELECT 1;" | npx prisma db execute --stdin --url <postgres-url>` → auth ok?
3. If P1003 → create DB via template0.
4. `npx prisma db push`.
5. Run app / login (auto-provisions user).
6. Apply data corrections (e.g. woreda normalization).

## 10. Avoiding PowerShell Quoting Pitfalls

- Do not rely on backslash escaping inside `"..."`.
- Use here-strings for multi-line or embedded quotes.
- Single quotes (`'...'`) treat everything literally—double-up single quotes inside if needed.

## 11. Production / Render Note

On Render you **do not** create the DB manually. The managed Postgres instance provides `DATABASE_URL`; the service does `prisma db push` at startup (Dockerfile `prisma db push` stage or a separate migration step). Ensure environment variable is set before the Next.js server boot.

---
Last updated: 2025-09-24
