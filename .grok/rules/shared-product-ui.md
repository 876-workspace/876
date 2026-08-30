# Shared Product UI Surfaces

A product screen rendered by more than one host lives once in `@876/<product>-ui`. Hosts adapt it rather than copying it.

`@876/ui` owns generic design primitives. Product UI packages own product presentation. Host apps own routes, auth/permissions, bounded service clients, browser BFF transport, mutations, and app chrome.

Product UI is transport-free: no `$876`, no session/service/operator client, no raw `fetch`, no host modules. Hosts load through explicit bounded roots such as `crm`/`work` from `src/lib/services` and pass plain data/actions/hrefs.

Browser mutations use host callbacks → same-origin host API → bounded server client. Business logic remains in the owning service.

Use `sharedTranspilePackages()` and keep the central UI package list in `scripts/shared-ui-packages.mjs`.

UI compatibility re-exports may remain for existing moved React surfaces; that does not permit retaining the global service-client mega-facade.
