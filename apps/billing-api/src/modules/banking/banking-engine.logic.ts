import { createHash } from 'node:crypto'

import type { StatementLineInput } from './banking-engine.schemas'

function normalizedText(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function statementFingerprint(
  accountId: string,
  line: StatementLineInput
): string {
  const canonical = [
    accountId,
    line.externalId ?? '',
    line.postedAt.toString(),
    line.type,
    line.amount.toString(),
    line.currency,
    normalizedText(line.description),
    normalizedText(line.payee),
    normalizedText(line.reference),
  ].join('|')

  return createHash('sha256').update(canonical).digest('hex')
}

interface CandidateLine {
  amount: bigint
  postedAt: number
  reference: string | null
  description: string | null
  payee: string | null
}

interface CandidateTransaction {
  amount: bigint
  availableAmount: bigint
  date: number
  reference: string | null
  description: string | null
}

export function scoreMatchCandidate(
  line: CandidateLine,
  transaction: CandidateTransaction
): number {
  if (transaction.availableAmount <= 0n) return 0
  if (line.amount > transaction.availableAmount) return 0

  let score = line.amount === transaction.availableAmount ? 50 : 30
  const dayDistance = Math.floor(
    Math.abs(line.postedAt - transaction.date) / 86_400
  )
  if (dayDistance === 0) score += 25
  else if (dayDistance <= 1) score += 20
  else if (dayDistance <= 3) score += 15
  else if (dayDistance <= 14) score += 5

  const statementReference = normalizedText(line.reference)
  const transactionReference = normalizedText(transaction.reference)
  if (
    statementReference &&
    transactionReference &&
    statementReference === transactionReference
  )
    score += 20

  const statementText = normalizedText(
    [line.payee, line.description].filter(Boolean).join(' ')
  )
  const transactionText = normalizedText(transaction.description)
  if (
    statementText &&
    transactionText &&
    (statementText.includes(transactionText) ||
      transactionText.includes(statementText))
  )
    score += 5

  return Math.min(score, 100)
}

export function matchConfidence(score: number) {
  if (score >= 90) return 'exact' as const
  if (score >= 70) return 'strong' as const
  return 'possible' as const
}

export interface RuleConditionValue {
  field: 'DESCRIPTION' | 'PAYEE' | 'REFERENCE' | 'AMOUNT' | 'TYPE'
  operator:
    | 'EQUALS'
    | 'CONTAINS'
    | 'STARTS_WITH'
    | 'ENDS_WITH'
    | 'GREATER_THAN'
    | 'LESS_THAN'
  value: string
}

export interface RuleValue {
  id: string
  matchMode: 'ALL' | 'ANY'
  conditions: RuleConditionValue[]
}

export interface RuleLineValue {
  description: string | null
  payee: string | null
  reference: string | null
  amount: bigint
  type: 'CREDIT' | 'DEBIT'
}

function conditionMatches(
  line: RuleLineValue,
  condition: RuleConditionValue
): boolean {
  const fieldValue =
    condition.field === 'DESCRIPTION'
      ? line.description
      : condition.field === 'PAYEE'
        ? line.payee
        : condition.field === 'REFERENCE'
          ? line.reference
          : condition.field === 'TYPE'
            ? line.type.toLowerCase()
            : line.amount.toString()

  if (condition.field === 'AMOUNT') {
    if (!/^-?\d+$/.test(condition.value)) return false
    const expected = BigInt(condition.value)
    if (condition.operator === 'GREATER_THAN') return line.amount > expected
    if (condition.operator === 'LESS_THAN') return line.amount < expected
    return condition.operator === 'EQUALS' && line.amount === expected
  }

  const actual = normalizedText(fieldValue)
  const expected = normalizedText(condition.value)
  if (condition.operator === 'EQUALS') return actual === expected
  if (condition.operator === 'CONTAINS') return actual.includes(expected)
  if (condition.operator === 'STARTS_WITH') return actual.startsWith(expected)
  if (condition.operator === 'ENDS_WITH') return actual.endsWith(expected)

  return false
}

export function ruleMatches(line: RuleLineValue, rule: RuleValue): boolean {
  if (!rule.conditions.length) return false
  const results = rule.conditions.map((condition) =>
    conditionMatches(line, condition)
  )

  return rule.matchMode === 'ALL'
    ? results.every(Boolean)
    : results.some(Boolean)
}
