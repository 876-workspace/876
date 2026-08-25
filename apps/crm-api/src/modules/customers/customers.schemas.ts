import { z } from 'zod'

const nullableText = z.string().trim().max(160).nullable().optional()

function requireCustomerName(
  value: {
    customerKind: 'INDIVIDUAL' | 'BUSINESS'
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
  },
  ctx: z.RefinementCtx
) {
  const person = [value.firstName, value.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  const company = value.companyName?.trim() ?? ''

  if (value.customerKind === 'INDIVIDUAL' && !person) {
    ctx.addIssue({
      code: 'custom',
      path: ['firstName'],
      message: 'Enter the customer name.',
    })
  }

  if (value.customerKind === 'BUSINESS' && !company) {
    ctx.addIssue({
      code: 'custom',
      path: ['companyName'],
      message: 'Enter the company name.',
    })
  }
}

export const organizationParamsSchema = z.object({
  organizationId: z.string().min(1),
})

export const customerParamsSchema = organizationParamsSchema.extend({
  id: z.string().min(1),
})

const customerIdentitySchema = z
  .object({
    customerKind: z.enum(['INDIVIDUAL', 'BUSINESS']),
    firstName: nullableText,
    lastName: nullableText,
    companyName: nullableText,
    email: z.string().trim().email().max(254).nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    ownerId: z.string().trim().max(160).nullable().optional(),
  })
  .superRefine(requireCustomerName)

export const createCustomerBodySchema = z.intersection(
  customerIdentitySchema,
  z.object({ idempotencyKey: z.string().min(1).max(200) })
)

export const updateCustomerBodySchema = z.intersection(
  customerIdentitySchema,
  z.object({ status: z.enum(['ACTIVE', 'INACTIVE']).optional() })
)

export const deleteCustomerBodySchema = z.object({
  deletedBy: z.string().min(1),
  reason: z.string().trim().max(300).nullable().optional(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerBodySchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerBodySchema>
