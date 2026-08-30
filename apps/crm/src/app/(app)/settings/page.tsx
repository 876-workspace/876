import { Page } from '@876/ui/page'

import { SettingsGroupCard } from './_components/settings-group-card'
import { SETTINGS_GROUPS } from './_lib/settings-nav'

export const metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <Page hub>
      <div className="mb-6">
        <h1 className="text-foreground text-lg font-semibold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground mt-0.5 text-[0.8125rem]">
          Configure teams, routing categories, request priorities, and workspace
          workflows.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_GROUPS.map((group) => (
          <SettingsGroupCard key={group.label} group={group} />
        ))}
      </div>
    </Page>
  )
}
