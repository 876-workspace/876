import { describe, expect, it } from 'vitest'

import { mapZohoCsv } from '../mappers/zoho-csv.js'

describe('mapZohoCsv', () => {
  it('maps generic task columns', () => {
    const result = mapZohoCsv(
      'Task Name,Description,Status,Priority,Owner,Due Date,Task ID\nShip it,Big launch,In Progress,High,Ada,2024-02-01,task_1\n'
    )
    expect(result.rowErrors).toEqual([])
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({
        title: 'Ship it',
        status: 'in-progress',
        priority: 'high',
        externalRef: 'task_1',
      }),
    })
    expect(
      (result.bundle.rows[0] as { workItem: { description: string } }).workItem
        .description
    ).toContain('Zoho owner: Ada')
  })

  it('requires a task name', () => {
    const result = mapZohoCsv('Task Name,Status\n,Open\n')
    expect(result.rowErrors).toEqual([
      { rowIndex: 0, message: 'Task name is required.' },
    ])
  })

  it('states the layout is unverified', () => {
    const result = mapZohoCsv('Task Name\nShip\n')
    expect(result.notes.join('\n')).toContain('unverified')
  })

  it('reports zoho-only columns as unmapped instead of guessing', () => {
    const result = mapZohoCsv('Task Name,Duration,Billing Status\nShip,5h,Billable\n')
    expect(result.unmappedFields).toEqual(['Duration', 'Billing Status'])
    expect(result.bundle.rows).toHaveLength(1)
  })

  it('accepts title aliases', () => {
    const result = mapZohoCsv('Title\nShip\n')
    expect(result.rowErrors).toEqual([])
  })

  it('handles empty input without rows', () => {
    const result = mapZohoCsv('Task Name\n')
    expect(result.bundle.rows).toEqual([])
    expect(result.rowErrors).toEqual([])
  })
})
