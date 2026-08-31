import { Page, PageBreadcrumb } from '@876/ui/page'

import { CreateSetupForm } from './_components/create-setup-form'

export const metadata = { title: 'New provisioning setup' }

export default function NewProvisioningSetupPage() {
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
      <CreateSetupForm />
    </Page>
  )
}
