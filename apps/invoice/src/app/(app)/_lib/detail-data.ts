import { cache } from 'react'

import { getInvoice } from '@/lib/invoice'

export const resolveItemDetail = cache(async (itemId: string) => {
  const invoice = await getInvoice()
  if (!invoice) return null

  const result = await invoice.items.retrieve(itemId)

  return { invoice, result }
})
