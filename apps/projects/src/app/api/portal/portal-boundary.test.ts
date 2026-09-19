import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...collectSourceFiles(full))
    else if (/\.tsx?$/.test(entry.name)) files.push(full)
  }
  return files
}

describe('portal client boundary', () => {
  it('keeps portal surfaces on the portal client only', () => {
    const forbidden = ['@/lib', 'clients', 'projects'].join('/')
    const roots = [
      join(process.cwd(), 'src', 'app', 'api', 'portal'),
      join(process.cwd(), 'src', 'app', 'portal'),
    ]
    const offenders: string[] = []
    for (const root of roots) {
      for (const file of collectSourceFiles(root)) {
        const content = readFileSync(file, 'utf8')
        const lines = content.split('\n')
        const hits = lines.filter(
          (line) =>
            line.includes(forbidden) &&
            (line.includes('from ') ||
              line.includes('import(') ||
              line.includes('require('))
        )
        if (hits.length > 0) offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })
})
