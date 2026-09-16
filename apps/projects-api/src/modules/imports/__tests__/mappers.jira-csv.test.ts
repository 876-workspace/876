import { describe, expect, it } from 'vitest'

import { mapJiraCsv } from '../mappers/jira-csv.js'

const FIXTURE = [
  'Summary,Description,Issue key,Issue Type,Status,Priority,Assignee,Due date,Labels,Project key',
  '"Ship it","Big launch",CONSOLE-12,Story,In Progress,High,ada,2024-02-01,"launch,q3",CONSOLE',
].join('\n')

describe('mapJiraCsv', () => {
  it('maps a jira export row', () => {
    const result = mapJiraCsv(`${FIXTURE}\n`)
    expect(result.rowErrors).toEqual([])
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({
        title: 'Ship it',
        description: 'Big launch',
        status: 'in-progress',
        priority: 'high',
        typeKey: 'story',
        projectKey: 'CONSOLE',
        externalRef: 'CONSOLE-12',
        labels: ['launch', 'q3'],
      }),
    })
  })

  it('requires summary', () => {
    const result = mapJiraCsv('Summary,Status\n,Done\n')
    expect(result.rowErrors).toEqual([
      { rowIndex: 0, message: 'Summary is required.' },
    ])
  })

  it('normalizes hyphenated jira headers', () => {
    const result = mapJiraCsv('Summary,Issue-Key,Due-Date\nShip,CONSOLE-1,2024-01-01\n')
    expect(result.rowErrors).toEqual([])
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({ externalRef: 'CONSOLE-1' }),
    })
  })

  it('reports custom jira columns as unmapped', () => {
    const result = mapJiraCsv('Summary,Sprint,Story Points\nShip,S12,3\n')
    expect(result.unmappedFields).toEqual(['Sprint', 'Story Points'])
  })

  it('notes dropped priorities', () => {
    const result = mapJiraCsv('Summary,Priority\nShip,Cosmic\n')
    expect(result.notes.join('\n')).toContain('Cosmic')
  })

  it('keeps the external-ref note', () => {
    const result = mapJiraCsv('Summary\nShip\n')
    expect(result.notes.join('\n')).toContain('externalRef')
  })
})
