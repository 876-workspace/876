/** Canonical template contracts — plans/sep/16-projects-phase-11/plan.md §Contracts. */

type ProjectTemplate = {
  object: 'projects.project-template'
  id: string
  key: string
  name: string
  description: string | null
  currentVersion: number
  sourceProjectId: string | null
  counts: {
    phases: number
    taskLists: number
    workItems: number
    dependencies: number
  }
  createdAt: number
  updatedAt: number
}
type TemplatePreview = {
  object: 'projects.template-preview'
  startDate: number
  phases: {
    ref: string
    name: string
    start: number | null
    end: number | null
  }[]
  workItems: {
    ref: string
    title: string
    start: number | null
    due: number | null
  }[]
  missing: {
    workItemTypes: string[]
    workflowStates: string[]
    labels: string[]
  }
}

export type { ProjectTemplate, TemplatePreview }
