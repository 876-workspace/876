export type CustomModule = {
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
}

export type CustomModuleStatus = {
  key: string
  label: string
  category: 'open' | 'in-progress' | 'done'
  position: number
}

export type CustomModuleRecord = {
  object: 'projects.custom-module-record'
  id: string
  moduleId: string
  projectId: string | null
  title: string
  statusKey: string
  values: Record<string, string | string[] | number | boolean | null>
  createdAt: number
  updatedAt: number
}

export type CustomModuleWidget = {
  object: 'projects.dashboard-widget'
  id: string
  kind: 'record-count' | 'status-breakdown' | 'recent-records'
  moduleId: string
  title: string
  position: number
}

export type WidgetData =
  | { kind: 'record-count'; count: number }
  | {
      kind: 'status-breakdown'
      rows: { statusKey: string; label: string; count: number }[]
    }
  | {
      kind: 'recent-records'
      records: { id: string; title: string; statusKey: string; updatedAt: number }[]
    }
