import 'server-only'

import { z } from 'zod'

import { request } from './request'
import { buildRuntime } from './runtime'
import type { ClientOptions, RequestOptions } from './types'

const crmWorkspaceSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  nextRequestNumber: z.number().int().positive(),
  provisioningRevision: z.number().int().nonnegative(),
  provisionedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type CrmWorkspace = z.infer<typeof crmWorkspaceSchema>

/** Platform-owned service data that may be ensured independently of CRM product access. */
export type CrmWorkspaceFixture = '876_SUPPORT'

export interface CrmWorkspaceEnsureOptions extends RequestOptions {
  fixtures?: readonly CrmWorkspaceFixture[]
}

export type CrmWorkspaceProvisioning = {
  object: 'crm_provisioning_manifest'
  revision: number
  priorities: Array<{
    key: string
    name: string
    description: string | null
    color: string | null
    icon: string | null
    weight: number
    sortOrder: number
    isDefault: boolean
  }>
  categories: Array<{
    key: string
    name: string
    description: string | null
    color: string | null
    icon: string | null
    sortOrder: number
    isActive: boolean
    defaultPriorityKey: string | null
  }>
  subcategories: Array<{
    key: string
    categoryKey: string
    name: string
    description: string | null
    icon: string | null
    sortOrder: number
    isActive: boolean
    defaultPriorityKey: string | null
  }>
}

/**
 * Operator control plane for CRM workspace lifecycle.
 *
 * This is deliberately separate from create876CrmClient(): normal CRM resource
 * operations remain on the flat data plane (`$876.requests.*`,
 * `$876.customers.*`). Ensuring a tenant prepares infrastructure; it does not
 * grant an `876-crm` product entitlement.
 */
export function create876CrmWorkspaceClient(options: ClientOptions = {}) {
  const runtime = buildRuntime(options)

  return {
    retrieve(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `/v1/tenants?organizationId=${encodeURIComponent(organizationId)}`,
          signal: options.signal,
        },
        crmWorkspaceSchema
      )
    },

    ensure(
      organizationId: string,
      provisioning?: CrmWorkspaceProvisioning,
      options: CrmWorkspaceEnsureOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: '/v1/tenants',
          body: {
            organizationId,
            ...(provisioning ? { provisioning } : {}),
            ...(options.fixtures?.length
              ? { fixtures: [...options.fixtures] }
              : {}),
          },
          signal: options.signal,
        },
        crmWorkspaceSchema
      )
    },
  }
}

export type CrmWorkspaceClient = ReturnType<
  typeof create876CrmWorkspaceClient
>