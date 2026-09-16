import { prisma } from '../../db/index.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import type { WorkStructurePreset } from './presets.js'

export type WorkStructureTransaction = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>

function db(transaction?: WorkStructureTransaction) {
  return transaction ?? prisma
}

export async function listWorkItemTypes(tenantId: string) {
  return prisma.workItemType.findMany({
    where: { tenantId, archivedAt: null },
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
  })
}

export async function retrieveWorkItemType(tenantId: string, id: string) {
  return prisma.workItemType.findFirst({
    where: { tenantId, id, archivedAt: null },
  })
}

export async function retrieveWorkItemTypeByKey(tenantId: string, key: string) {
  return prisma.workItemType.findFirst({
    where: { tenantId, key, archivedAt: null },
  })
}

export async function retrieveDefaultWorkItemType(tenantId: string) {
  return prisma.workItemType.findFirst({
    where: { tenantId, archivedAt: null, isDefault: true },
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
  })
}

export async function createWorkItemType(
  data: Parameters<typeof prisma.workItemType.create>[0]['data']
) {
  return prisma.workItemType.create({ data })
}

export async function createDefaultWorkItemType(
  tenantId: string,
  data: Parameters<typeof prisma.workItemType.create>[0]['data'],
  updatedAt: bigint
) {
  return prisma.$transaction(async (tx) => {
    await tx.workItemType.updateMany({
      where: { tenantId, archivedAt: null },
      data: { isDefault: false, updatedAt },
    })
    return tx.workItemType.create({ data: { ...data, isDefault: true } })
  })
}

export async function updateWorkItemType(
  tenantId: string,
  id: string,
  data: Parameters<typeof prisma.workItemType.update>[0]['data']
) {
  return prisma.workItemType.update({ where: { id }, data })
}

export async function updateDefaultWorkItemType(
  tenantId: string,
  id: string,
  data: Parameters<typeof prisma.workItemType.update>[0]['data'],
  updatedAt: bigint
) {
  return prisma.$transaction(async (tx) => {
    await tx.workItemType.updateMany({
      where: { tenantId, archivedAt: null },
      data: { isDefault: false, updatedAt },
    })
    return tx.workItemType.update({
      where: { id },
      data: { ...data, isDefault: true, updatedAt },
    })
  })
}

export async function archiveWorkItemType(
  tenantId: string,
  id: string,
  archivedAt: bigint
) {
  return prisma.workItemType.update({
    where: { id },
    data: { archivedAt, updatedAt: archivedAt },
  })
}

export async function countIssuesForWorkItemType(tenantId: string, id: string) {
  return prisma.issue.count({
    where: { tenantId, workItemTypeId: id, deletedAt: null },
  })
}

export async function listWorkflowStates(tenantId: string) {
  return prisma.workflowState.findMany({
    where: { tenantId, archivedAt: null },
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
  })
}

export async function retrieveWorkflowState(tenantId: string, id: string) {
  return prisma.workflowState.findFirst({
    where: { tenantId, id, archivedAt: null },
  })
}

export async function retrieveWorkflowStateByKey(
  tenantId: string,
  key: string
) {
  return prisma.workflowState.findFirst({
    where: { tenantId, key, archivedAt: null },
  })
}

export async function retrieveDefaultWorkflowState(tenantId: string) {
  return prisma.workflowState.findFirst({
    where: { tenantId, archivedAt: null, isDefault: true },
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
  })
}

export async function createWorkflowState(
  data: Parameters<typeof prisma.workflowState.create>[0]['data']
) {
  return prisma.workflowState.create({ data })
}

export async function createDefaultWorkflowState(
  tenantId: string,
  data: Parameters<typeof prisma.workflowState.create>[0]['data'],
  updatedAt: bigint
) {
  return prisma.$transaction(async (tx) => {
    await tx.workflowState.updateMany({
      where: { tenantId, archivedAt: null },
      data: { isDefault: false, updatedAt },
    })
    return tx.workflowState.create({ data: { ...data, isDefault: true } })
  })
}

export async function updateWorkflowState(
  tenantId: string,
  id: string,
  data: Parameters<typeof prisma.workflowState.update>[0]['data']
) {
  return prisma.workflowState.update({ where: { id }, data })
}

