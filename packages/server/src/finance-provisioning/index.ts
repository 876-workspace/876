import { z } from 'zod'

export const FINANCE_PROVISIONING_EVENT_TYPE =
  'finance_connection.ensure' as const
export const FINANCE_PROVISIONING_CONTRACT_VERSION = 1 as const
export const FINANCE_PROVISIONING_MANIFEST_VERSION = 1 as const

export const financeConnectionStatusSchema = z.enum([
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
])

export const financeConnectionScopeSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/)

export const financeProvisioningEventSchema = z.strictObject({
  eventId: z.string().trim().min(1).max(191),
  eventType: z.literal(FINANCE_PROVISIONING_EVENT_TYPE),
  contractVersion: z.literal(FINANCE_PROVISIONING_CONTRACT_VERSION),
  aggregateId: z.string().trim().min(1).max(191),
  organization: z.strictObject({
    id: z.string().trim().min(1).max(191),
    name: z.string().trim().min(1).max(160),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{2,80}$/),
    countryCode: z.string().length(2).nullable(),
    currencyCode: z.string().length(3),
  }),
  sourceAppId: z.string().trim().min(1).max(191),
  entitlementReference: z.string().trim().min(1).max(191),
  manifestVersion: z.literal(FINANCE_PROVISIONING_MANIFEST_VERSION),
  provisioningRevision: z.number().int().positive(),
  lifecycleVersion: z.number().int().positive(),
  desiredStatus: financeConnectionStatusSchema,
  scopes: z
    .array(financeConnectionScopeSchema)
    .min(1)
    .max(100)
    .refine((scopes) => new Set(scopes).size === scopes.length, {
      message: 'Finance scopes must be unique.',
    }),
  occurredAt: z.number().int().positive(),
})

export const financeProvisioningReceiptSchema = z.strictObject({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  status: financeConnectionStatusSchema,
  lifecycleVersion: z.number().int().positive(),
  applied: z.boolean(),
  duplicate: z.boolean(),
})

/** The normal 876 HTTP success envelope returned by Billing. */
export const financeProvisioningReceiptEnvelopeSchema = z.strictObject({
  data: financeProvisioningReceiptSchema,
  error: z.null(),
})

export type FinanceConnectionStatus = z.infer<
  typeof financeConnectionStatusSchema
>
export type FinanceProvisioningEvent = z.infer<
  typeof financeProvisioningEventSchema
>
export type FinanceProvisioningReceipt = z.infer<
  typeof financeProvisioningReceiptSchema
>

export type FinanceProvisioningContractIssue =
  | 'invalid-event'
  | 'invalid-response'
  | 'stale-response'
  | 'state-mismatch'
  | 'superseded-response'

export class FinanceProvisioningContractError extends Error {
  readonly code = 'finance-provisioning/contract-error' as const

  constructor(
    readonly issue: FinanceProvisioningContractIssue,
    message: string
  ) {
    super(message)
    this.name = 'FinanceProvisioningContractError'
  }
}

export function parseFinanceProvisioningEvent(
  input: unknown
): FinanceProvisioningEvent {
  const result = financeProvisioningEventSchema.safeParse(input)
  if (!result.success) {
    throw new FinanceProvisioningContractError(
      'invalid-event',
      `Finance provisioning event failed the shared wire contract: ${result.error.issues[0]?.message ?? 'invalid payload'}.`
    )
  }
  return result.data
}

/**
 * Validates Billing's success receipt against the event that was sent.
 *
 * Background delivery may legitimately receive a newer persisted lifecycle when
 * an old outbox event is replayed after a later event already won. Foreground
 * readiness is stricter: the exact lifecycle/status requested by the current
 * activation must be the state Billing reports before the application is called
 * ready.
 */
export function parseFinanceProvisioningReceipt(
  event: FinanceProvisioningEvent,
  input: unknown,
  options: { exactState?: boolean } = {}
): FinanceProvisioningReceipt {
  const result = financeProvisioningReceiptEnvelopeSchema.safeParse(input)
  if (!result.success) {
    throw new FinanceProvisioningContractError(
      'invalid-response',
      `Billing returned a 2xx response that failed the shared finance receipt contract: ${result.error.issues[0]?.message ?? 'invalid response'}.`
    )
  }

  const receipt = result.data.data
  if (receipt.lifecycleVersion < event.lifecycleVersion) {
    throw new FinanceProvisioningContractError(
      'stale-response',
      `Billing reported lifecycle ${receipt.lifecycleVersion} for event lifecycle ${event.lifecycleVersion}.`
    )
  }

  if (
    options.exactState &&
    receipt.lifecycleVersion !== event.lifecycleVersion
  ) {
    throw new FinanceProvisioningContractError(
      'superseded-response',
      `Billing reported lifecycle ${receipt.lifecycleVersion}; foreground readiness requires exact lifecycle ${event.lifecycleVersion}.`
    )
  }

  if (
    receipt.lifecycleVersion === event.lifecycleVersion &&
    receipt.status !== event.desiredStatus
  ) {
    throw new FinanceProvisioningContractError(
      'state-mismatch',
      `Billing reported ${receipt.status} for lifecycle ${receipt.lifecycleVersion}; event requires ${event.desiredStatus}.`
    )
  }

  return receipt
}
