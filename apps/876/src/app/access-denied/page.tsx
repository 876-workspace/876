import type { Metadata } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import { cn } from '@876/core/utils'
import { ChangeAccountAction } from './change-account-action'

export const metadata: Metadata = {
  title: 'Wrong account | 876',
  robots: { index: false, follow: false },
}

const ENTERPRISE_URL =
  process.env.NEXT_PUBLIC_ENTERPRISE_URL ?? 'http://localhost:3001'

/**
 * Hard block shown when an enterprise-realm session reaches the consumer app.
 * Consumer and enterprise are separate identities; we do NOT auto-redirect —
 * the user must explicitly switch accounts or open the enterprise workspace.
 */
export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12 text-center">
      <div className="max-w-md space-y-4">
        <p className="text-muted-foreground text-sm font-medium">
          Wrong account
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          This is your personal 876 account
        </h1>
        <p className="text-muted-foreground">
          You&apos;re signed in with a work (enterprise) account, which
          can&apos;t be used here. Open the enterprise workspace, or change to
          your personal account to continue.
        </p>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Link
            href={ENTERPRISE_URL}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            Go to enterprise workspace
          </Link>
          <ChangeAccountAction />
        </div>
      </div>
    </main>
  )
}
