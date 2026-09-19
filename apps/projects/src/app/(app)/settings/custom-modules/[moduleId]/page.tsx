import type { LayoutEntity } from '@876/projects/contracts'
import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { customModuleLayoutEntity } from '@/lib/custom-modules/module-access'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'

import { CustomModuleDetailTabs } from './_components/custom-module-detail-tabs'

export const metadata = { title: 'Custom module' }

type Props = { params: Promise<{ moduleId: string }> }

export default async function CustomModuleDetailPage({ params }: Props) {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const { moduleId } = await params
  const decodedId = decodeURIComponent(moduleId)

  const [module, fields, statuses] = await Promise.all([
    projects.customModules.retrieveModule(orgId, decodedId),
    projects.customModules.listFields(orgId, decodedId),
    projects.customModules.listStatuses(orgId, decodedId),
  ])

  if (module.error?.code === 'projects/custom-module-not-found') notFound()
  if (module.error || !module.data) {
    return (
      <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
        <PageBreadcrumb href="/settings/custom-modules" label="Custom modules" className="mb-4" />
        <AppError
          title="The custom module could not be loaded"
          error={
            module.error ?? {
              code: 'projects/custom-module-unavailable',
              message: 'The custom module could not be loaded.',
            }
          }
          variant="banner"
        />
      </div>
    )
  }

  const entity = customModuleLayoutEntity(module.data.key) as LayoutEntity
  const layouts = await projects.layouts.list(orgId, { entity })
  const layout = layouts.data?.data.find((entry) => entry.entity === entity) ?? null

  const availableFields = [
    { fieldKey: 'title', label: 'Title' },
    ...(fields.data?.data ?? []).map((field) => ({
      fieldKey: `cf:${field.key}`,
      label: field.label,
    })),
  ]

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings/custom-modules" label="Custom modules" className="mb-4" />
      <h1 className="876-page-title mb-2">{module.data.pluralName}</h1>
      <p className="text-muted-foreground mb-6 font-mono text-xs">
        {module.data.key} · {module.data.scope === 'org' ? 'Organization' : 'Project'} scope
      </p>
      {fields.error ?? statuses.error ? (
        <div className="mb-4">
          <AppError
            title="Some module settings could not be loaded"
            error={(fields.error ?? statuses.error) as NonNullable<typeof fields.error>}
            variant="banner"
          />
        </div>
      ) : null}
      <CustomModuleDetailTabs
        module={module.data}
        fields={fields.data?.data ?? []}
        statuses={statuses.data?.data ?? []}
        layout={layout}
        availableFields={availableFields}
      />
    </div>
  )
}
