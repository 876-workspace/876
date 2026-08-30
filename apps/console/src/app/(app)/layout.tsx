import { platform } from '@/lib/services/platform'
import type { ReactNode } from 'react'

import { BrowserApiBoundary } from '@/components/providers/browser-api-boundary'
import { UserStoreProvider } from '@/components/providers/user-store-provider'
import { Shell } from '@/components/shell/shell'
import { WidgetBar } from '@/features/widgets/components/widget-bar'
import { widgetCatalog } from '@/features/widgets/widget-catalog'
import { AnalyticsIdentity } from '@/lib/analytics/provider'
import { requireConsoleAccount, requireSession } from '@/lib/auth/guards'
import { getConsoleFeatures } from '@/lib/features'

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
      widgets: widgetCatalog,
    }),
  ])

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  const auditEvents = enabledWidgetIds.includes('live_logs')
    ? ((await platform.auditEvents.list({ limit: 12 })).data?.data ?? [])
    : []

  return (
    <>
      <BrowserApiBoundary />
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
        <Shell
          userId={user.id}
          user={{ name: displayName, email: user.email, avatar: user.avatar }}
          uiFeatures={uiFeatures}
          widgetRail={
            enabledWidgetIds.length > 0 || uiFeatures.chat ? (
              <WidgetBar
                auditEvents={auditEvents}
                enabledWidgetIds={enabledWidgetIds}
                chatEnabled={uiFeatures.chat}
              />
            ) : null
          }
        >
          {children}
        </Shell>
      </UserStoreProvider>
    </>
  )
}
