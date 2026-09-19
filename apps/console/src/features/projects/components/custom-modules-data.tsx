import { CustomModuleList } from '@876/projects-ui/custom-modules/custom-module-list'
import { AppError } from '@876/ui/app-error'

import { toUiCustomModule } from '../custom-modules-mappers'
import { projects } from '@/lib/clients/projects'

/**
 * The data half of the Custom modules list, shared by every host.
 * Read-only: the shared `CustomModuleList` with links resolved against the
 * host's Projects root. Field and record counts are resolved per module from
 * the module's own field and record collections.
 */
export async function CustomModulesData({
  organizationId,
  base,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
}) {
  const result = await projects.customModules.listModules(organizationId)
  const modules = result.data?.data ?? []

  const rows = await Promise.all(
    modules.map(async (customModule) => {
      const [fieldsResult, recordsResult] = await Promise.all([
        projects.customModules.listFields(organizationId, customModule.id),
        projects.customModules.listRecords(organizationId, customModule.id, {
          limit: 1,
        }),
      ])
      return toUiCustomModule(customModule, {
        fieldCount: fieldsResult.data?.data.length ?? 0,
        recordCount: recordsResult.data?.total_count ?? 0,
      })
    })
  )

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Custom module data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <CustomModuleList
        modules={rows}
        hrefBase={`${base}/custom-modules`}
      />
    </div>
  )
}
