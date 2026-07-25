# Brief — Couriers branding render surfaces (876 Storage Phase 3 prep)

**Tool:** `codex exec` (gpt-5.5), read-only exploration.
**Scope note:** a separate Sonnet agent is already covering the org-profile
settings page, the core API organization model, FastAPI service scaffolding,
migrations, auth tiers, error registry, feature flags, and the Console
UploadThing route. **Do not re-investigate those.** This brief covers only the
_render_ side, which that agent is not touching.

## Why this is needed

876 Storage's first vertical slice lets a Couriers org admin upload an
organization logo. Once a `logoFileId` exists we must render it everywhere the
org is currently represented by a name, initials, or a placeholder. We need a
complete inventory of those surfaces before writing the feature, so the upload
actually changes what users see rather than writing a value nothing reads.

## Questions

Answer each with `file:line` citations and verbatim JSX/code for the exact
element that renders the org identity.

1. **The org workspace shell.** Find the sidebar/topbar/shell component(s) used
   by `apps/couriers/src/app/org/[orgSlug]/**`. Where is the organization's
   name or avatar/initial rendered? Quote the exact element and its props.
2. **Org switcher.** Is there an organization switcher/picker in Couriers? If
   so, where does it render org identity for each entry?
3. **The customer portal.** `apps/couriers/src/app/portal/**` and
   `apps/couriers/src/components/portal/**` — where is the tenant's/org's
   branding rendered (portal header, login screen, emails)? Quote each.
4. **Documents.** Any invoice, manifest, package label, or PDF/print view under
   `apps/couriers/src/app/org/[orgSlug]/**` that renders org identity or has a
   placeholder where a logo would go.
5. **Existing avatar/initials helper.** Is there a shared component or util that
   renders "org initials in a circle" (in `apps/couriers`, or in
   `packages/ui`)? Give its exact path, props, and every call site in Couriers.
   This is the component a logo would slot into.
6. **Tenant vs org.** Couriers has a local `Tenant` Prisma model that mirrors an
   876 org. Does `Tenant` carry any branding fields today (logo, colors, display
   name)? Quote the model. Where does Couriers get the org's display name for
   the shell — the local `Tenant` row, or the platform client?
7. **Image rendering conventions.** Does Couriers use `next/image` anywhere? Is
   there a `remotePatterns`/`images` config in `apps/couriers/next.config.ts`?
   Quote it. This determines what we must add for an R2 asset hostname.

## Return shape

Markdown, one section per question, each with: answer, `file:line` citations,
verbatim code block of the rendering element. Finish with:

- **"Insertion points"** — a ranked list of the specific files/lines that would
  need to change to display an org logo, most important first.
- **"NOT FOUND"** — anything searched for and not located.

Do not modify any file. Do not commit. Output the report only.
