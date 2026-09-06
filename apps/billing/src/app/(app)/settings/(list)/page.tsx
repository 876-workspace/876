import { Page } from '@876/ui/page'
import { SettingsHub } from '@876/ui/settings-hub'

import { getVisibleSettingsSections } from '@/components/shell/nav-config'
import { requirePagePermission } from '@/lib/auth/billing-context'

import { BILLING_MODULE_SETTINGS_GROUP } from './_lib/module-settings-group'
import { toSettingsHubGroups } from './_lib/settings-hub-groups'

export const metadata = {
  title: 'Settings',
  description: 'Billing workspace settings.',
}

export default async function SettingsPage() {
  const context = await requirePagePermission('settings:read')
  const sections = getVisibleSettingsSections(context.permissions)
  const groups = [
    ...toSettingsHubGroups(sections),
    BILLING_MODULE_SETTINGS_GROUP,
  ]

  return (
    <Page hub>
      <div className="mb-6">
        <h1 className="876-page-title">Settings</h1>
      </div>
      <SettingsHub groups={groups} />
    </Page>
  )
}
