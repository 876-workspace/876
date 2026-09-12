import { requireAppPermission } from '@/lib/auth/guards'

export const metadata = { title: 'Request' }

// The request card in this segment's layout already renders the overview.
export default async function CustomerRequestPage() {
  await requireAppPermission('requests.view')
  return null
}
