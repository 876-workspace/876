import type { SidebarContextDefinition } from '@/components/shell/sidebar-context'
import { appSidebarContext } from '@/features/apps/app-detail-nav'
import { resolveApp } from './_data'

/**
 * The navigation contexts an app record contributes to the shell.
 *
 * Shared by the `@sidebar` and `@mobilenav` slots so the rail and the sheet
 * cannot disagree about which sections a product has. It lives beside the
 * record's `_data` rather than under `features/`, because it reads that route's
 * loader and `features/` may not import route code.
 *
 * `resolveApp` is request-cached and shared with the page beneath.
 */
export async function resolveAppContexts(
  slug: string
): Promise<SidebarContextDefinition[]> {
  const app = await resolveApp(slug)
  if (!app) return []

  return [appSidebarContext(app.app_kind, slug, app.name)]
}
