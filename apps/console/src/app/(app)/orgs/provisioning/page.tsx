import { Page } from '@876/ui/page'

import { $876 } from '@/lib/876'
import { FinanceProvisioningEditor } from './finance-provisioning-editor'
import { ProvisioningNav } from './provisioning-nav'

export const metadata = { title: 'Provisioning defaults' }

export default async function FinanceProvisioningPage() {
  const [catalogResult, manifestResult] = await Promise.all([
    $876.provisioning.retrieveCatalog('finance', 'shared'),
    $876.provisioning.retrieve('finance', 'shared'),
  ])
  if (catalogResult.error || !catalogResult.data)
    throw new Error(
      catalogResult.error?.message ?? 'Failed to load finance catalog.'
    )
  if (manifestResult.error || !manifestResult.data)
    throw new Error(
      manifestResult.error?.message ?? 'Failed to load finance defaults.'
    )

  return (
    <Page className="space-y-6">
      <div>
        <p className="876-eyebrow">Organizations</p>
        <h1 className="876-page-title mt-1">Provisioning defaults</h1>
      </div>
      <ProvisioningNav current="defaults" />
      <FinanceProvisioningEditor
        catalog={catalogResult.data}
        manifest={manifestResult.data}
      />
    </Page>
  )
}
