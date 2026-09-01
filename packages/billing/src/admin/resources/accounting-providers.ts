import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  accountingProviderAdoptionDeletedSchema,
  accountingProviderAdoptionSchema,
  accountingProviderAuthorizationSchema,
  accountingProviderConnectionDeletedSchema,
  accountingProviderConnectionListSchema,
  accountingProviderConnectionSchema,
  accountingProviderImportListSchema,
  accountingProviderListSchema,
  accountingProviderReconcileSchema,
  type AccountingProviderAdoptParams,
  type AccountingProviderConnection,
  type AccountingProviderConnectionCreateParams,
  type AccountingProviderConnectionParams,
  type AccountingProviderConnectionUpdateParams,
  type AccountingProviderImportListParams,
  type AccountingProviderReconcileParams,
  type AccountingProviderReleaseParams,
} from '../accounting-providers'
import type { List } from '../../types'

function connectionRoot(organizationId: string) {
  return `/api/v1/admin/organizations/${encodeURIComponent(organizationId)}/accounting-provider-connections`
}

export function createAdminAccountingProvidersResource(runtime: AdminRuntime) {
  return {
    list() {
      return AdminRequest(
        runtime,
        { method: 'GET', path: '/api/v1/admin/accounting-providers' },
        accountingProviderListSchema
      )
    },
    connections: {
      list(organizationId: string) {
        return AdminRequest<List<AccountingProviderConnection>>(
          runtime,
          { method: 'GET', path: connectionRoot(organizationId) },
          accountingProviderConnectionListSchema
        )
      },
      create(params: AccountingProviderConnectionCreateParams) {
        const { organizationId, ...body } = params
        return AdminRequest(
          runtime,
          { method: 'POST', path: connectionRoot(organizationId), body },
          accountingProviderConnectionSchema
        )
      },
      retrieve(params: AccountingProviderConnectionParams) {
        return AdminRequest(
          runtime,
          {
            method: 'GET',
            path: `${connectionRoot(params.organizationId)}/${encodeURIComponent(params.connectionId)}`,
          },
          accountingProviderConnectionSchema
        )
      },
      update(params: AccountingProviderConnectionUpdateParams) {
        const { organizationId, connectionId, ...body } = params
        return AdminRequest(
          runtime,
          {
            method: 'PATCH',
            path: `${connectionRoot(organizationId)}/${encodeURIComponent(connectionId)}`,
            body,
          },
          accountingProviderConnectionSchema
        )
      },
      delete(params: AccountingProviderConnectionParams) {
        return AdminRequest(
          runtime,
          {
            method: 'DELETE',
            path: `${connectionRoot(params.organizationId)}/${encodeURIComponent(params.connectionId)}`,
          },
          accountingProviderConnectionDeletedSchema
        )
      },
      authorize(params: AccountingProviderConnectionParams) {
        return AdminRequest(
          runtime,
          {
            method: 'POST',
            path: `${connectionRoot(params.organizationId)}/${encodeURIComponent(params.connectionId)}/authorize`,
          },
          accountingProviderAuthorizationSchema
        )
      },
      validate(params: AccountingProviderConnectionParams) {
        return AdminRequest(
          runtime,
          {
            method: 'POST',
            path: `${connectionRoot(params.organizationId)}/${encodeURIComponent(params.connectionId)}/validate`,
          },
          accountingProviderConnectionSchema
        )
      },
      reconcile(params: AccountingProviderReconcileParams) {
        return AdminRequest(
          runtime,
          {
            method: 'POST',
            path: `${connectionRoot(params.organizationId)}/${encodeURIComponent(params.connectionId)}/reconcile`,
            body: { resourceTypes: params.resourceTypes },
          },
          accountingProviderReconcileSchema
        )
      },
      imports: {
        list(params: AccountingProviderImportListParams) {
          return AdminRequest(
            runtime,
            {
              method: 'GET',
              path: `${connectionRoot(params.organizationId)}/${encodeURIComponent(params.connectionId)}/imports/${params.resourceType}`,
              query: { page: params.page, perPage: params.perPage },
            },
            accountingProviderImportListSchema
          )
        },
        adopt(params: AccountingProviderAdoptParams) {
          return AdminRequest(
            runtime,
            {
              method: 'POST',
              path: `${connectionRoot(params.organizationId)}/${encodeURIComponent(params.connectionId)}/imports/${params.resourceType}/adoptions`,
              body: {
                resourceId: params.resourceId,
                externalId: params.externalId,
              },
            },
            accountingProviderAdoptionSchema
          )
        },
        release(params: AccountingProviderReleaseParams) {
          return AdminRequest(
            runtime,
            {
              method: 'DELETE',
              path: `${connectionRoot(params.organizationId)}/${encodeURIComponent(params.connectionId)}/imports/${params.resourceType}/adoptions/${encodeURIComponent(params.resourceId)}`,
            },
            accountingProviderAdoptionDeletedSchema
          )
        },
      },
    },
  }
}
