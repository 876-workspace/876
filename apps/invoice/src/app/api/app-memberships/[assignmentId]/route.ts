import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getInvoiceApiContext } from '@/lib/auth/api-context'
import { requireAppAccessManager } from '@/lib/auth/app-access'
import { getWorkspace } from '@/lib/services/workspace'

const updateSchema = z.object({ app_role_id: z.string().min(1).nullable().optional(), permission_grants: z.array(z.string()).optional(), permission_denies: z.array(z.string()).optional(), title: z.string().min(1).max(160).nullable().optional(), attributes: z.record(z.string(), z.unknown()).nullable().optional(), status: z.string().min(1).max(32).optional() })
type RouteContext = { params: Promise<{ assignmentId: string }> }
function unauthorized() { return Response.json({ data: null, error: { code: 'invoice/unauthorized', message: 'Unauthorized.' } }, { status: 401 }) }
function invalidBody() { return Response.json({ data: null, error: { code: 'invoice/invalid-request', message: 'Invalid request body.' } }, { status: 400 }) }
export async function PATCH(request: NextRequest, route: RouteContext) { const context = await getInvoiceApiContext(); if (!context) return unauthorized(); const manager = await requireAppAccessManager(context.orgId); if (manager.response) return manager.response; const body = await request.json().catch(() => null); const input = updateSchema.safeParse(body); if (!input.success) return invalidBody(); const { assignmentId } = await route.params; const workspace = await getWorkspace(); const result = await workspace.appMemberships.update(context.orgId, assignmentId, input.data); return Response.json(result, { status: result.error ? 502 : 200 }) }
export async function DELETE(_request: NextRequest, route: RouteContext) { const context = await getInvoiceApiContext(); if (!context) return unauthorized(); const manager = await requireAppAccessManager(context.orgId); if (manager.response) return manager.response; const { assignmentId } = await route.params; const workspace = await getWorkspace(); const result = await workspace.appMemberships.delete(context.orgId, assignmentId); return Response.json(result, { status: result.error ? 502 : 200 }) }
