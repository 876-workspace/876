import type { Express } from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The serverless entry must default-export an app *instance*, not the
 * `createApp` factory.
 *
 * Vercel invokes the default export as the request handler. Exporting the
 * factory type-checks, builds, and deploys green — then every request calls
 * `createApp(req, res)`, which ignores both arguments, returns a new app, and
 * never responds. The deployment hangs until the platform times it out, with
 * nothing useful in the logs.
 */
describe('the work-api serverless entry', () => {
  let app: Express

  beforeEach(async () => {
    // Importing the entry pulls in the repository layer, which resolves the
    // pool at module load; the URL is never connected to in this test.
    vi.stubEnv(
      'WORK_DATABASE_URL',
      'postgresql://work:work@127.0.0.1:5432/work'
    )
    vi.resetModules()
    app = (await import('../index.js')).default
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('default-exports a mounted app that answers /health', async () => {
    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { status: 'ok', service: 'work-api' },
    })
  })

  it('default-exports a request handler rather than the createApp factory', () => {
    // An Express app is a function of (req, res, next) — arity 3. `createApp`
    // declares no parameters, so arity is what tells the two apart.
    expect(typeof app).toBe('function')
    expect(app.length).toBe(3)
  })
})
