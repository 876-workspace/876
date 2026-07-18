import type { ReactNode } from 'react'

import { UserStoreProvider } from '@/components/providers/user-store-provider'
import { ConsoleShell } from '@/components/console-shell'
import { consoleWidgetCatalog } from '@/components/widgets/widget-catalog'
import { requireConsoleAccount, requireSession } from '@/lib/auth/guards'
import { getConsoleFeatures } from '@/lib/features'
import { AnalyticsIdentity } from '@/lib/analytics/provider'
import { $876 } from '@/lib/876'

export default async function ConsoleRootLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/')
  const [user, { enabledWidgetIds, uiFeatures }] = await Promise.all([
    requireConsoleAccount(sessionUser.id, sessionUser),
    getConsoleFeatures({
      userId: sessionUser.id,
      widgets: consoleWidgetCatalog,
    }),
  ])

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  const auditEvents = enabledWidgetIds.includes('live_logs')
    ? ((await $876.auditEvents.list({ limit: 12 })).data?.data ?? [])
    : []

  return (
    <>
      <AnalyticsIdentity
        user={{
          id: user.id,
          name: displayName,
          email: user.email,
          avatar: user.avatar,
          status: user.status,
        }}
      />
      <UserStoreProvider
        initialUser={{
          id: user.id,
          name: displayName,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        }}
      >
        <ConsoleShell
          auditEvents={auditEvents}
          user={{ name: displayName, email: user.email, avatar: user.avatar }}
          enabledWidgetIds={enabledWidgetIds}
          uiFeatures={uiFeatures}
        >
          {children}
        </ConsoleShell>
      </UserStoreProvider>
    </>
  )
}
