import { redirect } from 'next/navigation'

export const metadata = { title: 'Add Priority - Settings' }

export default function NewPriorityPage() {
  redirect('/settings/priorities?priority=new')
}
