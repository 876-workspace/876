import { describe, expect, it } from 'vitest'

import { parseMentionedUserIds } from '../mentions.js'

describe('mention parser security corpus', () => {
  it('ignores script tags without token syntax', () => {
    expect(
      parseMentionedUserIds('<script>alert("xss")</script> review this')
    ).toEqual([])
  })

  it('extracts only the user id when the label carries markup', () => {
    expect(
      parseMentionedUserIds(
        '@[<script>alert(1)</script><img src=x onerror=alert(1)>](user:usr_ada)'
      )
    ).toEqual(['usr_ada'])
  })

  it('treats __proto__ as a plain id without polluting prototypes', () => {
    expect(parseMentionedUserIds('@[x](user:__proto__)')).toEqual(['__proto__'])
    expect(Object.prototype.hasOwnProperty.call({}, '__proto__')).toBe(false)
    expect(Object.getPrototypeOf({})).toBe(Object.prototype)
  })

  it('ignores unicode RTL overrides outside token syntax', () => {
    expect(parseMentionedUserIds('‮@bob please review')).toEqual([])
    expect(parseMentionedUserIds('@\u202Ealice review')).toEqual([])
  })

  it('extracts tokens adjacent to RTL marks', () => {
    expect(
      parseMentionedUserIds('\u202E@[Ada](user:usr_ada)\u202C')
    ).toEqual(['usr_ada'])
  })

  it('handles a 10k body with a trailing token', () => {
    const body = `${'a'.repeat(10000)} @[Ada](user:usr_ada)`
    expect(parseMentionedUserIds(body)).toEqual(['usr_ada'])
  })

  it('dedupes thousands of repeated tokens to one id', () => {
    const body = '@[Ada](user:usr_ada) '.repeat(2000)
    expect(parseMentionedUserIds(body)).toEqual(['usr_ada'])
  })

  it('rejects unclosed tokens', () => {
    expect(parseMentionedUserIds('@[Ada](user:usr_ada')).toEqual([])
    expect(parseMentionedUserIds('@[Ada]user:usr_ada)')).toEqual([])
  })

  it('rejects empty and whitespace-only user ids', () => {
    expect(parseMentionedUserIds('@[Ada](user:)')).toEqual([])
    expect(parseMentionedUserIds('@[Ada](user:   )')).toEqual([])
    expect(parseMentionedUserIds('@[Ada](user:usr ada)')).toEqual([])
  })

  it('rejects tokens split across lines in the id', () => {
    expect(parseMentionedUserIds('@[Ada](user:usr\nada)')).toEqual([])
  })

  it('ignores bare user: ids and mismatched schemes', () => {
    expect(parseMentionedUserIds('user:usr_ada')).toEqual([])
    expect(parseMentionedUserIds('@[Ada](USER:usr_ada)')).toEqual([])
    expect(parseMentionedUserIds('@[Ada](users:usr_ada)')).toEqual([])
  })

  it('keeps nested-paren labels from swallowing the id', () => {
    expect(parseMentionedUserIds('@[A (B)](user:usr_ada)')).toEqual([
      'usr_ada',
    ])
  })

  it('matches empty labels while preserving the id', () => {
    expect(parseMentionedUserIds('@[](user:usr_ada)')).toEqual(['usr_ada'])
  })
})
