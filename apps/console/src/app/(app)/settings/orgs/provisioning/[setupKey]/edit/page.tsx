import { notFound } from 'next/navigation'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { workspace } from '@/lib/876'
import { EditSetupForm } from './_components/edit-setup-form'

export const metadata = { title: 'Edit provisioning setup' }

type Props = { params: Promise<{ setupKey: string }> }

export default async function EditProvisioningSetupPage({ params }: Props) {
  const { setupKey } = await params
  const result = await workspace.provisioning.setups.retrieve(setupKey)
  if (result.error || !result.data) notFound()

  return (
    <Page className="space-y-6">
      <div>
        <PageBreadcrumb
          href={`/settings/orgs/provisioning/${encodeURIComponent(setupKey)}`}
          label={result.data.name}
          className="mb-4"
        />
        <h1 className="876-page-title">Edit setup</h1>
      </div>
      <EditSetupForm setup={result.data} />
    </Page>
  )
}
