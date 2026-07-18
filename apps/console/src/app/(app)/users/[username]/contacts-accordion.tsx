import Link from 'next/link'
import type { AdminConsumerContact } from '@876/admin'

import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { ChevronRight } from '@876/ui/icons'

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

/**
 * A single contact row in the overview accordion: avatar, name (+ optional
 * nickname tag), and email. Notes are intentionally omitted here - the card is a
 * compact glance; full details live on the contacts tab. The whole row links to
 * the contact's own user page.
 */
function ContactAccordionItem({ contact }: { contact: AdminConsumerContact }) {
  const name = contactName(contact)
  const href = `/users/${contact.contact_user.username ?? contact.contact_user_id}`
  return (
    <li>
      <Link
        href={href}
        className="group hover:bg-muted/50 -mx-1.5 flex items-center gap-3 rounded-lg px-1.5 py-2.5 transition-colors"
      >
        <Avatar className="size-9 shrink-0 text-xs">
          {contact.contact_user.avatar && (
            <AvatarImage src={contact.contact_user.avatar} alt={name} />
          )}
          <AvatarFallback>{contactInitials(contact)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground truncate text-sm font-medium">
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
        <ChevronRight className="text-muted-foreground/30 group-hover:text-muted-foreground size-4 shrink-0 transition-all group-hover:translate-x-0.5" />
      </Link>
    </li>
  )
}

/**
 * The contacts list inside the overview accordion. Renders up to `limit` rows
 * separated by hairline dividers (no per-item borders or cards), keeping the
 * glance clean. The caller supplies the "View all" affordance and empty state.
 */
export function ContactAccordion({
  contacts,
}: {
  contacts: AdminConsumerContact[]
}) {
  return (
    <ul className="divide-border/60 divide-y">
      {contacts.map((contact) => (
        <ContactAccordionItem key={contact.id} contact={contact} />
      ))}
    </ul>
  )
}
