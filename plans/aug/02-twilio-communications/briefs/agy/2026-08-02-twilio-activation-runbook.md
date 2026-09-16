# agy brief — write the Twilio activation runbook

Write exactly one new file: `/workspaces/876/docs/twilio-activation.md`.

Do not create, edit, delete, or touch any other file. Do not run git. Do not run
any wrangler command. Do not modify `docs/plans/twilio-communications.md`.

Read `/workspaces/876/docs/plans/twilio-communications.md` first for context and
match its tone: plain declarative prose, no marketing language, no emoji, no
"Introduction"/"Conclusion" sections, tables where a table is clearer than prose.

The file must contain exactly these seven sections, in this order, with these
exact `##` headings.

---

## 1. Heading and lead

Title the file `# Twilio Activation Runbook` (H1). Follow it with two sentences
stating that every Twilio capability ships disabled and that this runbook is the
deliberate, per-channel activation procedure. Then a `---` horizontal rule.

## 2. `## Environment variables`

One markdown table with exactly these columns: `Variable`, `Where it goes`,
`Purpose`. Use exactly these rows, in this order, with exactly these
`Where it goes` values:

| Variable                        | Where it goes | Purpose                                           |
| ------------------------------- | ------------- | ------------------------------------------------- |
| TWILIO_MODE                     | `vars`        | disabled, fake, or live                           |
| TWILIO_ACCOUNT_SID              | secret        | Account identifier                                |
| TWILIO_API_KEY                  | secret        | REST API key SID                                  |
| TWILIO_API_KEY_SECRET           | secret        | REST API key secret                               |
| TWILIO_AUTH_TOKEN               | secret        | Webhook signature validation only                 |
| TWILIO_VERIFY_SERVICE_SID       | secret        | Verify service identifier                         |
| TWILIO_MESSAGING_SERVICE_SID    | secret        | Messaging service identifier                      |
| TWILIO_VOICE_FROM_NUMBER        | `vars`        | Outbound caller ID                                |
| TWILIO_WHATSAPP_FROM            | `vars`        | WhatsApp sender                                   |
| TWILIO_WEBHOOK_BASE_URL         | `vars`        | Public base URL signatures are checked against    |
| TWILIO_LOOKUP_ENABLED           | `vars`        | Lookup validation and formatting                  |
| TWILIO_LOOKUP_LINE_TYPE_ENABLED | `vars`        | Paid carrier/line-type package, billed per lookup |
| TWILIO_VERIFY_SMS_ENABLED       | `vars`        | SMS OTP channel                                   |
| TWILIO_VERIFY_CALL_ENABLED      | `vars`        | Voice OTP channel                                 |
| TWILIO_VERIFY_WHATSAPP_ENABLED  | `vars`        | WhatsApp OTP channel                              |
| TWILIO_SMS_ENABLED              | `vars`        | Transactional SMS                                 |
| TWILIO_WHATSAPP_ENABLED         | `vars`        | Transactional WhatsApp                            |
| TWILIO_VOICE_ENABLED            | `vars`        | Outbound calls                                    |

Below the table add exactly these three bullet points:

- Non-secret values live in the `vars` block of `apps/api/wrangler.jsonc` and are
  reviewed in a pull request.
- Secrets are never committed. They are set with `wrangler secret put` and exist
  only in Cloudflare and in a developer's gitignored `.env.development.local`.
- `TWILIO_AUTH_TOKEN` is the Twilio account master credential. It can create and
  revoke API keys and spend money on the account. It is required only for webhook
  signature validation. Prefer the API key and secret for everything else.

## 3. `## Setting secrets`

State that the API runs as a Cloudflare Container fronted by the `876-api`
Worker. Then a fenced `bash` code block containing exactly one
`npx wrangler secret put <NAME> --name 876-api` line for each of the six rows
marked `secret` in the table above, in the same order, each preceded by no
comment. Precede the block with the sentence: "Run each from
`/workspaces/876/apps/api`; each command prompts for the value on stdin."

After the block, one sentence stating that `npx wrangler secret list --name
876-api` verifies what is set without revealing any value.

## 4. `## Twilio console prerequisites`

A numbered list, in this exact order, each item one sentence:

1. Create a Verify Service and record its `VA…` SID.
2. Create a Messaging Service and attach a sender pool.
3. Register and verify the WhatsApp sender.
4. Submit WhatsApp content templates for approval.
5. Configure a verified outbound caller ID for voice.
6. Point every webhook URL at the public `TWILIO_WEBHOOK_BASE_URL` host.

## 5. `## Activation order`

State that channels are enabled one at a time, and that each step is validated
against an internal allowlisted number before the next begins. Then a fenced
`text` code block containing exactly:

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

Then one paragraph explaining that `TWILIO_MODE` must be `live` for any channel
to function, that a `live` mode with missing credentials behaves as `disabled`
rather than failing at startup, and that each individual channel flag gates its
own capability independently.

## 6. `## Cost controls`

A bullet list of exactly these six items, each one sentence:

- `TWILIO_LOOKUP_LINE_TYPE_ENABLED` requests a paid data package and is billed
  per lookup; leave it off unless carrier or line type is actually needed.
- Lookup results are cached per number, so a repeat lookup inside the cache TTL
  does not bill a second request.
- Per-user, per-number, per-IP, per-organization, and per-app rate limits apply
  before any provider call.
- Verification sends are capped per 24-hour window with a resend cooldown.
- Destination-country allowlists restrict where messages and calls can go.
- Set a Twilio budget alert before enabling any channel.

## 7. `## Rollback`

Three numbered steps, each one sentence: set the specific channel flag to
`false` and redeploy; set `TWILIO_MODE` to `disabled` to halt every channel at
once; rotate the affected credential in the Twilio console and re-run
`wrangler secret put` if a credential is suspected compromised.

Close with one sentence stating that disabling a flag stops new operations but
does not cancel work already accepted by Twilio.

---

## Verification before you report done

Confirm the file exists at `/workspaces/876/docs/twilio-activation.md`, contains
all seven `##` sections in order, and that the environment-variable table has
exactly 18 data rows. Report the file path and its line count. Change nothing else.
