import { z } from 'zod'

import {
  provisioningPropertyInputSchema,
  provisioningResourceResponseSchema,
} from './provisioning.schemas'

const resourceKeySchema = z
  .string()
  .min(1)
  .max(120)
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, {
    message: 'Provisioning resource keys cannot be blank.',
  })

export const provisioningSetupResourceParamsSchema = z.strictObject({
  setup_key: z.string().min(1).max(60),
  resource_type: z.string().min(1).max(120),
})

export const provisioningSetupResourceItemParamsSchema = z.strictObject({
  setup_key: z.string().min(1).max(60),
  resource_type: z.string().min(1).max(120),
  resource_key: resourceKeySchema,
})

export const provisioningSetupResourceCreateSchema = z.strictObject({
  key: resourceKeySchema,
  position: z.number().int().min(0).optional(),
  properties: z.array(provisioningPropertyInputSchema).max(100).default([]),
})

export const provisioningSetupResourceUpdateSchema = z
  .strictObject({
    position: z.number().int().min(0).optional(),
    properties: z.array(provisioningPropertyInputSchema).max(100).optional(),
  })
  .refine(
    (value) => value.position !== undefined || value.properties !== undefined,
    { message: 'At least one resource field must be updated.' }
  )

export const deletedProvisioningSetupResourceResponseSchema = z.object({
  object: z.literal('provisioning_resource'),
  resource_type: z.string(),
  key: z.string(),
  deleted: z.literal(true),
})

export { provisioningResourceResponseSchema }

export type ProvisioningSetupResourceCreate = z.infer<
  typeof provisioningSetupResourceCreateSchema
>
export type ProvisioningSetupResourceUpdate = z.infer<
  typeof provisioningSetupResourceUpdateSchema
>
