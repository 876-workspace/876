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

  if (value.customerKind === 'INDIVIDUAL' && !person)
    ctx.addIssue({
      code: 'custom',
      path: ['firstName'],
      message: 'Enter the customer name.',
    })

  if (value.customerKind === 'BUSINESS' && !company)
    ctx.addIssue({
      code: 'custom',
      path: ['companyName'],
      message: 'Enter the company name.',
    })
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

/**
 * The identity link is fixed at creation, never edited afterwards — moving a
 * customer between parties would silently re-address its whole history.
 *
 * The two axes are independent (`.claude/rules/customer-architecture.md`), but
 * only two of the four combinations are meaningful: an 876 account is a person,
 * an 876 organization is a company. Absent both, the customer is `EXTERNAL`.
 */
const identityLinkSchema = z
  .object({
    userId: z.string().trim().max(160).nullable().optional(),
    organizationId: z.string().trim().max(160).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.userId && value.organizationId)
      ctx.addIssue({
        code: 'custom',
        path: ['organizationId'],
        message: 'A customer links to an account or an organization, not both.',
      })
  })

export const createCustomerBodySchema = z
  .intersection(
    customerIdentitySchema,
    z.intersection(
      identityLinkSchema,
      z.object({ idempotencyKey: z.string().min(1).max(200) })
    )
  )
  .superRefine((value, ctx) => {
    if (value.userId && value.customerKind !== 'INDIVIDUAL')
      ctx.addIssue({
        code: 'custom',
        path: ['userId'],
        message: 'An 876 account can only be an INDIVIDUAL customer.',
      })

    if (value.organizationId && value.customerKind !== 'BUSINESS')
      ctx.addIssue({
        code: 'custom',
        path: ['organizationId'],
        message: 'An 876 organization can only be a BUSINESS customer.',
      })
  })

export const updateCustomerBodySchema = z.intersection(
  customerIdentitySchema,
  z.object({ status: z.enum(['ACTIVE', 'INACTIVE']).optional() })
)

export const deleteCustomerBodySchema = z.object({
  deletedBy: z.string().min(1),
  reason: z.string().trim().max(300).nullable().optional(),
})
