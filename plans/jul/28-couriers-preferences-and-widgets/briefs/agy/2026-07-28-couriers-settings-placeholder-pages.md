# Scaffold placeholder settings pages for the couriers app

## Your goal

Create 25 new Next.js page files in the couriers app. Every file is a **placeholder
page** — it renders a breadcrumb, a title, and a "Coming soon." box. Nothing else.

You are copying one template 25 times, changing only three things each time:
the **function name**, the **metadata title**, and the **visible page title**.

Do not design anything. Do not add forms, inputs, tables, cards, or any UI beyond
the template. Do not add comments.

## The exact template

This is a real, existing file in the repo:
`apps/couriers/src/app/org/[orgSlug]/settings/general/page.tsx`

```tsx
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

export const metadata = { title: 'General — Settings' }

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />

      <PageHeader className="mb-8">
        <PageTitle>General</PageTitle>
      </PageHeader>

      <div className="876-empty-dashed max-w-2xl">Coming soon.</div>
    </Page>
  )
}
```

## The three things you change per file

Given a row from the table below with **Page title** = `Rate cards` and
**Function name** = `RateCardsSettingsPage`:

1. `export const metadata = { title: 'General — Settings' }`
   becomes
   `export const metadata = { title: 'Rate cards — Settings' }`
   The dash character is an em dash `—` (U+2014), NOT a hyphen `-`. Copy it exactly.

2. `export default async function GeneralSettingsPage({`
   becomes
   `export default async function RateCardsSettingsPage({`

3. `<PageTitle>General</PageTitle>`
   becomes
   `<PageTitle>Rate cards</PageTitle>`

**Everything else in the file stays byte-for-byte identical.** Same imports, same
`params` type, same `const { orgSlug } = await params`, same breadcrumb block, same
`876-empty-dashed` div, same blank lines between blocks.

## Full worked example — the first file

File path: `apps/couriers/src/app/org/[orgSlug]/settings/branding/page.tsx`

```tsx
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

export const metadata = { title: 'Branding — Settings' }

export default async function BrandingSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />

      <PageHeader className="mb-8">
        <PageTitle>Branding</PageTitle>
      </PageHeader>

      <div className="876-empty-dashed max-w-2xl">Coming soon.</div>
    </Page>
  )
}
```

Produce the other 24 files the same way.

## The 25 files to create

Every path below is relative to `apps/couriers/src/app/org/[orgSlug]/settings/`
and every one ends in `/page.tsx`. Create the directories as needed.

| #   | Directory path                     | Page title          | Function name                    |
| --- | ---------------------------------- | ------------------- | -------------------------------- |
| 1   | `branding`                         | Branding            | `BrandingSettingsPage`           |
| 2   | `domain`                           | Custom domain       | `CustomDomainSettingsPage`       |
| 3   | `subscription`                     | Manage subscription | `ManageSubscriptionSettingsPage` |
| 4   | `portal`                           | Customer portal     | `CustomerPortalSettingsPage`     |
| 5   | `portal/branding`                  | Portal branding     | `PortalBrandingSettingsPage`     |
| 6   | `portal/access`                    | Sign-up & access    | `PortalAccessSettingsPage`       |
| 7   | `rates`                            | Rate cards          | `RateCardsSettingsPage`          |
| 8   | `rates/customs`                    | Duties & customs    | `DutiesCustomsSettingsPage`      |
| 9   | `rates/taxes`                      | Taxes               | `TaxesSettingsPage`              |
| 10  | `rates/currencies`                 | Currencies          | `CurrenciesSettingsPage`         |
| 11  | `customization/fields`             | Custom fields       | `CustomFieldsSettingsPage`       |
| 12  | `customization/package-categories` | Package categories  | `PackageCategoriesSettingsPage`  |
| 13  | `customization/customer-id-types`  | Customer ID types   | `CustomerIdTypesSettingsPage`    |
| 14  | `customization/address-format`     | Address format      | `AddressFormatSettingsPage`      |
| 15  | `communication/templates`          | Email templates     | `EmailTemplatesSettingsPage`     |
| 16  | `communication/reminders`          | Reminders           | `RemindersSettingsPage`          |
| 17  | `automation/rules`                 | Workflow rules      | `WorkflowRulesSettingsPage`      |
| 18  | `integrations`                     | Integrations        | `IntegrationsSettingsPage`       |
| 19  | `developer/webhooks`               | Webhooks            | `WebhooksSettingsPage`           |
| 20  | `developer/api-keys`               | API keys            | `ApiKeysSettingsPage`            |
| 21  | `modules/customers`                | Customers           | `CustomersModuleSettingsPage`    |
| 22  | `modules/items`                    | Items               | `ItemsModuleSettingsPage`        |
| 23  | `modules/packages`                 | Packages            | `PackagesModuleSettingsPage`     |
| 24  | `modules/warehouse`                | Warehouse           | `WarehouseModuleSettingsPage`    |
| 25  | `modules/deliveries`               | Deliveries          | `DeliveriesModuleSettingsPage`   |

Note on the `&` character in rows 6 and 8: write it as a plain `&` inside the
`<PageTitle>` element — for example `<PageTitle>Sign-up & access</PageTitle>`.
Do NOT write `&amp;`. In the metadata string write it plainly too:
`{ title: 'Sign-up & access — Settings' }`.

## Files you must NOT touch

These already exist. Leave them completely alone:

- `settings/page.tsx`
- `settings/layout.tsx`
- `settings/settings-card.tsx`
- `settings/settings-groups.ts`
- `settings/general/page.tsx`
- `settings/notifications/page.tsx`
- `settings/billing/page.tsx`
- `settings/orgprofile/**`
- `settings/users/**`
- anything outside `apps/couriers/src/app/org/[orgSlug]/settings/`

Do not create a `branches` page — that one is being written separately by someone
else and you would conflict with it.

## Formatting rules

The repo uses Prettier with **single quotes** and **no semicolons**. The template
above already follows this. If you copy it exactly you will be correct.

## How to verify before you report done

Run these two commands from the repo root and make sure both pass:

```
pnpm --filter @876/couriers typecheck
npx prettier --check "apps/couriers/src/app/org/[orgSlug]/settings/**/*.tsx"
```

If prettier reports a file needs formatting, run:

```
npx prettier --write "apps/couriers/src/app/org/[orgSlug]/settings/**/*.tsx"
```

Then confirm you created exactly 25 new files:

```
git status --short apps/couriers/src/app/org/\[orgSlug\]/settings | grep '^??' | wc -l
```

## Absolute rules

- Do NOT run `git commit`, `git add`, `git checkout`, or `git push`. Someone else
  commits your work.
- Do NOT modify `settings-groups.ts` or any navigation file.
- Do NOT install packages or change `package.json`.
- Do NOT add tests.
- Do NOT invent extra pages that are not in the table above.
