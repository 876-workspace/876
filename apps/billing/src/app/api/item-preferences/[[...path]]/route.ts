import { createBillingResourceRoute } from '@/lib/api/resource-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const route = createBillingResourceRoute('item-preferences')

export const GET = route
export const PATCH = route
