'use client'

import type { ColumnDef } from '@tanstack/react-table'
import type { AdminConsumerContact } from '@876/admin'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Button } from '@876/ui/button'
import { Pencil, Trash } from '@876/ui/icons'

import { formatDate } from '@/lib/format'
import { contactDisplayName, contactInitials } from './contact-utils'

export type ContactRowActions = {
  isPending: boolean
  onEdit: (contact: AdminConsumerContact) => void
  onDelete: (contact: AdminConsumerContact) => void
}

export function createContactColumns(
  actions: ContactRowActions
): ColumnDef<AdminConsumerContact, unknown>[] {
  return [
    {
      id: 'contact',
      accessorFn: (contact) => contactDisplayName(contact),
      header: 'Contact',
      cell: ({ row }) => {
        const contact = row.original
        const contactName = contactDisplayName(contact)

        return (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9 text-xs">
              {contact.contact_user.avatar && (
                <AvatarImage
                  src={contact.contact_user.avatar}
                  alt={contactName}
                />
              )}
              <AvatarFallback>{contactInitials(contact)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{contactName}</p>
              <p className="text-muted-foreground truncate text-xs">
                {contact.contact_user.email}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'nickname',
      header: 'Nickname',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.nickname || '—'}</span>
      ),
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => (
        <div className="max-w-[24rem] whitespace-normal">
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {row.original.notes || '—'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Added',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => {
        const contact = row.original
        const contactName = contactDisplayName(contact)

        return (
          <div className="flex justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${contactName}`}
              onClick={() => actions.onEdit(contact)}
              disabled={actions.isPending}
            >
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${contactName}`}
              onClick={() => actions.onDelete(contact)}
              disabled={actions.isPending}
            >
              <Trash aria-hidden="true" className="size-4" />
            </Button>
          </div>
        )
      },
    },
  ]
}
