import * as Sentry from '@sentry/nextjs'

import { prisma, type PrismaTransactionClient } from '@/lib/db'

/**
 * How long a transaction may wait to acquire its connection.
 *
 * Prisma's default is 2000ms. A cold serverless database connection can take
 * longer to become available, so the first write after an idle period may
 * exceed the default and reject before running a single statement.
 */
export const TRANSACTION_MAX_WAIT_MS = 15_000

/**
 * How long the transaction body may run once it holds a connection.
 *
 * Must exceed {@link TRANSACTION_MAX_WAIT_MS} plus the body's own work, or a
 * transaction that finally acquired a woken connection is rolled back for
 * having taken too long to get there.
 */
export const TRANSACTION_TIMEOUT_MS = 20_000

const transactionOptions = {
  maxWait: TRANSACTION_MAX_WAIT_MS,
  timeout: TRANSACTION_TIMEOUT_MS,
} as const

/** Prisma error codes that mean "no connection was available in time". */
const COLD_START_CODES = new Set(['P2024', 'P2028'])

/**
 * Whether a failure is the database being asleep rather than the write being
 * wrong.
 *
 * Deliberately narrow: a unique-constraint violation, a validation error, or
 * workerd's cross-request I/O rejection must never be retried — the first two
 * would turn a clean 409 into a slow one, and the third can never succeed.
 *
 * The Prisma error code is read structurally rather than through
 * `instanceof PrismaClientKnownRequestError`, matching `prisma-errors.ts`. The
 * client is generated into the app and bundled for workerd; an `instanceof`
 * against that class is the check that silently stops matching after a
 * regeneration or a bundler dedupe, and a cold-start classifier that quietly
 * returns false is indistinguishable from having no retry at all.
 *
 * @param error - The thrown value to classify.
 * @returns `true` when retrying could plausibly succeed.
 */
export function isColdStartError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const code = (error as { code?: unknown }).code
  if (typeof code === 'string') return COLD_START_CODES.has(code)

  return error.message.includes('Timed out fetching a new connection')
}

/**
 * Runs an interactive transaction with bounds that survive a cold database
 * connection, retrying once if the connection could not be acquired at all.
 *
 * @param label - The `<resource>.<verb>` this transaction serves, e.g.
 *   `branches.create`. Recorded as a breadcrumb when a retry happens, so a
 *   failure report that follows names the operation that was already retried.
 * @param run - The transaction body.
 * @returns The body's result.
 *
 * @example
 * const branch = await runTransaction('branches.create', async (tx) => {
 *   const address = await tx.address.create({ data })
 *   return tx.branch.create({ data: { addressId: address.id, ... } })
 * })
 */
export async function runTransaction<T>(
  label: string,
  run: (tx: PrismaTransactionClient) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(run, transactionOptions)
  } catch (error) {
    if (!isColdStartError(error)) throw error

    Sentry.addBreadcrumb({
      category: 'db',
      level: 'warning',
      message: `Retrying ${label} after a cold-start connection failure.`,
    })

    // No backoff: the first attempt already waited out TRANSACTION_MAX_WAIT_MS,
    // which already covers the cold-connection budget. Sleeping only spends
    // Worker wall-clock the second attempt needs.
    return prisma.$transaction(run, transactionOptions)
  }
}
