import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

import { IntegrationCreateForm } from './_components/integration-create-form'

export const metadata = { title: 'New integration client' }

export default async function NewIntegrationClientPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href="/settings/integrations"
        label="Integrations"
        className="mb-4"
      />
      <h1 className="876-page-title mb-2">New client</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        The secret is shown once after creation.
      </p>
      <div className="max-w-3xl">
        <IntegrationCreateForm />
      </div>
    </div>
  )
}
