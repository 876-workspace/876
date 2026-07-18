import type {
  PlanCreated,
  PlanCreateInput,
  PlanCloneInput,
  PlanDeleted,
  PlanResource,
  PlanUpdated,
  PlanUpdateInput,
} from '@/types/plan'

import { request } from './request'

export const create = (params: PlanCreateInput) =>
  request<PlanCreated>('/api/v1/plans', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const retrieve = (planId: string) =>
  request<PlanResource>(`/api/v1/plans/${encodeURIComponent(planId)}`, {
    method: 'GET',
  })

export const update = (planId: string, params: PlanUpdateInput) =>
  request<PlanUpdated>(`/api/v1/plans/${encodeURIComponent(planId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

const deletePlan = (planId: string) =>
  request<PlanDeleted>(`/api/v1/plans/${encodeURIComponent(planId)}`, {
    method: 'DELETE',
  })

export const plans = {
  create,
  retrieve,
  update,
  delete: deletePlan,
  clone: (planId: string, params: PlanCloneInput) =>
    request<PlanCreated>(`/api/v1/plans/${encodeURIComponent(planId)}/clone`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),
}
