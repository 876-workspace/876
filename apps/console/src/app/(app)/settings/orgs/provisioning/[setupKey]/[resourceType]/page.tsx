import { notFound } from 'next/navigation'

import { workspace } from '@/lib/services/workspace'
import { FinanceProvisioningEditor } from '@/features/provisioning/components/finance-provisioning-editor'
import { getProvisioningCatalog, getProvisioningSetup } from '../_data'

export const metadata = { title: 'Provisioning setup' }

type Props = { params: Promise<{ setupKey: string; resourceType: string }> }

export default async function ProvisioningResourceTypePage({ params }: Props) {
  const { setupKey, resourceType } = await params

  const [catalogResult, manifestResult, setupResult] = await Promise.all([
    getProvisioningCatalog(setupKey),
    workspace.provisioning.retrieve('finance', setupKey),
    getProvisioningSetup(setupKey),
  ])
  if (catalogResult.error || !catalogResult.data) notFound()
  if (manifestResult.error || !manifestResult.data) notFound()
  if (setupResult.error || !setupResult.data) notFound()

  // Validate that the resourceType segment maps to a known catalog type.
  const typeExists = catalogResult.data.resource_types.some(
    (def) =>
      (def.resource_type || (def as { resourceType?: string }).resourceType) ===
      resourceType
  )
  if (!typeExists) notFound()

  return (
    <FinanceProvisioningEditor
      catalog={catalogResult.data}
      manifest={manifestResult.data}
      setup={setupResult.data}
      target={{ type: 'finance', key: setupKey }}
      initialType={resourceType}
    />
  )
}
