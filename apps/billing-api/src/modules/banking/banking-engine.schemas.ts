import { z } from 'zod'

const positiveMinorAmountSchema = z
  .string()
  .regex(/^\d+$/, 'Amount must be an integer minor-unit string.')
  .transform((value) => BigInt(value))
  .refine((value) => value > 0n, 'Amount must be positive.')

const signedMinorAmountSchema = z
  .string()
  .regex(/^-?\d+$/, 'Amount must be an integer minor-unit string.')
  .transform((value) => BigInt(value))

export const statementImportSourceSchema = z.enum([
  'file',
  'email',
  'feed',
  'api',
])
export const statementFormatSchema = z.enum([
  'csv',
  'tsv',
  'ofx',
  'qif',
  'camt-053',
  'camt-054',
  'mt940',
])
export const statementLineTypeSchema = z.enum(['credit', 'debit'])
export const statementLineStatusSchema = z.enum([
  'uncategorized',
  'recognized',
  'matched',
  'categorized',
  'excluded',
])

export const statementLineInputSchema = z.strictObject({
  externalId: z.string().trim().min(1).max(255).nullable().optional(),
  postedAt: z.number().int().nonnegative(),
  authorizedAt: z.number().int().nonnegative().nullable().optional(),
  type: statementLineTypeSchema,
  amount: positiveMinorAmountSchema,
  currency: z.string().trim().length(3).toUpperCase(),
  description: z.string().trim().min(1).nullable().optional(),
  payee: z.string().trim().min(1).max(255).nullable().optional(),
  reference: z.string().trim().min(1).max(255).nullable().optional(),
  bankCategory: z.string().trim().min(1).max(160).nullable().optional(),
  runningBalance: signedMinorAmountSchema.nullable().optional(),
})

export const statementImportCreateBodySchema = z
  .strictObject({
    source: statementImportSourceSchema,
    format: statementFormatSchema.nullable().optional(),
    sourceFileId: z.string().trim().min(1).nullable().optional(),
    sourceName: z.string().trim().min(1).max(255).nullable().optional(),
    mapping: z.record(z.string(), z.unknown()).nullable().optional(),
    lines: z.array(statementLineInputSchema).min(1).max(500),
  })
  .superRefine((value, context) => {
    if (value.source === 'file' && !value.format)
      context.addIssue({
        code: 'custom',
        message: 'File imports require a statement format.',
        path: ['format'],
      })
  })

export const statementImportStatusSchema = z.enum([
  'pending',
  'completed',
  'undone',
  'failed',
])

export const statementImportSchema = z.object({
  object: z.literal('bank-statement-import'),
  id: z.string(),
  accountId: z.string(),
  source: statementImportSourceSchema,
  format: statementFormatSchema.nullable(),
  sourceFileId: z.string().nullable(),
  sourceName: z.string().nullable(),
  status: statementImportStatusSchema,
  transactionCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  completedAt: z.number().int().nullable(),
  undoneAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const statementLineSchema = z.object({
  object: z.literal('bank-statement-line'),
  id: z.string(),
  accountId: z.string(),
  importId: z.string(),
  externalId: z.string().nullable(),
  fingerprint: z.string(),
  postedAt: z.number().int(),
  authorizedAt: z.number().int().nullable(),
  type: statementLineTypeSchema,
  amount: z.string(),
  currency: z.string(),
  description: z.string().nullable(),
  payee: z.string().nullable(),
  reference: z.string().nullable(),
  bankCategory: z.string().nullable(),
  runningBalance: z.string().nullable(),
  status: statementLineStatusSchema,
  recognitionSource: z.enum(['rule', 'heuristic', 'ai']).nullable(),
  recognizedRuleId: z.string().nullable(),
  duplicateOfId: z.string().nullable(),
  excludedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const statementImportWithLinesSchema = statementImportSchema.extend({
  lines: z.array(statementLineSchema),
})

export const accountStatementParamsSchema = z.object({
  accountId: z.string().min(1),
})
export const statementImportParamsSchema = z.object({
  importId: z.string().min(1),
})
export const statementLineParamsSchema = z.object({
  lineId: z.string().min(1),
})

export const statementMatchBodySchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        bankTransactionId: z.string().min(1),
        amount: positiveMinorAmountSchema,
      })
    )
    .min(1)
    .max(100),
})

export const statementMatchSchema = z.object({
  object: z.literal('bank-statement-match'),
  id: z.string(),
  statementLineId: z.string(),
  status: z.enum(['active', 'reversed']),
  matchedAt: z.number().int(),
  reversedAt: z.number().int().nullable(),
  items: z.array(
    z.object({
      object: z.literal('bank-statement-match-item'),
      id: z.string(),
      bankTransactionId: z.string(),
      amount: z.string(),
    })
  ),
})

export const matchCandidateSchema = z.object({
  object: z.literal('bank-match-candidate'),
  bankTransactionId: z.string(),
  paymentId: z.string().nullable(),
  type: statementLineTypeSchema,
  amount: z.string(),
  availableAmount: z.string(),
  date: z.number().int(),
  description: z.string().nullable(),
  reference: z.string().nullable(),
  score: z.number().int().min(0).max(100),
  confidence: z.enum(['exact', 'strong', 'possible']),
})

export const statementCategorizeBodySchema = z.strictObject({
  action: z.enum(['manual-deposit', 'manual-withdrawal']),
})

export const statementCategorizeResultSchema = z.object({
  statementLine: statementLineSchema,
  match: statementMatchSchema,
  bankTransactionId: z.string(),
})

