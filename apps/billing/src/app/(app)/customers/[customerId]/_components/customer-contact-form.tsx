'use client'

import { useRouter } from 'next/navigation'
import type { CustomerContactCreateParams } from '@876/billing'
import { CustomerContactForm } from '@876/billing-ui/customer-contact-form'
import { client } from '@/lib/client'

export function CustomerContactFormAdapter({
  customerId,
  contactId,
  initial,
}: {
  customerId: string
  contactId?: string
  initial?: Partial<CustomerContactCreateParams>
}) {
  const router = useRouter()
  return (
    <CustomerContactForm
      initial={initial}
      submitLabel={contactId ? 'Save' : 'Add'}
      cancelHref={`/customers/${customerId}`}
      onSubmit={async (params) => {
        const result = contactId
          ? await client.customers.contacts.update(
              customerId,
              contactId,
              params
            )
          : await client.customers.contacts.create(customerId, params)
        if (!result.error) {
          router.refresh()
          router.push(`/customers/${customerId}`)
        }
        return { error: result.error }
      }}
    />
  )
}
