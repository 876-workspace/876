import { describe, expect, it } from 'vitest'

import {
  editorContentEqual,
  getEditorPlainText,
  isEditorContentEmpty,
  parseEditorContent,
  serializeEditorContent,
} from './data'

describe('rich-content codec', () => {
  it('lifts legacy plain text into paragraph blocks', () => {
    const result = parseEditorContent('First line\n\nSecond line')

    expect(result.blocks).toEqual([
      { type: 'paragraph', data: { text: 'First line' } },
      { type: 'paragraph', data: { text: 'Second line' } },
    ])
  })

  it('escapes legacy text before treating it as Editor.js markup', () => {
    const result = parseEditorContent('<script>alert(1)</script>')

    expect(result.blocks[0]?.data).toEqual({
      text: '&lt;script&gt;alert(1)&lt;/script&gt;',
    })
  })

  it('normalizes legacy checklist blocks to list checklist data', () => {
    const result = parseEditorContent(
      JSON.stringify({
        blocks: [
          {
            type: 'checklist',
            data: { items: [{ text: 'Ship it', checked: true }] },
          },
        ],
      })
    )

    expect(result.blocks[0]).toEqual({
      type: 'list',
      data: {
        style: 'checklist',
        items: [{ content: 'Ship it', meta: { checked: true }, items: [] }],
      },
    })
  })

  it('extracts formatted and nested list text', () => {
    const body = JSON.stringify({
      blocks: [
        { type: 'paragraph', data: { text: '<b>Hello</b> world' } },
        {
          type: 'list',
          data: {
            style: 'unordered',
            items: [
              {
                content: 'Parent',
                items: [{ content: 'Child', items: [] }],
              },
            ],
          },
        },
      ],
    })

    expect(getEditorPlainText(body)).toBe('Hello world Parent Child')
  })

  it('treats an empty serialized paragraph as empty content', () => {
    const body = serializeEditorContent({
      blocks: [{ type: 'paragraph', data: { text: '<br>' } }],
    })

    expect(isEditorContentEmpty(body)).toBe(true)
  })

  it('compares authored blocks without save metadata', () => {
    const left = JSON.stringify({
      time: 1,
      version: '2.31.6',
      blocks: [{ type: 'paragraph', data: { text: 'Same' } }],
    })
    const right = JSON.stringify({
      time: 2,
      version: 'future',
      blocks: [{ type: 'paragraph', data: { text: 'Same' } }],
    })

    expect(editorContentEqual(left, right)).toBe(true)
  })
})
