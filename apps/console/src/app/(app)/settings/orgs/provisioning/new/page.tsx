import { Page, PageBreadcrumb } from '@876/ui/page'

import { workspace } from '@/lib/876'
import { CreateSetupForm } from './_components/create-setup-form'

export const metadata = { title: 'New provisioning setup' }

export default async function NewProvisioningSetupPage() {
  const result = await workspace.provisioning.setups.list()
  const sources = (result.data?.data ?? [])
    .filter((setup) => setup.published_revision !== null)
    .map((setup) => ({
      key: setup.key,
      name: setup.name,
      isDefault: setup.is_default,
    }))

  return (
    <Page className="space-y-6">
      <div>
        <PageBreadcrumb
          href="/settings/orgs/provisioning"
          label="Provisioning setups"
          className="mb-4"
        />
        <h1 className="876-page-title">New provisioning setup</h1>
      </div>
      <CreateSetupForm sources={sources} />
    </Page>
  )
}
