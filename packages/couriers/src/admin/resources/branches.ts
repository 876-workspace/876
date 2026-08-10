import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  branchListSchema,
  branchSchema,
  type Branch,
  type BranchList,
  type CreateBranchBody,
  type UpdateBranchBody,
} from '../types/branch.schema'
export function createBranchesResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/branches`
  return {
    list(tenantId: string) {
      return AdminRequest<BranchList>(
        runtime,
        { method: 'GET', path: path(tenantId) },
        branchListSchema
      )
    },
    retrieve(tenantId: string, id: string) {
      return AdminRequest<Branch>(
        runtime,
        { method: 'GET', path: `${path(tenantId)}/${encodeURIComponent(id)}` },
        branchSchema
      )
    },
    create(tenantId: string, body: CreateBranchBody) {
      return AdminRequest<Branch>(
        runtime,
        { method: 'POST', path: path(tenantId), body },
        branchSchema
      )
    },
    update(tenantId: string, id: string, body: UpdateBranchBody) {
      return AdminRequest<Branch>(
        runtime,
        {
          method: 'PATCH',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
          body,
        },
        branchSchema
      )
    },
  }
}