export async function updateDefaultWorkflowState(
  tenantId: string,
  id: string,
  data: Parameters<typeof prisma.workflowState.update>[0]['data'],
  updatedAt: bigint
) {
  return prisma.$transaction(async (tx) => {
    await tx.workflowState.updateMany({
      where: { tenantId, archivedAt: null },
      data: { isDefault: false, updatedAt },
    })
    return tx.workflowState.update({
      where: { id },
      data: { ...data, isDefault: true, updatedAt },
    })
  })
}

export async function archiveWorkflowState(
  tenantId: string,
  id: string,
  archivedAt: bigint
) {
  return prisma.workflowState.update({
    where: { id },
    data: { archivedAt, updatedAt: archivedAt },
  })
}

export async function countActiveWorkflowStates(tenantId: string) {
  return prisma.workflowState.count({ where: { tenantId, archivedAt: null } })
}

export async function countIssuesForWorkflowState(
  tenantId: string,
  id: string
) {
  return prisma.issue.count({
    where: { tenantId, workflowStateId: id, deletedAt: null },
  })
}

export async function listMilestones(
  tenantId: string,
  projectId: string,
  status?: string
) {
  return prisma.milestone.findMany({
    where: {
      tenantId,
      projectId,
      deletedAt: null,
      ...(status ? { status } : {}),
    },
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
  })
}

export async function retrieveMilestone(tenantId: string, id: string) {
  return prisma.milestone.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
}

export async function retrieveMilestoneByKey(
  tenantId: string,
  projectId: string,
  key: string
) {
  return prisma.milestone.findFirst({
    where: { tenantId, projectId, key, deletedAt: null },
  })
}

export async function createMilestone(
  data: Parameters<typeof prisma.milestone.create>[0]['data']
) {
  return prisma.milestone.create({ data })
}

export async function updateMilestone(
  tenantId: string,
  id: string,
  data: Parameters<typeof prisma.milestone.update>[0]['data']
) {
  return prisma.milestone.update({ where: { id }, data })
}

export type MilestoneTransaction = {
  client: WorkStructureTransaction
  updateMilestone: (
    id: string,
    data: Parameters<typeof prisma.milestone.update>[0]['data']
  ) => Promise<Awaited<ReturnType<typeof prisma.milestone.update>>>
}

export async function transaction<T>(
  callback: (tx: MilestoneTransaction) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (txPrisma) => {
    const client = txPrisma as WorkStructureTransaction
    return callback({
      client,
      updateMilestone: (id, data) =>
        txPrisma.milestone.update({ where: { id }, data }),
    })
  })
}

export async function deleteMilestone(
  tenantId: string,
  id: string,
  deletedAt: bigint
) {
  return prisma.milestone.update({
    where: { id },
    data: { deletedAt, updatedAt: deletedAt },
  })
}

export async function listCycles(tenantId: string) {
  return prisma.cycle.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { startsAt: 'desc' },
  })
}

export async function retrieveCycle(tenantId: string, id: string) {
  return prisma.cycle.findFirst({ where: { tenantId, id, deletedAt: null } })
}

export async function listCustomFields(
  tenantId: string,
  transaction?: WorkStructureTransaction
) {
  return db(transaction).customField.findMany({
    where: { tenantId, archivedAt: null },
    include: { types: true },
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
  })
}

export async function retrieveCustomField(
  tenantId: string,
  id: string,
  transaction?: WorkStructureTransaction
) {
  return db(transaction).customField.findFirst({
    where: { tenantId, id, archivedAt: null },
    include: { types: true },
  })
}

export async function retrieveCustomFieldByKey(tenantId: string, key: string) {
  return prisma.customField.findFirst({
    where: { tenantId, key, archivedAt: null },
    include: { types: true },
  })
}

export async function createCustomField(
  data: Parameters<typeof prisma.customField.create>[0]['data'],
  typeIds: string[]
) {
  return prisma.customField.create({
    data: {
      ...data,
      types: { createMany: { data: typeIds.map((typeId) => ({ typeId })) } },
    },
    include: { types: true },
  })
}

