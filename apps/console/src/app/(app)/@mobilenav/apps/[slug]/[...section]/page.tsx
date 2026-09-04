import { ServerMobileNav } from '@/components/shell/server-mobile-nav'
import { resolveAppContexts } from '@/app/(app)/apps/[slug]/_contexts'
import { requireSession } from '@/lib/auth/guards'

/**
 * A **required** catch-all paired with the base page above it. An optional one
 * would collide with `/apps/[slug]`, which is a real page — see the sibling
 * `@sidebar` slot and `components/shell/README.md`.
 */
export default async function AppMobileNavSection({
  params,
}: {
  params: Promise<{ slug: string; section: string[] }>
}) {
  const [{ slug }, sessionUser] = await Promise.all([
    params,
    requireSession('/'),
  ])

  return (
    <ServerMobileNav
      userId={sessionUser.id}
      contexts={await resolveAppContexts(slug)}
    />
  )
}
