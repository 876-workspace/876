import { AppError } from '@876/ui/app-error'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { PhaseCustomFieldSettings } from '@/features/projects/components/phase-custom-field-settings'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export const metadata = { title: 'Phase fields' }

export default async function PhaseFieldsPage() {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const fields = await projects.milestones.customFields.list(orgId)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title mb-2">Phase fields</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Define typed custom fields that apply to Phases without changing work-item fields.
      </p>
      {fields.error ? (
        <div className="mb-4">
          <AppError title="Phase fields could not be loaded" error={fields.error} variant="banner" />
        </div>
      ) : null}
      <PhaseCustomFieldSettings fields={fields.data?.data ?? []} />
    </div>
  )
}