export async function updateCustomField(
  tenantId: string,
  id: string,
  data: Parameters<typeof prisma.customField.update>[0]['data'],
  typeIds?: string[]
) {
  return prisma.customField.update({
    where: { id },
    data: {
      ...data,
      ...(typeIds === undefined
        ? {}
        : {
            types: {
              deleteMany: {},
              createMany: { data: typeIds.map((typeId) => ({ typeId })) },
            },
          }),
    },
    include: { types: true },
  })
}

export async function archiveCustomField(
  tenantId: string,
  id: string,
  archivedAt: bigint
) {
  return prisma.customField.update({
    where: { id },
    data: { archivedAt, updatedAt: archivedAt },
  })
}

export async function listCustomFieldValues(
  tenantId: string,
  issueId: string,
  transaction?: WorkStructureTransaction
) {
  return db(transaction).customFieldValue.findMany({
    where: { tenantId, issueId },
    include: { field: { include: { types: true } } },
    orderBy: { field: { position: 'asc' } },
  })
}

export async function upsertCustomFieldValue(
  data: {
    id: string
    tenantId: string
    issueId: string
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
  },
  transaction?: WorkStructureTransaction
) {
  return db(transaction).customFieldValue.upsert({
    where: {
      issueId_fieldId: { issueId: data.issueId, fieldId: data.fieldId },
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
    include: { field: { include: { types: true } } },
  })
}

export async function clearCustomFieldValue(
  tenantId: string,
  issueId: string,
  fieldId: string,
  transaction?: WorkStructureTransaction
) {
  await db(transaction).customFieldValue.deleteMany({
    where: { tenantId, issueId, fieldId },
  })
}

/**
 * Maps a preset's rows into Prisma create shapes and delegates to
 * `seedMissing`. Lives in the repository (not the service) so it can be
 * reached without importing `work-structure.service.ts` — that file also
 * imports the projects and issues modules for unrelated resources, and both
 * reach the DB-connecting pool at module-eval time. `tenants.service.ts`
 * calls this directly to backfill a pre-Phase-2 tenant on `ensure()`.
 */
export async function seedPreset(
  tenantId: string,
  preset: WorkStructurePreset
) {
  const timestamp = toDbUnixSeconds(nowUnixSeconds())
  await seedMissing(tenantId, {
    workItemTypes: preset.workItemTypes.map((item) => ({
      id: generateId('workItemType'),
      tenantId,
      ...item,
      description: null,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    workflowStates: preset.workflowStates.map((item) => ({
      id: generateId('workflowState'),
      tenantId,
      ...item,
      description: null,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    customFields: preset.customFields.map((item) => ({
      id: generateId('customField'),
      tenantId,
      ...item,
      options: undefined,
      required: false,
      description: null,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  })
}

export async function seedMissing(
  tenantId: string,
  data: {
    workItemTypes: Array<
      Parameters<typeof prisma.workItemType.create>[0]['data']
    >
    workflowStates: Array<
      Parameters<typeof prisma.workflowState.create>[0]['data']
    >
    customFields: Array<Parameters<typeof prisma.customField.create>[0]['data']>
  }
) {
  await prisma.$transaction(async (tx) => {
    for (const item of data.workItemTypes) {
      await tx.workItemType.upsert({
        where: { tenantId_key: { tenantId, key: item.key } },
        create: item,
        update: {},
      })
    }
    for (const item of data.workflowStates) {
      await tx.workflowState.upsert({
        where: { tenantId_key: { tenantId, key: item.key } },
        create: item,
        update: {},
      })
    }
    for (const item of data.customFields) {
      await tx.customField.upsert({
        where: { tenantId_key: { tenantId, key: item.key } },
        create: item,
        update: {},
      })
    }
    const states = await tx.workflowState.findMany({
      where: { tenantId, archivedAt: null },
      select: { id: true, key: true },
    })
    for (const state of states) {
      await tx.issue.updateMany({
        where: { tenantId, status: state.key, workflowStateId: null },
        data: { workflowStateId: state.id },
      })
    }
    const task = await tx.workItemType.findFirst({
      where: { tenantId, key: 'task', archivedAt: null },
      select: { id: true },
    })
    if (task)
      await tx.issue.updateMany({
        where: { tenantId, typeKey: 'task', workItemTypeId: null },
        data: { workItemTypeId: task.id },
      })
  })
}
