import { z } from 'zod'

export const TenantCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,80}$/),
  defaultCurrency: z.literal('JMD').default('JMD'),
})

export type TenantCreateParams = z.infer<typeof TenantCreateSchema>
export type TenantCreateInput = z.input<typeof TenantCreateSchema>

export interface TenantProvisioned {
  object: 'billing_tenant'
  id: string
  created: boolean
  provisioningVersion: number
}
