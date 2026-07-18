'use client'

import { useEffect } from 'react'
import { RefreshCw, TriangleAlertIcon } from '@876/ui/icons'
import { Button } from '@876/ui/button'

/**
 * Error boundary for the Console segment.
 *
 * Auth guards deliberately *throw* on indeterminate backend failures (a 5xx,
 * network blip, or config error) rather than collapsing them to "no access" -
 * faking an authorization answer from a transport fault is how users get
 * silently, randomly locked out. This boundary is the other half of that
 * contract: it turns such a throw into a recoverable "something went wrong -
 * retry" screen instead of a raw crash, without ever pretending the user lacks
 * access.
 *
 * `redirect()` / `notFound()` raise control-flow errors that must keep
 * propagating, so we re-throw them untouched.
 */
export default function ConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const digest = error.digest ?? ''
  if (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND') {
    throw error
  }

  useEffect(() => {
    console.error('[console] segment error', error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-500/10">
        <TriangleAlertIcon className="size-7 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="876-page-title mb-2">Something went wrong</h1>
      <p className="text-muted-foreground mb-8 max-w-sm text-sm">
        We couldn&apos;t load this part of Console. This is usually a temporary
        problem reaching the platform - your access is unaffected. Try again in
        a moment.
      </p>
      <Button size="sm" onClick={() => reset()}>
        <RefreshCw aria-hidden="true" className="size-4" />
        Try again
      </Button>
    </div>
  )
}
