import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getInvoiceApiContext } from '@/lib/auth/api-context'
import { requireAppAccessManager } from '@/lib/auth/app-access'
import { getWorkspace } from '@/lib/clients/workspace'

const createSchema = z.object({ user_id: z.string().min(1).optional(), membership_id: z.string().min(1).optional(), app_id: z.string().min(1).optional(), app_slug: z.string().min(1).optional(), app_role_id: z.string().min(1).optional(), permission_grants: z.array(z.string()).optional(), permission_denies: z.array(z.string()).optional(), title: z.string().min(1).max(160).nullable().optional(), attributes: z.record(z.string(), z.unknown()).nullable().optional(), status: z.string().min(1).max(32).optional() })
function unauthorized() { return Response.json({ data: null, error: { code: 'invoice/unauthorized', message: 'Unauthorized.' } }, { status: 401 }) }
function invalidBody() { return Response.json({ data: null, error: { code: 'invoice/invalid-request', message: 'Invalid request body.' } }, { status: 400 }) }
export async function POST(request: NextRequest) { const context = await getInvoiceApiContext(); if (!context) return unauthorized(); const manager = await requireAppAccessManager(context.orgId); if (manager.response) return manager.response; const body = await request.json().catch(() => null); const input = createSchema.safeParse(body); if (!input.success) return invalidBody(); const workspace = await getWorkspace(); const result = await workspace.appMemberships.create(context.orgId, input.data); return Response.json(result, { status: result.error ? 502 : 201 }) }
