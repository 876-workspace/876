import { createApp } from '@/application'

/**
 * Vercel serverless entrypoint.
 *
 * The regular server entry owns the long-running listener used by Containers.
 * Vercel instead needs the Express application itself so its function runtime
 * can manage the request lifecycle.
 */
const app = createApp()

export default app
