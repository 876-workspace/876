import { getError, type ProjectsError } from '../../http/errors.js'
import {
  toLayoutValue,
  type LayoutValues,
} from '../../../../../packages/projects/src/layout-rules.js'
import * as finance from '../finance/index.js'
import * as issues from '../issues/index.js'
import * as time from '../time/index.js'
import * as workStructure from '../work-structure/index.js'
import type {
  AutomationSubjectType,
  AutomationTrigger,
} from './automation.schemas.js'

export type SubjectSnapshot = {
  subjectType: AutomationSubjectType
  subjectId: string
  projectId: string | null
  values: LayoutValues
}

function scalar(value: unknown): string | null {
  const normalized = toLayoutValue(value)
  if (normalized === null || normalized === undefined) return null
  return Array.isArray(normalized) ? normalized[0] ?? null : normalized
}

export function triggerSubjectType(
  trigger: AutomationTrigger
): AutomationSubjectType {
  switch (trigger) {
    case 'phase.completed':
      return 'phase'
    case 'time-entry.submitted':
      return 'time-entry'
    case 'budget.threshold-reached':
      return 'budget'
    default:
      return 'work-item'
  }
}

export async function buildSubjectSnapshot(
  organizationId: string,
  subjectType: AutomationSubjectType,
  subjectId: string,
  projectIdOrKey?: string
): Promise<
  | { snapshot: SubjectSnapshot; error: null }
  | { snapshot: null; error: ProjectsError }
> {
  switch (subjectType) {
    case 'work-item': {
      const result = await issues.retrieve(organizationId, subjectId)
      if (result.error || !result.data)
        return {
          snapshot: null,
          error: result.error ?? getError('projects/automation-subject-not-found'),
        }
      const issue = result.data
      return {
        snapshot: {
          subjectType,
          subjectId: issue.id,
          projectId: issue.projectId,
          values: {
            title: scalar(issue.title),
            description: scalar(issue.description),
            state: scalar(issue.status),
            priority: scalar(issue.priority),
            assignee: scalar(issue.assigneeUserId),
            dueDate: scalar(issue.dueDate),
            startDate: scalar(issue.plannedStartDate),
            estimate: scalar(issue.estimate),
            labels: issue.labels.map((label) => label.id),
            phase: scalar(issue.milestone?.id ?? null),
            taskList: scalar(issue.taskListId),
          },
        },
        error: null,
      }
    }
    case 'phase': {
      const result = await workStructure.retrieveMilestone(
        organizationId,
        subjectId
      )
      if (result.error || !result.data)
        return {
          snapshot: null,
          error: result.error ?? getError('projects/automation-subject-not-found'),
        }
      const milestone = result.data
      return {
        snapshot: {
          subjectType,
          subjectId: milestone.id,
          projectId: milestone.projectId,
          values: {
            title: scalar(milestone.name),
            description: scalar(milestone.description),
            state: scalar(milestone.status),
            assignee: scalar(milestone.ownerUserId),
            startDate: scalar(milestone.startDate),
            dueDate: scalar(milestone.targetDate),
          },
        },
        error: null,
      }
    }
    case 'time-entry': {
      const result = await time.retrieveTimeEntry(organizationId, subjectId)
      if (result.error || !result.data)
        return {
          snapshot: null,
          error: result.error ?? getError('projects/automation-subject-not-found'),
        }
      const entry = result.data
      return {
        snapshot: {
          subjectType,
          subjectId: entry.id,
          projectId: entry.projectId,
          values: {
            userId: scalar(entry.userId),
            project: scalar(entry.projectId),
            issue: scalar(entry.issueId),
            billable: scalar(entry.billable),
            approvalStatus: scalar(entry.approvalStatus),
            durationMinutes: scalar(entry.durationMinutes),
          },
        },
        error: null,
      }
    }
    case 'budget': {
      if (!projectIdOrKey)
        return {
          snapshot: null,
          error: getError('projects/invalid-request', {
            param: 'projectId',
            description: 'Budget subjects require a project scope.',
          }),
        }
      const result = await finance.retrieveBudget(
        organizationId,
        projectIdOrKey,
        subjectId
      )
      if (result.error || !result.data)
        return {
          snapshot: null,
          error: result.error ?? getError('projects/automation-subject-not-found'),
        }
      const budget = result.data
      return {
        snapshot: {
          subjectType,
          subjectId: budget.id,
          projectId: budget.projectId,
          values: {
            scope: scalar(budget.scope),
            threshold: scalar(budget.thresholdPercent),
            project: scalar(budget.projectId),
          },
        },
        error: null,
      }
    }
  }
}
