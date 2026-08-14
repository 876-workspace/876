/** OpenAPI prose for the WorkOS webhooks module. Pure data. */

export const RECEIVE_SUMMARY = 'Receive a WorkOS webhook event'

export const RECEIVE_DESCRIPTION = `
Receives a WorkOS event authenticated by its \`WorkOS-Signature\` header. The
signature is verified over the exact raw request bytes before the event is
processed. \`user.updated\` events update an existing local user; other event
types are acknowledged for future extension.
`

export const RECEIVE_RESPONSES = {} as const
