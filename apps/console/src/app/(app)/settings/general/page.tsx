import { Settings } from '@876/ui/icons'
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

export const metadata = { title: 'General - Settings' }

const GENERAL_SECTIONS = [
  {
    label: 'Platform',
    fields: [
      {
        name: 'Platform name',
        description: 'Displayed in headers, emails, and login screens.',
        value: '876',
        editable: false,
      },
      {
        name: 'Support email',
        description: 'Outbound address used for transactional email.',
        value: 'support@876.app',
        editable: false,
      },
    ],
  },
  {
    label: 'Localisation',
    fields: [
      {
        name: 'Default timezone',
        description: 'Fallback timezone for users who have not set their own.',
        value: 'UTC',
        editable: false,
      },
      {
        name: 'Default locale',
        description: 'Language and regional format used across the platform.',
        value: 'en-US',
        editable: false,
      },
    ],
  },
]

export default function GeneralSettingsPage() {
  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />

      <PageHeader className="mb-8">
        <PageTitle>General</PageTitle>
        <PageDescription>
          Platform-wide configuration and defaults.
        </PageDescription>
      </PageHeader>

      <div className="max-w-2xl space-y-8">
        {GENERAL_SECTIONS.map((section) => (
          <div key={section.label}>
            <h2 className="876-section-title mb-3">{section.label}</h2>
            <div className="876-card divide-y">
              {section.fields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-start justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{field.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                      {field.description}
                    </p>
                  </div>
                  <span className="bg-muted text-muted-foreground shrink-0 rounded-md px-2.5 py-1 font-mono text-xs">
                    {field.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Settings />
            </EmptyMedia>
            <EmptyTitle>More options coming soon</EmptyTitle>
            <EmptyDescription>
              Additional platform configuration controls will appear here as
              they become available.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      </div>
    </Page>
  )
}
