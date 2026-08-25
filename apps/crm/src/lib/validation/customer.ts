import { z } from 'zod'

const nullableText = z.string().trim().max(160).nullable().optional()

export const customerCreateSchema = z
  .strictObject({
    customerKind: z.enum(['INDIVIDUAL', 'BUSINESS']),
    firstName: nullableText,
    lastName: nullableText,
    companyName: nullableText,
    email: z.string().trim().email().max(254).nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    ownerId: z.string().trim().max(160).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const person = [value.firstName, value.lastName].filter(Boolean).join(' ').trim()
    const company = value.companyName?.trim() ?? ''
    if (value.customerKind === 'INDIVIDUAL' && !person)
      ctx.addIssue({ code: 'custom', path: ['firstName'], message: 'Enter the customer name.' })
    if (value.customerKind === 'BUSINESS' && !company)
      ctx.addIssue({ code: 'custom', path: ['companyName'], message: 'Enter the company name.' })
  })

export const customerUpdateSchema = customerCreateSchema.and(
  z.strictObject({ status: z.enum(['ACTIVE', 'INACTIVE']) })
)

export const customerDeleteSchema = z.strictObject({
  reason: z.string().trim().max(300).nullable().optional(),
})
