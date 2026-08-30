import { redirect } from 'next/navigation'

export const metadata = { title: 'Add customer' }

export default function NewCustomerPage() {
  redirect('/customers?customer=new')
}
