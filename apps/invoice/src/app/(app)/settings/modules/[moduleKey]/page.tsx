import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { Switch } from '@876/ui/switch'

import { requireAppPermission } from '@/lib/auth/guards'
import { INVOICE_MODULE_CATALOG, isInvoiceModuleKey } from '@/lib/modules'

type Props = { params: Promise<{ moduleKey: string }> }

export default async function ModuleSettingsPage({ params }: Props) {
  const { moduleKey } = await params
  if (!isInvoiceModuleKey(moduleKey)) notFound()

  await requireAppPermission('settings.view')

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
              variant={moduleDefinition.enabledByDefault ? 'secondary' : 'outline'}
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
    </Page>
  )
}
