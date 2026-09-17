import type {
  CustomModuleField,
  CustomRecord,
  DashboardWidget,
} from '@876/projects/contracts'
import type {
  CustomModuleWidget,
  WidgetData,
} from '@876/projects-ui/custom-modules/types'
import type { Layout, LayoutEntity } from '@876/projects/contracts'

import { customModuleLayoutEntity } from './module-access'

import type {
  LayoutFieldControlKind,
  RecordFormField,
} from '@/types/custom-modules'

function controlKindFor(fieldType: string): LayoutFieldControlKind {
  switch (fieldType) {
    case 'textarea':
      return 'textarea'
    case 'number':
    case 'decimal':
      return 'number'
    case 'date':
      return 'date'
    case 'select':
      return 'select'
    case 'multi-select':
      return 'multi-select'
    case 'boolean':
      return 'boolean'
    default:
      return 'text'
  }
}

function selectOptions(
  field: CustomModuleField
): { value: string; label: string }[] {
  const options = field.options
  if (!Array.isArray(options)) return []
  return options
    .filter(
      (option): option is { key: string; label: string } =>
        typeof option === 'object' &&
        option !== null &&
        typeof (option as { key?: unknown }).key === 'string' &&
        typeof (option as { label?: unknown }).label === 'string'
    )
    .map((option) => ({ value: option.key, label: option.label }))
}

/** Module fields rendered through `LayoutRenderer`, with title first. */
export function toLayoutFieldDescriptors(
  fields: readonly CustomModuleField[]
): RecordFormField[] {
  const ordered = [...fields].sort((a, b) => a.position - b.position)
  return [
    {
      fieldKey: 'title',
      label: 'Title',
      control: { kind: 'text' },
    },
    ...ordered.map((field) => ({
      fieldKey: `cf:${field.key}`,
      label: field.label,
      control: {
        kind: controlKindFor(field.fieldType),
        ...(controlKindFor(field.fieldType) === 'select' ||
        controlKindFor(field.fieldType) === 'multi-select'
          ? { options: selectOptions(field) }
          : {}),
      },
    })),
  ]
}

/** A fallback single-section layout when no stored layout exists yet. */
export function fallbackRecordLayout(
  moduleKey: string,
  fieldKeys: readonly string[]
): Layout {
  return {
    object: 'projects.layout',
    id: null,
    entity: customModuleLayoutEntity(moduleKey) as LayoutEntity,
    workItemTypeId: null,
    name: 'Record fallback',
    version: 1,
    isDefault: false,
    builtIn: true,
    sections: [
      {
        key: 'section-1',
        title: 'Details',
        columns: 1,
        fields: fieldKeys.map((fieldKey) => ({
          fieldKey,
          width: 1 as const,
          visible: true,
        })),
      },
    ],
    rules: [],
  }
}

export function recordInitialValues(
  record: CustomRecord
): Record<string, string | string[] | null> {
  const values: Record<string, string | string[] | null> = {
    title: record.title,
  }
  for (const [key, value] of Object.entries(record.fields)) {
    if (typeof value === 'number' || typeof value === 'boolean') {
      values[`cf:${key}`] = String(value)
    } else {
      values[`cf:${key}`] = value
    }
  }
  return values
}

type FormValue = string | string[] | null | undefined

function toFieldValue(
  value: FormValue
): string | number | boolean | string[] | null {
  if (value === undefined) return null
  if (Array.isArray(value)) return value
  if (value === '') return null
  return value
}

/**
 * Splits submitted layout values into the record title plus `cf:` field
 * entries, exactly what the record routes store.
 */
export function toRecordFieldInputs(values: Record<string, FormValue>): {
  title: string
  fields: { key: string; value: string | number | boolean | string[] | null }[]
} {
  const rawTitle = values.title
  const title = Array.isArray(rawTitle) ? (rawTitle[0] ?? '') : (rawTitle ?? '')
  const fields: {
    key: string
    value: string | number | boolean | string[] | null
  }[] = []
  for (const [key, value] of Object.entries(values)) {
    if (!key.startsWith('cf:')) continue
    fields.push({ key: key.slice('cf:'.length), value: toFieldValue(value) })
  }
  return { title, fields }
}

