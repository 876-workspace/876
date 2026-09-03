import { ConsoleSidebar } from '@/components/shell/console-sidebar'
import { requireSession } from '@/lib/auth/guards'

/**
 * The sidebar for every route that does not contribute a context of its own.
 *
 * A parallel slot needs a `default` for the segments it does not match, and
 * this is also what renders on a hard load of any unmatched path.
 */
export default async function SidebarSlot() {
  const sessionUser = await requireSession('/')

  return <ConsoleSidebar userId={sessionUser.id} />
}
