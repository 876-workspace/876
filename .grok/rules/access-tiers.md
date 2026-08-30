# Access Principals

876 uses four explicit caller principals:

- `session`: a signed-in human/user-delegated bearer;
- `service`: a first-party 876 app/service calling another 876 service;
- `operator`: 876/Console privileged administration;
- `integration`: an external provider/partner/customer application.

A capability is implemented once in its owning service and may be routed at multiple principals with different guards/scopes/serializers/audit. Do not duplicate business logic per caller.

First-party composition such as Invoice → Billing, CRM → Work/Storage, and Couriers → Billing uses `service`, not `integration`. Service credentials are scoped and are not operator authority.

Console uses product/platform `operator` clients after Console permission checks; it never authenticates as a customer integration.

Reserve `integration` for external systems and never add operator powers to external integration contracts.

Signed-in human → session; first-party 876 service → service; 876/Console → operator; external system → integration.

Construct the owning bounded client in the host's server-only `src/lib/services` layer. Do not compose callers onto a global `$876` facade.
