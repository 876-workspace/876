import { Waves } from '@876/ui/icons'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import {
  Page,
  PageBreadcrumb,
  PageHeader,
  PageTitle,
  PageDescription,
} from '@876/ui/page'

export const metadata = { title: 'Notifications - Settings' }

const PLANNED_CHANNELS = [
  {
    name: 'Email alerts',
    description:
      'Send operational alerts to one or more email addresses when platform events occur.',
  },
  {
    name: 'Slack',
    description:
      'Post structured alerts to a Slack channel via an incoming webhook.',
  },
  {
    name: 'Webhooks',
    description:
      'Deliver signed event payloads to an endpoint of your choosing.',
  },
]

export default function NotificationsSettingsPage() {
  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />

      <PageHeader className="mb-8">
        <PageTitle>Notifications</PageTitle>
        <PageDescription>
          Configure alert channels and platform event subscriptions.
        </PageDescription>
      </PageHeader>

      <div className="max-w-2xl">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Waves />
            </EmptyMedia>
            <EmptyTitle>Notification channels coming soon</EmptyTitle>
            <EmptyDescription>
              Connect alert channels to receive real-time notifications when
              platform events occur.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="mt-6 grid w-full max-w-sm gap-3 text-left">
              {PLANNED_CHANNELS.map((channel) => (
                <div
                  key={channel.name}
                  className="876-card px-4 py-3 opacity-60"
                >
                  <p className="text-sm font-medium">{channel.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    {channel.description}
                  </p>
                </div>
              ))}
            </div>
          </EmptyContent>
        </Empty>
      </div>
    </Page>
  )
}
