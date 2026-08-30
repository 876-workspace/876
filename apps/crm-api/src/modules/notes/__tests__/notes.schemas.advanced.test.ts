import { describe, expect, it } from 'vitest'

import {
  createNoteBodySchema,
  deleteNoteBodySchema,
  listNotesQuerySchema,
  noteParamsSchema,
  requestParamsSchema,
  updateNoteBodySchema,
} from '../notes.schemas.js'

describe('notes.schemas - requestParamsSchema', () => {
  it('parses organizationId and id and trims whitespace', () => {
    expect(
      requestParamsSchema.parse({ organizationId: ' org_1 ', id: ' req_1 ' })
    ).toEqual({
      organizationId: 'org_1',
      id: 'req_1',
    })
  })

  it('rejects missing organizationId or id', () => {
    expect(() =>
      requestParamsSchema.parse({ organizationId: 'org_1' })
    ).toThrow()
    expect(() => requestParamsSchema.parse({ id: 'req_1' })).toThrow()
    expect(() =>
      requestParamsSchema.parse({ organizationId: '', id: 'req_1' })
    ).toThrow()
    expect(() =>
      requestParamsSchema.parse({ organizationId: '   ', id: 'req_1' })
    ).toThrow()
  })

  it('rejects unknown fields (strictObject)', () => {
    expect(() =>
      requestParamsSchema.parse({
        organizationId: 'org_1',
        id: 'req_1',
        extra: 'x',
      })
    ).toThrow()
  })
})

describe('notes.schemas - noteParamsSchema', () => {
  it('parses all three segments and trims', () => {
    expect(
      noteParamsSchema.parse({
        organizationId: ' org_1 ',
        id: ' req_1 ',
        noteId: ' note_1 ',
      })
    ).toEqual({
      organizationId: 'org_1',
      id: 'req_1',
      noteId: 'note_1',
    })
  })

  it('rejects missing noteId', () => {
    expect(() =>
      noteParamsSchema.parse({ organizationId: 'org_1', id: 'req_1' })
    ).toThrow()
    expect(() =>
      noteParamsSchema.parse({
        organizationId: 'org_1',
        id: 'req_1',
        noteId: '',
      })
    ).toThrow()
  })
})

