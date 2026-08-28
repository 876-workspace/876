# Environment Variables & Config Gaps

Read this before adding a variable an app reads, before wiring a client that
takes a credential or base URL, and before deploying an app whose config
changed. It exists because env gaps are the most expensive recurring failure
on this platform and the least like their symptom.

Companion to `.claude/rules/new-app-guide.md` §6–7 (per-app deployment config)
and `.claude/rules/access-tiers.md` (which credential a caller should hold).

## Why this needs a rule

An env gap almost never reports itself as one. Observed on this repo:

| Gap                                        | What the developer saw                                                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `BILLING_API_URL` unset                    | Silently fell back to `http://localhost:4004` — fine in dev, wrong in production.                                                             |
| `API_INTERNAL_KEY` unset                   | Privileged call downgraded to app-key-only, answered `auth/no-session`; the caller treated it as optional and rendered an empty navbar.       |
| `CRM_API_876_KEY` set to another app's key | Billing resolved a different app and reported "the app finance connection lacks the required scope" — a scope error for a credential problem. |
| `SESSION_COOKIE_SECRET` mismatched         | Every visitor treated as signed out; endless `/login` redirects, no error.                                                                    |

The pattern is always the same: **a missing or wrong value degrades into a
plausible-looking wrong answer somewhere else.** That is what makes it costly.

## The rules

1. **`.env.example` is the contract.** Every variable an app reads must be
   declared there. A variable that is not declared cannot be checked, and will
   be discovered in production.
2. **Mark optional variables `# optional — <why>`.** A variable with a working
   in-code default is optional; everything else is required. Without the
   marker the checker cannot tell "unset because it has a default" from
   "unset because someone forgot".
3. **Run `pnpm check:env` before you deploy, and `pnpm check:env --vercel`
   when config changed.** It compares each app's declared keys against what is
   configured locally and in that app's Vercel production environment, and
   never reads a value.
4. **A fallback base URL is a landmine, not a convenience.** Prefer failing
   loudly over defaulting to `localhost` — a default that works in dev and
   silently misroutes in production is worse than a crash at boot.
5. **Never paste another app's credential to make something work.** An app key
   identifies the app; a borrowed one authenticates as the wrong app and the
   failure surfaces as a permission or scope error. If an app has no key, issue
   one (Console → Apps → _app_ → API Keys) rather than borrowing.
6. **Do not swallow a config-dependent failure.** `?? []` on a call that failed
   because a credential was missing turns an outage into an empty list. Log the
   error's code and message, and let the caller decide.
7. **Log an env error as text, not as an object.** An error object passed as a
   second console argument renders as `{}` in the Next.js overlay.

## When adding a variable

1. Add it to the owning app's `.env.example`, with `# optional — <why>` when it
   has a default.
2. Set it locally.
3. Set it in the deployed environment — Vercel project env, or the app's
   `wrangler.jsonc` / `secrets.required` for a Worker.
4. Add it to `scripts/cloudflare-release-contract.mjs` when the app deploys to
   Cloudflare.
5. Run `pnpm check:env --vercel` and confirm the app reports clean.

## Do not

- Do not read a variable that is not declared in `.env.example`.
- Do not mark a variable optional that has no in-code default.
- Do not default a service base URL to `localhost` in new code.
- Do not borrow another app's API key, in any environment.
- Do not report an env/credential failure only to Sentry — a developer running
  the app locally will never see it.
