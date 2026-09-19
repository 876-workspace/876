import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', '..')

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      if (entry === 'node_modules') continue
      walk(path, found)
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      found.push(path)
    }
  }
  return found
}

function portalFiles(subtree: string): string[] {
  return walk(join(SRC, subtree))
}

const INTERNAL_CLIENT_PATTERNS = [
  `@/lib/clients/projects`,
  `@876/projects/service`,
  `from '@876/projects'`,
  `from "@876/projects"`,
]

describe('portal boundary', () => {
  it('portal pages never import the internal projects service', () => {
    const offenders = portalFiles(join('app', 'portal')).filter((file) => {
      const text = readFileSync(file, 'utf-8')
      return INTERNAL_CLIENT_PATTERNS.some((pattern) => text.includes(pattern))
    })
    expect(offenders).toEqual([])
  })

  it('portal API handlers touch the internal service only behind the portal guard', () => {
    const offenders = portalFiles(join('app', 'api', 'portal')).filter(
      (file) => {
        const text = readFileSync(file, 'utf-8')
        const usesInternal =
          text.includes(`@/lib/clients/projects`) ||
          text.includes(`@876/projects/service`)
        if (!usesInternal) return false
        return !text.includes('resolvePortalApiAccess')
      }
    )
    expect(offenders).toEqual([])
  })

  it('portal feature components never import the internal projects service', () => {
    const offenders = walk(join(SRC, 'features', 'portal')).filter((file) => {
      const text = readFileSync(file, 'utf-8')
      return INTERNAL_CLIENT_PATTERNS.some((pattern) => text.includes(pattern))
    })
    expect(offenders).toEqual([])
  })

  it('the portal guard resolves grants through the portal client', () => {
    const text = readFileSync(
      join(SRC, 'lib', 'portal-access', 'index.ts'),
      'utf-8'
    )
    expect(text).toContain('listIssues')
    expect(text).not.toContain('projects.view')
    expect(text).not.toContain('@/lib/clients/projects')
  })

  it('the portal service factory builds the portal client only', () => {
    const text = readFileSync(join(SRC, 'lib', 'clients', 'portal.ts'), 'utf-8')
    expect(text).toContain('@876/projects/portal')
    expect(text).not.toContain('@/lib/clients/projects')
    expect(text).not.toContain('@876/projects/service')
  })
})