describe('notes.schemas - listNotesQuerySchema', () => {
  it('parses empty query as empty object', () => {
    expect(listNotesQuerySchema.parse({})).toEqual({})
  })

  it('parses viewer_id and include_private true/false strings', () => {
    expect(
      listNotesQuerySchema.parse({
        viewer_id: 'usr_1',
        include_private: 'true',
      })
    ).toEqual({
      viewer_id: 'usr_1',
      include_private: true,
    })
    expect(listNotesQuerySchema.parse({ include_private: 'false' })).toEqual({
      include_private: false,
    })
    expect(listNotesQuerySchema.parse({ viewer_id: ' usr_42 ' })).toEqual({
      viewer_id: 'usr_42',
    })
  })

  it('trims viewer_id and rejects empty', () => {
    expect(() => listNotesQuerySchema.parse({ viewer_id: '' })).toThrow()
    expect(() => listNotesQuerySchema.parse({ viewer_id: '   ' })).toThrow()
  })

  it('rejects invalid include_private values and unknown fields', () => {
    expect(() =>
      listNotesQuerySchema.parse({ include_private: 'TRUE' })
    ).toThrow()
    expect(() =>
      listNotesQuerySchema.parse({ include_private: true as unknown as string })
    ).toThrow()
    expect(() =>
      listNotesQuerySchema.parse({ unknown: 'x' } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
  })
})

describe('notes.schemas - createNoteBodySchema', () => {
  const validBody = 'hello world'
  const base = { body: validBody, authorId: 'usr_1' }

  it('accepts minimal valid input', () => {
    expect(createNoteBodySchema.parse(base)).toEqual({
      body: validBody,
      authorId: 'usr_1',
    })
  })

  it('accepts explicit visibility values', () => {
    for (const visibility of ['PUBLIC', 'INTERNAL', 'PRIVATE'] as const) {
      expect(
        createNoteBodySchema.parse({ ...base, visibility }).visibility
      ).toBe(visibility)
    }
  })

  it('accepts legacy internal flag', () => {
    expect(
      createNoteBodySchema.parse({ ...base, internal: true }).internal
    ).toBe(true)
    expect(
      createNoteBodySchema.parse({ ...base, internal: false }).internal
    ).toBe(false)
  })

  it('accepts both visibility and internal simultaneously (service resolves precedence)', () => {
    expect(
      createNoteBodySchema.parse({
        ...base,
        visibility: 'PRIVATE',
        internal: false,
      })
    ).toEqual({
      body: validBody,
      authorId: 'usr_1',
      visibility: 'PRIVATE',
      internal: false,
    })
  })

  it('trims authorId and rejects empty', () => {
    expect(
      createNoteBodySchema.parse({ body: validBody, authorId: '  usr_1  ' })
        .authorId
    ).toBe('usr_1')
    expect(() =>
      createNoteBodySchema.parse({ body: validBody, authorId: '' })
    ).toThrow()
    expect(() =>
      createNoteBodySchema.parse({ body: validBody, authorId: '   ' })
    ).toThrow()
  })

  it('validates body via richContentSchema: rejects empty and overly long', () => {
    expect(() => createNoteBodySchema.parse({ ...base, body: '' })).toThrow()
    expect(() => createNoteBodySchema.parse({ ...base, body: '   ' })).toThrow()
    expect(() =>
      createNoteBodySchema.parse({ ...base, body: 'a'.repeat(10_001) })
    ).toThrow()
  })

  it('rejects unknown fields and invalid visibility', () => {
    expect(() =>
      createNoteBodySchema.parse({ ...base, unknown: 'x' } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
    expect(() =>
      createNoteBodySchema.parse({
        ...base,
        visibility: 'SECRET' as unknown as string,
      })
    ).toThrow()
    expect(() =>
      createNoteBodySchema.parse({ body: validBody } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
  })

  it('handles rich JSON body (Editor.js style)', () => {
    const rich = JSON.stringify({
      blocks: [{ type: 'paragraph', data: { text: 'hi <b>there</b>' } }],
    })
    expect(
      createNoteBodySchema.parse({ body: rich, authorId: 'usr_1' }).body
    ).toBe(rich)
  })
})

describe('notes.schemas - updateNoteBodySchema', () => {
  const base = { body: 'updated text', editedBy: 'usr_1' }

  it('parses valid update with required editedBy', () => {
    expect(updateNoteBodySchema.parse(base)).toEqual(base)
  })

  it('accepts optional includePrivate flag', () => {
    expect(
      updateNoteBodySchema.parse({ ...base, includePrivate: true })
        .includePrivate
    ).toBe(true)
    expect(
      updateNoteBodySchema.parse({ ...base, includePrivate: false })
        .includePrivate
    ).toBe(false)
    expect(updateNoteBodySchema.parse(base).includePrivate).toBeUndefined()
  })

  it('trims editedBy and rejects missing or empty', () => {
    expect(
      updateNoteBodySchema.parse({ body: 'x', editedBy: '  usr_1  ' }).editedBy
    ).toBe('usr_1')
    expect(() =>
      updateNoteBodySchema.parse({ body: 'x' } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
    expect(() =>
      updateNoteBodySchema.parse({ body: 'x', editedBy: '' })
    ).toThrow()
  })

  it('validates body like create', () => {
    expect(() =>
      updateNoteBodySchema.parse({ body: '', editedBy: 'usr_1' })
    ).toThrow()
    expect(() =>
      updateNoteBodySchema.parse({
        body: 'a'.repeat(10_001),
        editedBy: 'usr_1',
      })
    ).toThrow()
  })

  it('rejects unknown fields and wrong types', () => {
    expect(() =>
      updateNoteBodySchema.parse({ ...base, extra: 1 } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow()
    expect(() =>
      updateNoteBodySchema.parse({
        body: 'x',
        editedBy: 'usr_1',
        includePrivate: 'true' as unknown as boolean,
      })
    ).toThrow()
  })
})

describe('notes.schemas - deleteNoteBodySchema', () => {
  it('parses valid delete input and trims', () => {
    expect(deleteNoteBodySchema.parse({ deletedBy: '  usr_1  ' })).toEqual({
      deletedBy: 'usr_1',
    })
    expect(
      deleteNoteBodySchema.parse({ deletedBy: 'usr_1', includePrivate: true })
    ).toEqual({
      deletedBy: 'usr_1',
      includePrivate: true,
    })
  })

  it('accepts includePrivate false explicitly', () => {
    expect(
      deleteNoteBodySchema.parse({ deletedBy: 'usr_1', includePrivate: false })
        .includePrivate
    ).toBe(false)
  })

  it('rejects missing deletedBy, empty, or unknown fields', () => {
    expect(() =>
      deleteNoteBodySchema.parse({} as unknown as Record<string, unknown>)
    ).toThrow()
    expect(() => deleteNoteBodySchema.parse({ deletedBy: '' })).toThrow()
    expect(() =>
      deleteNoteBodySchema.parse({
        deletedBy: 'usr_1',
        unknown: 'x',
      } as unknown as Record<string, unknown>)
    ).toThrow()
  })
})
