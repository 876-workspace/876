# Twilio Activation Runbook

Every Twilio capability ships disabled. This runbook is the deliberate, per-channel activation procedure.

---

## Environment variables

| Variable | Where it goes | Purpose |
| --- | --- | --- |
| TWILIO_MODE | `vars` | disabled, fake, or live |
| TWILIO_ACCOUNT_SID | secret | Account identifier |
| TWILIO_API_KEY | secret | REST API key SID |
| TWILIO_API_KEY_SECRET | secret | REST API key secret |
| TWILIO_AUTH_TOKEN | secret | Webhook signature validation and signed voice-template URLs |
| TWILIO_VERIFY_SERVICE_SID | secret | Verify service identifier |
| TWILIO_MESSAGING_SERVICE_SID | secret | Messaging service identifier |
| TWILIO_VOICE_FROM_NUMBER | `vars` | Outbound caller ID |
| TWILIO_WHATSAPP_FROM | `vars` | WhatsApp sender |
| TWILIO_WEBHOOK_BASE_URL | `vars` | Public base URL signatures are checked against |
| TWILIO_LOOKUP_ENABLED | `vars` | Lookup validation and formatting |
| TWILIO_LOOKUP_LINE_TYPE_ENABLED | `vars` | Paid carrier/line-type package, billed per lookup |
| TWILIO_VERIFY_SMS_ENABLED | `vars` | SMS OTP channel |
| TWILIO_VERIFY_CALL_ENABLED | `vars` | Voice OTP channel |
| TWILIO_VERIFY_WHATSAPP_ENABLED | `vars` | WhatsApp OTP channel |
| TWILIO_SMS_ENABLED | `vars` | Transactional SMS |
| TWILIO_WHATSAPP_ENABLED | `vars` | Transactional WhatsApp |
| TWILIO_VOICE_ENABLED | `vars` | Outbound calls |

- Non-secret values live in the `vars` block of `apps/api/wrangler.jsonc` and are reviewed in a pull request.
- Secrets are never committed. They are set with `wrangler secret put` and exist only in Cloudflare and in a developer's gitignored `.env.development.local`.
- `TWILIO_AUTH_TOKEN` is the Twilio account master credential. It can create and revoke API keys and spend money on the account. It is required for webhook validation and signed voice-template URLs. Prefer the API key and secret for everything else.

## Setting secrets

The API runs as a Cloudflare Container fronted by the `876-api` Worker. Run each from `/workspaces/876/apps/api`; each command prompts for the value on stdin.

```bash
npx wrangler secret put TWILIO_ACCOUNT_SID --name 876-api
npx wrangler secret put TWILIO_API_KEY --name 876-api
npx wrangler secret put TWILIO_API_KEY_SECRET --name 876-api
npx wrangler secret put TWILIO_AUTH_TOKEN --name 876-api
npx wrangler secret put TWILIO_VERIFY_SERVICE_SID --name 876-api
npx wrangler secret put TWILIO_MESSAGING_SERVICE_SID --name 876-api
```

`npx wrangler secret list --name 876-api` verifies what is set without revealing any value.

## Twilio console prerequisites

1. Create a Verify Service and record its `VA…` SID.
2. Create a Messaging Service and attach a sender pool.
3. Register and verify the WhatsApp sender.
4. Submit WhatsApp content templates for approval.
5. Configure a verified outbound caller ID for voice.
6. Point every webhook URL at the public `TWILIO_WEBHOOK_BASE_URL` host.

## Activation order

Channels are enabled one at a time, and each step is validated against an internal allowlisted number before the next begins.

```text
Lookup
→ SMS Verify
→ Voice Verify
→ WhatsApp Verify
→ transactional SMS
→ WhatsApp templates
→ outbound voice
→ inbound webhooks
```

`TWILIO_MODE` must be `live` for any channel to function. A `live` mode with missing credentials behaves as `disabled` rather than failing at startup. Each individual channel flag gates its own capability independently.

## Cost controls

- `TWILIO_LOOKUP_LINE_TYPE_ENABLED` requests a paid data package and is billed per lookup; leave it off unless carrier or line type is actually needed.
- Lookup results are cached per number, so a repeat lookup inside the cache TTL does not bill a second request.
- Per-user and per-number rate limits apply to **verification sends only**. Transactional messages and outbound calls are admin-only and idempotency-scoped, but are **not** yet rate limited — treat per-app, per-org, and per-IP limits as a prerequisite to enabling them, not an existing protection.
- Verification sends are capped per 24-hour window with a resend cooldown.
- Destination-country allowlists are **not implemented**; restrict destinations in the Twilio console (Geo Permissions) until they are.
- Set a Twilio budget alert before enabling any channel.

## Rollback

1. Set the specific channel flag to `false` and redeploy.
2. Set `TWILIO_MODE` to `disabled` to halt every channel at once.
3. Rotate the affected credential in the Twilio console and re-run `wrangler secret put` if a credential is suspected compromised.

Disabling a flag stops new operations but does not cancel work already accepted by Twilio.
