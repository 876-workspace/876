import type { ReactNode } from 'react'

import { requirePortalCustomer } from '@/lib/portal/customer'

/**
 * Runs the portal customer guard before the segment starts streaming.
 *
 * `loading.tsx` wraps `page.tsx` but **not** the layout in its own segment, so
 * a guard here completes before any byte of the response is flushed. Left in
 * the page — behind `<Suspense>` — its `redirect()` would fire after streaming
 * had begun, which turns a real HTTP redirect into one encoded in the streamed
 * payload and lets the Packages heading flash for a signed-out visitor.
 *
 * The guard is `cache()`d, so the page body below reuses this lookup rather
 * than querying the customer profile a second time. The packages query itself
 * still streams — only the authorization blocks.
 */
export default async function PortalPackagesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePortalCustomer('/portal/packages')

  return children
}
