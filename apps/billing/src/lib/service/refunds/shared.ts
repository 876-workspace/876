import { prisma } from '@/lib/db'

export class RefundMutationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'RefundMutationError'
  }
}

export type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>

export function isRetryableTransactionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  )
}
