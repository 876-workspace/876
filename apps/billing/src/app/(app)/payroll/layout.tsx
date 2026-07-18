import { requireBillingFeature } from '@/lib/auth/billing-context'

export default async function PayrollLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireBillingFeature('payroll')
  return children
}
