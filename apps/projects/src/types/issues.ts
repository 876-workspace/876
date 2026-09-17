import type { IssueBoardGroupBy } from '@876/projects-ui/issue-board'
import type {
  IssueDependencyType,
  IssueRelationType,
  ListIssuesQuery,
  MyWork,
  Result,
} from '@876/projects/contracts'

export type IssueGroupBy = 'none' | IssueBoardGroupBy

export type IssueSearchParams = {
  q?: string
  project?: string
  status?: string
  priority?: string
  assignee?: string
  label?: string
  order?: string
  group?: string
}

export type ParsedIssueFilters = {
  query: ListIssuesQuery
  values: IssueSearchParams
  groupBy: IssueGroupBy
}

export type WorkItemOption = {
  id: string
  identifier: string
  title: string
}

export type RelationLink = {
  id: string
  type: IssueRelationType
  direction: 'outgoing' | 'incoming'
  item: WorkItemOption
}

export type DependencyLink = {
  id: string
  role: 'predecessor' | 'successor'
  type: IssueDependencyType
  lagMinutes: number
  item: WorkItemOption
}

export type MyWorkResult = Result<MyWork>
