/**
 * One-way backfill of the core entitlement catalog and org-app subscriptions
 * into 876 Billing's platform tenant, using the same idempotent `ensure`
 * endpoints the live Console mirror calls. Safe to re-run at any time.
 *
 * Requires the core API (port 4000) and the Billing app (port 3004) to be
 * running, and reads credentials from apps/console/.env.local.
 *
 * Usage: node apps/console/scripts/backfill-billing.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const envPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '.env.local'
)
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.trimStart().startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
    })
)

const CORE_URL = (env.API_URL ?? 'http://127.0.0.1:4000').replace(/\/+$/, '')
const BILLING_URL = (env.BILLING_URL ?? '').replace(/\/+$/, '')
const CORE_HEADERS = {
  'x-internal-key': env.API_INTERNAL_KEY ?? '',
  'X-876-API-Key': env.API_876_KEY ?? '',
}

if (!BILLING_URL || !env.BILLING_INTERNAL_KEY) {
  console.error('BILLING_URL / BILLING_INTERNAL_KEY missing in .env.local')
  process.exit(1)
}
if (!env.API_INTERNAL_KEY) {
  console.error('API_INTERNAL_KEY missing in .env.local')
  process.exit(1)
}

async function core(path) {
  const response = await fetch(`${CORE_URL}${path}`, { headers: CORE_HEADERS })
  const payload = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(
      `core GET ${path} -> ${response.status}: ${JSON.stringify(payload)?.slice(0, 200)}`
    )
  return payload?.data ?? payload
}

async function billingEnsure(path, body) {
  const response = await fetch(`${BILLING_URL}/api/v1/admin/${path}/ensure`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-key': env.BILLING_INTERNAL_KEY,
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.data) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : (payload?.error?.message ?? `HTTP ${response.status}`)
    throw new Error(`billing ${path}/ensure failed: ${message}`)
  }
  return payload.data
}

const INTERVAL_BY_CORE = {
  day: 'DAY',
  week: 'WEEK',
  month: 'MONTH',
  year: 'YEAR',
}

// Newer core rows carry cadence in the `recurring` JSON, legacy rows in
// `billing_interval`; a recurring price with neither is treated as monthly.
function coreCadence(price) {
  const interval =
    price.billing_interval ??
    price.recurring?.interval ??
    (price.type === 'recurring' ? 'month' : undefined)
  if (!interval || !INTERVAL_BY_CORE[interval]) return null
  return {
    intervalUnit: INTERVAL_BY_CORE[interval],
    intervalCount: price.interval_count ?? price.recurring?.interval_count ?? 1,
  }
}

function billingStatusFromCore(status) {
  if (status === 'trialing') return 'TRIALING'
  if (status === 'paused' || status === 'blocked') return 'PAUSED'
  if (status === 'canceled') return 'CANCELED'
  if (status === 'incomplete' || status === 'incomplete_expired') return 'DRAFT'
  return 'ACTIVE'
}

const counts = {
  plans: 0,
  prices: 0,
  customers: 0,
  subscriptions: 0,
  skipped: [],
}

// --- Catalog: core products (plan tiers) + prices -> billing plans/prices ---

const products = (await core('/products')).data ?? []
for (const product of products) {
  if (!product.app_id) {
    counts.skipped.push(`product ${product.slug}: no app_id`)
    continue
  }
  const billingProduct = await billingEnsure('products', {
    sourceAppId: product.app_id,
    slug: product.app_slug ?? product.app_id,
    name: product.app_name ?? product.app_slug ?? product.app_id,
    description: null,
    active: true,
  })

  for (const price of product.prices ?? []) {
    const cadence = coreCadence(price)
    if (!cadence) {
      counts.skipped.push(`price ${price.id}: no recurring interval`)
      continue
    }

    const { intervalUnit, intervalCount } = cadence
    const billingPlan = await billingEnsure('plans', {
      productId: billingProduct.id,
      entitlementReferenceId: product.id,
      code: product.slug,
      name: product.name,
      description: product.description ?? null,
      intervalUnit,
      intervalCount,
      trialDays: price.trial_period_days ?? 0,
      active: product.active !== false,
    })
    counts.plans += 1

    await billingEnsure('prices', {
      planId: billingPlan.id,
      entitlementReferenceId: price.id,
      nickname: price.nickname ?? price.name ?? null,
      currency: String(price.currency).toUpperCase(),
      unitAmount: price.unit_amount ?? 0,
      intervalUnit,
      intervalCount,
      active: price.active !== false,
    })
    counts.prices += 1
    console.log(
      `catalog: ${product.slug} ${price.currency} ${price.unit_amount} -> plan ${billingPlan.id}`
    )
  }
}

// --- Subscriptions: core org-app subscriptions -> billing customers/subscriptions ---

const subscriptions =
  (await core('/billing/subscriptions?limit=100')).data ?? []
const orgNames = new Map()

for (const subscription of subscriptions) {
  const items = subscription.items ?? []
  if (items.length === 0) {
    counts.skipped.push(`subscription ${subscription.id}: no items`)
    continue
  }

  if (!orgNames.has(subscription.organization_id)) {
    const org = await core(`/organizations/${subscription.organization_id}`)
    orgNames.set(
      subscription.organization_id,
      org.name ?? subscription.organization_id
    )
  }

  const customer = await billingEnsure('customers', {
    organizationId: subscription.organization_id,
    name: orgNames.get(subscription.organization_id),
  })
  counts.customers += 1

  try {
    await billingEnsure('subscriptions', {
      externalReference: subscription.id,
      sourceAppId: subscription.app_id,
      customerId: customer.id,
      items: items.map((item) => ({
        priceEntitlementReferenceId: item.price_id,
        quantity: item.quantity ?? 1,
      })),
      status: billingStatusFromCore(subscription.status),
      startAt: subscription.start_date ?? subscription.created_at,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    })
    counts.subscriptions += 1
    console.log(
      `subscription: ${subscription.id} (${subscription.app_slug ?? subscription.app_id})`
    )
  } catch (error) {
    counts.skipped.push(`subscription ${subscription.id}: ${error.message}`)
  }
}

console.log('\nBackfill complete.')
console.log(`plans ensured: ${counts.plans}, prices ensured: ${counts.prices}`)
console.log(
  `customers ensured: ${counts.customers}, subscriptions ensured: ${counts.subscriptions}`
)
if (counts.skipped.length > 0) {
  console.log('skipped:')
  for (const reason of counts.skipped) console.log(`  - ${reason}`)
}
