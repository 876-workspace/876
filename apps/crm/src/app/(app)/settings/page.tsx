import { Page } from '@876/ui/page'

import { SettingsGroupCard } from './_components/settings-group-card'
import { SETTINGS_GROUPS } from './_lib/settings-nav'

export const metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <Page hub>
      <h1 className="876-page-title mb-6">Settings</h1>
      <div className="gap-6 sm:columns-2 lg:columns-3">
        {SETTINGS_GROUPS.map((group) => (
          <SettingsGroupCard key={group.label} group={group} />
        ))}
      </div>
    </Page>
  )
}
