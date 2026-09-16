# Codex brief — Inbound WorkOS webhooks module (@876/api)

## Context & why

WorkOS is the identity source of record, but the service has no inbound webhook
endpoint, so a profile/org/membership edit made in WorkOS never reaches the local DB
until a full reconcile. This adds the durable sync path: a signed WorkOS webhook whose
`user.updated` events are applied to the local user row. Other event types are
acknowledged and logged (extensible later) so WorkOS stops retrying and the surface is
in place.

**The signature verifier (`webhook-signature.ts`) and the `app.ts` raw-body capture are
already written by the orchestrator — DO NOT create, edit, or re-derive them.** Use
`WorkOsWebhookVerifier` and `req.rawBody` as given. Follow `.agents/rules/git.md`,
`.claude/rules/express-api.md` (module/layer split, only `*.repository.ts` touches prisma,
Zod is the contract, envelopes/errors), and `.claude/rules/testing.md`. DO NOT COMMIT.

Reference module to mirror **exactly** for file shape/style: the existing
`apps/api/src/modules/twilio-webhooks/` (controller, service, repository, schemas, docs,
routes, index, `__tests__/`). Read it first.

## Already done for you (do NOT touch)

- `apps/api/src/providers/workos/webhook-signature.ts` — exports
  `class WorkOsWebhookVerifier` with
  `verify({ rawBody: Buffer | string, header: string | undefined, nowSeconds?: number }): boolean`.
- `apps/api/src/app.ts` — `express.json` now captures `req.rawBody` (a Buffer) for every
  request. Read it via `(req as unknown as { rawBody?: Buffer }).rawBody`.
- `apps/api/src/config/index.ts` — `WORKOS_WEBHOOK_SECRET` is parsed and exposed at
  `settings.workos.webhookSecret` (string, may be empty).

## File scope (only these — all NEW unless noted)

- `apps/api/src/modules/workos-webhooks/workos-webhooks.schemas.ts`
- `apps/api/src/modules/workos-webhooks/workos-webhooks.docs.ts`
- `apps/api/src/modules/workos-webhooks/workos-webhooks.service.ts`
- `apps/api/src/modules/workos-webhooks/workos-webhooks.controller.ts`
- `apps/api/src/modules/workos-webhooks/workos-webhooks.routes.ts`
- `apps/api/src/modules/workos-webhooks/index.ts`
- `apps/api/src/modules/workos-webhooks/__tests__/workos-webhooks.test.ts`
- `apps/api/src/modules/users/users.service.ts` (add ONE method — see Part 3)
- `apps/api/src/modules/users/index.ts` (export the new method if the module re-exports service fns; match how existing service fns are exposed)
- `apps/api/src/http/routes.ts` (register the new public router next to the Twilio one)

Do NOT touch `webhook-signature.ts`, `app.ts`, `config/index.ts`, or the users
repository/controller.

---

## Part 1 — schemas (`workos-webhooks.schemas.ts`)

WorkOS posts `{ id, event, data, created_at }`. The `data` shape varies by event, so keep
it a permissive record (do NOT strip unknown keys — same reasoning as twilio's permissive
body). Zod:

```ts
export const workosWebhookEventSchema = z.object({
  id: z.string(),
  event: z.string(),
  data: z.record(z.string(), z.unknown()),
  created_at: z.string().optional(),
})
export type WorkosWebhookEvent = z.infer<typeof workosWebhookEventSchema>

export const webhookProcessedSchema = z.object({
  object: z.literal('workos_webhook_event'),
  received: z.literal(true),
  event: z.string(),
  applied: z.boolean(),
})
```

`applied` is true when the event changed local state, false when acknowledged-only.

## Part 2 — service (`workos-webhooks.service.ts`)

```ts
// dispatch(event): decide what to apply. Returns { applied: boolean }.
// - 'user.updated'  -> extract workos user id + name/email from event.data, call
//                      users.syncUserFromWorkos(...). applied = whatever it returns.
// - anything else   -> log.info({ event }, 'workos_webhooks.unhandled') ; applied=false.
```

Extract from `event.data` defensively (it is `Record<string, unknown>`): the WorkOS user
id is `data.id` (string); name is `data.first_name` / `data.last_name`; email is
`data.email`. Coerce non-strings to null. Import the users capability through its module
barrel (`@/modules/users`), never by reaching into its files, and never touch prisma here.

