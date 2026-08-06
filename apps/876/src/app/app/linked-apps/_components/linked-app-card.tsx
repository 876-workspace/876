import Image from 'next/image'
import Link from 'next/link'
import { AppWindow, ExternalLink } from '@876/ui/icons'

import type { LinkedAppGrant } from '../_lib/linked-apps-types'

export function LinkedAppCard({ app }: { app: LinkedAppGrant }) {
  return (
    <article className="border-border/70 flex flex-col gap-4 rounded-[1.25rem] border bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5">
      <div className="flex min-w-0 gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--876-blue)_12%,transparent)] text-[color:var(--876-blue)]">
          {app.logoUrl ? (
            <Image
              src={app.logoUrl}
              alt=""
              width={36}
              height={36}
              unoptimized
              className="size-9 rounded-xl object-cover"
            />
          ) : (
            <AppWindow aria-hidden="true" className="size-6" />
          )}
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-[-0.02em]">
            {app.name}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Scopes: {app.scopes.join(', ')}
          </p>
          {app.homepageUrl ? (
            <Link
              href={app.homepageUrl}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--876-blue)]"
            >
              Visit app
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </div>

      <form action="/api/linked-apps/revoke" method="post">
        <input type="hidden" name="grant_id" value={app.id} />
        <button className="border-input bg-background hover:bg-accent focus-visible:ring-ring/50 inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-hidden">
          Revoke access
        </button>
      </form>
    </article>
  )
}
