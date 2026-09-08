import { createInvoiceFinanceResourceRoute } from '@/lib/api/resource-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const route = createInvoiceFinanceResourceRoute('refunds', {
  read: 'payments:read',
  write: 'payments:write',
})

export const GET = route
export const POST = route
