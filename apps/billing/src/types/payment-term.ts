import { z } from 'zod'

export const PaymentTermRuleSchema = z.enum([
  'DUE_ON_RECEIPT',
  'NET_DAYS',
  'END_OF_MONTH',
  'END_OF_NEXT_MONTH',
])

export const PaymentTermCreateSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120),
    rule: PaymentTermRuleSchema,
    dueDays: z.number().int().min(0).max(3650).default(0),
    isDefault: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.rule !== 'NET_DAYS' && value.dueDays !== 0)
      context.addIssue({
        code: 'custom',
        message: 'Only net-day terms can include due days.',
        path: ['dueDays'],
      })
  })

export type PaymentTermCreateParams = z.infer<typeof PaymentTermCreateSchema>
export type PaymentTermCreateInput = z.input<typeof PaymentTermCreateSchema>