## Part 3 — users sync method (`users.service.ts` + `index.ts`)

Add:

```ts
/**
 * Apply a WorkOS `user.updated` to the local row (WorkOS is source of record).
 * No-op returning false when no local user matches the WorkOS id, so an unknown
 * or not-yet-synced user does not error a webhook. Returns true when a row changed.
 */
export async function syncUserFromWorkos(params: {
  workosUserId: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}): Promise<boolean> {
  const user = await repository.findUserByWorkosId(params.workosUserId)
  if (!user) return false

  const updateData: Record<string, unknown> = {}
  if (params.firstName !== undefined) updateData.firstName = params.firstName
  if (params.lastName !== undefined) updateData.lastName = params.lastName
  if (params.email !== undefined && params.email)
    updateData.email = params.email
  if (Object.keys(updateData).length === 0) return false

  await repository.updateUser(user.id, {
    ...updateData,
    updatedAt: BigInt(nowUnixSeconds()),
  } as never)
  return true
}
```

Use the users module's OWN repository import + `nowUnixSeconds` exactly as the existing
service functions do (check the file's imports). Export `syncUserFromWorkos` the same way
the module already exposes service functions to `index.ts`. Do NOT push anything back to
WorkOS here (no echo loop).

## Part 4 — controller (`workos-webhooks.controller.ts`)

Mirror twilio's controller. The handler:

1. Read `const raw = (req as unknown as { rawBody?: Buffer }).rawBody`.
2. Build the verifier: `new WorkOsWebhookVerifier({ secret: settings.workos.webhookSecret })`
   (resolve `settings` the way twilio's controller resolves its config).
3. `verifier.verify({ rawBody: raw ?? Buffer.from(''), header: req.header('WorkOS-Signature') ?? undefined })`.
   On false → `throw new AppHttpError({ code: 'workos-webhook/invalid-signature', message: 'The request signature did not verify.', httpStatus: 403 })`.
4. Parse the already-JSON `req.body` with `workosWebhookEventSchema` (validation may also be
   declared on the route — mirror twilio; do not double-throw).
5. `const { applied } = await service.dispatch(event)`.
6. Respond `{ object: 'workos_webhook_event', received: true, event: event.event, applied }`.

If the raw body is missing (should not happen given app.ts capture) treat as an invalid
signature (403), never a 500.

## Part 5 — routes (`workos-webhooks.routes.ts`) + register (`routes.ts`)

Mirror `createTwilioWebhooksRouter`: `createApiRouter({ tag: 'WorkOS Webhooks', prefix:
'/webhooks/workos', security: 'public', resolveGuards })`, one `api.post({ path: '/',
operationId: 'workos-webhooks-receive', ... , request: { body: workosWebhookEventSchema },
responses: { 200: {…webhookProcessedSchema}, 403: {…} }, handler: controller.receive })`.
Export `createWorkosWebhooksRouter` from `index.ts`. In `http/routes.ts`, import and mount
it right next to the Twilio webhooks router (same public-router group).

## Part 6 — tests (`__tests__/workos-webhooks.test.ts`)

Mock `settings` (webhookSecret = a known value), the users module barrel
(`vi.mock('@/modules/users', ...)`), and drive the controller/service. Cover:

- **Valid signature + `user.updated`** → `users.syncUserFromWorkos` called with the
  extracted `{ workosUserId, firstName, lastName, email }`; response `applied: true` when
  it returns true.
- **Valid signature + unknown event** (`connection.activated`) → sync NOT called,
  `applied: false`, still 200.
- **Invalid signature** → 403 `workos-webhook/invalid-signature`, sync NOT called.
- **`user.updated` for an unknown local user** (sync returns false) → 200, `applied: false`.
- Assert exact call args and full response shape (`.claude/rules/testing.md`). For signature
  tests, compute a valid `WorkOS-Signature` in the test with the same HMAC
  (`createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')`) so a real signature
  is exercised, and an obviously-wrong one for the 403 case.

---

## Verify (run all, must pass)

```
pnpm --filter @876/api typecheck
pnpm --filter @876/api test
pnpm --filter @876/api lint
```

~5 Prisma-Accelerate "bad port" rejections in the sandbox are environmental, not failures.

Do NOT commit. Report exactly which files you changed and any deviations.
