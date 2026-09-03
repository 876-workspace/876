import { ConsoleSidebar } from '@/components/shell/console-sidebar'
import { appSidebarContext } from '@/features/apps/app-detail-nav'
import { requireSession } from '@/lib/auth/guards'
import { resolveApp } from '@/app/(app)/apps/[slug]/_data'

/**
 * The sidebar inside one app record.
 *
 * An optional catch-all so every section below the record — modules, plans,
 * provisioning — keeps the product rail rather than dropping back to the
 * platform one. The app lookup is request-cached and shared with the page.
 */
export default async function AppSidebarSlot({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const [{ slug }, sessionUser] = await Promise.all([
    params,
    requireSession('/'),
  ])
  const app = await resolveApp(slug)

  return (
    <ConsoleSidebar
      userId={sessionUser.id}
      contexts={app ? [appSidebarContext(app.app_kind, slug, app.name)] : []}
    />
  )
}
