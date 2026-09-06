import { Page } from '@876/ui/page'
import { SettingsHub } from '@876/ui/settings-hub'

import { requireAppPermission } from '@/lib/auth/guards'
import { getInvoiceContextResult } from '@/lib/auth/context'
import { resolveInvoiceFinanceAccess } from '@/lib/auth/finance-access'
import { SETTINGS_GROUPS } from './_lib/settings-nav'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  await requireAppPermission('settings.view')
  const context = await getInvoiceContextResult()
  const finance = context.status === 'ok'
    ? await resolveInvoiceFinanceAccess(context.context.orgId, context.context.userId, context.context.role)
    : null
  const permissions = finance?.status === 'ok' ? finance.viewer.permissions : []
  const groups = SETTINGS_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.requires || permissions.includes(item.requires.permission)
    ),
  })).filter((group) => group.items.length > 0)

  return (
    <Page hub>
      <div className="mb-6">
        <h1 className="876-page-title">Settings</h1>
      </div>
      <SettingsHub groups={groups} />
    </Page>
  )
}
