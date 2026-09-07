'use client'

import { SupportWidget as CrmSupportWidget } from '@876/crm-ui/support-widget'

import { client } from '@/lib/client'

export function SupportWidget() {
  return (
    <CrmSupportWidget
      transport={client.support}
      requestHref={(requestId) => `/requests/${requestId}`}
    />
  )
}
