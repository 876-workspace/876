import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  deletedPackageCategorySchema,
  packageCategoryListSchema,
  packageCategorySchema,
  type CreatePackageCategoryBody,
  type DeletedPackageCategory,
  type ListPackageCategoriesParams,
  type PackageCategory,
  type PackageCategoryList,
  type UpdatePackageCategoryBody,
} from '../types/package-category.schema'

export function createPackageCategoriesResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/package-categories`

  return {
    list(tenantId: string, params: ListPackageCategoriesParams = {}) {
      return AdminRequest<PackageCategoryList>(
        runtime,
        { method: 'GET', path: path(tenantId), query: params },
        packageCategoryListSchema
      )
    },

    retrieve(tenantId: string, id: string) {
      return AdminRequest<PackageCategory>(
        runtime,
        { method: 'GET', path: `${path(tenantId)}/${encodeURIComponent(id)}` },
        packageCategorySchema
      )
    },

    create(tenantId: string, body: CreatePackageCategoryBody) {
      return AdminRequest<PackageCategory>(
        runtime,
        { method: 'POST', path: path(tenantId), body },
        packageCategorySchema
      )
    },

    update(tenantId: string, id: string, body: UpdatePackageCategoryBody) {
      return AdminRequest<PackageCategory>(
        runtime,
        {
          method: 'PATCH',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
          body,
        },
        packageCategorySchema
      )
    },

    delete(tenantId: string, id: string) {
      return AdminRequest<DeletedPackageCategory>(
        runtime,
        { method: 'DELETE', path: `${path(tenantId)}/${encodeURIComponent(id)}` },
        deletedPackageCategorySchema
      )
    },
  }
}
