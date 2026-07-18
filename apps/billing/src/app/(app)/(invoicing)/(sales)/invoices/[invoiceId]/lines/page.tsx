import { redirect } from 'next/navigation'

export default async function InvoiceLinesPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const { invoiceId } = await params
  redirect(`/invoices/${encodeURIComponent(invoiceId)}`)
}
