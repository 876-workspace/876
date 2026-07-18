import { cache } from 'react'

import { service } from '@/lib/service'

export const resolveCreditNote = cache(service.creditNotes.retrieve)
export const resolveCoupon = cache(service.discounts.coupons.retrieve)
export const resolveCustomer = cache(service.customers.retrieve)
export const resolveInvoice = cache(service.invoices.retrieve)
export const resolveItem = cache(service.items.retrieve)
export const resolveAddon = cache(service.addons.retrieve)
export const resolvePlan = cache(service.plans.retrieve)
export const resolvePrice = cache(service.prices.retrieve)
export const resolveProduct = cache(service.products.retrieve)
export const resolveQuote = cache(service.quotes.retrieve)
export const resolveSubscription = cache(service.subscriptions.retrieve)
