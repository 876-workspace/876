import type {
  CustomModule as ServiceCustomModule,
  CustomModuleStatus as ServiceCustomModuleStatus,
  CustomRecord as ServiceCustomRecord,
} from '@876/projects'
import type {
  CustomModule as UiCustomModule,
  CustomModuleRecord as UiCustomModuleRecord,
  CustomModuleStatus as UiCustomModuleStatus,
} from '@876/projects-ui/custom-modules/types'

export type CustomModuleCounts = {
  fieldCount: number
  recordCount: number
}

export function toUiCustomModule(
  module: ServiceCustomModule,
  counts: CustomModuleCounts
): UiCustomModule {
  return {
    object: 'projects.custom-module',
    id: module.id,
    key: module.key,
    scope: module.scope,
    projectId: module.projectId,
    singularName: module.singularName,
    pluralName: module.pluralName,
    icon: module.icon ?? '',
    version: module.version,
    fieldCount: counts.fieldCount,
    recordCount: counts.recordCount,
    updatedAt: module.updatedAt,
  }
}

export function toUiCustomModuleStatus(
  status: ServiceCustomModuleStatus
): UiCustomModuleStatus {
  return {
    key: status.key,
    label: status.label,
    category: status.category,
    position: status.position,
  }
}

export function toUiCustomModuleRecord(
  record: ServiceCustomRecord
): UiCustomModuleRecord {
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
