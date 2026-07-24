import { expect, test } from '@playwright/test'

import { expectNoAccessibilityViolations } from '../support/accessibility'

test.describe('Console public boundary', () => {
  test('when an anonymous user visits Console, redirects to sign in', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
  })

  test('when an account is not authorized for Console, explains the denial accessibly', async ({
    page,
    browserName,
  }) => {
    await page.goto('/access-denied')

    await expect(
      page.getByRole('heading', { name: "You don't have access" })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Sign in with a different account' })
    ).toBeVisible()
    await expectNoAccessibilityViolations(page)
    if (browserName === 'chromium')
      await expect(page).toHaveScreenshot('console-access-denied.png', {
        fullPage: true,
      })
  })
})
