import { z } from 'zod'

export const AppFinanceConnectionStatusSchema = z.enum([
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
])

export const AppFinanceConnectionScopeSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/)

export type AppFinanceConnectionStatus = z.infer<
  typeof AppFinanceConnectionStatusSchema
>

export interface AppFinanceConnection {
  /** String representing the object's type. Always `app_finance_connection`. */
  object: 'app_finance_connection'
  /** Unique identifier for this product application's finance connection. */
  id: string
  /** Opaque Billing workspace identifier. */
  tenantId: string
  /** Opaque Core application identifier granted embedded finance access. */
  sourceAppId: string
  /** Current connection lifecycle state. */
  status: AppFinanceConnectionStatus
  /** Narrow Billing integration scopes granted to the source application. */
  scopes: string[]
  /** Opaque Core entitlement record that authorized this connection. */
  entitlementReference: string | null
  /** Applied source-application provisioning content revision. */
  provisioningVersion: number
  /** Monotonic lifecycle revision used to reject stale integration events. */
  lifecycleVersion: number
  activatedAt: number | null
  suspendedAt: number | null
  revokedAt: number | null
  createdAt: number
  updatedAt: number
}
