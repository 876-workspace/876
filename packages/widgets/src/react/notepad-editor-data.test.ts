import { describe, expect, it } from 'vitest'

import { getNotePlainText, parseNoteBody } from './notepad-editor-data'

describe('parseNoteBody legacy checklist migration', () => {
  it('rewrites a standalone checklist block to the list checklist shape', () => {
    const body = JSON.stringify({
      blocks: [
        {
          type: 'checklist',
          data: {
            items: [
              { text: 'Ship it', checked: true },
              { text: 'Tell the team', checked: false },
            ],
          },
        },
      ],
    })

    const result = parseNoteBody(body)

    expect(result.blocks).toHaveLength(1)
    expect(result.blocks[0]).toEqual({
      type: 'list',
      data: {
        style: 'checklist',
        items: [
          { content: 'Ship it', meta: { checked: true }, items: [] },
          { content: 'Tell the team', meta: { checked: false }, items: [] },
        ],
      },
    })
  })

  it('treats a missing checked flag as unchecked and missing text as empty', () => {
    const body = JSON.stringify({
      blocks: [{ type: 'checklist', data: { items: [{}] } }],
    })

    const result = parseNoteBody(body)

    expect(result.blocks[0].data).toEqual({
      style: 'checklist',
      items: [{ content: '', meta: { checked: false }, items: [] }],
    })
  })

  it('leaves non-checklist blocks untouched', () => {
    const paragraph = { type: 'paragraph', data: { text: 'Hello' } }
    const body = JSON.stringify({ blocks: [paragraph] })

    const result = parseNoteBody(body)

    expect(result.blocks[0]).toEqual(paragraph)
  })

  it('still extracts plain text from a migrated legacy checklist for search', () => {
    const body = JSON.stringify({
      blocks: [
        {
          type: 'checklist',
          data: { items: [{ text: 'Buy milk', checked: false }] },
        },
      ],
    })

    expect(getNotePlainText(body)).toBe('Buy milk')
  })
})
