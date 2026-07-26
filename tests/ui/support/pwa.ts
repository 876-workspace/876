import type { BrowserContext, Page } from '@playwright/test'
import { expect } from '@playwright/test'

interface PwaExpectation {
  appName: string
  context: BrowserContext
  offlineMessage: string
  page: Page
  themeColor: string
}

export async function expectShellOnlyPwa({
  appName,
  context,
  offlineMessage,
  page,
  themeColor,
}: PwaExpectation) {
  const onlinePath = new URL(page.url()).pathname
  const manifestResponse = await page.request.get('/manifest.webmanifest')
  expect(manifestResponse.ok()).toBe(true)
  expect(await manifestResponse.json()).toMatchObject({
    name: appName,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: themeColor,
    icons: expect.arrayContaining([
      expect.objectContaining({
        src: '/pwa/icon-192.png',
        sizes: '192x192',
      }),
      expect.objectContaining({
        src: '/pwa/icon-512.png',
        sizes: '512x512',
      }),
      expect.objectContaining({
        src: '/pwa/icon-maskable-512.png',
        purpose: 'maskable',
      }),
    ]),
  })

  const workerResponse = await page.request.get('/sw.js')
  expect(workerResponse.ok()).toBe(true)
  expect(workerResponse.headers()['content-type']).toContain(
    'application/javascript'
  )
  expect(workerResponse.headers()['cache-control']).toContain('no-store')

  await page.waitForFunction(
    async () => {
      await navigator.serviceWorker.ready
      return navigator.serviceWorker.controller !== null
    },
    undefined,
    { timeout: 30_000 }
  )

  await page.evaluate(() => fetch('/api/health'))

  const cachedPaths = await page.evaluate(async () => {
    const cacheNames = await caches.keys()
    const requests = await Promise.all(
      cacheNames.map(async (cacheName) => {
        const cache = await caches.open(cacheName)
        return cache.keys()
      })
    )

    return requests.flat().map((request) => new URL(request.url).pathname)
  })

  expect(cachedPaths).toContain('/offline.html')
  expect(cachedPaths).not.toContain('/api/health')
  expect(cachedPaths).not.toContain(onlinePath)

  await context.setOffline(true)
  try {
    await page.goto('/pwa-offline-probe')
    await expect(
      page.getByRole('heading', { name: 'You are offline' })
    ).toBeVisible()
    await expect(page.getByText(offlineMessage)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Try again' })).toHaveAttribute(
      'href',
      '/'
    )
  } finally {
    await context.setOffline(false)
  }
}
