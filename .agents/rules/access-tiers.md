# Access Principals — who is calling, and through what

The client entrypoint states whose authority is exercised.

| Principal | Caller | Typical credential | Scope |
| --- | --- | --- | --- |
| session | signed-in human | session/bearer | user's authorized org capabilities |
| service | first-party 876 app/service | scoped app/service credential | declared first-party capability |
| operator | 876 / Console | internal operator credential | privileged administration |
| integration | external third party/provider | OAuth/app integration scopes | granted external scope |

A capability is implemented once by its owning service and may be routed at multiple legitimate principals with different guards, scopes, serializers, and auditing. Do not duplicate business logic per caller.

Use `session` for a human principal and keep bearer authority request-scoped.

Use `service` for first-party app/service composition such as Invoice → Billing, CRM → Storage/Work, or Couriers → Billing. Service authority is scoped and is not operator authority. Historical first-party entrypoints named integration should migrate to service when they are not external contracts.

Use `operator` for 876/Console administration. Console performs its own permission/audit checks before invoking product operator clients. Privilege remains bounded by domain (`crm/operator`, `billing/operator`, etc.); global-only capabilities belong to `@876/platform`.

Reserve `integration` for external providers, partners, and customer applications. External integration routes are consent/scope gated and must never gain operator powers for Console convenience.

Decision: signed-in human → session; first-party 876 app/service → service; 876/Console → operator; external system → integration.

First-party product composition is not called an integration. Do not compose any principal onto a global `$876` facade; construct the owning bounded client in the host's `src/lib/services` layer.
