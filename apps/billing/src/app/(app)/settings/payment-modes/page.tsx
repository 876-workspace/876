import { Page, PageBreadcrumb } from '@876/ui/page'
import { PaymentModeSettings } from '@/features/settings/components/payment-mode-settings'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Payment Modes - Settings' }

export default async function PaymentModesPage() {
  const context = await requirePagePermission('payments:read')
  const modes = await service.paymentModes.list(context.tenant.id)
  const canManage = context.permissions.includes('payments:write')

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <PaymentModeSettings modes={modes} canManage={canManage} />
    </Page>
  )
}
