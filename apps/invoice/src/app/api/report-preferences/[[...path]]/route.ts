import { createInvoiceFinanceResourceRoute } from '@/lib/api/resource-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const route = createInvoiceFinanceResourceRoute('report-preferences', {
  read: 'sales:read',
  write: 'sales:write',
})

export const GET = route
export const POST = route
export const PUT = route
export const PATCH = route
export const DELETE = route
