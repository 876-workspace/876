'use client'

import { useEffect } from 'react'

/**
 * Root error boundary for the enterprise app.
 *
 * `global-error.tsx` replaces the root layout entirely, so it must render its
 * own `<html>`/`<body>` and cannot rely on the app's fonts or Tailwind layer.
 * Styles are inlined to stay self-contained. Enterprise has no Sentry wiring
 * (unlike Console / @876/app), so we log to the console instead of capturing.
 *
 * `redirect()` / `notFound()` raise control-flow errors that must keep
 * propagating, so we re-throw them untouched.
 */
export default function GlobalError({
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
    console.error('[enterprise] global error', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '1rem',
          textAlign: 'center',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          color: '#0a0a0a',
          background: '#ffffff',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: '24rem',
            fontSize: '0.875rem',
            color: '#525252',
          }}
        >
          We hit an unexpected problem loading this page. This is usually
          temporary — try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#ffffff',
            background: '#0a0a0a',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
