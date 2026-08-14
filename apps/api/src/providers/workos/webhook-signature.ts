/**
 * WorkOS webhook signature verification.
 *
 * WorkOS signs every webhook with an HMAC over the raw request body, exactly the
 * way Stripe does. There is no WorkOS Node SDK in this service, so the algorithm
 * is implemented directly — it is small, fully specified, and adding a vendor SDK
 * for one HMAC is not worth the dependency.
 *
 * ## The algorithm (https://workos.com/docs/events/data-syncing/webhooks)
 *
 * The `WorkOS-Signature` header is `t=<unix-seconds>, v1=<hex>`:
 *
 *   1. Read the issued timestamp `t` and the signature `v1`.
 *   2. Reject a timestamp outside the tolerance window — this is the replay guard,
 *      so a captured-and-resent payload with an old `t` is refused.
 *   3. Compute `HMAC-SHA256(secret, `${t}.${rawBody}`)` as a lowercase hex string.
 *   4. Compare it against `v1` in constant time.
 *
 * ## Why the RAW body, not the parsed one
 *
 * The signature is over the exact bytes WorkOS sent. Re-serializing the parsed
 * JSON (`JSON.stringify(req.body)`) reorders keys and drops insignificant
 * whitespace, so it will not match. The raw Buffer must be captured by the body
 * parser (`express.json({ verify })` → `req.rawBody`) before it is parsed, and
 * passed here untouched.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

/** How far the signed timestamp may be from now before the request is rejected. */
const DEFAULT_TOLERANCE_SECONDS = 300

type ParsedHeader = { timestamp: number; signature: string }

/** Parse `t=..., v1=...` into its parts, or null when the header is malformed. */
function parseSignatureHeader(header: string): ParsedHeader | null {
  let timestamp: number | null = null
  let signature: string | null = null

  for (const part of header.split(',')) {
    const [key, value] = part.split('=', 2).map((segment) => segment.trim())
    if (key === 't' && value) {
      const parsed = Number(value)
      if (Number.isInteger(parsed)) timestamp = parsed
    } else if (key === 'v1' && value) {
      signature = value
    }
  }

  if (timestamp === null || signature === null) return null
  return { timestamp, signature }
}

/** Constant-time compare of two hex signatures of equal expected length. */
function constantTimeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

/** Verify a signed WorkOS webhook without trusting the parsed body. */
export class WorkOsWebhookVerifier {
  private readonly secret: string
  private readonly toleranceSeconds: number

  constructor(opts: { secret: string; toleranceSeconds?: number }) {
    this.secret = opts.secret
    this.toleranceSeconds = opts.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS
  }

  /**
   * @param rawBody    The exact request bytes WorkOS signed (captured before JSON
   *                   parsing). A parsed-then-restringified body will not verify.
   * @param header     The `WorkOS-Signature` header value.
   * @param nowSeconds Current time; injectable so tests are deterministic.
   */
  verify(params: {
    rawBody: Buffer | string
    header: string | undefined
    nowSeconds?: number
  }): boolean {
    if (!this.secret || !params.header) return false

    const parsed = parseSignatureHeader(params.header)
    if (!parsed) return false

    const now = params.nowSeconds ?? Math.floor(Date.now() / 1000)
    if (Math.abs(now - parsed.timestamp) > this.toleranceSeconds) return false

    const body =
      typeof params.rawBody === 'string'
        ? params.rawBody
        : params.rawBody.toString('utf8')

    const expected = createHmac('sha256', this.secret)
      .update(`${parsed.timestamp}.${body}`, 'utf8')
      .digest('hex')

    return constantTimeEquals(expected, parsed.signature)
  }
}
