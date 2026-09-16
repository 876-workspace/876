import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'
import { readCustomFieldValue } from '../custom-fields/field-values.js'

type Timestamp = bigint | number

export type CustomModuleRow = {
  id: string
  tenantId: string
  scope: string
  projectId: string | null
  key: string
  singularName: string
  pluralName: string
  icon: string | null
  version: number
  restrictedToRoleKeys: string[]
  deletedAt: Timestamp | null
  deletedBy: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CustomModuleFieldRow = {
  id: string
  tenantId: string
  moduleId: string
  key: string
  label: string
  fieldType: string
  options: unknown
  required: boolean
  position: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CustomModuleStatusRow = {
  id: string
  tenantId: string
  moduleId: string
  key: string
  label: string
  category: string
  position: number
  isDefault: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CustomModuleRecordRow = {
  id: string
  tenantId: string
  moduleId: string
  projectId: string | null
  title: string
  statusKey: string
  createdBy: string | null
  updatedBy: string | null
  deletedAt: Timestamp | null
  deletedBy: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CustomModuleRecordValueRow = {
  id: string
  tenantId: string
  recordId: string
  fieldId: string
  stringValue: string | null
  integerValue: number | null
  decimalValue: { toString(): string } | null
  booleanValue: boolean | null
  dateValue: Timestamp | null
  selectKey: string | null
  selectKeys: string[]
  updatedBy: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
  field?: { key: string; fieldType: string }
}

export type CustomModuleLinkRow = {
  id: string
  tenantId: string
  sourceRecordId: string
  targetType: string
  targetId: string
  relation: string
  createdBy: string | null
  createdAt: Timestamp
}

export type DashboardWidgetRow = {
  id: string
  tenantId: string
  userId: string | null
  kind: string
  moduleId: string
  config: unknown
  position: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type SerializedCustomModule = {
  object: 'projects.custom-module'
  id: string
  scope: string
  projectId: string | null
  key: string
  singularName: string
  pluralName: string
  icon: string | null
  version: number
  restrictedToRoleKeys: string[]
  createdAt: number
  updatedAt: number
}

export type SerializedCustomModuleTombstone = {
  object: 'projects.custom-module'
  id: string
  deleted: true
}

export type SerializedModuleField = {
  object: 'projects.custom-module-field'
  id: string
  moduleId: string
  key: string
  label: string
  fieldType: string
  options: unknown
  required: boolean
  position: number
  createdAt: number
  updatedAt: number
}

export type SerializedModuleStatus = {
  object: 'projects.custom-module-status'
  id: string
  moduleId: string
  key: string
  label: string
  category: string
  position: number
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

export type SerializedCustomRecord = {
  object: 'projects.custom-record'
  id: string
  moduleId: string
  moduleKey: string
  projectId: string | null
  title: string
  statusKey: string
  fields: Record<string, string | number | boolean | string[] | null>
  createdBy: string | null
  updatedBy: string | null
  createdAt: number
  updatedAt: number
}

export type SerializedCustomRecordTombstone = {
  object: 'projects.custom-record'
  id: string
  deleted: true
}

export type SerializedModuleLink = {
  object: 'projects.custom-module-link'
  id: string
  sourceRecordId: string
  targetType: string
  targetId: string
  relation: string
  createdBy: string | null
  createdAt: number
}

export type SerializedModuleLinkTombstone = {
  object: 'projects.custom-module-link'
  id: string
  deleted: true
}

export type SerializedDashboardWidget = {
  object: 'projects.dashboard-widget'
  id: string
  userId: string | null
  kind: string
  moduleId: string
  config: unknown
  position: number
  createdAt: number
  updatedAt: number
}

export type SerializedDashboardWidgetTombstone = {
  object: 'projects.dashboard-widget'
  id: string
  deleted: true
}

export type ModuleCountRow = { key: string; label: string; count: number }

export type StatusReport = {
  object: 'projects.custom-module-status-report'
  moduleId: string
  moduleKey: string
  total: number
  byStatus: ModuleCountRow[]
}

export type FieldReport = {
  object: 'projects.custom-module-field-report'
  moduleId: string
  moduleKey: string
  fieldKey: string
  total: number
  byValue: ModuleCountRow[]
}

export type CreatedPerDayRow = { day: string; count: number }

export type CreatedReport = {
  object: 'projects.custom-module-created-report'
  moduleId: string
  moduleKey: string
  from: number
  to: number
  total: number
  perDay: CreatedPerDayRow[]
}

export function serializeCustomModule(row: CustomModuleRow): SerializedCustomModule {
  return {
    object: 'projects.custom-module',
    id: row.id,
    scope: row.scope,
    projectId: row.projectId,
    key: row.key,
    singularName: row.singularName,
    pluralName: row.pluralName,
    icon: row.icon,
    version: row.version,
    restrictedToRoleKeys: row.restrictedToRoleKeys,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeModuleField(row: CustomModuleFieldRow): SerializedModuleField {
  return {
    object: 'projects.custom-module-field',
    id: row.id,
    moduleId: row.moduleId,
    key: row.key,
    label: row.label,
    fieldType: row.fieldType,
    options: row.options,
    required: row.required,
    position: row.position,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeModuleStatus(row: CustomModuleStatusRow): SerializedModuleStatus {
  return {
    object: 'projects.custom-module-status',
    id: row.id,
    moduleId: row.moduleId,
    key: row.key,
    label: row.label,
    category: row.category,
    position: row.position,
    isDefault: row.isDefault,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeCustomRecord(
  row: CustomModuleRecordRow,
  moduleKey: string,
  values: CustomModuleRecordValueRow[]
): SerializedCustomRecord {
  const fields: Record<string, string | number | boolean | string[] | null> = {}
  for (const value of values) {
    const key = value.field?.key
    if (!key) continue
    fields[key] = readCustomFieldValue({
      stringValue: value.stringValue,
      integerValue: value.integerValue,
      decimalValue: value.decimalValue,
      booleanValue: value.booleanValue,
      dateValue: value.dateValue,
      selectKey: value.selectKey,
      selectKeys: value.selectKeys,
      field: { fieldType: value.field?.fieldType ?? 'text' },
    })
  }
  return {
    object: 'projects.custom-record',
    id: row.id,
    moduleId: row.moduleId,
    moduleKey,
    projectId: row.projectId,
    title: row.title,
    statusKey: row.statusKey,
    fields,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeModuleLink(row: CustomModuleLinkRow): SerializedModuleLink {
  return {
    object: 'projects.custom-module-link',
    id: row.id,
    sourceRecordId: row.sourceRecordId,
    targetType: row.targetType,
    targetId: row.targetId,
    relation: row.relation,
    createdBy: row.createdBy,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}

export function serializeDashboardWidget(row: DashboardWidgetRow): SerializedDashboardWidget {
  return {
    object: 'projects.dashboard-widget',
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    moduleId: row.moduleId,
    config: row.config,
    position: row.position,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function dayKeyForUnixSeconds(value: number): string {
  const date = new Date(value * 1000)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createdPerDay(createdAt: number[], from: number, to: number): CreatedPerDayRow[] {
  const counts = new Map<string, number>()
  for (const value of createdAt) {
    if (value < from || value > to) continue
    const day = dayKeyForUnixSeconds(value)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((left, right) => left.day.localeCompare(right.day))
}

export { nullableFromDbUnixSeconds }
