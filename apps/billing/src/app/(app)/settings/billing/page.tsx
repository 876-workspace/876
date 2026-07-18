import { Badge } from '@876/ui/badge'
import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import {
  PaymentTermCreateForm,
  SalespersonCreateForm,
} from '@/components/billing-engine-settings-forms'
import { InvoicePreferenceForm } from '@/components/invoice-preference-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Billing & Sales - Settings' }

export default async function BillingSettingsPage() {
  const context = await requirePagePermission('sales:read')
  const [paymentTerms, salespeople, preference, currencies] = await Promise.all(
    [
      service.paymentTerms.list(context.tenant.id),
      service.salespeople.list(context.tenant.id),
      service.invoicePreferences.retrieve(context.tenant.id),
      service.currencies.list(context.tenant.id),
    ]
  )
  const canManage = context.permissions.includes('sales:write')

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <PageHeader>
        <PageTitle>Billing & Sales</PageTitle>
        <PageDescription>
          Control invoice due dates and optional salesperson attribution.
        </PageDescription>
      </PageHeader>

      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-balance">Invoice preferences</h2>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Set defaults for new invoices and control auditable late-fee
              assessment.
            </p>
          </div>
          {preference ? (
            <InvoicePreferenceForm
              initial={{
                defaultTaxBehavior: preference.defaultTaxBehavior,
                defaultNotes: preference.defaultNotes,
                defaultTerms: preference.defaultTerms,
                allowEditingSentInvoices: preference.allowEditingSentInvoices,
                lateFeesEnabled: preference.lateFeesEnabled,
                lateFeeCalculationType: preference.lateFeeCalculationType,
                lateFeePercent: preference.lateFeePercent?.toString() ?? null,
                lateFeeAmount: preference.lateFeeAmount?.toString() ?? null,
                lateFeeGraceDays: preference.lateFeeGraceDays,
                lateFeeGenerateAsDraft: preference.lateFeeGenerateAsDraft,
              }}
              currency={context.tenant.defaultCurrency}
              decimalPlaces={
                currencies.find((currency) => currency.isDefault)?.currency
                  .decimalPlaces ?? 2
              }
              canManage={canManage}
            />
          ) : (
            <p className="876-card text-muted-foreground p-5 text-sm">
              Invoice preferences have not been provisioned for this workspace.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-balance">Payment terms</h2>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Terms calculate invoice due dates when a draft is finalized.
            </p>
          </div>
          {canManage ? <PaymentTermCreateForm /> : null}
          <div className="876-card overflow-hidden">
            <div className="divide-border divide-y">
              {paymentTerms.map((term) => (
                <div
                  key={term.id}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{term.name}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {paymentTermDescription(term.rule, term.dueDays)}
                    </p>
                  </div>
                  {term.isDefault ? (
                    <Badge variant="info">Default</Badge>
                  ) : null}
                  {term.isSystem ? (
                    <Badge variant="outline">Built in</Badge>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-balance">Salespeople</h2>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Assign a salesperson to customers and snapshot the name on
              invoices.
            </p>
          </div>
          {canManage ? <SalespersonCreateForm /> : null}
          <div className="876-card overflow-hidden">
            {salespeople.length === 0 ? (
              <p className="text-muted-foreground px-5 py-10 text-center text-sm">
                No salespeople configured.
              </p>
            ) : (
              <div className="divide-border divide-y">
                {salespeople.map((salesperson) => (
                  <div
                    key={salesperson.id}
                    className="flex items-center gap-3 px-5 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{salesperson.name}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {salesperson.email ?? 'No email address'}
                      </p>
                    </div>
                    <Badge
                      variant={salesperson.isActive ? 'success' : 'secondary'}
                    >
                      {salesperson.isActive ? 'Active' : 'Archived'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </Page>
  )
}

function paymentTermDescription(rule: string, dueDays: number) {
  if (rule === 'DUE_ON_RECEIPT') return 'Due on receipt'
  if (rule === 'NET_DAYS')
    return `Due ${dueDays} day${dueDays === 1 ? '' : 's'} after issue`
  if (rule === 'END_OF_MONTH') return 'Due at the end of the issue month'
  return 'Due at the end of the next month'
}
