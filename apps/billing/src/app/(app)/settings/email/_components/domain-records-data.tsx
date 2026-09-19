import { DomainRecordsPanel } from '@876/communications-ui/panels/domain-records-panel'

import { communicationsService } from '@/lib/clients/communications'

interface DomainRecordsDataProps {
  organizationId: string
  baseHref: string
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
    message: 'DNS records could not be loaded. Try again.',
  }
}

export async function DomainRecordsData({
  organizationId,
  baseHref,
}: DomainRecordsDataProps) {
  try {
    const result = await communicationsService().domains.list(organizationId)
    if (result.error || !result.data)
      return (
        <DomainRecordsPanel
          state={{ status: 'error', error: toError(result.error) }}
          domainName="Sending domain"
          domainId="unknown"
          baseHref={baseHref}
        />
      )
    const first = result.data.data[0]
    if (!first)
      return (
        <DomainRecordsPanel
          state={{ status: 'empty' }}
          domainName="Sending domain"
          domainId="unknown"
          baseHref={baseHref}
        />
      )
    if (first.records.length === 0)
      return (
        <DomainRecordsPanel
          state={{ status: 'empty' }}
          domainName={first.name}
          domainId={first.id}
          baseHref={baseHref}
        />
      )
    return (
      <DomainRecordsPanel
        state={{ status: 'ready', data: first.records }}
        domainName={first.name}
        domainId={first.id}
        baseHref={baseHref}
      />
    )
  } catch (error) {
    return (
      <DomainRecordsPanel
        state={{ status: 'error', error: toError(error) }}
        domainName="Sending domain"
        domainId="unknown"
        baseHref={baseHref}
      />
    )
  }
}
