import { CustomerCreateCard } from '../_components/customer-create-card'

export const metadata = { title: 'Add customer' }

/**
 * Create opens in the card slot, in the same place the customer it creates
 * will appear — so the list stays visible beside it and the URL is shareable.
 */
export default function NewCustomerPage() {
  return <CustomerCreateCard />
}
