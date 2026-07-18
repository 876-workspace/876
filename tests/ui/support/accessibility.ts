import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()

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
