import { DashboardWidget } from '@876/projects-ui/custom-modules/dashboard-widget'

import { callerRoleKeys, hasModuleAccess } from '@/lib/custom-modules/module-access'
import { toWidgetViews, widgetDataFor } from '@/lib/custom-modules/record-form-helpers'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'
import { resolveAccessContext } from '@/lib/auth/access-context'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'

export async function DashboardWidgetsData() {
  const { orgId, userId } = await requireProjectsContext()
  const access = await resolveAccessContext(userId, orgId)
  const roleKeys = access.status === 'ok' ? callerRoleKeys(access.context.permissions) : []
  const client = serviceWithRoleKeys(roleKeys)

  const [widgets, modules] = await Promise.all([
    client.customModules.listWidgets(orgId, {}),
    client.customModules.listModules(orgId),
  ])

  const moduleRows = (modules.data?.data ?? []).filter((module) =>
    hasModuleAccess(module.restrictedToRoleKeys, roleKeys)
  )
  const names = new Map(moduleRows.map((module) => [module.id, module.pluralName] as const))
  const mine = (widgets.data?.data ?? []).filter(
    (widget) => widget.userId === null || widget.userId === userId
  )
  const views = toWidgetViews(mine, names)
  if (views.length === 0) return null

  const pairs = await Promise.all(
    views.map(async (widget) => {
      const [report, recent] = await Promise.all([
        client.customModules.statusReport(orgId, widget.moduleId, {}),
        client.customModules.listRecords(orgId, widget.moduleId, { limit: 5 }),
      ])
      const data = widgetDataFor(widget, {
        total: report.data?.total ?? 0,
        byStatus: (report.data?.byStatus ?? []).map((row) => ({
          statusKey: row.key,
          label: row.label,
          count: row.count,
        })),
        recent: (recent.data?.data ?? []).map((record) => ({
          id: record.id,
          title: record.title,
          statusKey: record.statusKey,
          updatedAt: record.updatedAt,
        })),
      })
      return { widget, data }
    })
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {pairs.map(({ widget, data }) => (
        <DashboardWidget key={widget.id} widget={widget} data={data} />
      ))}
    </div>
  )
}
