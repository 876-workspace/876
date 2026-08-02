import 'server-only'

import { service } from '@/lib/service'

interface CurrentPayment {
  customerId: string
  paymentModeId: string
  depositAccountId: string
  invoiceAllocations: Array<{ invoiceId: string; amount: bigint }>
}

export async function getPaymentFormData(
  tenantId: string,
  current?: CurrentPayment
) {
  const [customers, accounts, modes, currencies, invoices] = await Promise.all([
    service.customers.list(tenantId),
    service.bankAccounts.list(tenantId),
    service.paymentModes.list(tenantId),
    service.currencies.list(tenantId),
    service.invoices.list(tenantId),
  ])
  const currentAllocations = new Map(
    (current?.invoiceAllocations ?? []).map((allocation) => [
      allocation.invoiceId,
      allocation.amount,
    ])
  )

  return {
    customers: customers
      .filter(
        (customer) =>
          customer.status === 'ACTIVE' || customer.id === current?.customerId
      )
      .map((customer) => ({ value: customer.id, label: customer.name })),
    accounts: accounts
      .filter(
        (account) =>
          account.isActive || account.id === current?.depositAccountId
      )
      .map((account) => ({
        value: account.id,
        label: `${account.name} (${account.currency})`,
        currency: account.currency,
      })),
    modes: modes
      .filter((mode) => mode.isActive || mode.id === current?.paymentModeId)
      .map((mode) => ({ value: mode.id, label: mode.name })),
    currencies: currencies.map(({ currency }) => ({
      value: currency.code,
      label: `${currency.name} (${currency.code})`,
      decimalPlaces: currency.decimalPlaces,
    })),
    invoices: invoices.flatMap((invoice) => {
      const currentAllocation = currentAllocations.get(invoice.id) ?? 0n
      const editableAmountDue = invoice.amountDue + currentAllocation
      const isCurrentInvoice = currentAllocation > 0n
      const isOpen =
        invoice.status !== 'VOID' &&
        (isCurrentInvoice ||
          (invoice.status !== 'PAID' && invoice.amountDue > 0n))
      if (!isOpen) return []

      return [
        {
          id: invoice.id,
          customerId: invoice.customerId,
          number: invoice.number,
          currency: invoice.currency,
          amountDue: editableAmountDue.toString(),
        },
      ]
    }),
  }
}
