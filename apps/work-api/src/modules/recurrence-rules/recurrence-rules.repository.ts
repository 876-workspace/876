import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type { Prisma } from '../../db/generated/prisma/client.js'

type CreateParams = Omit<Prisma.WorkRecurrenceRuleUncheckedCreateInput, 'id'>
type UpdateParams = Prisma.WorkRecurrenceRuleUncheckedUpdateInput

export const list = (tenantId: string) =>
  prisma.workRecurrenceRule.findMany({
    where: { tenantId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
export const retrieve = (tenantId: string, ruleId: string) =>
  prisma.workRecurrenceRule.findFirst({ where: { tenantId, id: ruleId } })
export const create = (params: CreateParams) =>
  prisma.workRecurrenceRule.create({
    data: { id: `rrule_${randomUUID().replaceAll('-', '')}`, ...params },
  })
export const update = (ruleId: string, params: UpdateParams) =>
  prisma.workRecurrenceRule.update({ where: { id: ruleId }, data: params })
export async function remove(ruleId: string) {
  await prisma.workRecurrenceRule.delete({ where: { id: ruleId } })
  return {
    object: 'recurrence_rule' as const,
    id: ruleId,
    deleted: true as const,
  }
}
