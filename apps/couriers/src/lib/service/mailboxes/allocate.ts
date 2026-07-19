import { prisma } from '@/lib/db'
import type { MailboxAllocateParams, MailboxAllocation } from '@/types/mailbox'
import type { ServiceResult } from '@/types/api'
import { err, ok } from '../result'

const MAX_ALLOCATION_ATTEMPTS = 25

/**
 * Returns an available mailbox-number candidate without reserving it.
 * Callers insert it transactionally and must allocate once more when that
 * insert loses a race with a P2002 mailbox-number unique violation.
 */
export async function allocate(
  params: MailboxAllocateParams
): ServiceResult<MailboxAllocation> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    select: { mailboxPrefix: true },
  })
  if (!tenant) return err('The requested tenant was not found.', 404)

  const prefix = tenant.mailboxPrefix?.trim().toUpperCase() ?? ''
  const count = await prisma.mailbox.count({
    where: { tenantId: params.tenantId },
  })

  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
    const candidate = String(1000 + count + attempt + 1).padStart(4, '0')
    const number = `${prefix}${candidate}`
    const existing = await prisma.mailbox.findUnique({
      where: {
        mailboxes_tenant_id_number_key: {
          tenantId: params.tenantId,
          number,
        },
      },
      select: { id: true },
    })
    if (!existing) return ok({ number })
  }

  return err('A mailbox number could not be allocated. Please try again.', 503)
}
