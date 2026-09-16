import type { CommunicationsOperatorClient } from '@876/communications/operator'

import { request } from './request'

type DomainsResource = CommunicationsOperatorClient['domains']

type VerifiedDomain = NonNullable<
  Awaited<ReturnType<DomainsResource['verify']>>['data']
>

function emailRoot(organizationId: string) {
  return `/api/organizations/${encodeURIComponent(organizationId)}/email`
}

export const emailDomains = {
  verify(organizationId: string, domainId: string) {
    return request<VerifiedDomain>(
      `${emailRoot(organizationId)}/domains/${encodeURIComponent(domainId)}/verify`,
      { method: 'POST' }
    )
  },
}
