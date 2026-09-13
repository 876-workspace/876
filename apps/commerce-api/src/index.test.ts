import { describe, expect, it } from 'vitest'

import handler from './index'

describe('Commerce API entry module', () => {
  it('default-exports a request handler, not the app factory', () => {
    expect(typeof handler).toBe('function')
    expect(handler.length).toBe(3)
  })
})
