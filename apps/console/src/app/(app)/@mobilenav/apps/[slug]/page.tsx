import { ServerMobileNav } from '@/components/shell/server-mobile-nav'
import { resolveAppContexts } from '@/app/(app)/apps/[slug]/_contexts'
import { requireSession } from '@/lib/auth/guards'

export default async function AppMobileNavBase({
  params,
}: {
  params: Promise<{ slug: string }>
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
