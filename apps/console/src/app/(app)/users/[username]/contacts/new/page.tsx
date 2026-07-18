import { notFound } from 'next/navigation'
import { resolveUser } from '../../_data'
import { ContactCreate } from './contact-create'

type Props = {
  params: Promise<{ username: string }>
}

export default async function NewContactPage({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  return (
    <div className="space-y-6">
      <ContactCreate user={user} />
    </div>
  )
}
