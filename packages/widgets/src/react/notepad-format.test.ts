import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  emptyNoteBody,
  getNotePlainText,
  parseNoteBody,
  serializeNoteBody,
} from './notepad-editor-data'
import {
  DEFAULT_NOTE_COLOR,
  formatNoteUpdatedAt,
  getNoteCharacterCount,
  getNoteColorPalette,
  getNotePreview,
  getNoteWordCount,
  noteColorCssVars,
  NOTE_COLORS,
  resolveNoteColor,
  sortStickyNotes,
} from './notepad-format'

const SECURITY_BODIES = [
  '<script>alert(1)</script>',
  "'; DROP TABLE notes; --",
  '../../etc/passwd',
  '__proto__',
  '\u0000',
  'a'.repeat(2_000),
] as const

describe('Notepad display formatting', () => {
  describe('getNotePreview', () => {
    it('when body is Editor.js JSON with HTML markup, then strips tags for the card preview', () => {
      // Arrange
      const body = serializeNoteBody({
        blocks: [
          { type: 'paragraph', data: { text: 'Ship <b>launch</b> checklist' } },
          { type: 'paragraph', data: { text: 'Ping Alejandra' } },
        ],
      })

      // Act
      const preview = getNotePreview(body)

      // Assert
      expect(preview).toBe('Ship launch checklist Ping Alejandra')
    })

    it('when body is empty or whitespace, then labels the note as empty', () => {
      expect(getNotePreview(emptyNoteBody())).toBe('Empty note')
      expect(getNotePreview(' \n\t ')).toBe('Empty note')
      expect(getNotePreview('')).toBe('Empty note')
    })

    it.each(SECURITY_BODIES)(
      'when body contains adversarial input %j, then preview never throws and returns a string',
      (raw) => {
        const preview = getNotePreview(raw)
        expect(typeof preview).toBe('string')
        expect(preview.length).toBeGreaterThan(0)
      }
    )
  })

  describe('getNoteWordCount / getNoteCharacterCount', () => {
    it('when body mixes paragraphs and list items, then counts every visible word once', () => {
      const body = serializeNoteBody({
        blocks: [
          { type: 'paragraph', data: { text: 'One two' } },
          {
            type: 'list',
            data: {
              style: 'unordered',
              items: ['three', 'four items'],
            },
          },
        ],
      })

      expect(getNoteWordCount(body)).toBe(5)
      expect(getNoteCharacterCount(body)).toBe(getNotePlainText(body).length)
    })

    it('when body is an empty editor document, then word and character counts are zero', () => {
      expect(getNoteWordCount(emptyNoteBody())).toBe(0)
      expect(getNoteCharacterCount(emptyNoteBody())).toBe(0)
    })

    it('when body is a checklist, then only item text contributes to the count', () => {
      const body = serializeNoteBody({
        blocks: [
          {
            type: 'checklist',
            data: {
              items: [
                { text: 'Buy <i>milk</i>', checked: true },
                { text: 'Call support', checked: false },
              ],
            },
          },
        ],
      })

      expect(getNoteWordCount(body)).toBe(4)
      expect(getNotePreview(body)).toBe('Buy milk Call support')
    })
  })

  describe('resolveNoteColor / palette', () => {
    it.each([...NOTE_COLORS])(
      'when color is %s, then resolveNoteColor returns the same palette key',
      (color) => {
        expect(resolveNoteColor(color)).toBe(color)
        expect(getNoteColorPalette(color).label.length).toBeGreaterThan(0)
      }
    )

    it('when color is missing or unknown, then defaults to yellow', () => {
      expect(resolveNoteColor(undefined)).toBe(DEFAULT_NOTE_COLOR)
      expect(resolveNoteColor(null)).toBe(DEFAULT_NOTE_COLOR)
      expect(resolveNoteColor('')).toBe(DEFAULT_NOTE_COLOR)
      expect(resolveNoteColor('not-a-color')).toBe('yellow')
      expect(resolveNoteColor('orange')).toBe('yellow')
    })

    it('when building CSS variables for a color, then every sticky token is set', () => {
      const vars = noteColorCssVars('blue') as Record<string, string>

      expect(vars['--sticky-swatch']).toMatch(/^#/)
      expect(vars['--sticky-surface']).toMatch(/^#/)
      expect(vars['--sticky-ink']).toMatch(/^#/)
      expect(vars['--sticky-surface-dark']).toContain('oklch')
      expect(vars['--sticky-ink-dark']).toContain('oklch')
    })
  })

  describe('sortStickyNotes', () => {
    it('when notes mix pinned and unpinned, then pinned come first and each group is most-recent first', () => {
      const sorted = sortStickyNotes([
        { id: 'a', pinned: false, updatedAt: 300 },
        { id: 'b', pinned: true, updatedAt: 100 },
        { id: 'c', pinned: true, updatedAt: 200 },
        { id: 'd', pinned: false, updatedAt: 400 },
      ])

      expect(sorted.map((entry) => entry.id)).toEqual(['c', 'b', 'd', 'a'])
    })

    it('when timestamps are Unix seconds, then they are compared as milliseconds-equivalent order', () => {
      const sorted = sortStickyNotes([
        { id: 'older', pinned: false, updated_at: 1_700_000_000 },
        { id: 'newer', pinned: false, updated_at: 1_800_000_000 },
      ])

      expect(sorted.map((entry) => entry.id)).toEqual(['newer', 'older'])
    })

    it('when the input array is sorted, then the original array is not mutated', () => {
      const original = [
        { id: 'a', pinned: false, updatedAt: 1 },
        { id: 'b', pinned: true, updatedAt: 2 },
      ]
      const snapshot = original.map((entry) => ({ ...entry }))

      sortStickyNotes(original)

      expect(original).toEqual(snapshot)
    })
  })

  describe('formatNoteUpdatedAt', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-07-16T15:30:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('when the note was updated today, then formats as a local time', () => {
      const todayMs = new Date('2026-07-16T09:05:00.000Z').getTime()
      const formatted = formatNoteUpdatedAt(todayMs)

      expect(formatted).toMatch(/\d/)
      expect(formatted.length).toBeGreaterThan(0)
      // Same-day path uses the time formatter (contains colon or AM/PM-style tokens in most locales).
      expect(formatted).not.toMatch(/2026/)
    })

    it('when the note was updated on a previous day, then formats as a short date', () => {
      const earlier = new Date('2026-07-10T12:00:00.000Z').getTime()
      const formatted = formatNoteUpdatedAt(earlier)

      expect(formatted).toMatch(/10|Jul|7/)
    })
  })
})

describe('Editor.js note body helpers', () => {
  describe('parseNoteBody', () => {
    it('when body is legacy plain text with blank lines, then splits into paragraph blocks', () => {
      const data = parseNoteBody('Hello\n\nWorld')

      expect(data.blocks).toHaveLength(2)
      expect(data.blocks[0]).toMatchObject({
        type: 'paragraph',
        data: { text: 'Hello' },
      })
      expect(getNotePlainText('Hello\n\nWorld')).toBe('Hello World')
    })

    it('when body is valid Editor.js JSON, then round-trips without losing blocks', () => {
      const original = {
        time: 1,
        blocks: [
          { type: 'header', data: { text: 'Launch plan', level: 2 } },
          { type: 'paragraph', data: { text: 'Body copy for QA' } },
          {
            type: 'quote',
            data: { text: 'Ship only what we can support' },
          },
        ],
        version: '2.31.0',
      }

      const serialized = serializeNoteBody(original)
      const parsed = parseNoteBody(serialized)

      expect(parsed.blocks).toEqual(original.blocks)
    })

    it('when body is empty JSON blocks, then returns a single empty paragraph', () => {
      const parsed = parseNoteBody(JSON.stringify({ blocks: [] }))

      expect(parsed.blocks).toHaveLength(1)
      expect(parsed.blocks[0]).toMatchObject({
        type: 'paragraph',
        data: { text: '' },
      })
    })

    it('when body is malformed JSON that looks like an object, then treats it as plain text', () => {
      const parsed = parseNoteBody('{not-json')

      expect(parsed.blocks[0]?.type).toBe('paragraph')
      expect(getNotePlainText('{not-json')).toContain('{not-json')
    })

    it('when plain text includes HTML special characters, then escapes them for safe editor injection', () => {
      const parsed = parseNoteBody('Price < $5 & "ok"')

      expect(parsed.blocks[0]?.data).toMatchObject({
        text: 'Price &lt; $5 &amp; &quot;ok&quot;',
      })
    })

    it('when list items use nested content objects, then plain text still extracts the labels', () => {
      const body = serializeNoteBody({
        blocks: [
          {
            type: 'list',
            data: {
              style: 'ordered',
              items: [
                { content: 'First <b>item</b>' },
                { text: 'Second item' },
              ],
            },
          },
        ],
      })

      expect(getNotePlainText(body)).toBe('First item Second item')
    })
  })

  describe('serializeNoteBody', () => {
    it('when blocks are provided without a timestamp, then assigns a numeric time field', () => {
      const serialized = serializeNoteBody({
        blocks: [{ type: 'paragraph', data: { text: 'Draft' } }],
      })
      const parsed = JSON.parse(serialized) as {
        time: number
        blocks: unknown[]
      }

      expect(typeof parsed.time).toBe('number')
      expect(parsed.blocks).toHaveLength(1)
    })
  })
})
