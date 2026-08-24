import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

import {
  findAuthRoutingUser,
  requireSession,
  resolveHomePathForUser,
} from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Organizations | 876',
  robots: { index: false, follow: false },
}

export default async function RootPage() {
  const sessionUser = await requireSession('/')
  const user = await findAuthRoutingUser(sessionUser.id)

  if (!user) redirect('/login?returnTo=%2F')

  redirect(await resolveHomePathForUser(user.id))
}
