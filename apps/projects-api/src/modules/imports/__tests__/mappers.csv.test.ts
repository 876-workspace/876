import { describe, expect, it } from 'vitest'

import { mapGenericCsv } from '../mappers/csv-mapper.js'

describe('mapGenericCsv', () => {
  it('maps a work item row', () => {
    const result = mapGenericCsv(
      'title,description,status,priority,labels\nShip it,Big launch,in-progress,high,"launch, q3"\n'
    )
    expect(result.rowErrors).toEqual([])
    expect(result.bundle.rows).toHaveLength(1)
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({
        title: 'Ship it',
        description: 'Big launch',
        status: 'in-progress',
        priority: 'high',
        labels: ['launch', 'q3'],
      }),
    })
  })

  it('reports missing titles as row errors', () => {
    const result = mapGenericCsv('title,status\n,done\n')
    expect(result.bundle.rows).toHaveLength(0)
    expect(result.rowErrors).toEqual([
      { rowIndex: 0, message: 'title is required.' },
    ])
  })

  it('detects time entry rows by userId plus startedAt', () => {
    const result = mapGenericCsv(
      'title,userId,startedAt,endedAt,billable\n,usr_1,1700000000,1700003600,true\n'
    )
    expect(result.rowErrors).toEqual([])
    expect(result.bundle.rows[0]).toEqual({
      kind: 'time-entry',
      timeEntry: expect.objectContaining({
        userId: 'usr_1',
        startedAt: 1700000000,
        endedAt: 1700003600,
        billable: true,
      }),
    })
  })

  it('flags invalid time entry dates', () => {
    const result = mapGenericCsv('userId,startedAt\nusr_1,not-a-date\n')
    expect(result.rowErrors).toEqual([
      { rowIndex: 0, message: 'startedAt is not a valid date.' },
    ])
  })

  it('drops unrecognized priorities with a note', () => {
    const result = mapGenericCsv('title,priority\nShip,cosmic\n')
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({ priority: null }),
    })
    expect(result.notes.join('\n')).toContain('cosmic')
  })

  it('reports unmapped columns', () => {
    const result = mapGenericCsv('title,Sprint,Story Points\nShip,S12,3\n')
    expect(result.unmappedFields).toEqual(['Sprint', 'Story Points'])
    expect(result.bundle.rows).toHaveLength(1)
  })

  it('resolves project ids versus keys', () => {
    const result = mapGenericCsv(
      'title,project\nA,prj_123\nB,CONSOLE\n'
    )
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({ projectId: 'prj_123', projectKey: null }),
    })
    expect(result.bundle.rows[1]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({ projectId: null, projectKey: 'CONSOLE' }),
    })
  })

  it('parses iso due dates to unix seconds', () => {
    const result = mapGenericCsv('title,dueDate\nShip,2024-01-15\n')
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({
        dueDate: Math.floor(Date.parse('2024-01-15') / 1000),
      }),
    })
  })
})
