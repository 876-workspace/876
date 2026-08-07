/**
 * OpenAPI prose for the Twilio webhooks module. Pure data — this file imports
 * nothing (.claude/rules/express-api.md).
 *
 * Written rather than translated: `domains/twilio_webhooks/` has no `docs.py`.
 */

const SIGNATURE_NOTE = `
Authenticated by Twilio's request signature, not by an 876 credential. The
signature is verified against the configured public webhook URL — never against
a URL rebuilt from \`Host\` or \`X-Forwarded-Host\`, which a caller controlling
those headers could choose. An unsigned or mismatched request is rejected with
\`communications/invalid-webhook-signature\` before anything is read from it.
`

export const MESSAGE_STATUS_SUMMARY = 'Twilio message status callback'

export const MESSAGE_STATUS_DESCRIPTION = `
Applies a delivery-status transition to the message identified by
\`MessageSid\`.
${SIGNATURE_NOTE}
Transitions only ever move forward: a lower-ranked status is ignored, and no
update is applied after a terminal outcome. Twilio retries and may deliver
callbacks out of order, so a late \`sent\` must not overwrite \`delivered\`.

Every accepted callback is recorded by \`(provider_sid, event_type,
payload_hash)\`, so a retry of an identical payload is answered
\`{"processed": false}\` rather than applied twice.
`

export const MESSAGE_STATUS_RESPONSES = {} as const

export const MESSAGE_INBOUND_SUMMARY = 'Twilio inbound message callback'

export const MESSAGE_INBOUND_DESCRIPTION = `
Accepts an inbound message callback and does nothing with its content.
${SIGNATURE_NOTE}
Persistence is deliberately not implemented: an inbound message carries text a
member of the public wrote, and the platform does not retain it by default.
`

export const MESSAGE_INBOUND_RESPONSES = {} as const

export const CALL_STATUS_SUMMARY = 'Twilio call status callback'

export const CALL_STATUS_DESCRIPTION = `
Applies a call-progress transition to the call identified by \`CallSid\`.
${SIGNATURE_NOTE}
Ranked and terminal-guarded exactly as the message callback is. On
\`completed\`, the reported \`CallDuration\` is stored, and the answer time is
taken from \`AnsweredAt\` when Twilio supplies it, or derived from the duration
when it does not.
`

export const CALL_STATUS_RESPONSES = {} as const

export const CALL_INBOUND_SUMMARY = 'Twilio inbound call callback'

export const CALL_INBOUND_DESCRIPTION = `
Records that an inbound call arrived and answers with empty TwiML, which ends
the call cleanly rather than leaving the caller on an open line.
${SIGNATURE_NOTE}
`

export const CALL_INBOUND_RESPONSES = {} as const

export const VOICE_TWIML_SUMMARY = 'Serve TwiML for a platform voice template'

export const VOICE_TWIML_DESCRIPTION = `
Returns the TwiML for one server-owned voice template.
${SIGNATURE_NOTE}
The template is selected by \`template_key\`, which must both name a known
platform template and carry a matching \`signature\` — an HMAC of the key under
the Twilio auth token, computed when the call was placed and compared here in
constant time. No part of the response derives from caller-supplied content, so
this URL cannot be edited into making 876 read out arbitrary text.
`

export const VOICE_TWIML_RESPONSES = {} as const
