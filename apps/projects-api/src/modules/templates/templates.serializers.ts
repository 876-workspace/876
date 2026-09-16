import { fromDbUnixSeconds } from '../../platform/timestamps.js'

type Timestamp = bigint | number

export type ProjectTemplateRow = {
  id: string
  tenantId: string
  key: string
  name: string
  description: string | null
  currentVersion: number
  definition: unknown
  sourceProjectId: string | null
  deletedAt: Timestamp | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type ProjectTemplateVersionRow = {
  id: string
  tenantId: string
  templateId: string
  version: number
  definition: unknown
  createdAt: Timestamp
}

export type TemplateCounts = {
  phases: number
  taskLists: number
  workItems: number
  dependencies: number
}

export type SerializedProjectTemplate = {
  object: 'projects.project-template'
  id: string
  key: string
  name: string
  description: string | null
  currentVersion: number
  sourceProjectId: string | null
  counts: TemplateCounts
  createdAt: number
  updatedAt: number
}

export type SerializedProjectTemplateVersion = {
  object: 'projects.project-template-version'
  id: string
  templateId: string
  version: number
  createdAt: number
}

export type SerializedProjectTemplateTombstone = {
  object: 'projects.project-template'
  id: string
  deleted: true
}

export type SerializedTemplatePreviewPhase = {
  ref: string
  name: string
  start: number | null
  end: number | null
}

export type SerializedTemplatePreviewWorkItem = {
  ref: string
  title: string
  start: number | null
  due: number | null
}

export type SerializedTemplatePreviewMissing = {
  workItemTypes: string[]
  workflowStates: string[]
  labels: string[]
}

export type SerializedTemplatePreview = {
  object: 'projects.template-preview'
  startDate: number
  phases: SerializedTemplatePreviewPhase[]
  workItems: SerializedTemplatePreviewWorkItem[]
  missing: SerializedTemplatePreviewMissing
}

function countArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

export function definitionCounts(definition: unknown): TemplateCounts {
  if (typeof definition !== 'object' || definition === null) {
    return { phases: 0, taskLists: 0, workItems: 0, dependencies: 0 }
  }
  const record = definition as Record<string, unknown>
  return {
    phases: countArray(record.phases),
    taskLists: countArray(record.taskLists),
    workItems: countArray(record.workItems),
    dependencies: countArray(record.dependencies),
  }
}

export function serializeProjectTemplate(
  row: ProjectTemplateRow,
): SerializedProjectTemplate {
  return {
    object: 'projects.project-template',
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    currentVersion: row.currentVersion,
    sourceProjectId: row.sourceProjectId,
    counts: definitionCounts(row.definition),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeProjectTemplateVersion(
  row: ProjectTemplateVersionRow,
): SerializedProjectTemplateVersion {
  return {
    object: 'projects.project-template-version',
    id: row.id,
    templateId: row.templateId,
    version: row.version,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}

export function serializeTemplatePreview(params: {
  startDate: number
  phases: SerializedTemplatePreviewPhase[]
  workItems: SerializedTemplatePreviewWorkItem[]
  missing: SerializedTemplatePreviewMissing
}): SerializedTemplatePreview {
  return {
    object: 'projects.template-preview',
    startDate: params.startDate,
    phases: params.phases,
    workItems: params.workItems,
    missing: {
      workItemTypes: [...params.missing.workItemTypes].sort(),
      workflowStates: [...params.missing.workflowStates].sort(),
      labels: [...params.missing.labels].sort(),
    },
  }
}
