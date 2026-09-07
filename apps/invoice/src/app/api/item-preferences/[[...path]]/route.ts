import { createInvoiceResourceRoute } from '@/lib/api/resource-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const route = createInvoiceResourceRoute('item-preferences')

export const GET = route
export const PATCH = route
