/**
 * Twilio webhook signature verification, pinned to the configured public URL.
 *
 * The Python service delegates this to `twilio.request_validator.RequestValidator`.
 * There is no Twilio Node SDK in this service, so the algorithm is implemented
 * directly — it is small, fully specified, and adding a vendor SDK for one HMAC
 * is not worth the dependency.
 *
 * ## The algorithm (https://www.twilio.com/docs/usage/security)
 *
 * 1. Start with the full request URL, including its query string.
 * 2. Append `key + value` for every POST form parameter, keys sorted.
 * 3. HMAC-SHA1 that string with the account's **auth token** and base64 it.
 * 4. Compare, in constant time, against `X-Twilio-Signature`.
 *
 * ## Why the URL is configured, never reconstructed
 *
 * Twilio signs the exact URL it called. Rebuilding that URL from `Host` /
 * `X-Forwarded-Host` lets a caller who controls those headers choose the string
 * being signed, which is the whole attack this check exists to stop. The base
 * URL therefore comes from configuration (`TWILIO_WEBHOOK_BASE_URL`) and only
 * the path and query — which Express derives from the request line — are taken
 * from the request.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

import type { CommunicationsWebhookVerifier } from '../communications'

/** Validate signed Twilio webhooks without trusting proxy-reconstructed hosts. */
export class TwilioWebhookVerifier implements CommunicationsWebhookVerifier {
  private readonly authToken: string
  private readonly baseUrl: string

  constructor(opts: { authToken: string; webhookBaseUrl: string }) {
    this.authToken = opts.authToken
    this.baseUrl = opts.webhookBaseUrl.replace(/\/+$/, '') + '/'
  }

  /**
   * @param path  The request path **including its query string** — Twilio signs
   *              the exact URL, and signing only the path makes an otherwise
   *              valid callback fail.
   */
  validate(params: {
    path: string
    params: Record<string, string>
    signature: string
  }): boolean {
    if (!this.authToken || !params.signature) return false

    let url: URL
    try {
      url = new URL(params.path.replace(/^\/+/, ''), this.baseUrl)
    } catch {
      return false
    }

    // Twilio's own validators accept the URL both with and without an explicit
    // default port, because proxies disagree about whether to include it.
    // Reproducing both variants is what keeps a correctly configured base URL
    // working behind either kind of proxy.
    return [withoutDefaultPort(url), withDefaultPort(url)].some((variant) =>
      constantTimeEquals(this.sign(variant, params.params), params.signature)
    )
  }

  private sign(url: string, params: Record<string, string>): string {
    let payload = url
    for (const key of Object.keys(params).sort(compareByCodeUnit)) {
      // An absent value contributes the empty string, matching Twilio's
      // `str(params[name] or "")`.
      payload += key + (params[key] ?? '')
    }

    return createHmac('sha1', this.authToken)
      .update(payload, 'utf8')
      .digest('base64')
  }
}

function compareByCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function withoutDefaultPort(url: URL): string {
  const copy = new URL(url)
  copy.port = ''
  return copy.toString()
}

function withDefaultPort(url: URL): string {
  const copy = new URL(url)
  if (!copy.port) copy.port = copy.protocol === 'https:' ? '443' : '80'
  // `URL` drops a port that is the protocol's default, so it has to be spliced
  // back into the serialized form by hand.
  return copy.port
    ? copy.toString()
    : url
        .toString()
        .replace(
          `${url.protocol}//${url.host}`,
          `${url.protocol}//${url.host}:${url.protocol === 'https:' ? '443' : '80'}`
        )
}

/**
 * Compare two signatures without leaking where they diverge.
 *
 * Both sides are hashed to a fixed width first, so `timingSafeEqual` never sees
 * mismatched lengths and the comparison cost does not depend on the input.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const left = createHmac('sha256', 'twilio-signature-compare')
    .update(a)
    .digest()
  const right = createHmac('sha256', 'twilio-signature-compare')
    .update(b)
    .digest()
  return timingSafeEqual(left, right)
}
