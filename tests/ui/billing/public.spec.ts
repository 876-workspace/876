import { expect, test } from '@playwright/test'

import { expectNoAccessibilityViolations } from '../support/accessibility'

test.describe('Billing public boundary', () => {
  test('when an anonymous user visits Billing, redirects to sign in', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
  })

  test('when an anonymous user reaches a protected status page, renders sign in accessibly', async ({
    page,
    browserName,
  }) => {
    await page.goto('/no-access')

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByText('to access 876 Billing')).toBeVisible()
    await expectNoAccessibilityViolations(page)
    if (browserName === 'chromium')
      await expect(page).toHaveScreenshot('billing-sign-in.png', {
        fullPage: true,
      })
  })
})
