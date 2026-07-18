import { expect, test } from '@playwright/test'

import { expectNoAccessibilityViolations } from '../support/accessibility'

test.describe('Couriers public boundary', () => {
  test('when an anonymous user visits a workspace, redirects to sign in', async ({
    page,
  }) => {
    await page.goto('/app')

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
  })

  test('when an account has no Couriers context, renders the sign-in state accessibly', async ({
    page,
    browserName,
  }) => {
    await page.goto('/no-access')

    await expect(
      page.getByRole('heading', { name: 'Sign in to continue' })
    ).toBeVisible()
    await expectNoAccessibilityViolations(page)
    if (browserName === 'chromium')
      await expect(page).toHaveScreenshot('couriers-no-access.png', {
        fullPage: true,
      })
  })

  test('when a personal account reaches Couriers, explains the work-account requirement', async ({
    page,
  }) => {
    await page.goto('/access-denied')

    await expect(
      page.getByRole('heading', {
        name: 'This workspace needs a work account',
      })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Change account/i })
    ).toBeVisible()
  })
})
