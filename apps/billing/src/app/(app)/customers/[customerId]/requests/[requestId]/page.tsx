import { requirePagePermission } from '@/lib/auth/billing-context'

export const metadata = { title: 'Request' }

// The request card in this segment's layout already renders the overview.
export default async function CustomerRequestPage() {
  await requirePagePermission('customers:read')
  return null
}
