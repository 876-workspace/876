import { prisma } from '../../db/index.js'

export type CustomModuleTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>

export type ListRecordsOptions = {
  moduleId: string
  status?: string
  projectId?: string
  q?: string
  limit: number
  startingAfter?: string
  endingBefore?: string
}

export async function transaction<T>(
  fn: (client: CustomModuleTransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => fn(tx as CustomModuleTransactionClient))
}

export async function listModules(tenantId: string) {
  return prisma.customModule.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

export async function retrieveModule(tenantId: string, moduleId: string) {
  return prisma.customModule.findFirst({ where: { tenantId, id: moduleId, deletedAt: null } })
}

export async function retrieveModuleByKey(tenantId: string, key: string) {
  return prisma.customModule.findFirst({ where: { tenantId, key, deletedAt: null } })
}

export async function createModule(data: Parameters<typeof prisma.customModule.create>[0]['data']) {
  return prisma.customModule.create({ data })
}

export async function updateModule(id: string, data: Parameters<typeof prisma.customModule.update>[0]['data']) {
  return prisma.customModule.update({ where: { id }, data })
}

export async function listModuleFields(moduleId: string) {
  return prisma.customModuleField.findMany({
    where: { moduleId },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  })
}

export async function retrieveModuleField(moduleId: string, fieldId: string) {
  return prisma.customModuleField.findFirst({ where: { moduleId, id: fieldId } })
}

export async function retrieveModuleFieldByKey(moduleId: string, key: string) {
  return prisma.customModuleField.findFirst({ where: { moduleId, key } })
}

export async function createModuleField(
  data: Parameters<typeof prisma.customModuleField.create>[0]['data']
) {
  return prisma.customModuleField.create({ data })
}

export async function updateModuleField(
  id: string,
  data: Parameters<typeof prisma.customModuleField.update>[0]['data']
) {
  return prisma.customModuleField.update({ where: { id }, data })
}

export async function deleteModuleField(id: string) {
  return prisma.customModuleField.delete({ where: { id } })
}

export async function listModuleStatuses(moduleId: string) {
  return prisma.customModuleStatus.findMany({
    where: { moduleId },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  })
}

export async function retrieveModuleStatus(moduleId: string, statusId: string) {
  return prisma.customModuleStatus.findFirst({ where: { moduleId, id: statusId } })
}

export async function retrieveModuleStatusByKey(moduleId: string, key: string) {
  return prisma.customModuleStatus.findFirst({ where: { moduleId, key } })
}

export async function createModuleStatus(
  data: Parameters<typeof prisma.customModuleStatus.create>[0]['data']
) {
  return prisma.customModuleStatus.create({ data })
}

export async function updateModuleStatus(
  id: string,
  data: Parameters<typeof prisma.customModuleStatus.update>[0]['data']
) {
  return prisma.customModuleStatus.update({ where: { id }, data })
}

export async function updateManyModuleStatuses(
  moduleId: string,
  updates: Array<{ id: string; position: number; isDefault?: boolean }>
) {
  for (const update of updates) {
    await prisma.customModuleStatus.update({
      where: { id: update.id, moduleId } as never,
      data: {
        position: update.position,
        ...(update.isDefault !== undefined ? { isDefault: update.isDefault } : {}),
      },
    })
  }
}

export async function deleteModuleStatus(id: string) {
  return prisma.customModuleStatus.delete({ where: { id } })
}

export async function countRecordsByStatus(moduleId: string, statusKey: string) {
  return prisma.customModuleRecord.count({ where: { moduleId, statusKey, deletedAt: null } })
}

function buildRecordWhere(tenantId: string, options: Omit<ListRecordsOptions, 'limit' | 'startingAfter' | 'endingBefore'>) {
  const where: Record<string, unknown> = { tenantId, moduleId: options.moduleId, deletedAt: null }
  if (options.status) where.statusKey = options.status
  if (options.projectId) where.projectId = options.projectId
  if (options.q) where.title = { contains: options.q, mode: 'insensitive' }
  return where
}

export async function listRecords(tenantId: string, options: ListRecordsOptions) {
  const where = buildRecordWhere(tenantId, options)
  const cursorId = options.startingAfter ?? options.endingBefore
  return prisma.customModuleRecord.findMany({
    where,
    cursor: cursorId ? { id: cursorId } : undefined,
    skip: cursorId ? 1 : 0,
    take: options.endingBefore ? -(options.limit + 1) : options.limit + 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}

export async function countRecords(tenantId: string, options: Omit<ListRecordsOptions, 'limit' | 'startingAfter' | 'endingBefore'>) {
  return prisma.customModuleRecord.count({ where: buildRecordWhere(tenantId, options) })
}

export async function retrieveRecord(tenantId: string, moduleId: string, recordId: string) {
  return prisma.customModuleRecord.findFirst({
    where: { tenantId, moduleId, id: recordId, deletedAt: null },
  })
}

export async function retrieveRecordById(tenantId: string, recordId: string) {
  return prisma.customModuleRecord.findFirst({ where: { tenantId, id: recordId, deletedAt: null } })
}

export async function listRecordValues(recordIds: string[]) {
  if (recordIds.length === 0) return []
  return prisma.customModuleRecordValue.findMany({
    where: { recordId: { in: recordIds } },
    include: { field: true },
  })
}

export async function listRecordsForReport(tenantId: string, moduleId: string) {
  return prisma.customModuleRecord.findMany({
    where: { tenantId, moduleId, deletedAt: null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

export async function listLinksForSource(sourceRecordId: string) {
  return prisma.customModuleLink.findMany({
    where: { sourceRecordId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

export async function retrieveLink(sourceRecordId: string, linkId: string) {
  return prisma.customModuleLink.findFirst({ where: { sourceRecordId, id: linkId } })
}

export async function findLink(sourceRecordId: string, targetType: string, targetId: string, relation: string) {
  return prisma.customModuleLink.findFirst({ where: { sourceRecordId, targetType, targetId, relation } })
}

export async function listWidgets(tenantId: string, options: { moduleId?: string; userId?: string }) {
  return prisma.dashboardWidget.findMany({
    where: {
      tenantId,
      ...(options.moduleId ? { moduleId: options.moduleId } : {}),
      ...(options.userId ? { userId: options.userId } : {}),
    },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  })
}

export async function retrieveWidget(tenantId: string, widgetId: string) {
  return prisma.dashboardWidget.findFirst({ where: { tenantId, id: widgetId } })
}
