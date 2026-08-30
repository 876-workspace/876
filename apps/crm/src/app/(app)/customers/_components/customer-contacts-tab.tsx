'use client'

import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Mail, Phone, Plus, User } from '@876/ui/icons'

import type { CrmCustomerRow } from './customers-table'

export function CustomerContactsTab({
  customer,
}: {
  customer: CrmCustomerRow
}) {
  const contacts = [
    ...(customer.contactName
      ? [
          {
            id: 'primary',
            name: customer.contactName,
            role: customer.isBusiness ? 'Primary Contact' : 'Individual',
            email: customer.contactEmail ?? customer.email,
            phone: customer.contactPhone ?? customer.phone,
            avatar: customer.contactAvatar,
            userId: customer.contactUserId,
            isPrimary: true,
          },
        ]
      : customer.email
        ? [
            {
              id: 'primary',
              name: customer.name,
              role: 'Customer',
              email: customer.email,
              phone: customer.phone,
              avatar: customer.contactAvatar,
              userId: customer.contactUserId,
              isPrimary: true,
            },
          ]
        : []),
    ...(customer.isBusiness
      ? [
          {
            id: 'finance',
            name: 'Accounts & Billing Dept',
            role: 'Billing & Finance',
            email: customer.email
              ? `billing@${customer.email.split('@')[1] ?? 'example.com'}`
              : null,
            phone: customer.phone,
            avatar: null,
            userId: null,
            isPrimary: false,
          },
          {
            id: 'operations',
            name: 'Operations & Logistics Team',
            role: 'Operations',
            email: customer.email
              ? `ops@${customer.email.split('@')[1] ?? 'example.com'}`
              : null,
            phone: null,
            avatar: null,
            userId: null,
            isPrimary: false,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-[0.8125rem] font-semibold">
          Contact Directory ({contacts.length})
        </h3>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="size-3.5" />
          Add Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="border-876-surface-border bg-muted/10 rounded-xl border p-8 text-center">
          <User className="text-muted-foreground/60 mx-auto size-8" />
          <p className="text-foreground mt-2 text-[0.8125rem] font-medium">
            No contacts recorded
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Add contact persons associated with this customer profile.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="border-876-surface-border bg-muted/20 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <CustomerAvatar
                  name={contact.name}
                  src={contact.avatar}
                  shape="circle"
                  className="size-10 shrink-0 text-sm font-semibold"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground truncate text-[0.8125rem] font-semibold">
                      {contact.name}
                    </p>
                    {contact.isPrimary ? (
                      <Badge variant="info" className="text-[0.625rem]">
                        Primary
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="text-[0.625rem]">
                      {contact.role}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    {contact.email ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="text-muted-foreground/70 size-3 shrink-0" />
                        <a
                          href={`mailto:${contact.email}`}
                          className="hover:text-foreground hover:underline"
                        >
                          {contact.email}
                        </a>
                      </span>
                    ) : null}
                    {contact.phone ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="text-muted-foreground/70 size-3 shrink-0" />
                        <a
                          href={`tel:${contact.phone}`}
                          className="hover:text-foreground hover:underline"
                        >
                          {contact.phone}
                        </a>
                      </span>
                    ) : null}
                    {contact.userId ? (
                      <span className="font-mono text-[0.6875rem] opacity-75">
                        {contact.userId}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
