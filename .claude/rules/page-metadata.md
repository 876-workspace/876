# Page Metadata

This rule applies to Next.js App Router pages and layouts across 876 product and operator apps. It is intentionally narrow: metadata should make browser tabs, app identity, crawler policy, and deliberately public sharing behavior correct without turning authenticated SaaS screens into an SEO surface.

## 1. Root layout owns application metadata

Every Next.js app root layout must own the application-level defaults:

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  applicationName: '876 Billing',
  title: {
    default: '876 Billing',
    template: '%s | 876 Billing',
  },
  robots: {
    index: false,
    follow: false,
  },
}
```

Use the actual app name and existing metadata base/icons/manifest configuration for that surface. Do not repeat the app suffix in child pages; the root `title.template` is the owner.

Authenticated product apps and internal/operator apps default to `noindex,nofollow`. This is crawler guidance, not access control. Authentication and authorization remain the security boundary.

## 2. Child pages export local titles

A normal private page should export only the local browser-tab title unless it has a real reason to override another metadata field:

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Invoices',
}
```

The rendered title becomes `Invoices | 876 Billing` through the root template.

Do not write:

```ts
export const metadata = {
  title: 'Invoices | 876 Billing',
}
```

Do not add descriptions, keywords, canonicals, Open Graph, Twitter cards, or route-level robots fields merely for completeness on private application screens.

## 3. Title grammar

Use concise noun/action titles that match the screen:

- list/section: `Customers`, `Invoices`, `Settings`
- create: `New Invoice`, `New Customer`
- edit: `Edit Invoice`, `Edit Customer`
- nested settings: `Finance`, `Payment Modes`, `Currencies`, `Taxes`
- record subview: `Activity`, `Transactions`, `Statement`, `Audit`, `Access`, `Permissions`
- unavailable/access state: `Access Required`, `Unavailable`, `Onboarding`

The app suffix comes from the root template. Do not reproduce app branding manually inside a page title — never write `| 876 Console` yourself.

Console's operator record subviews are the one sanctioned contextual pattern, because an operator routinely has several records of the same kind open at once and a bare `Audit` tab is unusable:

```text
<record> • <subview> - <section>      Acme Freight • Billing - Organizations
<record> - <section>                  Couriers - Settings
```

The `•` separates the record from what you are looking at; the `-` names the section it lives in. Use it only where a record identity genuinely disambiguates the tab, keep both separators in that fixed order, and never introduce a third convention.

When contextual identity materially helps users distinguish tabs, prefer a safe business identifier:

- `Invoice INV-1042`
- `Quote QUO-218`
- `Payment PAY-91`

Avoid putting sensitive personal data, email addresses, phone numbers, addresses, payment details, or secrets in browser titles. Internal pages are still visible in browser history, tab previews, screenshots, telemetry, and operating-system surfaces.

Organization/app names that are already non-sensitive navigation labels may be used where useful, but do not introduce a data lookup solely for the title.

## 4. Dynamic metadata and performance

Use `generateMetadata` only when the title is genuinely dynamic and the data is already available through an existing reusable resolver.

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { invoiceId } = await params
  const invoice = await resolveInvoice(invoiceId)

  if (!invoice) return { title: 'Invoice not found' }

  return {
    title: `Invoice ${invoice.number}`,
  }
}
```

Rules:

1. Reuse the existing route/domain resolver. Do not create a second repository/service client or raw fetch for metadata.
2. Do not add a metadata-only network/database round trip just to make the browser title prettier. A static resource title is preferable to a new navigation waterfall.
3. Do not move awaited record data into a detail layout to support metadata. Follow `navigation-performance.md`: layouts should stay shell-fast.
4. If the resolver is already memoized/cached within the request, `generateMetadata` and page rendering may share it.
5. Missing resources should return a neutral title such as `Invoice not found`; the page itself still owns `notFound()`/error behavior.

## 5. Inheritance and deliberate exceptions

Not every `page.tsx` file represents an independent metadata owner.

### Parallel route slots

Files under `@slot/` render into another route's canonical page. The canonical route owns metadata. Do not duplicate metadata in sidebar/mobile/list slots unless that slot is itself the only canonical page for a URL.

### Redirect-only pages

A page whose only behavior is `redirect(...)` does not need its own metadata. The destination route owns the title and crawler policy.

### Null list/detail slot pages

A page that intentionally returns `null` only to select the list-only state of a shared list/detail layout may inherit the section metadata from that layout. Prefer section metadata on the route layout when it naturally owns the visible toolbar/list shell.

### Nested layouts

A section layout may own a stable section title if every descendant is part of that section. Child pages should still override the title when their action/subview is meaningfully distinct.

Do not add metadata exports merely to silence a checker when the file is one of the deliberate ownership cases above. The checker/allowlist should document the exception instead.

## 6. Auth, onboarding, and access pages

Login, registration, verification, onboarding, no-access, unavailable, and similar account/app-gating pages are normally `noindex,nofollow` as well. Give them a useful local title (`Sign in`, `Onboarding`, `Access Required`) and inherit the root crawler policy.

Authentication pages are not public marketing pages just because unauthenticated users can reach them.

## 7. Public/share routes are explicit exceptions

A deliberately public page (for example a future hosted invoice, payment link, receipt, documentation page, or marketing route) must make its policy explicit rather than accidentally inheriting a private-app assumption.

For a public route, decide separately:

- whether search engines may index it;
- whether links should be followed;
- whether a canonical URL is needed;
- whether Open Graph/Twitter metadata is useful for WhatsApp, Slack, social, or messaging previews;
- whether the title/description can reveal customer or transaction information.

A public share link can still be `noindex` while having Open Graph metadata. Indexability and link-preview quality are separate decisions.

Never expose private customer/payment data in share metadata.

## 8. Descriptions and social metadata

Private app screens do not need unique SEO descriptions. The root app description is sufficient unless a non-SEO consumer has a concrete need for an override.

Open Graph/Twitter metadata belongs on public/share/marketing/documentation routes where link previews are intentional. Do not add it to authenticated records by default.

## 9. Robots policy

For private apps, prefer the root metadata API `robots` field over repeating `<meta name="robots">` manually.

Do not rely on `robots.txt` as the security boundary or as the only no-index mechanism for private application pages. A crawler blocked from fetching a URL may not see page-level metadata, and authorization is still required regardless of crawler policy.

## 10. Client components

A Client Component page cannot export App Router metadata. If a canonical page must remain a Client Component, put stable metadata in the nearest appropriate Server Component layout for that segment, or split the client UI below a Server Component page.

Do not convert a server page to a client page just for metadata, and do not introduce a layout solely to satisfy a lint-style rule when an existing parent already clearly owns the metadata.

## 11. Route review checklist

When adding or changing a page:

1. Is this a canonical route, redirect, parallel slot, or inherited list/detail slot?
2. Does the root layout already provide app suffix, icons, description, and robots policy?
3. What concise local title helps the user distinguish this browser tab?
4. Can the title stay static?
5. If dynamic, can it reuse an existing resolver without a metadata-only round trip?
6. Could the title expose PII/secrets in history, tab previews, screenshots, logs, or telemetry?
7. Is the route deliberately public? If yes, make index/share policy explicit.

## 12. Current finance/admin surfaces

The current private roots for Console, Billing, and Invoice already own `noindex,nofollow` plus app title templates. New route work in these apps should preserve that inheritance and add only meaningful local titles at the correct ownership boundary.
