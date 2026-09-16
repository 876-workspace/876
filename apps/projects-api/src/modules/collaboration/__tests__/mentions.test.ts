import { describe, expect, it } from 'vitest'

import { parseMentionedUserIds } from '../mentions.js'

describe('parseMentionedUserIds', () => {
  it('extracts user ids from token syntax only', () => {
    const body =
      'Hey @[Ada](user:usr_ada) and @[Grace](user:usr_grace), see @bob and user:usr_free.'
    expect(parseMentionedUserIds(body)).toEqual(['usr_ada', 'usr_grace'])
  })

  it('ignores free-text @name fragments and bare user: ids', () => {
    expect(parseMentionedUserIds('@alice please review')).toEqual([])
    expect(parseMentionedUserIds('contact user:usr_alice today')).toEqual([])
    expect(parseMentionedUserIds('@[Broken](usr_alice)')).toEqual([])
  })

  it('dedupes repeated mentions while preserving order', () => {
    const body =
      '@[Ada](user:usr_ada) ping @[Ada](user:usr_ada) and @[Ada L](user:usr_ada)'
    expect(parseMentionedUserIds(body)).toEqual(['usr_ada'])
  })

  it('drops the self mention when selfUserId is provided', () => {
    const body = '@[Me](user:usr_me) and @[Ada](user:usr_ada)'
    expect(parseMentionedUserIds(body, { selfUserId: 'usr_me' })).toEqual([
      'usr_ada',
    ])
  })

  it('returns an empty list for empty or mention-free bodies', () => {
    expect(parseMentionedUserIds('')).toEqual([])
    expect(parseMentionedUserIds('No mentions here.')).toEqual([])
  })
})
