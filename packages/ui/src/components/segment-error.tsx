'use client'

import { RefreshCw, TriangleAlertIcon } from '../icons'
import { Button } from './button'

export type SegmentErrorProps = {
  error: Error & { digest?: string }
  retry: () => void
  title?: string
  description?: string
}

/**
 * The content-area fallback an app's segment `error.tsx` renders.
 *
 * A Server Component that throws while rendering reaches the browser as the
 * opaque "Minified React error #441". Without a segment boundary it escalates
 * to `global-error`, which replaces the whole app — sidebar and all — for what
 * is usually one failed request. Mounted below the app's layout, this keeps
 * the shell in place and shows the digest, which is the only key that matches
 * the real message in the server logs.
 *
 * `retry` must be Next's `retry()`, not `reset()`: a server fetch failure only
 * recovers when the segment is fetched again.
 */
export function SegmentError({
  error,
  retry,
  title = 'Something went wrong',
  description = 'This page could not be loaded. It is usually a temporary problem — try again in a moment.',
}: SegmentErrorProps) {
  return (
    <div
      role="alert"
      className="flex min-h-[50dvh] flex-col items-center justify-center px-4 py-12 text-center"
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-amber-500/10">
        <TriangleAlertIcon
          aria-hidden="true"
          className="size-6 text-amber-600 dark:text-amber-400"
        />
      </div>
      <h1 className="876-page-title mb-2">{title}</h1>
      <p className="text-muted-foreground mb-6 max-w-sm text-[0.8125rem]">
        {description}
      </p>
      <Button size="sm" variant="info" onClick={() => retry()}>
        <RefreshCw aria-hidden="true" className="size-4" />
        Try again
      </Button>
      {error.digest ? (
        <p className="text-muted-foreground mt-6 font-mono text-xs">
          Reference {error.digest}
        </p>
      ) : null}
    </div>
  )
}
