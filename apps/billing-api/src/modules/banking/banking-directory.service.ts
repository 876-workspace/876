import { AppHttpError } from '@/http/errors'
import {
  CoreDirectoryUnavailableError,
  HttpCoreDirectoryGateway,
} from '@/providers/core-directory'

const directory = new HttpCoreDirectoryGateway()

function listing<T>(data: T[], url: string) {
  return {
    object: 'list' as const,
    data,
    has_more: false,
    total_count: data.length,
    url,
  }
}

function unavailable(error: unknown): never {
  if (error instanceof CoreDirectoryUnavailableError)
    throw new AppHttpError({
      code: 'banking/directory-unavailable',
      message: 'The bank directory is temporarily unavailable. Try again.',
      httpStatus: 503,
    })
  throw error
}

export async function listDirectoryBanks(
  countryCode: string,
  ids?: string[]
) {
  try {
    const rows = await directory.listBanks(countryCode, ids)
    const query = ids?.length
      ? `?countryCode=${encodeURIComponent(countryCode)}&ids=${encodeURIComponent(ids.join(','))}`
      : `?countryCode=${encodeURIComponent(countryCode)}`
    return listing(
      rows.map((row) => ({
        object: 'bank-directory-bank' as const,
        ...row,
      })),
      `/api/v1/banking/directory/banks${query}`
    )
  } catch (error) {
    unavailable(error)
  }
}

export async function listDirectoryBranches(bankId: string, ids?: string[]) {
  try {
    const bank = await directory.bank(bankId)
    if (!bank)
      throw new AppHttpError({
        code: 'banking/directory-bank-not-found',
        message: 'Bank not found in the financial directory.',
        httpStatus: 404,
      })

    const rows = await directory.listBranches(bankId, ids)
    const query = ids?.length
      ? `?ids=${encodeURIComponent(ids.join(','))}`
      : ''
    return listing(
      rows.map((row) => ({
        object: 'bank-directory-branch' as const,
        ...row,
      })),
      `/api/v1/banking/directory/banks/${encodeURIComponent(bankId)}/branches${query}`
    )
  } catch (error) {
    unavailable(error)
  }
}

export async function listDirectoryBranchesByIds(ids: string[]) {
  try {
    const rows = await directory.listBranchesByIds(ids)
    return listing(
      rows.map((row) => ({
        object: 'bank-directory-branch' as const,
        ...row,
      })),
      `/api/v1/banking/directory/branches?ids=${encodeURIComponent(ids.join(','))}`
    )
  } catch (error) {
    unavailable(error)
  }
}
