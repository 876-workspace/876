import { SessionRequest } from '../session-request'
import type { Runtime } from '../runtime'
import {
  packageListSchema,
  packageSchema,
  type CreatePackageBody,
  type ListPackagesParams,
  type Package,
  type PackageList,
  type UpdatePackageBody,
} from '../admin/types/package.schema'

export function createPackagesResource(runtime: Runtime) {
  const path = '/v1/me/packages'
  return {
    list(params: ListPackagesParams = {}) {
      return SessionRequest<PackageList>(
        runtime,
        { method: 'GET', path, query: params },
        packageListSchema
      )
    },
    retrieve(id: string) {
      return SessionRequest<Package>(
        runtime,
        { method: 'GET', path: `${path}/${encodeURIComponent(id)}` },
        packageSchema
      )
    },
    create(body: CreatePackageBody) {
      return SessionRequest<Package>(
        runtime,
        { method: 'POST', path, body },
        packageSchema
      )
    },
    update(id: string, body: UpdatePackageBody) {
      return SessionRequest<Package>(
        runtime,
        { method: 'PATCH', path: `${path}/${encodeURIComponent(id)}`, body },
        packageSchema
      )
    },
  }
}
