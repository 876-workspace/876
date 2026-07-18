'use client'

import Link from 'next/link'
import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

export function NoAccessView({ orgSlug }: { orgSlug?: string }) {
  const heading = orgSlug
    ? `You don't have access to this workspace`
    : `No workspace access`

  const body = orgSlug
    ? `Your account isn't a member of the ${orgSlug} workspace. Ask a workspace admin to invite you, or switch to an account that has access.`
    : `Your account doesn't have an active membership in any workspace. Ask a workspace admin to invite you, or switch to an account that has access.`

  const switchHref = `/login?${AUTH_RETURN_TO_PARAM}=/`

  return (
    <main className="bg-background text-foreground grid min-h-dvh place-items-center px-4 py-10">
      <section className="border-border/70 bg-card w-full max-w-md rounded-[1.5rem] border p-6 shadow-[0_24px_70px_rgb(15_23_42_/_10%)]">
        <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
          <svg
            aria-hidden="true"
            className="size-5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-lg font-semibold tracking-[-0.03em]">{heading}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">{body}</p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href={switchHref}
            className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-semibold transition-colors"
          >
            Change account
          </Link>
          <Link
            href={process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}
            className="border-border bg-background hover:bg-accent inline-flex h-9 items-center justify-center rounded-full border px-4 text-xs font-semibold transition-colors"
          >
            Go to my 876 account
          </Link>
        </div>
      </section>
    </main>
  )
}
