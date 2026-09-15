import { createInvoiceFinanceResourceRoute } from '@/lib/api/resource-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const route = createInvoiceFinanceResourceRoute('branding', {
  read: 'sales:read',
  write: 'sales:write',
})

export const GET = route
export const PATCH = route
