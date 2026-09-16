import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { requireAppPermission } from '@/lib/auth/require-projects-context'

import { CustomModuleCreateForm } from './_components/custom-module-create-form'

export const metadata = { title: 'New custom module' }

export default async function NewCustomModulePage() {
  await requireAppPermission('settings.edit')

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings/custom-modules" label="Custom modules" className="mb-4" />
      <h1 className="876-page-title mb-2">New custom module</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Give the module a key, names, scope, and icon. Fields and statuses come next.
      </p>
      <CustomModuleCreateForm />
    </div>
  )
}
