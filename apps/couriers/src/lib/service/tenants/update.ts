import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Tenant } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import { ok, err } from '../result'

export async function update(
  tenantId: string,
  data: { mailboxPrefix?: string | null }
): ServiceResult<Pick<Tenant, 'mailboxPrefix'>> {
  if (data.mailboxPrefix != null && !/^[A-Z0-9]+$/.test(data.mailboxPrefix)) {
    return err('Prefix may only contain letters and numbers.', 422)
  }

  const now = nowUnixSeconds()
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { ...data, updatedAt: now },
  })

  return ok({ mailboxPrefix: tenant.mailboxPrefix })
}
