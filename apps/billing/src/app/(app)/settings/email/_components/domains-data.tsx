import { DomainListPanel } from '@876/communications-ui/panels/domain-list-panel'

import { communicationsService } from '@/lib/clients/communications'

import { DomainVerifyActions } from './domain-verify-actions'

interface DomainsDataProps {
  organizationId: string
  baseHref: string
  canManage: boolean
}

function toError(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const typed = error as { code: string; message: string }
    return { code: typed.code, message: typed.message }
  }
  return {
    code: 'email/load-failed',
    message: 'Sending domains could not be loaded. Try again.',
  }
}

export async function DomainsData({
  organizationId,
  baseHref,
  canManage,
}: DomainsDataProps) {
  try {
    const result = await communicationsService().domains.list(organizationId)
    if (result.error || !result.data)
      return (
        <DomainListPanel
          state={{ status: 'error', error: toError(result.error) }}
          baseHref={baseHref}
        />
      )
    if (result.data.data.length === 0)
      return <DomainListPanel state={{ status: 'empty' }} baseHref={baseHref} />
    return (
      <div className="space-y-4">
        <DomainListPanel
          state={{ status: 'ready', data: result.data.data }}
          baseHref={baseHref}
        />
        {canManage ? (
          <DomainVerifyActions
            domains={result.data.data.map((domain) => ({
              id: domain.id,
              name: domain.name,
              status: domain.status,
            }))}
          />
        ) : null}
      </div>
    )
  } catch (error) {
    return (
      <DomainListPanel
        state={{ status: 'error', error: toError(error) }}
        baseHref={baseHref}
      />
    )
  }
}
