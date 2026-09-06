import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('panel contract', () => {
  it('keeps the three panel states discriminated', () => { const source = readFileSync('src/panels/panel.ts', 'utf8'); expect(source).toContain("status: 'ready'"); expect(source).toContain("status: 'empty'"); expect(source).toContain("status: 'error'") })
  it('does not import service clients, session helpers, or fetch in panel sources', () => { for (const file of readdirSync('src/panels')) { if (!file.endsWith('.tsx') && file !== 'panel.ts') continue; const source = readFileSync(`src/panels/${file}`, 'utf8'); expect(source).not.toMatch(/from ['\"]@876\/(billing|workspace|platform)|server-only|\bfetch\s*\(/) } })
})
