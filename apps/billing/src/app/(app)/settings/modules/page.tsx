import Link from 'next/link'

import { Badge } from '@876/ui/badge'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { Switch } from '@876/ui/switch'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { BILLING_MODULE_CATALOG } from '@/lib/modules'

export const metadata = { title: 'Modules - Settings' }

export default async function ModulesPage() {
  await requirePagePermission('settings:read')

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <div className="mb-6">
        <h1 className="876-page-title">Modules</h1>
      </div>

      <div className="876-card overflow-hidden">
        <div className="divide-border divide-y">
          {BILLING_MODULE_CATALOG.map((module) => (
            <div
              key={module.key}
              className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/settings/modules/${module.key}`}
                  className="font-medium hover:underline"
                >
                  {module.label} settings
                </Link>
                <div className="text-muted-foreground mt-1 text-sm">
                  {module.description}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={module.enabledByDefault ? 'secondary' : 'outline'}>
                  {module.enabledByDefault ? 'Enabled' : 'Disabled'}
                </Badge>
                {/* Persistence is intentionally out of scope in this phase, so this state control stays disabled instead of discarding a change. */}
                <Switch
                  checked={module.enabledByDefault}
                  disabled
                  aria-label={`${module.label} enabled`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  )
}
