import { prisma } from '../../db/index.js'

export async function milestoneProgress(tenantId: string, milestoneId: string) {
  const where = { tenantId, milestoneId, deletedAt: null }
  const [total, completed] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.count({
      where: {
        ...where,
        OR: [
          { workflowState: { is: { category: 'completed' } } },
          { workflowStateId: null, status: 'done' },
        ],
      },
    }),
  ])

  return { total, completed }
}

export async function listMilestoneComments(
  tenantId: string,
  milestoneId: string
) {
  return prisma.milestoneComment.findMany({
    where: { tenantId, milestoneId, deletedAt: null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

export async function retrieveMilestoneComment(
  tenantId: string,
  milestoneId: string,
  id: string
) {
  return prisma.milestoneComment.findFirst({
    where: { tenantId, milestoneId, id, deletedAt: null },
  })
}

export async function createMilestoneComment(
  data: Parameters<typeof prisma.milestoneComment.create>[0]['data']
) {
  return prisma.milestoneComment.create({ data })
}

export async function updateMilestoneComment(
  id: string,
  body: string,
  updatedAt: bigint
) {
  return prisma.milestoneComment.update({
    where: { id },
    data: { body, updatedAt },
  })
}

export async function deleteMilestoneComment(id: string, deletedAt: bigint) {
  return prisma.milestoneComment.update({
    where: { id },
    data: { deletedAt, updatedAt: deletedAt },
  })
}

export async function listMilestoneEvents(
  tenantId: string,
  milestoneId: string
) {
  return prisma.milestoneEvent.findMany({
    where: { tenantId, milestoneId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}

export async function createMilestoneEvent(
  data: Parameters<typeof prisma.milestoneEvent.create>[0]['data']
) {
  return prisma.milestoneEvent.create({ data })
}

export async function listMilestoneCustomFields(tenantId: string) {
  return prisma.milestoneCustomField.findMany({
    where: { tenantId, archivedAt: null },
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
  })
}

export async function retrieveMilestoneCustomField(
  tenantId: string,
  id: string
) {
  return prisma.milestoneCustomField.findFirst({
    where: { tenantId, id, archivedAt: null },
  })
}

export async function retrieveMilestoneCustomFieldByKey(
  tenantId: string,
  key: string
) {
  return prisma.milestoneCustomField.findFirst({
    where: { tenantId, key, archivedAt: null },
  })
}

export async function createMilestoneCustomField(
  data: Parameters<typeof prisma.milestoneCustomField.create>[0]['data']
) {
  return prisma.milestoneCustomField.create({ data })
}

export async function updateMilestoneCustomField(
  id: string,
  data: Parameters<typeof prisma.milestoneCustomField.update>[0]['data']
) {
  return prisma.milestoneCustomField.update({ where: { id }, data })
}

export async function archiveMilestoneCustomField(
  id: string,
  archivedAt: bigint
) {
  return prisma.milestoneCustomField.update({
    where: { id },
    data: { archivedAt, updatedAt: archivedAt },
  })
}

export async function listMilestoneCustomFieldValues(
  tenantId: string,
  milestoneId: string
) {
  return prisma.milestoneCustomFieldValue.findMany({
    where: {
      tenantId,
      milestoneId,
      field: { is: { archivedAt: null } },
    },
    include: { field: true },
    orderBy: { field: { position: 'asc' } },
  })
}

export async function upsertMilestoneCustomFieldValue(data: {
  id: string
  tenantId: string
  milestoneId: string
  fieldId: string
  stringValue: string | null
  integerValue: number | null
  decimalValue: string | null
  booleanValue: boolean | null
  dateValue: bigint | null
  selectKey: string | null
  selectKeys: string[]
  updatedBy: string | null
  createdAt: bigint
  updatedAt: bigint
}) {
  return prisma.milestoneCustomFieldValue.upsert({
    where: {
      milestoneId_fieldId: {
        milestoneId: data.milestoneId,
        fieldId: data.fieldId,
      },
    },
    create: data,
    update: {
      stringValue: data.stringValue,
      integerValue: data.integerValue,
      decimalValue: data.decimalValue,
      booleanValue: data.booleanValue,
      dateValue: data.dateValue,
      selectKey: data.selectKey,
      selectKeys: data.selectKeys,
      updatedBy: data.updatedBy,
      updatedAt: data.updatedAt,
    },
    include: { field: true },
  })
}

export async function clearMilestoneCustomFieldValue(
  tenantId: string,
  milestoneId: string,
  fieldId: string
) {
  await prisma.milestoneCustomFieldValue.deleteMany({
    where: { tenantId, milestoneId, fieldId },
  })
}
