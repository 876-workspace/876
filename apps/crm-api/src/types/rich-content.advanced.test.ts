import { describe, expect, it } from 'vitest'

import { optionalRichContentSchema, richContentSchema } from './rich-content.js'

describe('richContentSchema - plain text', () => {
  it('accepts non-empty trimmed text', () => {
    expect(richContentSchema(10).parse('hello')).toBe('hello')
    expect(richContentSchema(10).parse('  hello  ')).toBe('hello')
  })

  it('rejects empty or whitespace only', () => {
    expect(() => richContentSchema(10).parse('')).toThrow()
    expect(() => richContentSchema(10).parse('   ')).toThrow()
  })

  it('enforces text length limit', () => {
    expect(() => richContentSchema(5).parse('123456')).toThrow()
    expect(richContentSchema(5).parse('12345')).toBe('12345')
  })
})

describe('richContentSchema - Editor.js JSON blocks', () => {
  it('accepts valid paragraph blocks', () => {
    const rich = JSON.stringify({
      blocks: [{ type: 'paragraph', data: { text: 'hello' } }],
    })
    expect(richContentSchema(10).parse(rich)).toBe(rich)
  })

  it('counts HTML-stripped length for blocks', () => {
    const rich = JSON.stringify({
      blocks: [{ type: 'paragraph', data: { text: '<b>hello</b>' } }],
    })
    // 'hello' is 5 chars, should pass limit 5
    expect(richContentSchema(5).parse(rich)).toBe(rich)
    // but 'hello world' is 11, exceeds 5
    const long = JSON.stringify({
      blocks: [{ type: 'paragraph', data: { text: 'hello world' } }],
    })
    expect(() => richContentSchema(5).parse(long)).toThrow()
  })

  it('handles list items counting', () => {
    const rich = JSON.stringify({
      blocks: [
        {
          type: 'list',
          data: {
            items: [
              { content: 'item one' },
              { text: 'item two' },
              { content: '<i>three</i>', items: [{ content: 'nested' }] },
            ],
          },
        },
      ],
    })
    // total = 8 + 8 + 5 + 6 = 27? roughly
    expect(richContentSchema(30).parse(rich)).toBe(rich)
    expect(() => richContentSchema(10).parse(rich)).toThrow()
  })

  it('enforces max blocks 250', () => {
    const blocks = Array.from({ length: 251 }, (_, i) => ({
      type: 'paragraph',
      data: { text: `block ${i}` },
    }))
    const rich = JSON.stringify({ blocks })
    expect(() => richContentSchema(100_000).parse(rich)).toThrow()
    const ok = JSON.stringify({ blocks: blocks.slice(0, 250) })
    expect(richContentSchema(100_000).parse(ok)).toBe(ok)
  })

  it('enforces max bytes 100_000', () => {
    const big = 'a'.repeat(100_001)
    expect(() => richContentSchema(100_001).parse(big)).toThrow()
  })

  it('treats legacy plain text that is JSON but not blocks as plain', () => {
    const notBlocks = JSON.stringify({ hello: 'world' })
    // trimmed length is notBlocks.length, which may exceed limit
    expect(richContentSchema(100).parse(notBlocks)).toBe(notBlocks)
  })

  it('handles HTML entities and br tags in length', () => {
    const rich = JSON.stringify({
      blocks: [
        { type: 'paragraph', data: { text: 'a &amp; b<br> c &nbsp; d' } },
      ],
    })
    // plainInlineLength decodes: 'a & b\n c   d' length?
    expect(richContentSchema(20).parse(rich)).toBe(rich)
  })

  it('rejects non-string input', () => {
    expect(() =>
      richContentSchema(10).parse(123 as unknown as string)
    ).toThrow()
    expect(() =>
      richContentSchema(10).parse(null as unknown as string)
    ).toThrow()
  })
})

describe('optionalRichContentSchema', () => {
  it('accepts undefined and null as optional', () => {
    expect(optionalRichContentSchema(10).parse(undefined)).toBeUndefined()
    expect(optionalRichContentSchema(10).parse(null)).toBeNull()
  })

  it('validates string when provided', () => {
    expect(optionalRichContentSchema(10).parse('hello')).toBe('hello')
    expect(optionalRichContentSchema(10).parse('')).toBe('')
    expect(optionalRichContentSchema(10).parse('   ')).toBe('')
    const rich = JSON.stringify({
      blocks: [{ type: 'paragraph', data: { text: 'hi' } }],
    })
    expect(optionalRichContentSchema(10).parse(rich)).toBe(rich)
  })

  it('applies same block limits as richContentSchema', () => {
    const rich = JSON.stringify({
      blocks: [{ type: 'paragraph', data: { text: 'hello world long text' } }],
    })
    expect(() => optionalRichContentSchema(5).parse(rich)).toThrow()
  })
})
