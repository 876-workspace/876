import 'server-only'

import { getBilling } from '@/lib/services/billing'

type BillingClient = Awaited<ReturnType<typeof getBilling>>

export async function getPaymentFormData(billing: BillingClient) {
  const [customers, accounts, modes, currencies, invoices] = await Promise.all([
    billing.customers.list(),
    billing.bankAccounts.list(),
    billing.paymentModes.list(),
    billing.currencies.list(),
    billing.invoices.list(),
  ])
  const failure =
    customers.error ??
    accounts.error ??
    modes.error ??
    currencies.error ??
    invoices.error
  if (
    failure ||
    !customers.data ||
    !accounts.data ||
    !modes.data ||
    !currencies.data ||
    !invoices.data
  ) {
    return {
      data: null,
      error: failure ?? {
        code: 'billing/payment-form-unavailable',
        message: 'Payment entry data is unavailable right now.',
      },
    }
  }

  const currencyRows = currencies.data.data.filter((row) => row.isEnabled)
  const defaultCurrency =
    currencyRows.find((row) => row.isDefault)?.currency.code ??
    currencyRows[0]?.currency.code ??
    'JMD'

  return {
    data: {
      customers: customers.data.data
        .filter((customer) => customer.status === 'ACTIVE')
        .map((customer) => ({ value: customer.id, label: customer.name })),
      accounts: accounts.data.data
        .filter((account) => account.isActive)
        .map((account) => ({
          value: account.id,
          label: `${account.name} (${account.currency})`,
          currency: account.currency,
        })),
      modes: modes.data.data
        .filter((mode) => mode.isActive)
        .map((mode) => ({ value: mode.id, label: mode.name })),
      currencies: currencyRows.map(({ currency }) => ({
        value: currency.code,
        label: `${currency.name} (${currency.code})`,
        decimalPlaces: currency.decimalPlaces,
      })),
      invoices: invoices.data.data.flatMap((invoice) => {
        const status = stringField(invoice, 'status')
        const amountDue = stringField(invoice, 'amountDue')
        const customerId = stringField(invoice, 'customerId')
        const currency = stringField(invoice, 'currency')
        const number = stringField(invoice, 'number')
        if (
          !customerId ||
          !currency ||
          !number ||
          !amountDue ||
          status === 'DRAFT' ||
          status === 'PAID' ||
          status === 'VOID' ||
          status === 'UNCOLLECTIBLE' ||
          BigInt(amountDue) <= 0n
        )
          return []
        return [{ id: invoice.id, customerId, number, currency, amountDue }]
      }),
      defaultCurrency,
    },
    error: null,
  }
}

function stringField(record: Record<string, unknown>, key: string) {
  return typeof record[key] === 'string' ? record[key] : null
}
