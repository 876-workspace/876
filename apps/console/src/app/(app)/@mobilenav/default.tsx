import { ServerMobileNav } from '@/components/shell/server-mobile-nav'
import { requireSession } from '@/lib/auth/guards'

/**
 * The mobile navigation for every route that contributes no context of its own.
 *
 * A parallel slot needs a `default` for the segments it does not match, and
 * this is also what renders on a hard load of any unmatched path.
 */
export default async function MobileNavSlot() {
  const sessionUser = await requireSession('/')

  return <ServerMobileNav userId={sessionUser.id} />
}
