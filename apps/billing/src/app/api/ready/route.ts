import { apiSuccess } from '@876/core/api'

import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  try {
    await prisma.tenant.findFirst({ select: { id: true } })

    return apiSuccess({
      object: 'readiness',
      status: 'ready',
      service: 'billing',
    })
  } catch {
    return apiSuccess(
      {
        object: 'readiness',
        status: 'not_ready',
        service: 'billing',
      },
      { status: 503 }
    )
  }
}