function widgetTitle(widget: DashboardWidget, moduleName: string): string {
  const config = widget.config as { title?: unknown } | null
  const title =
    config && typeof config.title === 'string' ? config.title.trim() : ''
  if (title !== '') return title
  if (widget.kind === 'record-count') return `${moduleName} count`
  if (widget.kind === 'status-breakdown') return `${moduleName} by status`
  return `Recent ${moduleName}`
}

/** Service widgets rendered through `DashboardWidget`, with titles resolved. */
export function toWidgetViews(
  widgets: readonly DashboardWidget[],
  moduleNames: ReadonlyMap<string, string> | Record<string, string>
): CustomModuleWidget[] {
  const names =
    moduleNames instanceof Map
      ? moduleNames
      : new Map(Object.entries(moduleNames))
  return [...widgets]
    .sort((a, b) => a.position - b.position)
    .map((widget) => ({
      object: 'projects.dashboard-widget' as const,
      id: widget.id,
      kind: widget.kind,
      moduleId: widget.moduleId,
      title: widgetTitle(widget, names.get(widget.moduleId) ?? 'Records'),
      position: widget.position,
    }))
}

export function widgetDataFor(
  widget: CustomModuleWidget,
  report: {
    total: number
    byStatus: { statusKey: string; label: string; count: number }[]
    recent: {
      id: string
      title: string
      statusKey: string
      updatedAt: number
    }[]
  }
): WidgetData {
  if (widget.kind === 'record-count')
    return { kind: 'record-count', count: report.total }
  if (widget.kind === 'status-breakdown')
    return {
      kind: 'status-breakdown',
      rows: report.byStatus.map((row) => ({
        statusKey: row.statusKey,
        label: row.label,
        count: row.count,
      })),
    }
  return {
    kind: 'recent-records',
    records: report.recent,
  }
}

/** CSV download href for a module report served by the thin API routes. */
export function moduleReportCsvHref(
  moduleId: string,
  kind: 'by-status' | 'by-field' | 'created'
): string {
  return `/api/custom-modules/${encodeURIComponent(moduleId)}/reports/${kind}?format=csv`
}

type ServiceModule = {
  id: string
  key: string
  scope: 'org' | 'project'
  projectId: string | null
  singularName: string
  pluralName: string
  icon: string | null
  version: number
  updatedAt: number
}

type ServiceRecord = {
  id: string
  moduleId: string
  projectId: string | null
  title: string
  statusKey: string
  fields: Record<string, string | number | boolean | string[] | null>
  createdAt: number
  updatedAt: number
}

/** Service modules listed through `CustomModuleList` with counts resolved. */
export function toUiModule(
  module: ServiceModule,
  counts: { fieldCount: number; recordCount: number }
): {
  object: 'projects.custom-module'
  id: string
  key: string
  scope: 'org' | 'project'
  projectId: string | null
  singularName: string
  pluralName: string
  icon: string
  version: number
  fieldCount: number
  recordCount: number
  updatedAt: number
} {
  return {
    object: 'projects.custom-module',
    id: module.id,
    key: module.key,
    scope: module.scope,
    projectId: module.projectId,
    singularName: module.singularName,
    pluralName: module.pluralName,
    icon: module.icon ?? 'forms',
    version: module.version,
    fieldCount: counts.fieldCount,
    recordCount: counts.recordCount,
    updatedAt: module.updatedAt,
  }
}

/** Service records rendered through `RecordList` and `RecordSummary`. */
export function toUiRecord(record: ServiceRecord): {
  object: 'projects.custom-module-record'
  id: string
  moduleId: string
  projectId: string | null
  title: string
  statusKey: string
  values: Record<string, string | string[] | number | boolean | null>
  createdAt: number
  updatedAt: number
} {
  return {
    object: 'projects.custom-module-record',
    id: record.id,
    moduleId: record.moduleId,
    projectId: record.projectId,
    title: record.title,
    statusKey: record.statusKey,
    values: { ...record.fields },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}
