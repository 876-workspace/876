import { SessionRequest } from '../session-request'
import type { Runtime } from '../runtime'
import {
  branchListSchema,
  branchSchema,
  type Branch,
  type BranchList,
  type CreateBranchBody,
  type UpdateBranchBody,
} from '../admin/types/branch.schema'

export function createBranchesResource(runtime: Runtime) {
  const path = '/v1/me/branches'
  return {
    list(params: Record<string, unknown> = {}) {
      return SessionRequest<BranchList>(
        runtime,
        { method: 'GET', path, query: params as never },
        branchListSchema
      )
    },
    retrieve(id: string) {
      return SessionRequest<Branch>(
        runtime,
        { method: 'GET', path: `${path}/${encodeURIComponent(id)}` },
        branchSchema
      )
    },
    create(body: CreateBranchBody) {
      return SessionRequest<Branch>(
        runtime,
        { method: 'POST', path, body },
        branchSchema
      )
    },
    update(id: string, body: UpdateBranchBody) {
      return SessionRequest<Branch>(
        runtime,
        { method: 'PATCH', path: `${path}/${encodeURIComponent(id)}`, body },
        branchSchema
      )
    },
  }
}
