import { z } from 'zod'

const optionalTextSchema = z.string().trim().min(1).nullable().optional()

export const customerCreateSchema = z.strictObject({
  customerKind: z.enum(['INDIVIDUAL', 'BUSINESS']),
  name: z.string().trim().min(1),
  firstName: optionalTextSchema,
  lastName: optionalTextSchema,
  companyName: optionalTextSchema,
  email: optionalTextSchema,
  phone: optionalTextSchema,
  customerNumber: optionalTextSchema,
  website: optionalTextSchema,
  taxRegistrationNumber: optionalTextSchema,
  notes: optionalTextSchema,
})

const importAddressSchema = z.strictObject({
  label: optionalTextSchema,
  attention: optionalTextSchema,
  line1: optionalTextSchema,
  line2: optionalTextSchema,
  city: optionalTextSchema,
  state: optionalTextSchema,
  postalCode: optionalTextSchema,
  countryCode: optionalTextSchema,
})

const importContactSchema = z.strictObject({
  salutation: optionalTextSchema,
  firstName: optionalTextSchema,
  lastName: optionalTextSchema,
  email: optionalTextSchema,
  workPhone: optionalTextSchema,
  mobilePhone: optionalTextSchema,
})

export const customerImportRowSchema = z.strictObject({
  rowNumber: z.number().int().min(1),
  name: z.string().trim().min(1),
  customerKind: z.enum(['INDIVIDUAL', 'BUSINESS']).optional(),
  salutation: optionalTextSchema,
  firstName: optionalTextSchema,
  lastName: optionalTextSchema,
  companyName: optionalTextSchema,
  email: optionalTextSchema,
  phone: optionalTextSchema,
  workPhone: optionalTextSchema,
  currency: optionalTextSchema,
  language: optionalTextSchema,
  customerNumber: optionalTextSchema,
  website: optionalTextSchema,
  notes: optionalTextSchema,
  taxRegistrationNumber: optionalTextSchema,
  billingAddress: importAddressSchema.optional(),
  shippingAddress: importAddressSchema.optional(),
  contact: importContactSchema.optional(),
})

const customerImportRequestFields = {
  duplicateStrategy: z.enum(['skip', 'update']),
  rows: z.array(customerImportRowSchema).min(1).max(500),
}

export const customerImportRequestSchema = z
  .discriminatedUnion('dryRun', [
    z.strictObject({
      ...customerImportRequestFields,
      dryRun: z.literal(true),
    }),
    z.strictObject({
      ...customerImportRequestFields,
      dryRun: z.literal(false),
      idempotencyKey: z.string().uuid(),
    }),
  ])
  .superRefine((value, context) => {
    const rowNumbers = new Set<number>()

    for (const row of value.rows) {
      if (rowNumbers.has(row.rowNumber)) {
        context.addIssue({
          code: 'custom',
          message: 'Row numbers must be unique.',
          path: ['rows'],
        })
      }
      rowNumbers.add(row.rowNumber)
    }
  })

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>
export type CustomerImportRow = z.infer<typeof customerImportRowSchema>
export type CustomerImportRequest = z.infer<typeof customerImportRequestSchema>
