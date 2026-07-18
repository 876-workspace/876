'use client'

import type { AdminConsumerContact } from '@876/admin'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { Mail, MoreHorizontalIcon, Pencil, Trash } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { formatDate } from '@/lib/format'
import type { ContactRowActions } from './contacts-columns'
import { contactDisplayName, contactInitials } from './contact-utils'

type Props = {
  contacts: AdminConsumerContact[]
  actions: ContactRowActions
  emptyState: React.ReactNode
}

export function ContactsGridView({ contacts, actions, emptyState }: Props) {
  if (contacts.length === 0) {
    return <div className="876-card">{emptyState}</div>
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {contacts.map((contact) => {
        const name = contactDisplayName(contact)
        return (
          <div
            key={contact.id}
            className="876-card shadow-876-sm flex flex-col p-4"
          >
            <div className="flex items-start gap-3">
              <Avatar className="size-11">
                {contact.contact_user.avatar && (
                  <AvatarImage src={contact.contact_user.avatar} alt={name} />
                )}
                <AvatarFallback>{contactInitials(contact)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{name}</p>
                {contact.nickname && (
                  <p className="text-muted-foreground truncate text-xs">
                    “{contact.nickname}”
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                    '-mt-1 -mr-1'
                  )}
                  aria-label={`Actions for ${name}`}
                >
                  <MoreHorizontalIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-auto min-w-36">
                  <DropdownMenuItem
                    onClick={() => actions.onEdit(contact)}
                    disabled={actions.isPending}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => actions.onDelete(contact)}
                    disabled={actions.isPending}
                  >
                    <Trash className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <a
              href={`mailto:${contact.contact_user.email}`}
              className="text-muted-foreground hover:text-foreground mt-3 flex items-center gap-1.5 text-xs transition-colors"
            >
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{contact.contact_user.email}</span>
            </a>

            {contact.notes && (
              <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">
                {contact.notes}
              </p>
            )}

            <p className="text-muted-foreground/70 mt-auto pt-3 text-xs">
              Added {formatDate(contact.created_at)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
