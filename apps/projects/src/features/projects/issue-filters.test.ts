import { describe, expect, it } from 'vitest'

import { parseIssueFilters } from './issue-filters'

describe('parseIssueFilters', () => {
  it('trims and forwards supported server filters with a bounded limit', () => {
    const result = parseIssueFilters({
      q: '  login redirect  ',
      project: '  project_1 ',
      status: 'ready-for-qa',
      priority: 'high',
      assignee: ' user_1 ',
      label: ' label_bug ',
      order: 'priority',
      group: 'assignee',
    })

    expect(result.query).toEqual({
      q: 'login redirect',
      project: 'project_1',
      assignee: 'user_1',
      label: 'label_bug',
      status: 'ready-for-qa',
      priority: 'high',
      order: 'priority',
      limit: 100,
    })
    expect(result.groupBy).toBe('assignee')
    expect(result.values.group).toBe('assignee')
  })

  it('accepts tenant-defined workflow-state keys instead of a fixed status enum', () => {
    const result = parseIssueFilters({ status: 'ready-for-release' })

    expect(result.query.status).toBe('ready-for-release')
    expect(result.values.status).toBe('ready-for-release')
  })

  it('drops invalid enum-like values rather than forwarding them to the service', () => {
    const result = parseIssueFilters({
      status: 'Ready For QA',
      priority: 'critical',
      order: 'newest',
      group: 'team',
    })

    expect(result.query.status).toBeUndefined()
    expect(result.query.priority).toBeUndefined()
    expect(result.query.order).toBeUndefined()
    expect(result.groupBy).toBe('none')
  })

  it('uses the caller default group when the URL does not select one', () => {
    const result = parseIssueFilters({}, 'status')

    expect(result.groupBy).toBe('status')
    expect(result.values.group).toBe('status')
  })
})
