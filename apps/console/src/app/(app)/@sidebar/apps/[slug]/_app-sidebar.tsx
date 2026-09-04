import { ServerSidebar } from '@/components/shell/server-sidebar'
import { resolveAppContexts } from '@/app/(app)/apps/[slug]/_contexts'
import { requireSession } from '@/lib/auth/guards'

/**
 * The sidebar inside one app record.
 *
 * Shared by the record's own base route and every section below it — modules,
 * plans, provisioning — so each keeps the product rail rather than dropping
 * back to the platform one. A single optional catch-all page can't do this:
 * Next.js rejects a route tree where a segment is both a concrete page
 * (`/apps/[slug]` from the record's own overview) and the parent of an
 * optional catch-all (`/apps/[slug][[...section]]`) at the same node. Two
 * routes — this file's base page and the sibling `[...section]/page.tsx`
 * required catch-all — cover the same segments without that conflict.
 */
export async function AppSidebarSlot({ slug }: { slug: string }) {
  const [sessionUser, contexts] = await Promise.all([
    requireSession('/'),
    // Shared with the `@mobilenav` slot, so the rail and the sheet cannot
    // disagree about which sections this product has.
    resolveAppContexts(slug),
  ])

  return <ServerSidebar userId={sessionUser.id} contexts={contexts} />
}
