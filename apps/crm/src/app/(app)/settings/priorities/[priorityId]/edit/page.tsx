import { redirect } from 'next/navigation'

export const metadata = { title: 'Edit Priority - Settings' }

type Props = { params: Promise<{ priorityId: string }> }

export default async function EditPriorityPage({ params }: Props) {
  const { priorityId } = await params
  redirect(`/settings/priorities?priority=${encodeURIComponent(priorityId)}`)
}
