import { describe, expect, it } from 'vitest'

import { normalizeHeader, parseCsv, rowToRecord } from '../mappers/csv.js'

describe('parseCsv', () => {
  it('parses headers and rows', () => {
    const table = parseCsv('title,status\nShip it,done\n')
    expect(table.headers).toEqual(['title', 'status'])
    expect(table.rows).toEqual([['Ship it', 'done']])
  })

  it('handles quoted commas and escaped quotes', () => {
    const table = parseCsv('title,note\n"Ship, it","say ""hi"""\n')
    expect(table.rows).toEqual([['Ship, it', 'say "hi"']])
  })

  it('handles embedded newlines in quoted fields', () => {
    const table = parseCsv('title,note\n"one","line one\nline two"\n')
    expect(table.rows).toEqual([['one', 'line one\nline two']])
  })

  it('handles crlf line endings', () => {
    const table = parseCsv('a,b\r\n1,2\r\n')
    expect(table.rows).toEqual([['1', '2']])
  })

  it('skips blank lines', () => {
    const table = parseCsv('a,b\n\n1,2\n\n')
    expect(table.rows).toEqual([['1', '2']])
  })

  it('pads short rows with empty strings', () => {
    const table = parseCsv('a,b,c\n1,2\n')
    expect(table.rows).toEqual([['1', '2', '']])
  })

  it('returns empty tables for empty input', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [] })
  })

  it('throws on unclosed quotes', () => {
    expect(() => parseCsv('a\n"unclosed')).toThrow()
  })
})

describe('normalizeHeader', () => {
  it('lowercases and strips separators', () => {
    expect(normalizeHeader(' Due Date ')).toBe('duedate')
    expect(normalizeHeader('Issue-Key')).toBe('issuekey')
    expect(normalizeHeader('assignee_email')).toBe('assigneeemail')
  })
})

describe('rowToRecord', () => {
  it('maps headers to cells', () => {
    expect(rowToRecord(['Title', 'Status'], ['Ship', 'done'])).toEqual({
      title: 'Ship',
      status: 'done',
    })
  })
})
