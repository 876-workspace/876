import { CustomModuleList } from '@876/projects-ui/custom-modules/custom-module-list'
import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import Link from 'next/link'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { toUiModule } from '@/lib/custom-modules/record-form-helpers'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export const metadata = { title: 'Custom modules' }

export default async function CustomModulesPage() {
  await requireAppPermission('settings.view')
  const { orgId } = await requireProjectsContext()
  const result = await projects.customModules.listModules(orgId)

  const modules = result.data?.data ?? []
  const counts = await Promise.all(
    modules.map(async (module) => {
      const [fields, records] = await Promise.all([
        projects.customModules.listFields(orgId, module.id),
        projects.customModules.listRecords(orgId, module.id, { limit: 1 }),
      ])
      return {
        fieldCount: fields.data?.data.length ?? 0,
        recordCount: records.data?.total_count ?? records.data?.data.length ?? 0,
      }
    })
  )

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="876-page-title">Custom modules</h1>
        <Link
          href="/settings/custom-modules/new"
          className={buttonVariants({ variant: 'default', size: 'sm' })}
        >
          New module
        </Link>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Define your own record types — risks, decisions, vendors — with fields,
        statuses, and layouts.
      </p>
      {result.error ? (
        <div className="mb-4">
          <AppError
            title="Custom modules could not be loaded"
            error={result.error}
            variant="banner"
          />
        </div>
      ) : null}
      <CustomModuleList
        modules={modules.map((module, index) =>
          toUiModule(module, counts[index] ?? { fieldCount: 0, recordCount: 0 })
        )}
        hrefBase="/settings/custom-modules"
      />
    </div>
  )
}
