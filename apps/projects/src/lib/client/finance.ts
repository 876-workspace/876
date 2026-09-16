'use client'

import type {
  Budget,
  BudgetList,
  CreateBudgetInput,
  CreateInvoiceDraftInput,
  CreateRateInput,
  FinancialSummary,
  InvoiceDraft,
  ProjectBilling,
  PutProjectBillingInput,
  Rate,
  RateList,
  UpdateBudgetInput,
  UpdateRateInput,
} from '@876/projects'

import { request } from './request'

export type PutBillingParams = PutProjectBillingInput
export type CreateBudgetParams = CreateBudgetInput
export type UpdateBudgetParams = UpdateBudgetInput
export type CreateRateParams = CreateRateInput
export type UpdateRateParams = UpdateRateInput

function root(projectId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}`
}

function json(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export const financeClient = {
  getBilling(projectId: string) {
    return request<ProjectBilling>(`${root(projectId)}/billing`)
  },
  putBilling(projectId: string, params: PutBillingParams) {
    return request<ProjectBilling>(`${root(projectId)}/billing`, {
      ...json(params),
      method: 'PUT',
    })
  },
  getSummary(projectId: string, from: number, to: number) {
    const search = new URLSearchParams({ from: String(from), to: String(to) })
    return request<FinancialSummary>(
      `${root(projectId)}/financial-summary?${search.toString()}`
    )
  },
  listBudgets(projectId: string) {
    return request<BudgetList>(`${root(projectId)}/budgets`)
  },
  createBudget(projectId: string, params: CreateBudgetParams) {
    return request<Budget>(`${root(projectId)}/budgets`, json(params))
  },
  updateBudget(projectId: string, budgetId: string, params: UpdateBudgetParams) {
    return request<Budget>(
      `${root(projectId)}/budgets/${encodeURIComponent(budgetId)}`,
      { ...json(params), method: 'PATCH' }
    )
  },
  deleteBudget(projectId: string, budgetId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `${root(projectId)}/budgets/${encodeURIComponent(budgetId)}`,
      { method: 'DELETE' }
    )
  },
  listRates(projectId: string) {
    return request<RateList>(`${root(projectId)}/rates`)
  },
  createRate(projectId: string, params: CreateRateParams) {
    return request<Rate>(`${root(projectId)}/rates`, json(params))
  },
  updateRate(projectId: string, rateId: string, params: UpdateRateParams) {
    return request<Rate>(
      `${root(projectId)}/rates/${encodeURIComponent(rateId)}`,
      { ...json(params), method: 'PATCH' }
    )
  },
  deleteRate(projectId: string, rateId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `${root(projectId)}/rates/${encodeURIComponent(rateId)}`,
      { method: 'DELETE' }
    )
  },
  createInvoiceDraft(
    projectId: string,
    params: CreateInvoiceDraftInput
  ) {
    return request<InvoiceDraft>(
      `${root(projectId)}/invoice-drafts`,
      json(params)
    )
  },
}
