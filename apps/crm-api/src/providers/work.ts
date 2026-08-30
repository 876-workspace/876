import { getError, type AppError, type Error as ErrorValue } from '@876/core'
import { create876WorkIntegrationClient } from '@876/work/integration'

import { getLogger } from '../platform/logger.js'

const log = getLogger('providers.work')

export function workClient() {
  return create876WorkIntegrationClient({
    baseUrl: process.env.WORK_API_URL,
    apiKey: process.env.CRM_API_876_KEY,
  })
}

export function crmRequestWorkContext(requestId: string) {
  return { service: 'crm', resource: 'request', id: requestId } as const
}

/**
 * Preserves useful Work failure categories at CRM's provider boundary. The
 * upstream message is logged for operators; callers receive CRM's stable,
 * user-safe error contract.
 */
export function workErrorToCrm(error: AppError | null | undefined): ErrorValue {
  let mapped: ErrorValue = getError('crm/work-unavailable')

  switch (error?.code) {
    case 'work/connection-forbidden':
    case 'work/invalid-api-key':
    case 'work/not-configured':
    case 'work/unauthorized':
      mapped = getError('crm/work-not-connected')
      break
    case 'work/tenant-not-found':
      mapped = getError('crm/work-workspace-missing')
      break
    case 'work/tenant-inactive':
      mapped = getError('crm/work-workspace-inactive')
      break
    case 'work/session-forbidden':
      mapped = getError('crm/work-forbidden')
      break
    case 'work/invalid-request':
      mapped = getError('crm/invalid-request')
      break
    case 'work/invalid-response':
      mapped = getError('crm/work-invalid-response')
      break
  }

  log.warn(
    {
      work_error_code: error?.code,
      work_error_message: error?.message,
      crm_error_code: mapped.code,
    },
    'work_error_mapped'
  )

  return mapped
}
