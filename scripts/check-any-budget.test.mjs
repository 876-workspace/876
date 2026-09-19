import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'

import {
  budgetFor,
  computeUpdatedBudget,
  countAnyOccurrences,
  evaluateCounts,
  isExcludedSourcePath,
  scanWorkspaceDir,
} from './check-any-budget.mjs'

// The cast form, assembled so this file never holds the literal token pair.
const CAST = 'as ' + 'any'

function makeTree(files) {
  const root = mkdtempSync(join(tmpdir(), 'any-budget-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  return root
}

describe('countAnyOccurrences: true positives', () => {
  it('counts a colon annotation with its line', () => {
    // ARRANGE + ACT
    const result = countAnyOccurrences('const x: any = 1;')

    // ASSERT — exact count and exact line, both sides of the shape
    assert.equal(result.count, 1)
    assert.deepEqual(result.lines, [1])
  })

  it('counts the cast form', () => {
    const result = countAnyOccurrences(`const y = (value ${CAST});`)

    assert.equal(result.count, 1)
    assert.deepEqual(result.lines, [1])
  })

  it('counts a generic argument', () => {
    const result = countAnyOccurrences('const xs: Array<any> = [];')

    assert.equal(result.count, 1)
    assert.deepEqual(result.lines, [1])
  })

  it('counts a record value position', () => {
    const result = countAnyOccurrences('type R = Record<string, any>;')

    assert.equal(result.count, 1)
    assert.deepEqual(result.lines, [1])
  })

  it('counts a promise return position', () => {
    const result = countAnyOccurrences('type F = () => Promise<any>;')

    assert.equal(result.count, 1)
    assert.deepEqual(result.lines, [1])
  })

  it('counts two occurrences on separate lines with both lines', () => {
    const result = countAnyOccurrences('const a: any = 1;\nconst b: any = 2;')

    assert.equal(result.count, 2)
    assert.deepEqual(result.lines, [1, 2])
  })
})

describe('countAnyOccurrences: lookalike identifiers', () => {
  it('ignores anyOf', () => {
    const result = countAnyOccurrences('const shape = anyOf(a, b);')

    assert.equal(result.count, 0)
    assert.deepEqual(result.lines, [])
  })

  it('ignores company', () => {
    const result = countAnyOccurrences('const company = getCompany();')

    assert.equal(result.count, 0)
    assert.deepEqual(result.lines, [])
  })

  it('ignores Anything', () => {
    const result = countAnyOccurrences('class Anything {}')

    assert.equal(result.count, 0)
    assert.deepEqual(result.lines, [])
  })
})

describe('countAnyOccurrences: stripped regions', () => {
  it('ignores the token inside a line comment', () => {
    const result = countAnyOccurrences('// const x: any = 1;\nconst y = 2;')

    assert.equal(result.count, 0)
    assert.deepEqual(result.lines, [])
  })

  it('ignores the token inside a block comment', () => {
    const result = countAnyOccurrences('/* const x: any = 1; */\nconst y = 2;')

    assert.equal(result.count, 0)
    assert.deepEqual(result.lines, [])
  })

  it('ignores the token inside string literals', () => {
    const result = countAnyOccurrences(
      'const s = ": any";\nconst t = \'any\';\nconst u = `any`;'
    )

    assert.equal(result.count, 0)
    assert.deepEqual(result.lines, [])
  })

  it('ignores JSX copy that is not a type', () => {
    const result = countAnyOccurrences(
      '<p>keep any unused amount as customer credit</p>'
    )

    assert.equal(result.count, 0)
    assert.deepEqual(result.lines, [])
  })

  it('keeps code inside a template interpolation', () => {
    const result = countAnyOccurrences(`const s = \`v=\${(x ${CAST})}\`;`)

    assert.equal(result.count, 1)
    assert.deepEqual(result.lines, [1])
  })
})

describe('workspace scanning: exclusions', () => {
  it('skips test files while counting sibling source', () => {
    // ARRANGE
    const root = makeTree({
      'src/real.ts': 'export const x: any = 1;\n',
      'src/real.test.ts':
        'const a: any = 1;\nconst b: any = 2;\nconst c: any = 3;\n',
    })

    // ACT
    const row = scanWorkspaceDir(join(root, 'src'), 'apps/fake')

    // ASSERT — only the non-test file contributes, with its path attached
    assert.equal(row.count, 1)
    assert.deepEqual(row.occurrences, [
      { file: 'apps/fake/src/real.ts', line: 1 },
    ])
  })

  it('skips __tests__ directories while counting sibling source', () => {
    // ARRANGE
    const root = makeTree({
      'src/ok.ts': 'export const x: any = 1;\n',
      'src/__tests__/helper.ts': 'const a: any = 1;\nconst b: any = 2;\n',
    })

    // ACT
    const row = scanWorkspaceDir(join(root, 'src'), 'apps/fake')

    // ASSERT
    assert.equal(row.count, 1)
    assert.deepEqual(row.occurrences, [
      { file: 'apps/fake/src/ok.ts', line: 1 },
    ])
  })

  it('marks spec files and generated clients excluded', () => {
    assert.equal(isExcludedSourcePath('a.spec.ts'), true)
    assert.equal(isExcludedSourcePath('v1-contract.generated.ts'), true)
    assert.equal(isExcludedSourcePath('ok.ts'), false)
  })
})

describe('budget evaluation', () => {
  it('treats a workspace absent from the budget file as budget 0', () => {
    // ARRANGE + ACT
    const allowed = budgetFor({}, 'apps/brand-new')
    const { rows, overBudget } = evaluateCounts(
      [{ workspace: 'apps/brand-new', count: 0, occurrences: [] }],
      {}
    )

    // ASSERT — both the lookup and the row agree on 0, and nothing is over
    assert.equal(allowed, 0)
    assert.equal(rows[0].budget, 0)
    assert.equal(rows[0].over, false)
    assert.deepEqual(overBudget, [])
  })

  it('passes when current equals budget', () => {
    const { rows, overBudget } = evaluateCounts(
      [{ workspace: 'apps/billing', count: 18, occurrences: [] }],
      { 'apps/billing': 18 }
    )

    assert.equal(rows[0].current, 18)
    assert.equal(rows[0].budget, 18)
    assert.equal(rows[0].delta, 0)
    assert.equal(rows[0].over, false)
    assert.deepEqual(overBudget, [])
  })

  it('fails when current exceeds budget by one', () => {
    const { rows, overBudget } = evaluateCounts(
      [
        {
          workspace: 'apps/billing',
          count: 19,
          occurrences: [{ file: 'apps/billing/src/x.ts', line: 1 }],
        },
      ],
      { 'apps/billing': 18 }
    )

    assert.equal(rows[0].delta, 1)
    assert.equal(rows[0].over, true)
    assert.equal(overBudget.length, 1)
    assert.equal(overBudget[0].workspace, 'apps/billing')
  })
})

describe('computeUpdatedBudget (--update)', () => {
  it('lowers a budget that has fallen', () => {
    const { next, lowered, refusals } = computeUpdatedBudget(
      [{ workspace: 'apps/billing', count: 15, occurrences: [] }],
      { 'apps/billing': 18 }
    )

    assert.deepEqual(next, { 'apps/billing': 15 })
    assert.deepEqual(lowered, [{ workspace: 'apps/billing', from: 18, to: 15 }])
    assert.deepEqual(refusals, [])
  })

  it('refuses to raise a budget that has grown', () => {
    const { next, lowered, refusals } = computeUpdatedBudget(
      [{ workspace: 'apps/billing', count: 20, occurrences: [] }],
      { 'apps/billing': 18 }
    )

    assert.deepEqual(next, { 'apps/billing': 18 })
    assert.deepEqual(lowered, [])
    assert.deepEqual(refusals, [
      { workspace: 'apps/billing', current: 20, budget: 18 },
    ])
  })
})
