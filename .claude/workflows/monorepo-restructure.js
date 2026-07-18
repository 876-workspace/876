export const meta = {
  name: 'monorepo-restructure',
  description:
    'Migrate the 876 platform from one Next.js app into consumer/enterprise/admin apps over shared packages',
  whenToUse:
    'Run to continue the apps/* extraction after the @876/platform and @876/auth-ui packages exist. Resumable: each phase verifies before the next begins.',
  phases: [
    {
      title: 'Audit',
      detail: 'Classify every src/ file by target app/package',
    },
    {
      title: 'Platform',
      detail: 'Extract src/lib + src/types into @876/platform',
    },
    {
      title: 'Apps',
      detail: 'Create consumer/enterprise/admin apps in parallel',
    },
    {
      title: 'Verify',
      detail: 'Typecheck + build each workspace, prove admin isolation',
    },
  ],
}

// ---------------------------------------------------------------------------
// Schemas — structured outputs keep each agent's result machine-checkable.
// ---------------------------------------------------------------------------

const AUDIT_SCHEMA = {
  type: 'object',
  required: ['platform', 'consumer', 'enterprise', 'admin', 'shared'],
  properties: {
    platform: {
      type: 'array',
      items: { type: 'string' },
      description: 'Paths that move to packages/platform',
    },
    consumer: { type: 'array', items: { type: 'string' } },
    enterprise: { type: 'array', items: { type: 'string' } },
    admin: {
      type: 'array',
      items: { type: 'string' },
      description: 'Admin-only; must land in apps/admin/src/lib/admin',
    },
    shared: {
      type: 'array',
      items: { type: 'string' },
      description: 'Already-extracted package code (core/db/ui/sdk/auth-ui)',
    },
    notes: { type: 'string' },
  },
}

