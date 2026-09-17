import 'server-only'

import type { LayoutEntity } from '@876/projects/contracts'

import type { ModuleBundle } from '@/types/custom-modules'

import { customModuleLayoutEntity, findModuleByKey } from './module-access'
import { serviceWithRoleKeys } from './service-with-roles'

export async function loadModuleBundle(
  orgId: string,
  roleKeys: readonly string[],
  moduleKey: string
): Promise<
  | { status: 'ok'; bundle: ModuleBundle }
  | { status: 'not-found' }
  | { status: 'error'; error: { code: string; message: string } }
> {
  const client = serviceWithRoleKeys(roleKeys)
  const listed = await client.customModules.listModules(orgId)
  if (listed.error || !listed.data)
    return {
      status: 'error',
      error: listed.error ?? {
        code: 'projects/custom-modules-unavailable',
        message: 'Custom modules could not be loaded.',
      },
    }

  const definition = findModuleByKey(listed.data.data, moduleKey)
  if (!definition) return { status: 'not-found' }

  const entity = customModuleLayoutEntity(definition.key) as LayoutEntity
  const [fields, statuses, layouts] = await Promise.all([
    client.customModules.listFields(orgId, definition.id),
    client.customModules.listStatuses(orgId, definition.id),
    client.layouts.list(orgId, { entity }),
  ])

  return {
    status: 'ok',
    bundle: {
      module: definition,
      fields: fields.data?.data ?? [],
      statuses: statuses.data?.data ?? [],
      layout:
        layouts.data?.data.find((entry) => entry.entity === entity) ?? null,
      loadError: fields.error ?? statuses.error ?? layouts.error ?? null,
    },
  }
}
