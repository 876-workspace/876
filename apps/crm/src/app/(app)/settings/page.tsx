import { Page } from '@876/ui/page'
import { SettingsHub } from '@876/ui/settings-hub'

import { requireAppPermission } from '@/lib/auth/require-crm-context'
import { SETTINGS_GROUPS } from './_lib/settings-nav'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  await requireAppPermission('settings.view')

  return (
    <Page hub>
      <div className="mb-6">
        <h1 className="876-page-title">Settings</h1>
      </div>
      <SettingsHub groups={SETTINGS_GROUPS} />
    </Page>
  )
}
