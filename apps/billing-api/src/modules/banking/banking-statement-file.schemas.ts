import { z } from 'zod'

const columnNameSchema = z.string().trim().min(1).max(255)

export const statementDateFormatSchema = z.enum([
  'yyyy-mm-dd',
  'dd/mm/yyyy',
  'mm/dd/yyyy',
  'dd-mm-yyyy',
  'mm-dd-yyyy',
])

export const statementNumberFormatSchema = z
  .strictObject({
    decimalSeparator: z.enum(['.', ',']).default('.'),
    thousandsSeparator: z.enum([',', '.', 'space', 'none']).default(','),
  })
  .superRefine((value, context) => {
    if (
      value.thousandsSeparator !== 'none' &&
      value.thousandsSeparator !== 'space' &&
      value.thousandsSeparator === value.decimalSeparator
    )
      context.addIssue({
        code: 'custom',
        message: 'Decimal and thousands separators must be different.',
        path: ['thousandsSeparator'],
      })
  })

const sharedMappingShape = {
  dateColumn: columnNameSchema,
  dateFormat: statementDateFormatSchema,
  descriptionColumn: columnNameSchema.nullable().optional(),
  payeeColumn: columnNameSchema.nullable().optional(),
  referenceColumn: columnNameSchema.nullable().optional(),
  externalIdColumn: columnNameSchema.nullable().optional(),
  balanceColumn: columnNameSchema.nullable().optional(),
  numberFormat: statementNumberFormatSchema.default({
    decimalSeparator: '.',
    thousandsSeparator: ',',
  }),
}

const signedAmountMappingSchema = z.strictObject({
  ...sharedMappingShape,
  amountMode: z.literal('signed'),
  amountColumn: columnNameSchema,
  /** Direction represented by a positive source amount. */
  positiveDirection: z.enum(['credit', 'debit']).default('credit'),
})

const splitAmountMappingSchema = z.strictObject({
  ...sharedMappingShape,
  amountMode: z.literal('debit-credit'),
  debitColumn: columnNameSchema,
  creditColumn: columnNameSchema,
})

export const statementFileMappingSchema = z.discriminatedUnion('amountMode', [
  signedAmountMappingSchema,
  splitAmountMappingSchema,
])

export const statementFilePreviewBodySchema = z.strictObject({
  format: z.enum(['csv', 'tsv']),
  /** UTF-8 statement text. File persistence remains owned by 876 Storage. */
  content: z.string().min(1).max(2_000_000),
  currency: z.string().trim().length(3).toUpperCase(),
  mapping: statementFileMappingSchema,
})

export const statementFileImportBodySchema = statementFilePreviewBodySchema.extend({
  /** Opaque 876 Storage id when the source file has already been persisted. */
  sourceFileId: z.string().trim().min(1).max(255).nullable().optional(),
  sourceName: z.string().trim().min(1).max(255).nullable().optional(),
})

export const statementPreviewLineSchema = z.object({
  sourceRowNumber: z.number().int().positive(),
  externalId: z.string().nullable(),
  postedAt: z.number().int().nonnegative(),
  type: z.enum(['credit', 'debit']),
  amount: z.string().regex(/^\d+$/),
  currency: z.string().length(3),
  description: z.string().nullable(),
  payee: z.string().nullable(),
  reference: z.string().nullable(),
  runningBalance: z.string().regex(/^-?\d+$/).nullable(),
})

export const statementPreviewErrorSchema = z.object({
  rowNumber: z.number().int().positive(),
  field: z.string(),
  message: z.string(),
})

export const statementFilePreviewSchema = z.object({
  object: z.literal('bank-statement-preview'),
  accountId: z.string(),
  format: z.enum(['csv', 'tsv']),
  currency: z.string().length(3),
  headers: z.array(z.string()),
  totalRows: z.number().int().nonnegative(),
  validRows: z.number().int().nonnegative(),
  invalidRows: z.number().int().nonnegative(),
  lines: z.array(statementPreviewLineSchema),
  errors: z.array(statementPreviewErrorSchema),
})

export type StatementFileMapping = z.infer<typeof statementFileMappingSchema>
export type StatementFilePreviewBody = z.infer<
  typeof statementFilePreviewBodySchema
>
export type StatementFileImportBody = z.infer<typeof statementFileImportBodySchema>
export type StatementPreviewLine = z.infer<typeof statementPreviewLineSchema>
export type StatementPreviewError = z.infer<typeof statementPreviewErrorSchema>
