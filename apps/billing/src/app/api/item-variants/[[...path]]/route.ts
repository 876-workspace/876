import { createBillingResourceRoute } from '@/lib/api/resource-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const route = createBillingResourceRoute('item-variants')

export const GET = route
