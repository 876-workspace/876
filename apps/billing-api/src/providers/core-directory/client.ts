import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'

import {
  CoreDirectoryUnavailableError,
  type CoreDirectoryBank,
  type CoreDirectoryBranch,
  type CoreDirectoryGateway,
} from './types'

const log = getLogger('core-directory')
const MAX_ATTEMPTS = 2
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function unwrapEnvelope(raw: unknown): unknown {
  const record = object(raw)
  if (!record || !('data' in record) || !('error' in record)) return raw
  return record.error === null ? record.data : null
}

function bankFrom(value: unknown): CoreDirectoryBank | null {
  const record = object(value)
  if (
    !record ||
    typeof record.id !== 'string' ||
    typeof record.country_code !== 'string' ||
    typeof record.name !== 'string' ||
    typeof record.bank_code !== 'string' ||
    typeof record.institution_type !== 'string'
  )
    return null

  return {
    id: record.id,
    countryCode: record.country_code,
    name: record.name,
    shortName: typeof record.short_name === 'string' ? record.short_name : null,
    bankCode: record.bank_code,
    clearingSystem:
      typeof record.clearing_system === 'string' ? record.clearing_system : null,
    institutionType: record.institution_type,
  }
}

function branchFrom(value: unknown): CoreDirectoryBranch | null {
  const record = object(value)
  if (
    !record ||
    typeof record.id !== 'string' ||
    typeof record.bank_id !== 'string' ||
    typeof record.name !== 'string' ||
    typeof record.transit_number !== 'string'
  )
    return null

  return {
    id: record.id,
    bankId: record.bank_id,
    name: record.name,
    transitNumber: record.transit_number,
    routingNumber:
      typeof record.routing_number === 'string' ? record.routing_number : null,
  }
}

function listItems(payload: unknown, path: string): unknown[] {
  const record = object(payload)
  if (!record || !Array.isArray(record.data))
    throw new CoreDirectoryUnavailableError({
      reason: 'invalid-response',
      path,
    })
  return record.data
}

export class HttpCoreDirectoryGateway implements CoreDirectoryGateway {
  async listBanks(countryCode: string): Promise<CoreDirectoryBank[]> {
    const path = `/directory/banks?country_code=${encodeURIComponent(countryCode)}&limit=100`
    const payload = await this.request(path)
    return listItems(payload, path).map((value) => {
      const bank = bankFrom(value)
      if (!bank)
        throw new CoreDirectoryUnavailableError({
          reason: 'invalid-response',
          path,
        })
      return bank
    })
  }

  async listBranches(bankId: string): Promise<CoreDirectoryBranch[]> {
    const path = `/directory/banks/${encodeURIComponent(bankId)}/branches?limit=100`
    const payload = await this.request(path)
    return listItems(payload, path).map((value) => {
      const branch = branchFrom(value)
      if (!branch)
        throw new CoreDirectoryUnavailableError({
          reason: 'invalid-response',
          path,
        })
      return branch
    })
  }

  async bank(bankId: string): Promise<CoreDirectoryBank | null> {
    const path = `/directory/banks/${encodeURIComponent(bankId)}`
    const payload = await this.request(path, true)
    if (payload === null) return null
    const bank = bankFrom(payload)
    if (!bank)
      throw new CoreDirectoryUnavailableError({
        reason: 'invalid-response',
        path,
      })
    return bank
  }

  async branch(branchId: string): Promise<CoreDirectoryBranch | null> {
    const path = `/directory/bank-branches/${encodeURIComponent(branchId)}`
    const payload = await this.request(path, true)
    if (payload === null) return null
    const branch = branchFrom(payload)
    if (!branch)
      throw new CoreDirectoryUnavailableError({
        reason: 'invalid-response',
        path,
      })
    return branch
  }

  private async request(
    path: string,
    allowNotFound = false
  ): Promise<unknown | null> {
    const settings = getSettings()
    if (!settings.identityApiKey)
      throw new CoreDirectoryUnavailableError({
        reason: 'configuration',
        path,
      })

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      let response: Response
      try {
        response = await fetch(`${settings.identityApiUrl}${path}`, {
          method: 'GET',
          headers: { 'x-876-api-key': settings.identityApiKey },
          signal: AbortSignal.timeout(settings.identityTimeoutMs),
        })
      } catch (error) {
        const reason =
          error instanceof Error &&
          (error.name === 'AbortError' || error.name === 'TimeoutError')
            ? 'timeout'
            : 'network'
        if (attempt < MAX_ATTEMPTS) continue
        log.error({ err: error, path, reason }, 'core_directory.request.failed')
        throw new CoreDirectoryUnavailableError({ reason, path })
      }

      if (allowNotFound && response.status === 404) return null
      if (!response.ok) {
        if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS)
          continue
        throw new CoreDirectoryUnavailableError({
          reason: 'upstream',
          path,
          status: response.status,
        })
      }

      let raw: unknown
      try {
        raw = await response.json()
      } catch {
        throw new CoreDirectoryUnavailableError({
          reason: 'invalid-response',
          path,
        })
      }

      const payload = unwrapEnvelope(raw)
      if (payload === null || payload === undefined)
        throw new CoreDirectoryUnavailableError({
          reason: 'invalid-response',
          path,
        })
      return payload
    }

    throw new CoreDirectoryUnavailableError({ reason: 'network', path })
  }
}
