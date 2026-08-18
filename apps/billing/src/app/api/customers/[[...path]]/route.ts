import { createBillingResourceRoute } from '@/lib/api/resource-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const route = createBillingResourceRoute('customers')

export const GET = route
export const POST = route
export const PUT = route
export const PATCH = route
export const DELETE = route
