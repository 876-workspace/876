import type { ComponentProps } from 'react'

/**
 * Recovery controls for a service worker's static offline fallback.
 *
 * The recovery logic is intentionally loaded from a standalone, precached
 * script rather than a React client bundle: an offline document must work
 * before any application chunks are available.
 */
export function OfflineRecovery({
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'children' | 'type'>) {
  return (
    <>
      <button data-offline-retry type="button" className={className} {...props}>
        Try again
      </button>
      <script src="/pwa/offline-recovery.js" />
    </>
  )
}
