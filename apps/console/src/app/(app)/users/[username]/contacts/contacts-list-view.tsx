'use client'

import type { AdminConsumerContact } from '@876/admin'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Button } from '@876/ui/button'
import { Pencil, Trash } from '@876/ui/icons'

import { formatDate } from '@/lib/format'
import type { ContactRowActions } from './contacts-columns'
import { contactDisplayName, contactInitials } from './contact-utils'

type Props = {
  contacts: AdminConsumerContact[]
  actions: ContactRowActions
  emptyState: React.ReactNode
}

export function ContactsListView({ contacts, actions, emptyState }: Props) {
  if (contacts.length === 0) {
    return <div className="876-card">{emptyState}</div>
  }

  return (
    <div className="876-card divide-border divide-y overflow-hidden">
      {contacts.map((contact) => {
        const name = contactDisplayName(contact)
        return (
          <div
            key={contact.id}
            className="group hover:bg-muted/40 flex items-center gap-3 px-4 py-2.5 transition-colors"
          >
            <Avatar className="size-8 text-xs">
              {contact.contact_user.avatar && (
                <AvatarImage src={contact.contact_user.avatar} alt={name} />
              )}
              <AvatarFallback>{contactInitials(contact)}</AvatarFallback>
            </Avatar>

            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="truncate text-sm font-medium">{name}</span>
              {contact.nickname && (
                <span className="text-muted-foreground truncate text-xs">
                  “{contact.nickname}”
                </span>
              )}
            </div>

            <span className="text-muted-foreground hidden min-w-0 flex-1 truncate text-xs sm:block">
              {contact.contact_user.email}
            </span>

            <span className="text-muted-foreground/70 hidden w-24 shrink-0 text-right text-xs md:block">
              {formatDate(contact.created_at)}
            </span>

            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${name}`}
                onClick={() => actions.onEdit(contact)}
                disabled={actions.isPending}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${name}`}
                onClick={() => actions.onDelete(contact)}
                disabled={actions.isPending}
              >
                <Trash className="size-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
