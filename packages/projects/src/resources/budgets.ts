import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  budgetListSchema,
  budgetSchema,
  deletedSchema,
  type CreateBudgetInput,
  type RequestOptions,
  type UpdateBudgetInput,
} from '../types'

function collectionRoot(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/budgets`
}

function resourcePath(
  organizationId: string,
  projectId: string,
  budgetId: string
) {
  return `${collectionRoot(organizationId, projectId)}/${encodeURIComponent(budgetId)}`
}

export function createBudgetsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      projectId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: collectionRoot(organizationId, projectId),
          signal: options.signal,
        },
        budgetListSchema
      )
    },
    create(
      organizationId: string,
      projectId: string,
      input: CreateBudgetInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: collectionRoot(organizationId, projectId),
          body: input,
          signal: options.signal,
        },
        budgetSchema
      )
    },
    retrieve(
      organizationId: string,
      projectId: string,
      budgetId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: resourcePath(organizationId, projectId, budgetId),
          signal: options.signal,
        },
        budgetSchema
      )
    },
    update(
      organizationId: string,
      projectId: string,
      budgetId: string,
      input: UpdateBudgetInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: resourcePath(organizationId, projectId, budgetId),
          body: input,
          signal: options.signal,
        },
        budgetSchema
      )
    },
    delete(
      organizationId: string,
      projectId: string,
      budgetId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: resourcePath(organizationId, projectId, budgetId),
          signal: options.signal,
        },
        deletedSchema
      )
    },
  }
}