export const bankTransferCreateBodySchema = z.strictObject({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: positiveMinorAmountSchema,
  currency: z.string().trim().length(3).toUpperCase(),
  transferredAt: z.number().int().nonnegative(),
  description: z.string().trim().min(1).nullable().optional(),
  reference: z.string().trim().min(1).max(120).nullable().optional(),
})

export const bankTransferSchema = z.object({
  object: z.literal('bank-transfer'),
  id: z.string(),
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.string(),
  currency: z.string(),
  transferredAt: z.number().int(),
  description: z.string().nullable(),
  reference: z.string().nullable(),
  status: z.enum(['posted', 'reversed']),
  reversedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const reconciliationCreateBodySchema = z
  .strictObject({
    startAt: z.number().int().nonnegative(),
    endAt: z.number().int().nonnegative(),
    openingBalance: signedMinorAmountSchema,
    closingBalance: signedMinorAmountSchema,
    bankTransactionIds: z.array(z.string().min(1)).max(1000).default([]),
  })
  .refine((value) => value.startAt <= value.endAt, {
    message: 'The reconciliation start must not be after the end.',
    path: ['endAt'],
  })

export const reconciliationSchema = z.object({
  object: z.literal('bank-reconciliation'),
  id: z.string(),
  accountId: z.string(),
  startAt: z.number().int(),
  endAt: z.number().int(),
  openingBalance: z.string(),
  closingBalance: z.string(),
  clearedBalance: z.string(),
  difference: z.string(),
  status: z.enum(['draft', 'completed', 'reopened']),
  completedAt: z.number().int().nullable(),
  reopenedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  bankTransactionIds: z.array(z.string()),
})

export const reconciliationParamsSchema = z.object({
  reconciliationId: z.string().min(1),
})

export const bankRuleConditionInputSchema = z.strictObject({
  field: z.enum(['description', 'payee', 'reference', 'amount', 'type']),
  operator: z.enum([
    'equals',
    'contains',
    'starts-with',
    'ends-with',
    'greater-than',
    'less-than',
  ]),
  value: z.string().trim().min(1).max(255),
})

const bankRuleActionSchema = z.strictObject({
  type: z.enum(['manual-deposit', 'manual-withdrawal', 'review']),
  note: z.string().trim().min(1).max(255).nullable().optional(),
})

export const bankRuleCreateBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  priority: z.number().int().min(0).max(10000).default(0),
  enabled: z.boolean().default(true),
  matchMode: z.enum(['all', 'any']).default('all'),
  automationMode: z.enum(['recognize', 'auto-categorize']).default('recognize'),
  accountIds: z.array(z.string().min(1)).max(100).default([]),
  conditions: z.array(bankRuleConditionInputSchema).min(1).max(20),
  action: bankRuleActionSchema,
})

export const bankRuleUpdateBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    priority: z.number().int().min(0).max(10000).optional(),
    enabled: z.boolean().optional(),
    matchMode: z.enum(['all', 'any']).optional(),
    automationMode: z.enum(['recognize', 'auto-categorize']).optional(),
    accountIds: z.array(z.string().min(1)).max(100).optional(),
    conditions: z.array(bankRuleConditionInputSchema).min(1).max(20).optional(),
    action: bankRuleActionSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Nothing to update.')

export const bankRuleSchema = z.object({
  object: z.literal('bank-rule'),
  id: z.string(),
  name: z.string(),
  priority: z.number().int(),
  enabled: z.boolean(),
  matchMode: z.enum(['all', 'any']),
  automationMode: z.enum(['recognize', 'auto-categorize']),
  accountIds: z.array(z.string()),
  conditions: z.array(bankRuleConditionInputSchema.extend({ id: z.string() })),
  action: bankRuleActionSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const deletedBankRuleSchema = z.object({
  object: z.literal('bank-rule'),
  id: z.string(),
  deleted: z.literal(true),
})

export const bankRuleParamsSchema = z.object({
  ruleId: z.string().min(1),
})

export const bankDepositCreateBodySchema = z
  .strictObject({
    sourceAccountId: z.string().min(1),
    destinationAccountId: z.string().min(1),
    transactionIds: z.array(z.string().min(1)).min(1).max(100),
    amount: positiveMinorAmountSchema,
    currency: z.string().trim().length(3).toUpperCase(),
    depositedAt: z.number().int().positive(),
    description: z.string().trim().min(1).nullable().optional(),
    reference: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .refine(
    (body) => new Set(body.transactionIds).size === body.transactionIds.length,
    'A transaction may appear only once.'
  )

export const bankDepositSchema = z.object({
  object: z.literal('bank-deposit'),
  id: z.string(),
  sourceAccountId: z.string(),
  destinationAccountId: z.string(),
  amount: z.string(),
  currency: z.string(),
  depositedAt: z.number().int(),
  description: z.string().nullable(),
  reference: z.string().nullable(),
  status: z.enum(['posted', 'reversed']),
  reversedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  transactionIds: z.array(z.string()),
})
export const bankDepositParamsSchema = z.object({
  depositId: z.string().min(1),
})

export type StatementImportCreateBody = z.infer<
  typeof statementImportCreateBodySchema
>
export type StatementLineInput = z.infer<typeof statementLineInputSchema>
export type StatementMatchBody = z.infer<typeof statementMatchBodySchema>
export type StatementCategorizeBody = z.infer<
  typeof statementCategorizeBodySchema
>
export type BankTransferCreateBody = z.infer<
  typeof bankTransferCreateBodySchema
>
export type ReconciliationCreateBody = z.infer<
  typeof reconciliationCreateBodySchema
>
export type BankRuleCreateBody = z.infer<typeof bankRuleCreateBodySchema>
export type BankRuleUpdateBody = z.infer<typeof bankRuleUpdateBodySchema>
export type BankDepositCreateBody = z.infer<typeof bankDepositCreateBodySchema>
