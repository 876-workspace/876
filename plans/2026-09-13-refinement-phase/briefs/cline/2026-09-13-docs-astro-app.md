# Brief: empty 876 Docs app (Astro)

Working directory: `/root/projects/876-wt/docs-app` (branch `feat/docs-astro-app`). Work ONLY inside this directory.

## Goal
Create `apps/docs` — a basic, standard, templated Astro site. Empty content, no features. It must install and build inside this pnpm monorepo.

## Steps
1. Create `apps/docs/package.json`:
   - `"name": "@876/docs"`, `"private": true`, `"type": "module"`.
   - scripts: `"dev": "astro dev --port 3008"`, `"build": "astro build"`, `"preview": "astro preview --port 3008"`, `"typecheck": "astro check"`.
   - dependencies: `astro` (latest 5.x or newer stable), devDependencies `@astrojs/check` and `typescript` (match the version of `typescript` used in `apps/console/package.json`).
2. `apps/docs/astro.config.mjs`: `import { defineConfig } from 'astro/config'; export default defineConfig({ site: 'https://876-docs.vercel.app' })`.
3. `apps/docs/tsconfig.json`: `{ "extends": "astro/tsconfigs/strict", "include": [".astro/types.d.ts", "**/*"], "exclude": ["dist"] }`.
4. `apps/docs/src/layouts/base-layout.astro`: minimal HTML shell with `<title>` prop, `<meta name="viewport">`, a `<slot />`, and a small inline `<style>` using a system font stack.
5. `apps/docs/src/pages/index.astro`: uses the layout, title "876 Docs", renders an `<h1>876 Docs</h1>` and nothing else.
6. `apps/docs/public/favicon.svg`: a simple SVG (a rounded square with the text 876).
7. `apps/docs/.gitignore`: `dist/`, `.astro/`, `node_modules/`.
8. `apps/docs/README.md`: 5–10 lines: what it is, `pnpm --filter @876/docs dev`, port 3008.
9. Root `package.json`: add script `"dev:docs": "pnpm --filter @876/docs dev"` next to the other `dev:*` scripts (keep the file otherwise byte-identical; edit only that one line insertion).
10. Run `pnpm install` from the worktree root (lockfile will update), then `pnpm --filter @876/docs build` and `pnpm --filter @876/docs typecheck`. Fix any failures.

## Must NOT
- Touch any other app or package. No git commits. No log files. No UI frameworks, no Starlight, no Tailwind.

## Report
Write `plans/2026-09-13-refinement-phase/reports/cline/2026-09-13-docs-astro-app.md`: files created, versions installed, the exact output of the build and typecheck (last 10 lines each).
