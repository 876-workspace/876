import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  financialSummarySchema,
  invoiceDraftSchema,
  projectBillingSchema,
  type CreateInvoiceDraftInput,
  type GetFinancialSummaryQuery,
  type PutProjectBillingInput,
  type RequestOptions,
} from '../types'

function billingRoot(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/billing`
}

function summaryRoot(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/financial-summary`
}

function invoiceDraftsRoot(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/invoice-drafts`
}

export function createProjectBillingResource(runtime: Runtime) {
  return {
    retrieve(
      organizationId: string,
      projectId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: billingRoot(organizationId, projectId),
          signal: options.signal,
        },
        projectBillingSchema
      )
    },
    put(
      organizationId: string,
      projectId: string,
      input: PutProjectBillingInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PUT',
          path: billingRoot(organizationId, projectId),
          body: input,
          signal: options.signal,
        },
        projectBillingSchema
      )
    },
    financialSummary(
      organizationId: string,
      projectId: string,
      query: GetFinancialSummaryQuery & RequestOptions = { from: 0, to: 0 }
    ) {
      const { signal, from, to } = query
      const search = new URLSearchParams({
        from: String(from),
        to: String(to),
      })
      return request(
        runtime,
        {
          method: 'GET',
          path: `${summaryRoot(organizationId, projectId)}?${search.toString()}`,
          signal,
        },
        financialSummarySchema
      )
    },
    createInvoiceDraft(
      organizationId: string,
      projectId: string,
      input: CreateInvoiceDraftInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: invoiceDraftsRoot(organizationId, projectId),
          body: input,
          signal: options.signal,
        },
        invoiceDraftSchema
      )
    },
  }
}
