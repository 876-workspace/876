import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'
import type { BudgetConsumption, PlannedActual } from './finance.calculations.js'

type Timestamp = bigint | number

export type ProjectBillingRow = {
  id: string
  tenantId: string
  projectId: string
  billingMethod: string
  currency: string
  billingCustomerId: string | null
  fixedFeeAmount: number | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type BudgetRow = {
  id: string
  tenantId: string
  projectId: string
  scope: string
  milestoneId: string | null
  userId: string | null
  amountMinor: number | null
  hours: number | null
  thresholdPercent: number
  periodStart: Timestamp | null
  periodEnd: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type RateRow = {
  id: string
  tenantId: string
  projectId: string | null
  userId: string | null
  scope: string
  billRateMinor: number
  costRateMinor: number
  currency: string
  effectiveFrom: Timestamp | null
  effectiveTo: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type SerializedProjectBilling = {
  object: 'projects.project-billing'
  id: string
  tenantId: string
  projectId: string
  billingMethod: string
  currency: string
  billingCustomerId: string | null
  fixedFeeAmount: number | null
  createdAt: number
  updatedAt: number
}

export type SerializedBudget = {
  object: 'projects.budget'
  id: string
  tenantId: string
  projectId: string
  scope: string
  milestoneId: string | null
  userId: string | null
  amountMinor: number | null
  hours: number | null
  thresholdPercent: number
  periodStart: number | null
  periodEnd: number | null
  createdAt: number
  updatedAt: number
}

export type SerializedRate = {
  object: 'projects.rate'
  id: string
  tenantId: string
  projectId: string | null
  userId: string | null
  scope: string
  billRateMinor: number
  costRateMinor: number
  currency: string
  effectiveFrom: number | null
  effectiveTo: number | null
  createdAt: number
  updatedAt: number
}

export type SerializedBudgetTombstone = {
  object: 'projects.budget'
  id: string
  deleted: true
}

export type SerializedRateTombstone = {
  object: 'projects.rate'
  id: string
  deleted: true
}

export type SerializedMoneyPlannedActual = {
  plannedMinor: number | null
  actualMinor: number
  varianceMinor: number | null
}

export type SerializedMinutesPlannedActual = {
  plannedMinutes: number
  actualMinutes: number
  varianceMinutes: number
}

export type SerializedBudgetConsumption = BudgetConsumption & {
  budgetId: string
  scope: string
  kind: 'amount' | 'hours'
}

export type SerializedFinancialSummary = {
  object: 'projects.financial-summary'
  tenantId: string
  projectId: string
  from: number
  to: number
  minutes: SerializedMinutesPlannedActual
  cost: SerializedMoneyPlannedActual
  revenue: SerializedMoneyPlannedActual
  unpricedMinutes: number
  budgets: SerializedBudgetConsumption[]
}

export type SerializedInvoiceDraft = {
  object: 'projects.invoice-draft'
  invoiceId: string
  tenantId: string
  projectId: string
  from: number
  to: number
  idempotencyKey: string
  billedEntryIds: string[]
  billedCount: number
  billedAmountMinor: number
}

export type SerializedBilledInvoice = {
  object: 'projects.billed-invoice'
  invoiceId: string
  tenantId: string
  projectId: string
  status: string
  billedMinutes: number
  entryCount: number
}

export function serializeProjectBilling(
  row: ProjectBillingRow
): SerializedProjectBilling {
  return {
    object: 'projects.project-billing',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    billingMethod: row.billingMethod,
    currency: row.currency,
    billingCustomerId: row.billingCustomerId,
    fixedFeeAmount: row.fixedFeeAmount,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeBudget(row: BudgetRow): SerializedBudget {
  return {
    object: 'projects.budget',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    scope: row.scope,
    milestoneId: row.milestoneId,
    userId: row.userId,
    amountMinor: row.amountMinor,
    hours: row.hours,
    thresholdPercent: row.thresholdPercent,
    periodStart: nullableFromDbUnixSeconds(row.periodStart),
    periodEnd: nullableFromDbUnixSeconds(row.periodEnd),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeRate(row: RateRow): SerializedRate {
  return {
    object: 'projects.rate',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    userId: row.userId,
    scope: row.scope,
    billRateMinor: row.billRateMinor,
    costRateMinor: row.costRateMinor,
    currency: row.currency,
    effectiveFrom: nullableFromDbUnixSeconds(row.effectiveFrom),
    effectiveTo: nullableFromDbUnixSeconds(row.effectiveTo),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeMoneyPlannedActual(
  planned: PlannedActual
): SerializedMoneyPlannedActual {
  return {
    plannedMinor: planned.planned,
    actualMinor: planned.actual,
    varianceMinor: planned.variance,
  }
}
