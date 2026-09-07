import { createInvoiceFinanceResourceRoute } from '@/lib/api/resource-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const route = createInvoiceFinanceResourceRoute('tax-rates', {
  read: 'taxes:read',
  write: 'taxes:write',
})

export const GET = route
export const POST = route
export const PATCH = route
