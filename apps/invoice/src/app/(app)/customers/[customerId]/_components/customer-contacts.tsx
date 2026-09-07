'use client'

import { useState } from 'react'
import type { CustomerContact } from '@876/billing'
import { CustomerContactsPanel } from '@876/billing-ui/panels/customer-contacts-panel'
import type { PanelState } from '@876/billing-ui/panels/panel'
import { client } from '@/lib/client'

export function CustomerContacts({
  customerId,
  state,
  canManage,
}: {
  customerId: string
  state: PanelState<CustomerContact[]>
  canManage: boolean
}) {
  const [deletingContactId, setDeletingContactId] = useState<string | null>(
    null
  )
  return (
    <CustomerContactsPanel
      state={state}
      addHref={`/customers/${customerId}/contacts/new`}
      editHref={(contactId) =>
        `/customers/${customerId}/contacts/${contactId}/edit`
      }
      canManage={canManage}
      deletingContactId={deletingContactId}
      onDelete={async (contactId) => {
        setDeletingContactId(contactId)
        const result = await client.customers.contacts.delete(
          customerId,
          contactId
        )
        setDeletingContactId(null)
        if (!result.error) window.location.reload()
      }}
    />
  )
}
