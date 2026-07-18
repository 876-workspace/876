import type { ReactNode } from 'react'

import { AccountShell } from '@/components/account/account-shell'
import {
  getEnabledConsumerFeatureSlugs,
  requireActiveUser,
  requireSession,
} from '@/lib/auth/guards'

export default async function ConsumerLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/app')
  const dbUser = await requireActiveUser(sessionUser.id)
  const shellUser = dbUser ?? sessionUser

  const enabledFeatureSlugs = dbUser
    ? [...(await getEnabledConsumerFeatureSlugs(dbUser.id))]
    : []

  return (
    <AccountShell
      enabledFeatureSlugs={enabledFeatureSlugs}
      user={{
        name: getDisplayName(shellUser),
        email: shellUser.email,
        avatar: getAvatar(shellUser),
      }}
    >
      {children}
    </AccountShell>
  )
}

function getDisplayName(user: {
  firstName?: string | null
  lastName?: string | null
  email: string
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')

  return name || user.email
}

function getAvatar(user: { avatar?: string | null }): string | null {
  return user.avatar ?? null
}
