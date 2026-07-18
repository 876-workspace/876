import type { AdminConsumerContact } from '@876/admin'

export function contactDisplayName(contact: AdminConsumerContact): string {
  return (
    [contact.contact_user.first_name, contact.contact_user.last_name]
      .filter(Boolean)
      .join(' ') || contact.contact_user.email
  )
}

export function contactInitials(contact: AdminConsumerContact): string {
  const initials = [
    contact.contact_user.first_name?.[0],
    contact.contact_user.last_name?.[0],
  ]
    .filter(Boolean)
    .join('')
    .toUpperCase()

  return initials || contact.contact_user.email[0]?.toUpperCase() || '?'
}

/** Case-insensitive match across name, email, nickname, notes, and user ID. */
export function contactMatchesQuery(
  contact: AdminConsumerContact,
  query: string
): boolean {
  const haystack = [
    contactDisplayName(contact),
    contact.contact_user.email,
    contact.nickname,
    contact.notes,
    contact.contact_user_id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.trim().toLowerCase())
}
