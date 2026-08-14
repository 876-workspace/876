function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  )
}

export function isUniqueConstraintError(error: unknown): boolean {
  return hasPrismaCode(error, 'P2002')
}

export function isRetryableTransactionError(error: unknown): boolean {
  return hasPrismaCode(error, 'P2034')
}
