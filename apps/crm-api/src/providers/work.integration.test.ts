import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('CRM Work credential boundary', () => {
  it('does not retain the Work operator credential anywhere in CRM API', () => {
    const forbidden = ['WORK', 'INTERNAL', 'KEY'].join('_')
    let source = ''
    try {
      source = execFileSync(
        'rg',
        [
          '--hidden',
          '--no-ignore',
          '--fixed-strings',
          forbidden,
          process.cwd(),
        ],
        { encoding: 'utf8' }
      )
    } catch (error) {
      const result = error as { status?: number }
      if (result.status !== 1) throw error
    }

    expect(source).toBe('')
  })
})
