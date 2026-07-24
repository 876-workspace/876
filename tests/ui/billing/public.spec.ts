import { expect, test } from '@playwright/test'

import { expectNoAccessibilityViolations } from '../support/accessibility'

test.describe('Billing public boundary', () => {
  test('when an anonymous user visits Billing, redirects to sign in', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
  })

  test('when an account has no Billing workspace, explains the restriction accessibly', async ({
    page,
    browserName,
  }) => {
    await page.goto('/no-access')

    await expect(
      page.getByRole('heading', { name: 'Billing access is restricted' })
    ).toBeVisible()
    await expect(
      page.getByText(/Ask a Billing owner to grant the required workspace role/)
    ).toBeVisible()
    await expectNoAccessibilityViolations(page)
    if (browserName === 'chromium')
      await expect(page).toHaveScreenshot('billing-no-access.png', {
        fullPage: true,
      })
  })
})
