import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The boundary these tests defend was violated once already: sibling services
 * imported each other's `*.repository.ts`, reaching into another module's data
 * layer. `.claude/rules/express-api.md` requires cross-module calls to go
 * through the owning module's `index.ts`, and a grep is the only thing that
 * notices the day someone adds the import back.
 */
const MODULES_DIR = join(import.meta.dirname, '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory())
      return entry === '__tests__' ? [] : sourceFiles(path)
    return entry.endsWith('.ts') ? [path] : []
  })
}

const files = sourceFiles(MODULES_DIR)

describe('module boundaries', () => {
  it('finds the module sources it is meant to police', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('never imports another module’s repository', () => {
    const offenders = files.filter((file) =>
      /from\s+'\.\.\/[a-z-]+\/[a-z-]+\.repository/.test(
        readFileSync(file, 'utf8')
      )
    )

    expect(offenders.map((file) => file.replace(MODULES_DIR, ''))).toEqual([])
  })

  it('never re-exports a repository from a module’s public index', () => {
    const offenders = files
      .filter((file) => file.endsWith('index.ts'))
      .filter((file) => /\.repository/.test(readFileSync(file, 'utf8')))

    expect(offenders.map((file) => file.replace(MODULES_DIR, ''))).toEqual([])
  })

  it('never imports another module’s serializer function into a repository', () => {
    // A repository returns rows. Wire representation belongs to the serializer,
    // which is why serializeLabel moved out of issues.repository.
    const offenders = files
      .filter((file) => file.endsWith('.repository.ts'))
      .filter((file) =>
        /^import\s+\{[^}]*\bserialize[A-Z]/m.test(readFileSync(file, 'utf8'))
      )

    expect(offenders.map((file) => file.replace(MODULES_DIR, ''))).toEqual([])
  })
})
