import { workspace } from '@/lib/services/workspace'
import { notFound } from 'next/navigation'

import { FinanceProvisioningEditor } from '@/features/provisioning/components/finance-provisioning-editor'

export const metadata = { title: 'Provisioning setup' }

type Props = { params: Promise<{ setupKey: string }> }

export default async function ProvisioningSetupPage({ params }: Props) {
  const { setupKey } = await params

  const [catalogResult, manifestResult] = await Promise.all([
    workspace.provisioning.retrieveCatalog('finance', setupKey),
    workspace.provisioning.retrieve('finance', setupKey),
  ])
  if (catalogResult.error || !catalogResult.data) notFound()
  if (manifestResult.error || !manifestResult.data) notFound()

  return (
    <FinanceProvisioningEditor
      catalog={catalogResult.data}
      manifest={manifestResult.data}
      target={{ type: 'finance', key: setupKey }}
    />
  )
}
