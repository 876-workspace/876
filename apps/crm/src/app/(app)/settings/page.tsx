import { Page } from '@876/ui/page'
import { SettingsHub } from '@876/ui/settings-hub'

import { SETTINGS_GROUPS } from './_lib/settings-nav'

export const metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <Page hub>
      <div className="mb-6">
        <h1 className="876-page-title">Settings</h1>
      </div>
      <SettingsHub groups={SETTINGS_GROUPS} />
    </Page>
  )
}
