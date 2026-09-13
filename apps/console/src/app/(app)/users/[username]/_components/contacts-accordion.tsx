'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AdminConsumerContact } from '@876/platform/compat'

import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { buttonVariants } from '@876/ui/button'
import { DetailCardSection } from '@876/ui/detail-card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon, Pencil, Plus, TrashIcon } from '@876/ui/icons'

import { client } from '@/lib/client'

/** Display name for a contact, falling back to the linked user's email. */
function contactName(contact: AdminConsumerContact): string {
  const { first_name, last_name, email } = contact.contact_user
  return [first_name, last_name].filter(Boolean).join(' ') || email
}

/** Two-letter initials for the avatar fallback. */
function contactInitials(contact: AdminConsumerContact): string {
  const { first_name, last_name, email } = contact.contact_user
  return (
    [first_name?.[0], last_name?.[0]].filter(Boolean).join('').toUpperCase() ||
    email[0]?.toUpperCase() ||
    '?'
  )
}

type Props = {
  userId: string
  username: string
  contacts: AdminConsumerContact[]
}

/**
 * The user's saved contacts — every one of them another 876 account. Each row
 * opens that account; the row menu edits or removes the saved contact.
 */
export function ContactsAccordion({ userId, username, contacts }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete(contact: AdminConsumerContact) {
    if (!window.confirm(`Remove ${contactName(contact)} from contacts?`)) return
    setError(null)
    startTransition(async () => {
      const { error: resultError } = await client.users.deleteContact(
        userId,
        contact.id
      )
      if (resultError) {
        setError(resultError.message)
        return
      }
      router.refresh()
    })
  }

  return (
    <DetailCardSection
      title={
        <span className="flex items-center justify-between gap-3">
          Contacts
          <Link
            href={`/users/${username}/contacts/new`}
            className={buttonVariants({ variant: 'info', size: 'xs' })}
          >
            <Plus className="size-3.5" strokeWidth={2.25} />
            Add
          </Link>
        </span>
      }
    >
      {error ? (
        <p role="alert" className="text-destructive mb-2 text-[0.8125rem]">
          {error}
        </p>
      ) : null}

      {contacts.length === 0 ? (
        <p className="text-muted-foreground text-[0.8125rem]">No contacts</p>
      ) : (
        <ul className="divide-border/60 divide-y">
          {contacts.map((contact) => {
            const name = contactName(contact)
            return (
              <li key={contact.id} className="flex items-center gap-2 py-2">
                <Link
                  href={`/users/${contact.contact_user.username ?? contact.contact_user_id}`}
                  className="hover:bg-muted/50 -mx-1.5 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1.5 py-1 transition-colors"
                >
                  <Avatar className="size-9 shrink-0 text-xs">
                    {contact.contact_user.avatar && (
                      <AvatarImage
                        src={contact.contact_user.avatar}
                        alt={name}
                      />
                    )}
                    <AvatarFallback>{contactInitials(contact)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground truncate text-[0.8125rem] font-medium">
                        {name}
                      </span>
                      {contact.nickname && (
                        <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[0.625rem] font-medium">
                          {contact.nickname}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                      {contact.contact_user.email}
                    </span>
                  </div>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={buttonVariants({
                      variant: 'ghost',
                      size: 'icon-sm',
                    })}
                    aria-label={`Actions for ${name}`}
                    disabled={isPending}
                  >
                    <MoreHorizontalIcon className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-auto min-w-44">
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(
                          `/users/${username}/contacts/${contact.id}/edit`
                        )
                      }
                    >
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDelete(contact)}
                    >
                      <TrashIcon className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          })}
        </ul>
      )}
    </DetailCardSection>
  )
}
