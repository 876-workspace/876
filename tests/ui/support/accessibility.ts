import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export async function expectNoAccessibilityViolations(page: Page) {
  const results = await analyzeWhenStable(page)

  expect(
    results.violations,
    results.violations
      .map(
        (violation) =>
          `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`
      )
      .join('\n')
  ).toEqual([])
}

async function analyzeWhenStable(page: Page) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.waitForLoadState('domcontentloaded')
      return await new AxeBuilder({ page }).analyze()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (attempt === 1 || !message.includes('Execution context was destroyed'))
        throw error
    }
  }

  throw new Error('Accessibility scan did not start.')
}
