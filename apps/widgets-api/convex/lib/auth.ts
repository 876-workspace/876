/**
 * Server-to-server auth for Convex HTTP actions / internal calls.
 * Hosts (Console/Billing/Couriers) never talk to Convex with publishable keys
 * for privileged ops; widgets-api holds CONVEX_DEPLOY_KEY / service credentials.
 *
 * For mutations invoked via ConvexHttpClient from widgets-api, pass actor +
 * role in args and validate a shared service secret from env.
 */

/**
 * Validate the shared service secret.
 * Must be set on the Convex deployment:
 * Dashboard → Settings → Environment Variables → WIDGETS_SERVICE_KEY
 * (same value as apps/widgets-api and host servers — never the browser).
 */
export function assertServiceSecret(presented: string | undefined) {
  const expected = process.env.WIDGETS_SERVICE_KEY
  if (!expected)
    throw new Error('WIDGETS_SERVICE_KEY is not configured on Convex.')
  if (!presented || presented !== expected)
    throw new Error('Unauthorized Widgets service call.')
}

export function unixSeconds(date = Date.now()) {
  return Math.floor(date / 1000)
}
