export type CoreDirectoryBank = {
  id: string
  countryCode: string
  name: string
  shortName: string | null
  bankCode: string
  clearingSystem: string | null
  institutionType: string
}

export type CoreDirectoryBranch = {
  id: string
  bankId: string
  name: string
  transitNumber: string
  routingNumber: string | null
}

export type CoreDirectoryGateway = {
  listBanks(countryCode: string): Promise<CoreDirectoryBank[]>
  listBranches(bankId: string): Promise<CoreDirectoryBranch[]>
  bank(bankId: string): Promise<CoreDirectoryBank | null>
  branch(branchId: string): Promise<CoreDirectoryBranch | null>
}

export type CoreDirectoryFailureReason =
  | 'configuration'
  | 'network'
  | 'timeout'
  | 'upstream'
  | 'invalid-response'

export class CoreDirectoryUnavailableError extends Error {
  readonly reason: CoreDirectoryFailureReason
  readonly path: string
  readonly status: number | null

  constructor(options: {
    reason: CoreDirectoryFailureReason
    path: string
    status?: number | null
  }) {
    super('The Core financial directory could not be reached.')
    this.name = 'CoreDirectoryUnavailableError'
    this.reason = options.reason
    this.path = options.path
    this.status = options.status ?? null
  }
}
