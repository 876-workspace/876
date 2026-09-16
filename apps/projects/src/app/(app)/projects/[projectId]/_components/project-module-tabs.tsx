import Link from 'next/link'

import { callerRoleKeys, projectScopeModules } from '@/lib/custom-modules/module-access'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'

/**
 * Links to this project's custom-module record lists. Rendered beside the
 * project tabs; the tab bar itself stays static.
 */
export async function ProjectModuleTabs({
  orgId,
  projectId,
  roleKeys,
}: {
  orgId: string
  projectId: string
  roleKeys: readonly string[]
}) {
  const keys = callerRoleKeys(roleKeys)
  const listed = await serviceWithRoleKeys(keys).customModules.listModules(orgId)
  const modules = projectScopeModules(listed.data?.data ?? [], projectId)
  if (modules.length === 0) return null

  return (
    <nav aria-label="Project custom modules" className="mb-4 flex flex-wrap gap-2">
      {modules.map((module) => (
        <Link
          key={module.id}
          href={`/projects/${encodeURIComponent(projectId)}/m/${encodeURIComponent(module.key)}`}
          className="rounded-full border px-4 py-1.5 text-sm font-medium"
        >
          {module.pluralName}
        </Link>
      ))}
    </nav>
  )
}
