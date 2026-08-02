import 'server-only'

/**
 * Prisma error codes Billing reacts to.
 *
 * These are the only two the service layer branches on. Naming them keeps the
 * meaning at the call site — `isRetryableTransactionError(error)` says what the
 * caller cares about, where a bare `'P2034'` says only what Prisma called it.
 *
 * @see https://www.prisma.io/docs/orm/reference/error-reference
 */
const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002'
const PRISMA_TRANSACTION_WRITE_CONFLICT = 'P2034'

/** Narrow an unknown thrown value to something carrying a Prisma error code. */
function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  )
}

/**
 * A uniqueness conflict the caller is expected to handle — a duplicate slug,
 * a repeated external reference. Detected without exposing database internals
 * to the caller or the client.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return hasPrismaCode(error, PRISMA_UNIQUE_CONSTRAINT_VIOLATION)
}

/**
 * A write conflict or deadlock inside an interactive transaction. The
 * operation did not happen and is safe to retry — which is why every caller
 * branches on it rather than surfacing it as a failure.
 */
export function isRetryableTransactionError(error: unknown): boolean {
  return hasPrismaCode(error, PRISMA_TRANSACTION_WRITE_CONFLICT)
}
