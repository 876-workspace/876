import { describe, expect, it } from 'vitest'

import { mapJiraJson } from '../mappers/jira-json.js'

function issue(overrides = {}) {
  return {
    key: 'CONSOLE-12',
    id: '10012',
    fields: {
      summary: 'Ship it',
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Big launch' }],
          },
        ],
      },
      issuetype: { name: 'Story' },
      status: { name: 'In Progress' },
      priority: { name: 'High' },
      duedate: '2024-02-01',
      labels: ['launch', 'q3'],
      project: { key: 'CONSOLE' },
      ...overrides,
    },
  }
}

describe('mapJiraJson', () => {
  it('maps a rest issue with adf description', () => {
    const result = mapJiraJson(JSON.stringify({ issues: [issue()] }))
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
      }),
    })
  })

  it('accepts a bare array and a single issue', () => {
    expect(mapJiraJson(JSON.stringify([issue()])).bundle.rows).toHaveLength(1)
    expect(mapJiraJson(JSON.stringify(issue())).bundle.rows).toHaveLength(1)
  })

  it('handles plain-text descriptions', () => {
    const result = mapJiraJson(
      JSON.stringify([issue({ description: 'plain text' })])
    )
    expect(result.bundle.rows[0]).toEqual({
      kind: 'work-item',
      workItem: expect.objectContaining({ description: 'plain text' }),
    })
  })

  it('requires summary', () => {
    const result = mapJiraJson(JSON.stringify([issue({ summary: '' })]))
    expect(result.rowErrors).toEqual([
      { rowIndex: 0, message: 'fields.summary is required.' },
    ])
  })

  it('reports unknown field paths as unmapped', () => {
    const result = mapJiraJson(
      JSON.stringify([issue({ customfield_10001: 'x' })])
    )
    expect(result.unmappedFields).toContain('fields.customfield_10001')
  })

  it('rejects invalid json', () => {
    const result = mapJiraJson('{nope')
    expect(result.rowErrors).toEqual([
      { rowIndex: 0, message: 'Payload is not valid JSON.' },
    ])
  })

  it('rejects non-object entries', () => {
    const result = mapJiraJson(JSON.stringify(['nope']))
    expect(result.rowErrors).toEqual([
      { rowIndex: 0, message: 'Issue entry is not an object.' },
    ])
  })
})
