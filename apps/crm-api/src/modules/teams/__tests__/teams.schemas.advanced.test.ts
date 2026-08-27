import { describe, expect, it } from 'vitest'
import {
  createTeamBodySchema,
  deleteTeamBodySchema,
  listTeamsQuerySchema,
  memberBodySchema,
  updateMemberBodySchema,
  updateTeamBodySchema,
} from '../teams.schemas.js'

describe('teams.schemas - listTeamsQuerySchema', () => {
  it('parses empty', () => {
    expect(listTeamsQuerySchema.parse({})).toEqual({})
  })
  it('parses status ACTIVE and ARCHIVED', () => {
    expect(listTeamsQuerySchema.parse({ status: 'ACTIVE' })).toEqual({
      status: 'ACTIVE',
    })
    expect(listTeamsQuerySchema.parse({ status: 'ARCHIVED' })).toEqual({
      status: 'ARCHIVED',
    })
  })
  it('parses includeMembers true as enum', () => {
    expect(listTeamsQuerySchema.parse({ includeMembers: 'true' })).toEqual({
      includeMembers: 'true',
    })
  })
  it('rejects invalid status', () => {
    expect(() => listTeamsQuerySchema.parse({ status: 'DELETED' })).toThrow()
  })
  it('rejects includeMembers false string', () => {
    expect(() =>
      listTeamsQuerySchema.parse({ includeMembers: 'false' })
    ).toThrow()
  })
})

describe('teams.schemas - createTeamBodySchema', () => {
  const base = { name: 'Support', createdBy: 'usr_1' }
  it('parses minimal', () => {
    expect(createTeamBodySchema.parse(base)).toMatchObject({
      name: 'Support',
      createdBy: 'usr_1',
    })
  })
  it('trims name and rejects empty', () => {
    expect(createTeamBodySchema.parse({ ...base, name: '  Ops  ' }).name).toBe(
      'Ops'
    )
    expect(() => createTeamBodySchema.parse({ ...base, name: '' })).toThrow()
    expect(() => createTeamBodySchema.parse({ ...base, name: '   ' })).toThrow()
  })
  it('enforces name max 120', () => {
    expect(() =>
      createTeamBodySchema.parse({ ...base, name: 'a'.repeat(121) })
    ).toThrow()
    expect(
      createTeamBodySchema.parse({ ...base, name: 'a'.repeat(120) }).name
    ).toHaveLength(120)
  })
  it('accepts optional description, color, autoAssign, isDefault', () => {
    const parsed = createTeamBodySchema.parse({
      ...base,
      description: 'Help team',
      color: '#fff',
      isDefault: true,
      autoAssign: 'ROUND_ROBIN',
    })
    expect(parsed.description).toBe('Help team')
    expect(parsed.autoAssign).toBe('ROUND_ROBIN')
    expect(parsed.isDefault).toBe(true)
  })
  it('accepts nullable description and color as null', () => {
    expect(
      createTeamBodySchema.parse({ ...base, description: null }).description
    ).toBeNull()
    expect(
      createTeamBodySchema.parse({ ...base, color: null }).color
    ).toBeNull()
  })
  it('trims description and rejects over 1000', () => {
    expect(
      createTeamBodySchema.parse({ ...base, description: '  hello  ' })
        .description
    ).toBe('hello')
    expect(() =>
      createTeamBodySchema.parse({ ...base, description: 'a'.repeat(1001) })
    ).toThrow()
  })
  it('validates members array', () => {
    const parsed = createTeamBodySchema.parse({
      ...base,
      members: [{ userId: 'usr_2', role: 'LEAD' }, { userId: 'usr_3' }],
    })
    expect(parsed.members).toHaveLength(2)
    expect(parsed.members?.[1]?.role).toBeUndefined()
  })
  it('rejects invalid autoAssign', () => {
    expect(() =>
      createTeamBodySchema.parse({ ...base, autoAssign: 'RANDOM' })
    ).toThrow()
  })
  it('rejects empty member userId', () => {
    expect(() =>
      createTeamBodySchema.parse({ ...base, members: [{ userId: '' }] })
    ).toThrow()
  })
})

describe('teams.schemas - updateTeamBodySchema', () => {
  it('requires at least one field', () => {
    expect(() => updateTeamBodySchema.parse({})).toThrow()
  })
  it('accepts partial updates', () => {
    expect(updateTeamBodySchema.parse({ name: 'New' }).name).toBe('New')
    expect(updateTeamBodySchema.parse({ status: 'ARCHIVED' }).status).toBe(
      'ARCHIVED'
    )
  })
  it('trims name on update', () => {
    expect(updateTeamBodySchema.parse({ name: '  New  ' }).name).toBe('New')
    expect(() => updateTeamBodySchema.parse({ name: '' })).toThrow()
  })
  it('allows null description to clear', () => {
    expect(
      updateTeamBodySchema.parse({ description: null }).description
    ).toBeNull()
  })
})

describe('teams.schemas - member schemas', () => {
  it('parses memberBody with addedBy', () => {
    expect(
      memberBodySchema.parse({ userId: 'usr_2', addedBy: 'usr_1' })
    ).toMatchObject({ userId: 'usr_2', addedBy: 'usr_1' })
  })
  it('rejects missing addedBy', () => {
    expect(() => memberBodySchema.parse({ userId: 'usr_2' })).toThrow()
  })
  it('parses updateMember role', () => {
    expect(updateMemberBodySchema.parse({ role: 'LEAD' }).role).toBe('LEAD')
    expect(() => updateMemberBodySchema.parse({ role: 'ADMIN' })).toThrow()
  })
  it('deleteTeam requires deletedBy', () => {
    expect(deleteTeamBodySchema.parse({ deletedBy: 'usr_1' })).toEqual({
      deletedBy: 'usr_1',
    })
    expect(() => deleteTeamBodySchema.parse({})).toThrow()
    expect(
      deleteTeamBodySchema.parse({
        deletedBy: 'usr_1',
        reason: '  no longer needed  ',
      }).reason
    ).toBe('no longer needed')
  })
})