const MIGRATION_SCHEMA = {
  type: 'object',
  required: ['workspace', 'status', 'movedCount'],
  properties: {
    workspace: { type: 'string' },
    status: { type: 'string', enum: ['green', 'partial', 'blocked'] },
    movedCount: { type: 'number' },
    importRewrites: { type: 'number' },
    failingCommand: { type: 'string' },
    summary: { type: 'string' },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['workspace', 'typecheck', 'build', 'isolationOk'],
  properties: {
    workspace: { type: 'string' },
    typecheck: { type: 'boolean' },
    build: { type: 'boolean' },
    isolationOk: {
      type: 'boolean',
      description: 'true if no cross-app admin import leaked',
    },
    details: { type: 'string' },
  },
}

// ---------------------------------------------------------------------------
// Phase 1 — Audit. One reader classifies the whole src/ tree.
// ---------------------------------------------------------------------------

phase('Audit')
const audit = await agent(
  `Read the structure under /workspaces/876/src. Classify every file/directory into exactly one bucket for the multi-app restructure:
   - platform: shared server logic (src/lib/service, src/lib/auth, src/lib/analytics, src/lib/errors, src/lib/app, src/lib/posthog, src/lib/utils.ts, src/lib/prisma.ts, src/types/*). Goes to packages/platform.
   - consumer: src/app/(consumer)/app/*, auth pages (login/register/recover/reset-password/verify-email), oauth/, .well-known/, callback/, serwist+PWA, src/app/api/(auth|users|features|organizations|memberships), consumer components/stores/hooks.
   - enterprise: src/app/(enterprise)/org/*, src/components/enterprise.
   - admin: src/app/(admin)/a/*, src/app/api/admin, src/components/admin, src/lib/sdk/admin, src/app/api/_shared/internal-admin.ts. These are ADMIN-ONLY and must be isolated to apps/admin/src/lib/admin.
   - shared: anything already living in packages/* (core, db, ui, sdk, auth-ui).
   Return the path lists. Be exhaustive; do not invent paths.`,
  { schema: AUDIT_SCHEMA, label: 'audit:src-tree' }
)

log(
  `Audit: platform=${audit.platform.length} consumer=${audit.consumer.length} enterprise=${audit.enterprise.length} admin=${audit.admin.length}`
)

// ---------------------------------------------------------------------------
// Phase 2 — Platform extraction. This is the barrier: every app depends on it,
// so it must be green before any app work starts.
// ---------------------------------------------------------------------------

phase('Platform')
const platform = await agent(
  `Create the @876/platform workspace package at packages/platform.
   1. Scaffold package.json (private, type module) with a subpath exports map for service, auth/*, analytics, errors, types/*, utils, db; deps on @876/core, @876/db, server-only. Add a tsconfig.json.
   2. Move these source paths into packages/platform/src, preserving structure: ${JSON.stringify(audit.platform)}.
   3. Remove any type/error modules that duplicate packages/core (dedupe against @876/core).
   4. Update the moved files' internal imports: '@/lib/<x>' -> relative within platform, '@/types/<x>' -> '../types/<x>'. Convert app-alias imports to package-relative ones so the package is self-contained.
   5. In the remaining root src/, rewrite '@/lib/<x>' and '@/types/<x>' imports that now live in platform to '@876/platform/...'.
   6. Update guards.ts and redirect-after-login.ts to build absolute cross-app URLs from NEXT_PUBLIC_CONSUMER_URL / NEXT_PUBLIC_ENTERPRISE_URL / NEXT_PUBLIC_ADMIN_URL (defaults to localhost:3000/3001/3002).
   Run 'pnpm install --no-frozen-lockfile' then 'pnpm typecheck'. Report status green only if typecheck passes.`,
  {
    schema: MIGRATION_SCHEMA,
    label: 'extract:@876/platform',
    isolation: 'worktree',
  }
)

if (platform.status !== 'green') {
  log(
    `Platform extraction not green (${platform.status}): ${platform.failingCommand ?? ''}. Stopping before app split.`
  )
  return { audit, platform, aborted: true }
}

// ---------------------------------------------------------------------------
// Phase 3 — Apps. Pipeline each app through migrate -> verify independently,
// so consumer can be verifying while admin is still migrating. Worktree
// isolation prevents the three file-moving agents from colliding.
// ---------------------------------------------------------------------------

phase('Apps')
const APPS = [
  {
    name: '@876/consumer',
    dir: 'apps/consumer',
    port: 3000,
    files: audit.consumer,
    extra:
      'Owns all auth infrastructure. Wire src/app/auth/page.tsx to <AuthFlow mode="consumer" />. Depends on @876/sdk + @876/auth-ui. Keep serwist/PWA + Sentry + PostHog.',
  },
  {
    name: '@876/enterprise',
    dir: 'apps/enterprise',
    port: 3001,
    files: audit.enterprise,
    extra:
      'Wire /auth to <AuthFlow mode="enterprise" /> and /onboarding to <AuthFlow mode="business-onboarding" />. No @876/sdk-for-3p, no serwist, no PostHog direct.',
  },
  {
    name: '@876/admin-app',
    dir: 'apps/admin',
    port: 3002,
    files: audit.admin,
    extra:
      'Move admin-only logic into apps/admin/src/lib/admin (NOT a shared package). Wire /auth to <AuthFlow mode="admin" />. Add ESLint no-restricted-imports banning "admin" paths in the consumer + enterprise eslint configs.',
  },
]

const appResults = await pipeline(
  APPS,
  (app) =>
    agent(
      `Create the ${app.name} Next.js app at ${app.dir} (dev port ${app.port}).
       1. Scaffold package.json, next.config.ts, tsconfig.json (paths @/* -> ./src/*), components.json, vercel.json.
       2. Move these paths from root src/, dropping the route-group wrapper directories: ${JSON.stringify(app.files)}.
       3. Add a root layout, globals.css, providers.
       4. Rewrite imports: shared logic -> @876/platform/*, UI -> @876/ui, auth UI -> @876/auth-ui.
       5. ${app.extra}
       Run 'pnpm --filter ${app.name} exec tsc --noEmit'. Report movedCount and status.`,
      {
        schema: MIGRATION_SCHEMA,
        label: `build:${app.dir}`,
        phase: 'Apps',
        isolation: 'worktree',
      }
    ),
  (migration, app) =>
    agent(
      `Verify the ${app.name} app at ${app.dir}.
       Run: 'pnpm --filter ${app.name} exec tsc --noEmit' and 'pnpm --filter ${app.name} build'.
       Then prove admin isolation: grep ${app.dir}/src for any import path containing '/admin/' or '@876/admin'. For consumer and enterprise this MUST return nothing; for the admin app it is expected.
       Report typecheck, build, and isolationOk booleans.`,
      { schema: VERIFY_SCHEMA, label: `verify:${app.dir}`, phase: 'Verify' }
    )
)

// ---------------------------------------------------------------------------
// Phase 4 — Roll-up. Surface anything that did not reach green.
// ---------------------------------------------------------------------------

phase('Verify')
const results = appResults.filter(Boolean)
const broken = results.filter((r) => !r.typecheck || !r.build)
const leaked = results.filter((r) => !r.isolationOk)

log(
  `Apps verified: ${results.length}/${APPS.length}. Broken: ${broken.length}. Isolation leaks: ${leaked.length}.`
)

return {
  audit,
  platform,
  apps: results,
  ready: broken.length === 0 && leaked.length === 0,
}
