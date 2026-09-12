import { z } from 'zod'

import type {
  BankMatchCandidate,
  BankReconciliation,
  BankRule,
  BankStatementImport,
  BankStatementImportWithLines,
  BankStatementLine,
  BankStatementMatch,
  BankStatementPreview,
  BankTransfer,
  DeletedBankRule,
} from './banking-engine'
import type { List } from './common'
import { listSchema } from './common.schema'

const statementLineTypeSchema = z.enum(['credit', 'debit'])
const statementImportSourceSchema = z.enum(['file', 'email', 'feed', 'api'])
const statementFormatSchema = z.enum([
  'csv',
  'tsv',
  'ofx',
  'qif',
  'camt-053',
  'camt-054',
  'mt940',
])

export const BankStatementImportSchema = z.strictObject({
  object: z.literal('bank-statement-import'),
  id: z.string(),
  accountId: z.string(),
  source: statementImportSourceSchema,
  format: statementFormatSchema.nullable(),
  sourceFileId: z.string().nullable(),
  sourceName: z.string().nullable(),
  status: z.enum(['pending', 'completed', 'undone', 'failed']),
  transactionCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  completedAt: z.number().int().nullable(),
  undoneAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BankStatementImport>

export const BankStatementLineSchema = z.strictObject({
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
  status: z.enum([
    'uncategorized',
    'recognized',
    'matched',
    'categorized',
    'excluded',
  ]),
  recognitionSource: z.enum(['rule', 'heuristic', 'ai']).nullable(),
  recognizedRuleId: z.string().nullable(),
  duplicateOfId: z.string().nullable(),
  excludedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BankStatementLine>

export const BankStatementImportWithLinesSchema =
  BankStatementImportSchema.extend({
    lines: z.array(BankStatementLineSchema),
  }) satisfies z.ZodType<BankStatementImportWithLines>

const StatementPreviewLineSchema = z.strictObject({
  sourceRowNumber: z.number().int().positive(),
  externalId: z.string().nullable(),
  postedAt: z.number().int().nonnegative(),
  type: statementLineTypeSchema,
  amount: z.string(),
  currency: z.string(),
  description: z.string().nullable(),
  payee: z.string().nullable(),
  reference: z.string().nullable(),
  runningBalance: z.string().nullable(),
})

const StatementPreviewErrorSchema = z.strictObject({
  rowNumber: z.number().int().positive(),
  field: z.string(),
  message: z.string(),
})

export const BankStatementPreviewSchema = z.strictObject({
  object: z.literal('bank-statement-preview'),
  accountId: z.string(),
  format: z.enum(['csv', 'tsv']),
  currency: z.string(),
  headers: z.array(z.string()),
  totalRows: z.number().int().nonnegative(),
  validRows: z.number().int().nonnegative(),
  invalidRows: z.number().int().nonnegative(),
  lines: z.array(StatementPreviewLineSchema),
  errors: z.array(StatementPreviewErrorSchema),
}) satisfies z.ZodType<BankStatementPreview>

export const BankStatementMatchSchema = z.strictObject({
  object: z.literal('bank-statement-match'),
  id: z.string(),
  statementLineId: z.string(),
  status: z.enum(['active', 'reversed']),
  matchedAt: z.number().int(),
  reversedAt: z.number().int().nullable(),
  items: z.array(
    z.strictObject({
      object: z.literal('bank-statement-match-item'),
      id: z.string(),
      bankTransactionId: z.string(),
      amount: z.string(),
    })
  ),
}) satisfies z.ZodType<BankStatementMatch>

export const BankMatchCandidateSchema = z.strictObject({
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
}) satisfies z.ZodType<BankMatchCandidate>

export const BankStatementCategorizeResultSchema = z.strictObject({
  statementLine: BankStatementLineSchema,
  match: BankStatementMatchSchema,
  bankTransactionId: z.string(),
})

export const BankTransferSchema = z.strictObject({
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
}) satisfies z.ZodType<BankTransfer>

export const BankReconciliationSchema = z.strictObject({
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
}) satisfies z.ZodType<BankReconciliation>

const BankRuleConditionSchema = z.strictObject({
  id: z.string(),
  field: z.enum(['description', 'payee', 'reference', 'amount', 'type']),
  operator: z.enum([
    'equals',
    'contains',
    'starts-with',
    'ends-with',
    'greater-than',
    'less-than',
  ]),
  value: z.string(),
})

const BankRuleActionSchema = z.object({
  type: z.enum(['manual-deposit', 'manual-withdrawal', 'review']),
  note: z.string().nullable().optional(),
})

export const BankRuleSchema = z.strictObject({
  object: z.literal('bank-rule'),
  id: z.string(),
  name: z.string(),
  priority: z.number().int(),
  enabled: z.boolean(),
  matchMode: z.enum(['all', 'any']),
  automationMode: z.enum(['recognize', 'auto-categorize']),
  accountIds: z.array(z.string()),
  conditions: z.array(BankRuleConditionSchema),
  action: BankRuleActionSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BankRule>

export const DeletedBankRuleSchema = z.strictObject({
  object: z.literal('bank-rule'),
  id: z.string(),
  deleted: z.literal(true),
}) satisfies z.ZodType<DeletedBankRule>

export const BankStatementImportListSchema = listSchema(
  BankStatementImportSchema
) satisfies z.ZodType<List<BankStatementImport>>
export const BankStatementLineListSchema = listSchema(
  BankStatementLineSchema
) satisfies z.ZodType<List<BankStatementLine>>
export const BankMatchCandidateListSchema = listSchema(
  BankMatchCandidateSchema
) satisfies z.ZodType<List<BankMatchCandidate>>
export const BankTransferListSchema = listSchema(
  BankTransferSchema
) satisfies z.ZodType<List<BankTransfer>>
export const BankReconciliationListSchema = listSchema(
  BankReconciliationSchema
) satisfies z.ZodType<List<BankReconciliation>>
export const BankRuleListSchema = listSchema(
  BankRuleSchema
) satisfies z.ZodType<List<BankRule>>
