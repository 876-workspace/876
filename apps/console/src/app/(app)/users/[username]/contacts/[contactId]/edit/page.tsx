import { notFound } from 'next/navigation'
import type { AdminConsumerContact } from '@876/admin'
import { resolveUser, resolveUserContacts } from '../../../_data'
import { ContactEdit } from './contact-edit'

type Props = {
  params: Promise<{ username: string; contactId: string }>
}

export default async function EditContactPage({ params }: Props) {
  const { username, contactId } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  const contacts = await resolveUserContacts(user.id)
  const contact = contacts.find(
    (contact: AdminConsumerContact) => contact.id === contactId
  )
  if (!contact) notFound()

  return (
    <div className="space-y-6">
      <ContactEdit user={user} contact={contact} />
    </div>
  )
}
