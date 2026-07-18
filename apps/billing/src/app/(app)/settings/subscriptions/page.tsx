import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { SubscriptionPreferenceForm } from '@/components/subscription-preference-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Subscription Billing - Settings' }

export default async function SubscriptionSettingsPage() {
  const context = await requirePagePermission('subscriptions:read')
  const preferences = await service.subscriptions.preferences.retrieve(
    context.tenant.id
  )
  const canManage = context.permissions.includes('subscriptions:write')

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <PageHeader>
        <PageTitle>Subscription Billing</PageTitle>
        <PageDescription>
          Control how agreements renew, invoice, consolidate, pause, resume, and
          bill in advance.
        </PageDescription>
      </PageHeader>
      <SubscriptionPreferenceForm
        initial={{
          ...preferences,
          advanceBillingMethod: 'INVOICE',
          advanceRules: preferences.advanceRules.map((rule) => ({
            intervalUnit: rule.intervalUnit,
            daysBefore: rule.daysBefore,
          })),
          calendarDays: preferences.calendarDays.map(
            (entry) => entry.dayOfMonth
          ),
          calendarMonths: preferences.calendarMonths.map(
            (entry) => entry.month
          ),
        }}
        canManage={canManage}
      />
    </Page>
  )
}
