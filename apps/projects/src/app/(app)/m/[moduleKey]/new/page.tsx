import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { callerRoleKeys } from '@/lib/custom-modules/module-access'
import { loadModuleBundle } from '@/lib/custom-modules/record-pages'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

import { RecordCreateForm } from './_components/record-create-form'

export const metadata = { title: 'New record' }

type Props = { params: Promise<{ moduleKey: string }> }

export default async function NewRecordPage({ params }: Props) {
  const access = await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const { orgId } = await requireProjectsContext()
  const { moduleKey } = await params

  const loaded = await loadModuleBundle(orgId, callerRoleKeys(access.permissions), moduleKey)
  if (loaded.status === 'not-found') notFound()
  if (loaded.status === 'error') {
    return (
      <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
        <AppError title="The record form could not be loaded" error={loaded.error} variant="banner" />
      </div>
    )
  }

  const { bundle } = loaded
  const base = `/m/${encodeURIComponent(bundle.module.key)}`

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href={base} label={bundle.module.pluralName} className="mb-4" />
      <h1 className="876-page-title mb-6">New {bundle.module.singularName}</h1>
      {bundle.loadError ? (
        <div className="mb-4">
          <AppError
            title="Some form options could not be loaded"
            error={bundle.loadError}
            variant="banner"
          />
        </div>
      ) : null}
      <RecordCreateForm
        moduleId={bundle.module.id}
        moduleKey={bundle.module.key}
        pluralName={bundle.module.pluralName}
        projectId={null}
        fields={bundle.fields}
        statuses={bundle.statuses}
        layout={bundle.layout}
        cancelHref={base}
        successHrefBase={base}
      />
    </div>
  )
}
