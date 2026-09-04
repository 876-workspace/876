import { expect, test } from '@playwright/test'

import { expectNoAccessibilityViolations } from '../support/accessibility'

test.describe('Projects public boundary', () => {
  test('when an anonymous user visits Projects, redirects to sign in', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
  })

  test('when an account cannot use Projects, explains the denial accessibly', async ({
    page,
  }) => {
    await page.goto('/no-access')

    await expect(
      page.getByRole('heading', { name: 'Projects access unavailable' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Change account' })
    ).toBeVisible()
    await expectNoAccessibilityViolations(page)
  })

  test('on a phone viewport, the denial card fits without horizontal scrolling', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/no-access')

    await expect(
      page.getByRole('heading', { name: 'Projects access unavailable' })
    ).toBeVisible()

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    )
    expect(scrollWidth).toBeLessThanOrEqual(375)
  })
})
