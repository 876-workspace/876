import { describe, expect, it } from 'vitest'

import { serializeNoteBody } from './notepad-editor-data'
import {
  createDraftNoteId,
  DEFAULT_NOTE_TITLE,
  isDraftNoteId,
  isEmptyNoteDraft,
  titleForDisplay,
  titleForEditor,
  titleForPersist,
} from './notepad-draft'

describe('notepad draft helpers', () => {
  it('createDraftNoteId returns a draft-prefixed unique id', () => {
    const left = createDraftNoteId()
    const right = createDraftNoteId()
    expect(isDraftNoteId(left)).toBe(true)
    expect(isDraftNoteId(right)).toBe(true)
    expect(left).not.toBe(right)
  })

  it('isDraftNoteId is false for server note ids', () => {
    expect(isDraftNoteId('wnote_abc')).toBe(false)
    expect(isDraftNoteId('draft')).toBe(false)
  })

  it('titleForEditor blanks the default untitled label', () => {
    expect(titleForEditor('')).toBe('')
    expect(titleForEditor('  ')).toBe('')
    expect(titleForEditor(DEFAULT_NOTE_TITLE)).toBe('')
    expect(titleForEditor('Launch plan')).toBe('Launch plan')
  })

  it('titleForPersist coerces empty titles to the default', () => {
    expect(titleForPersist('')).toBe(DEFAULT_NOTE_TITLE)
    expect(titleForPersist('   ')).toBe(DEFAULT_NOTE_TITLE)
    expect(titleForPersist('  Hello  ')).toBe('Hello')
  })

  it('titleForDisplay prefers a non-empty title', () => {
    expect(titleForDisplay('')).toBe(DEFAULT_NOTE_TITLE)
    expect(titleForDisplay('Brief')).toBe('Brief')
  })

  it('isEmptyNoteDraft requires both empty title and empty body', () => {
    const emptyBody = serializeNoteBody({
      blocks: [{ type: 'paragraph', data: { text: '' } }],
    })
    const withText = serializeNoteBody({
      blocks: [{ type: 'paragraph', data: { text: 'hello' } }],
    })

    expect(isEmptyNoteDraft('', emptyBody)).toBe(true)
    expect(isEmptyNoteDraft(DEFAULT_NOTE_TITLE, emptyBody)).toBe(true)
    expect(isEmptyNoteDraft('Named', emptyBody)).toBe(false)
    expect(isEmptyNoteDraft('', withText)).toBe(false)
  })
})
