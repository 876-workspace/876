import { describe, expect, it } from 'vitest'

import { mapAsanaCsv } from '../mappers/asana-csv.js'

describe('mapAsanaCsv', () => {
  it('maps an asana task row', () => {
    const result = mapAsanaCsv(
      'Task ID,Name,Notes,Assignee Email,Due Date,Tags,Projects\ntask_1,Ship it,Big launch,ada@example.com,2024-02-01,"launch,q3",Website\n'
    )
    expect(result.rowErrors).toEqual([])
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({
        title: 'Ship it',
        status: 'todo',
        externalRef: 'task_1',
        labels: ['launch', 'q3'],
      }),
    })
    expect(
      (result.bundle.rows[0] as { workItem: { description: string } }).workItem
        .description
    ).toContain('ada@example.com')
  })

  it('marks completed tasks done', () => {
    const result = mapAsanaCsv('Name,Completed At\nShip,2024-01-01\n')
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({ status: 'done' }),
    })
  })

  it('maps known sections to status', () => {
    const result = mapAsanaCsv('Name,Section/Column\nShip,In Progress\n')
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({ status: 'in-progress' }),
    })
  })

  it('requires names', () => {
    const result = mapAsanaCsv('Name,Notes\n,hello\n')
    expect(result.rowErrors).toEqual([
      { rowIndex: 0, message: 'Name is required.' },
    ])
  })

  it('reports custom asana columns as unmapped', () => {
    const result = mapAsanaCsv('Name,Custom Priority\nShip,P1\n')
    expect(result.unmappedFields).toEqual(['Custom Priority'])
  })

  it('documents the assignee limitation', () => {
    const result = mapAsanaCsv('Name\nShip\n')
    expect(result.notes.join('\n')).toContain('not 876 user ids')
  })
})
