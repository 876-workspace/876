import { prisma } from '../../db/index.js'

export async function listProjectCustomFields(tenantId: string) {
  return prisma.projectCustomField.findMany({
    where: { tenantId, archivedAt: null },
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
  })
}

export async function retrieveProjectCustomField(
  tenantId: string,
  id: string
) {
  return prisma.projectCustomField.findFirst({
    where: { tenantId, id, archivedAt: null },
  })
}

export async function retrieveProjectCustomFieldByKey(
  tenantId: string,
  key: string
) {
  return prisma.projectCustomField.findFirst({
    where: { tenantId, key, archivedAt: null },
  })
}

export async function createProjectCustomField(
  data: Parameters<typeof prisma.projectCustomField.create>[0]['data']
) {
  return prisma.projectCustomField.create({ data })
}

export async function updateProjectCustomField(
  id: string,
  data: Parameters<typeof prisma.projectCustomField.update>[0]['data']
) {
  return prisma.projectCustomField.update({ where: { id }, data })
}

export async function archiveProjectCustomField(
  id: string,
  archivedAt: bigint
) {
  return prisma.projectCustomField.update({
    where: { id },
    data: { archivedAt, updatedAt: archivedAt },
  })
}

export async function listProjectCustomFieldValues(
  tenantId: string,
  projectId: string
) {
  return prisma.projectCustomFieldValue.findMany({
    where: {
      tenantId,
      projectId,
      field: { is: { archivedAt: null } },
    },
    include: { field: true },
    orderBy: { field: { position: 'asc' } },
  })
}

export async function listProjectCustomFieldValuesForProjects(
  tenantId: string,
  projectIds: string[]
) {
  if (projectIds.length === 0) return []
  return prisma.projectCustomFieldValue.findMany({
    where: {
      tenantId,
      projectId: { in: projectIds },
      field: { is: { archivedAt: null } },
    },
    include: { field: true },
    orderBy: { field: { position: 'asc' } },
  })
}

export async function upsertProjectCustomFieldValue(data: {
  id: string
  tenantId: string
  projectId: string
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
  return prisma.projectCustomFieldValue.upsert({
    where: {
      projectId_fieldId: {
        projectId: data.projectId,
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

export async function clearProjectCustomFieldValue(
  tenantId: string,
  projectId: string,
  fieldId: string
) {
  await prisma.projectCustomFieldValue.deleteMany({
    where: { tenantId, projectId, fieldId },
  })
}
