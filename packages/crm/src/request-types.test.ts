import { describe, expect, it } from 'vitest'

import { requestChannelSchema } from './request-types'

describe('request channel vocabulary', () => {
  it('publishes the exact canonical channel set', () => {
    expect(requestChannelSchema.options).toEqual([
      'FORM',
      'WIDGET',
      'CHAT',
      'EMAIL',
      'API',
      'AGENT',
    ])
  })

  it('accepts hosted form intake', () => {
    expect(requestChannelSchema.parse('FORM')).toBe('FORM')
  })

  it('accepts embedded widget intake', () => {
    expect(requestChannelSchema.parse('WIDGET')).toBe('WIDGET')
  })

  it('accepts conversational and transport channels', () => {
    expect(['CHAT', 'EMAIL', 'API'].map((value) => requestChannelSchema.parse(value))).toEqual([
      'CHAT',
      'EMAIL',
      'API',
    ])
  })

  it('accepts direct agent creation', () => {
    expect(requestChannelSchema.parse('AGENT')).toBe('AGENT')
  })

  it('rejects the former CRM source value', () => {
    expect(requestChannelSchema.safeParse('CRM').success).toBe(false)
  })

  it('rejects the former WEB and PHONE source values', () => {
    expect(requestChannelSchema.safeParse('WEB').success).toBe(false)
    expect(requestChannelSchema.safeParse('PHONE').success).toBe(false)
  })
})
