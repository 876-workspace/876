import { z } from 'zod'

export const paymentTermRuleSchema = z.enum([
  'DUE_ON_RECEIPT',
  'NET_DAYS',
  'END_OF_MONTH',
  'END_OF_NEXT_MONTH',
])

export const paymentTermSchema = z.object({
  object: z.literal('payment_term'),
  id: z.string(),
  name: z.string(),
  rule: paymentTermRuleSchema,
  dueDays: z.number().int(),
  isDefault: z.boolean(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const paymentTermCreateBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120),
    rule: paymentTermRuleSchema,
    dueDays: z.number().int().min(0).optional().default(0),
    isDefault: z.boolean().optional().default(false),
  })
  .superRefine((body, context) => {
    if (body.rule !== 'NET_DAYS' && body.dueDays !== 0) {
      context.addIssue({
        code: 'custom',
        path: ['dueDays'],
        message: 'dueDays is only used with NET_DAYS.',
      })
    }
  })

export const salespersonSchema = z.object({
  object: z.literal('salesperson'),
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  externalReference: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const salespersonCreateBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  email: z.email().nullable().optional(),
  externalReference: z.string().trim().min(1).nullable().optional(),
})

export type PaymentTermCreateBody = z.infer<typeof paymentTermCreateBodySchema>
export type SalespersonCreateBody = z.infer<typeof salespersonCreateBodySchema>
