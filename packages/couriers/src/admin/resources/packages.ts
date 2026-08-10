import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  packageListSchema,
  packageSchema,
  type CreatePackageBody,
  type ListPackagesParams,
  type Package,
  type PackageList,
  type UpdatePackageBody,
} from '../types/package.schema'

export function createPackagesResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/packages`

  return {
    list(tenantId: string, params: ListPackagesParams = {}) {
      return AdminRequest<PackageList>(
        runtime,
        { method: 'GET', path: path(tenantId), query: params },
        packageListSchema
      )
    },

    retrieve(tenantId: string, id: string) {
      return AdminRequest<Package>(
        runtime,
        { method: 'GET', path: `${path(tenantId)}/${encodeURIComponent(id)}` },
        packageSchema
      )
    },

    create(tenantId: string, body: CreatePackageBody) {
      return AdminRequest<Package>(
        runtime,
        { method: 'POST', path: path(tenantId), body },
        packageSchema
      )
    },

    update(tenantId: string, id: string, body: UpdatePackageBody) {
      return AdminRequest<Package>(
        runtime,
        {
          method: 'PATCH',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
          body,
        },
        packageSchema
      )
    },
  }
}
