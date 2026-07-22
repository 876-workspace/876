import { expect, test } from '@playwright/test'

import { expectNoAccessibilityViolations } from '../support/accessibility'

test.describe('Console public boundary', () => {
  test('when an anonymous user visits Console, redirects to sign in', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
  })

  test('when an anonymous user reaches a protected status page, renders sign in accessibly', async ({
    page,
    browserName,
  }) => {
    await page.goto('/access-denied')

    await expect(
      page.getByRole('heading', { name: 'Sign in to Console' })
    ).toBeVisible()
    await expect(page.getByText('with your 876 account')).toBeVisible()
    await expectNoAccessibilityViolations(page)
    if (browserName === 'chromium')
      await expect(page).toHaveScreenshot('console-sign-in.png', {
        fullPage: true,
      })
  })
})
