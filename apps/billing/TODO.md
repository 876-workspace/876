# 876 Billing TODO

## Replace broad core-admin access

- [ ] Remove `create876AdminClient` / `API_INTERNAL_KEY` from 876 Billing's
      normal application flow.
- [ ] Replace it with self-scoped `@876/sdk` calls for user/session access and
      a narrowly scoped Billing-to-core service capability for the small set of
      platform operations Billing genuinely needs (for example, organization access
      checks and its own app-access provisioning).
- [ ] Keep `@876/admin` as the Console's broad platform-administration client;
      Billing must never use it for Billing-domain data or expose it to the browser.
