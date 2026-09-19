import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { Switch } from '@876/ui/switch'

import { requireAppPermission } from '@/lib/auth/guards'
import { getInvoiceContext } from '@/lib/auth/context'
import { INVOICE_MODULE_CATALOG, isInvoiceModuleKey } from '@/lib/modules'
import { getBilling } from '@/lib/clients/billing'
import { ReportPreferencesForm } from '@/features/settings/components/report-preferences-form'

type Props = { params: Promise<{ moduleKey: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { moduleKey } = await params
  const moduleDefinition = INVOICE_MODULE_CATALOG.find(
    (module) => module.key === moduleKey
  )

  return {
    title: moduleDefinition
      ? `${moduleDefinition.label} Settings`
      : 'Module Settings',
  }
}

export default async function ModuleSettingsPage({ params }: Props) {
  const { moduleKey } = await params
  if (!isInvoiceModuleKey(moduleKey)) notFound()

  const context = await requireAppPermission('settings.view')

  const moduleDefinition = INVOICE_MODULE_CATALOG.find(
    (module) => module.key === moduleKey
  )
  if (!moduleDefinition) notFound()

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <div className="mb-6">
        <h1 className="876-page-title">{moduleDefinition.label} settings</h1>
      </div>

      <div className="876-card max-w-2xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{moduleDefinition.label}</div>
            <div className="text-muted-foreground mt-1 text-sm">
              {moduleDefinition.description}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant={
                moduleDefinition.enabledByDefault ? 'secondary' : 'outline'
              }
            >
              {moduleDefinition.enabledByDefault ? 'Enabled' : 'Disabled'}
            </Badge>
            {/* Persistence is intentionally out of scope in this phase, so this state control stays disabled instead of discarding a change. */}
            <Switch
              checked={moduleDefinition.enabledByDefault}
              disabled
              aria-label={`${moduleDefinition.label} enabled`}
            />
          </div>
        </div>
      </div>
      {moduleKey === 'reports' ? (
        <ReportPreferencesSection
          canManage={context.permissions.includes('sales:write')}
        />
      ) : null}
    </Page>
  )
}

async function ReportPreferencesSection({ canManage }: { canManage: boolean }) {
  const invoiceContext = await getInvoiceContext()
  if (!invoiceContext) return null

  const billing = await getBilling(invoiceContext.orgId)
  const result = await billing.reportPreferences.retrieve()
  if (result.error)
    return (
      <p role="alert" className="text-destructive mt-4 text-sm">
        {result.error.message}
      </p>
    )

  const supported =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : ['America/Jamaica', 'UTC']
  return (
    <div className="mt-6 max-w-2xl">
      <ReportPreferencesForm
        initial={{
          timezone: result.data.timezone,
          fiscalYearStartMonth: result.data.fiscalYearStartMonth,
        }}
        timeZones={supported}
        canManage={canManage}
      />
    </div>
  )
}