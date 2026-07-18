import type { Metadata } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import { cn } from '@876/core/utils'

export const metadata: Metadata = {
  title: 'Account suspended | 876',
  robots: { index: false, follow: false },
}

/**
 * Shown when a banned (or otherwise non-active) user is redirected here by the
 * RSC account guard. The message is intentionally generic — the internal ban
 * reason is never exposed to the user.
 */
export default function SuspendedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12 text-center">
      <div className="max-w-md space-y-4">
        <p className="text-muted-foreground text-sm font-medium">
          Account suspended
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Your account has been suspended
        </h1>
        <p className="text-muted-foreground">
          Access to your 876 account has been suspended for violating our Terms
          of Service. If you believe this is a mistake, please contact support.
        </p>
        <div className="pt-2">
          <Link
            href="mailto:support@876.com"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            Contact support
          </Link>
        </div>
      </div>
    </main>
  )
}
