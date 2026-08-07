import { listObject, type ListObject } from '@/http/envelope'
import { AppHttpError } from '@/http/errors'
import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repository from './modules.repository'
import type {
  ApplicationModule,
  CreateModuleBody,
  EntitlementsQuery,
  ListModulesQuery,
  UpdateModuleBody,
} from './modules.schemas'
import { serializeModule } from './modules.serializers'

/** Application modules — the functional areas of a product app. */

const log = getLogger('modules')

const notFound = () =>
  new AppHttpError({
    code: 'module/not-found',
    message: 'Application module not found.',
    httpStatus: 404,
  })

/**
 * A module's rollout flag must be a root feature owned by the same app, and no
 * two modules may share one.
 *
 * A child flag is already gated by its parent, so pointing a module at one would
 * make the module's availability depend on a second switch nobody looking at the
 * module can see. Sharing a flag across modules is worse: toggling it would move
 * two products at once.
 */
async function resolveFeature(
  appId: string,
  featureId: string | null,
  currentModuleId: string | null
): Promise<{ id: string; slug: string } | null> {
  if (featureId === null) return null

  const feature = await repository.findFeature(featureId)
  if (!feature)
    throw new AppHttpError({
      code: 'module/feature-not-found',
      message: 'The selected rollout feature flag does not exist.',
      httpStatus: 422,
    })

  if (feature.appId !== appId || feature.parentFeatureId !== null)
    throw new AppHttpError({
      code: 'module/feature-invalid',
      message:
        'A module rollout flag must be a root feature owned by the same application.',
      httpStatus: 422,
    })

  const linked = await repository.findByFeature(appId, featureId)
  if (linked && linked.id !== currentModuleId)
    throw new AppHttpError({
      code: 'module/feature-in-use',
      message:
        'The selected rollout feature flag is already linked to another module.',
      httpStatus: 409,
    })

  return { id: feature.id, slug: feature.slug }
}

export async function listModules(
  query: ListModulesQuery
): Promise<ListObject<ApplicationModule>> {
  if (!(await repository.appExists(query.appId)))
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })

  const rows = await repository.listForApp(query.appId, query.includeArchived)

  return listObject({
    data: rows.map(serializeModule),
    hasMore: false,
    url: '/modules',
  })
}

export async function listEntitledModules(
  query: EntitlementsQuery
): Promise<ListObject<ApplicationModule>> {
  const rows = await repository.listEntitled(query.organizationId, query.appId)

  return listObject({
    data: rows.map(serializeModule),
    hasMore: false,
    url: '/modules/entitlements',
  })
}

export async function retrieveModule(
  moduleId: string
): Promise<ApplicationModule> {
  const row = await repository.findById(moduleId)
  if (!row) throw notFound()

  return serializeModule(row)
}

export async function createModule(
  body: CreateModuleBody
): Promise<ApplicationModule> {
  // Only a product app has modules: an internal or third-party app has nothing
  // to sell an organization.
  if (!(await repository.appIsProduct(body.app_id)))
    throw new AppHttpError({
      code: 'module/app-invalid',
      message: 'Modules can only belong to product applications.',
      httpStatus: 422,
    })

  if (await repository.findByKey(body.app_id, body.key))
    throw new AppHttpError({
      code: 'module/duplicate-key',
      message: 'A module with this key already exists for the application.',
      httpStatus: 409,
    })

  const feature = await resolveFeature(
    body.app_id,
    body.feature_id ?? null,
    null
  )
  const now = BigInt(nowUnixSeconds())

  const row = await repository.create({
    id: generateId('applicationModule'),
    appId: body.app_id,
    key: body.key,
    name: body.name.trim(),
    description: body.description ?? null,
    featureId: feature?.id ?? null,
    status: 'active',
    position: body.position,
    createdAt: now,
    updatedAt: now,
  })

  log.info(
    { module_id: row.id, app_id: row.appId, key: row.key },
    'modules.create'
  )

  return serializeModule(row)
}

export async function updateModule(
  moduleId: string,
  body: UpdateModuleBody,
  provided: Set<string>
): Promise<ApplicationModule> {
  const row = await repository.findById(moduleId)
  if (!row) throw notFound()

  const data: Record<string, unknown> = { updatedAt: BigInt(nowUnixSeconds()) }

  if (provided.has('feature_id')) {
    const feature = await resolveFeature(
      row.appId,
      body.feature_id ?? null,
      row.id
    )
    data.featureId = feature?.id ?? null
  }

  if (body.name !== undefined) data.name = body.name.trim()
  if (provided.has('description')) data.description = body.description ?? null
  if (body.position !== undefined) data.position = body.position
  if (body.status !== undefined) data.status = body.status

  // Archiving detaches the module from every plan that sells it, or the plan
  // would keep granting an entitlement the app no longer exposes.
  if (body.status === 'archived') await repository.deletePlanModules(row.id)

  const updated = await repository.update(moduleId, data)
  log.info({ module_id: updated.id, status: updated.status }, 'modules.update')

  return serializeModule(updated)
}

export async function archiveModule(
  moduleId: string
): Promise<{ object: 'application_module'; id: string; deleted: true }> {
  const row = await repository.findById(moduleId)
  if (!row) throw notFound()

  await repository.deletePlanModules(row.id)
  await repository.update(moduleId, {
    status: 'archived',
    updatedAt: BigInt(nowUnixSeconds()),
  })

  return { object: 'application_module', id: row.id, deleted: true }
}
