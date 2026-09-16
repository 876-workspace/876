# Task: Give the 876 Billing no-access screen a real Sign out + switch-account action

## Why (context)

876 Billing's `/no-access` page (`apps/billing/src/app/no-access/page.tsx`) currently
shows only a message. The platform no-access UX standard (ADR-013) requires every
no-access screen to also offer a **real Sign out** (clear the session, THEN navigate to
`/login`) plus a way to **go to the 876 account**. A plain `<Link href="/login">` is wrong:
it leaves the session active and the login page bounces straight back to no-access.

Enterprise and couriers already meet the standard. Mirror them for Billing.

## Exact file scope (do ONLY these — touch nothing else)

1. CREATE `apps/billing/src/app/no-access/_components/no-access-actions.tsx`
2. EDIT `apps/billing/src/app/no-access/page.tsx` (render the new component; keep the
   existing redirect + message)
3. EDIT `apps/billing/src/app/no-access/page.test.tsx` (add a test that the actions render)

Do NOT create env files, do NOT touch the shell, do NOT change any other page.

## Step 1 — create the client component

Create EXACTLY this file at
`apps/billing/src/app/no-access/_components/no-access-actions.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'

import { request } from '@/lib/client/request'

/**
 * No-access actions for 876 Billing. Sign out clears the session BEFORE
 * navigating — a plain link to /login would leave the session active and bounce
 * straight back here (ADR-013 — no-access UX standard). Billing authenticates in
 * the enterprise realm through its own /api/auth bridge, the same one the shell
 * user menu logs out through.
 */
export function NoAccessActions() {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await request<unknown>('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.assign('/login')
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-semibold transition-colors disabled:opacity-60"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
      <Link
        href={process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}
        className="border-border bg-background hover:bg-accent inline-flex h-9 items-center justify-center rounded-full border px-4 text-xs font-semibold transition-colors"
      >
        Go to my 876 account
      </Link>
    </div>
  )
}
```

Do not change the import path `@/lib/client/request` — that is the real Billing browser
request helper (the shell user menu imports the exact same thing).

## Step 2 — render it in the page

In `apps/billing/src/app/no-access/page.tsx`, import the new component and render it
INSIDE the existing `<PageHeader>`…`</PageHeader>` block's parent `<Page>`, right AFTER
the closing `</PageHeader>`. Keep everything else (the `getWorkspaceContext` redirect, the
`<main>`, `<Page>`, title, description) EXACTLY as-is.

Add this import with the other imports:

```tsx
import { NoAccessActions } from './_components/no-access-actions'
```

The returned JSX becomes:

```tsx
<main>
  <Page className="mx-auto max-w-2xl py-16">
    <PageHeader>
      <PageTitle>Billing access is restricted</PageTitle>
      <PageDescription>
        Ask a Billing owner to grant the required workspace role, or review the
        organization&apos;s Billing subscription.
      </PageDescription>
    </PageHeader>
    <NoAccessActions />
  </Page>
</main>
```

## Step 3 — extend the test

In `apps/billing/src/app/no-access/page.test.tsx`, the existing "renders the restriction
message without workspace access" test renders the page. Add ONE new assertion (or a new
`it`) that the Sign out control is present. Because the component is a client component
using `next/link` and the request helper, mock the request helper so the render does not
fail:

Add this mock near the top with the other `vi.mock` calls:

```ts
vi.mock('@/lib/client/request', () => ({ request: vi.fn() }))
```

Then, in the "renders the restriction message" test (after the existing heading
assertion), add:

```ts
expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy()
expect(screen.getByRole('link', { name: /go to my 876 account/i })).toBeTruthy()
```

Do not weaken or remove the existing assertions.

## Verify (run these; all must pass)

```
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test -- no-access
```

If the filter name `@876/billing-app` is wrong, find the correct one with
`grep '"name"' apps/billing/package.json` and use that.

Do NOT commit. Report exactly which files you changed and the verification results.
