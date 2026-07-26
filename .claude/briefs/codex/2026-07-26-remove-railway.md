# Brief: remove Railway from the codebase

## Why

Railway is dead infrastructure. The 876 identity API used to run at
`876-api-production-e78f.up.railway.app`; that deployment has been **deleted**
(every path returns Railway's "Application not found"). The platform now
deploys entirely on Cloudflare: Next.js apps as OpenNext Workers, FastAPI
services as Cloudflare Containers.

A previous phase already repointed every app's `API_URL` at the Cloudflare
Container Worker. This phase removes the leftover Railway config files, docs,
and stale references so nothing points at or documents a platform we no longer
use.

## Delete these files entirely

```
railway.toml
apps/api/railway.toml
apps/876/railway.toml
apps/console/railway.toml
apps/couriers/railway.toml
apps/enterprise/railway.toml
apps/billing/railway.toml
apps/billing-api/railway.toml
apps/billing-api/railway.scheduler.toml
apps/storage-api/railway.toml
docs/railway.md
```

## Fix the one test that reads a deleted file

`apps/billing/src/lib/api/backend-boundary.test.ts` — the test
`'does not let the Billing UI run database migrations'` does:

```ts
const railway = readFileSync(join(APP_ROOT, 'railway.toml'), 'utf8')
...
expect(railway).not.toMatch(/prisma\s+migrate/)
```

Deleting `apps/billing/railway.toml` makes this throw. **Remove the
`readFileSync` of `railway.toml` and its `expect(railway)` assertion.** Keep the
two `packageJson.scripts` assertions — they still enforce the real boundary
(the Billing UI package must not carry migration scripts). Do not invent a
replacement assertion against `wrangler.jsonc` or the CI workflow; the CI
workflow legitimately runs `prisma migrate deploy` for billing, so such an
assertion would be wrong.

Also remove the now-unused `readFileSync` import **only if** nothing else in
the file uses it (it is also used by the `next.config.ts` and `package.json`
reads, so it almost certainly must stay — check before touching the import).

## Update these references

Keep edits surgical and factually correct. Do not rewrite whole documents.

| File                                                                                                                                                               | Current problem                                                                                          | Required outcome                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` (line ~43)                                                                                                                                             | "Railway remains dual-run only during cutover (`docs/railway.md`)"                                       | Drop that clause and the `docs/railway.md` link. Cloudflare is now the only target.                                                                   |
| `GEMINI.md` (line ~88)                                                                                                                                             | Claims `@876/api` "cannot run on Cloudflare — deploy it separately on Railway, Fly.io, or Render"        | Factually wrong now. State that FastAPI services deploy as Cloudflare Containers (Dockerfile + Worker front door), matching `CLAUDE.md`.              |
| `docs/cloudflare.md` (19 refs)                                                                                                                                     | Multiple Railway/dual-run/cutover mentions, plus a migration-mapping table row                           | Remove Railway rows, the dual-run/cutover framing, and any link to `docs/railway.md`. Keep all Cloudflare content intact.                             |
| `docs/widgets.md` (lines ~54-57)                                                                                                                                   | Documents Railway private networking, `.railway.internal` hosts, and an `up.railway.app` public fallback | Remove the Railway networking paragraph. Keep whatever is true about the Cloudflare Worker URL.                                                       |
| `docs/storage.md` (line ~185)                                                                                                                                      | Note about `railway.toml` being "dual-run only during cutover"                                           | Remove the note.                                                                                                                                      |
| `apps/billing/BILLING_ENGINE.md` (line ~133)                                                                                                                       | "Railway cron, a queue, or another scheduler may trigger the sweep"                                      | Drop "Railway cron" from the list; the Cloudflare Cron trigger is the real mechanism.                                                                 |
| `apps/billing-api/wrangler.jsonc` (line ~28)                                                                                                                       | Comment: "Mirrors Railway apps/billing-api/railway.scheduler.toml (_/5 _ \* \* \*)"                      | The referenced file is being deleted. Reword to describe the cron without the Railway reference.                                                      |
| `apps/billing-api/tests/test_environment_check.py` (line ~23)                                                                                                      | Test fixture uses `http://876-api.railway.internal`                                                      | Replace with a neutral non-Railway URL that still satisfies the assertion's intent. **Run the test after changing it.**                               |
| `apps/console/src/app/layout.tsx` (~15), `apps/couriers/src/app/layout.tsx` (~18), `apps/enterprise/src/app/layout.tsx` (~20), `apps/876/src/app/layout.tsx` (~29) | Comment says an empty string slips through "as Railway does for an unset-but-declared variable"          | Keep the guard logic **exactly as is** — only reword the parenthetical so it no longer attributes the behaviour to Railway. The code must not change. |
| `.claude/config.json` (lines ~14-15)                                                                                                                               | Registers a `railway` MCP server at `https://mcp.railway.com`                                            | Remove that MCP server entry.                                                                                                                         |
| `.claude/settings.local.json` (lines ~77-84)                                                                                                                       | Allowlists `railway` CLI commands                                                                        | Remove those permission entries.                                                                                                                      |

## Do NOT touch

- **`.claude/briefs/**`** — briefs are the committed historical record of what
was asked of a delegated tool and when. Rewriting them would falsify that
record. Leave every Railway mention in them alone, including
`.claude/briefs/codex/2026-07-26-service-urls-off-railway.md`.
- Any `wrangler.jsonc` `vars` block — the previous phase already fixed those.
- `apps/api/Dockerfile` build logic. It has a comment mentioning Railway
  ("Used by Railway when Root Directory is set to apps/api"); reword **only**
  that comment, change no build steps.
- Do not commit. The orchestrating agent stages and commits.

## Verification (all must pass)

```bash
# 1. No railway.toml survives
find . -name "railway*.toml" -not -path "*/node_modules/*"   # expect no output

# 2. No Railway references outside the historical briefs
grep -rn -i "railway" --include="*.md" --include="*.ts" --include="*.tsx" \
  --include="*.py" --include="*.json" --include="*.jsonc" . \
  | grep -v node_modules | grep -v "^\./\.git/" | grep -v "\.claude/briefs/"
# expect no output

# 3. The touched tests still pass
pnpm --filter @876/billing-app test -- backend-boundary
pnpm --filter @876/billing-api test -- test_environment_check

# 4. Formatting
pnpm exec prettier --check "**/*.{md,ts,tsx,json,jsonc}"
```

Report which files you deleted, which you edited, and the result of each
verification command.
