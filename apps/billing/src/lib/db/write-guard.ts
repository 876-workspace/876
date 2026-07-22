const MUTATING_OPERATIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'delete',
  'deleteMany',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
])

export class LegacyBillingWriterInactiveError extends Error {
  readonly code = 'billing/writer-inactive'

  constructor() {
    super('The legacy Billing backend is not the active writer.')
    this.name = 'LegacyBillingWriterInactiveError'
  }
}

/** Prevents Prisma mutations after write ownership moves to FastAPI. */
export function assertLegacyBillingWriteAllowed(
  operation: string,
  writer = process.env.BILLING_WRITER
): void {
  if (MUTATING_OPERATIONS.has(operation) && writer !== 'legacy')
    throw new LegacyBillingWriterInactiveError()
}
