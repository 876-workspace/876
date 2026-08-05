import type { AdminMembership, AdminOrganization } from '@876/admin'

/**
 * Console's customer-account vocabulary — the shapes the user detail views read.
 *
 * The identity API has no consumer/enterprise column: realm is a property of the
 * *session* (`X-876-Realm`, sealed into the cookie by
 * `apps/api/domains/auth/session_state.py`), never of the user row. So the
 * account shape is **derived from membership**, and one person can legitimately
 * be both — a Speedy Shipping employee who also collects their own packages is
 * one `user_…` with a membership and a courier customer profile.
 *
 * See `.claude/rules/customer-architecture.md` for the three-layer model these
 * types sit on top of (identity → registry relationship → app profile).
 */

/**
 * How a user reads today, derived from their org memberships:
 * none → `consumer`, some → `enterprise`, some *and* app relationships of their
 * own → `dual`. Purely a presentation decision — nothing is stored.
 */
export type AccountShape = 'consumer' | 'enterprise' | 'dual'

/** How prominently an enforcement tag should read in the header. */
export type EnforcementTone = 'danger' | 'warning' | 'neutral'

/**
 * One standing fact about the account, rendered as a header chip. Modelled on
 * the leaked Twitter admin panel: every enforcement state is visible at once
 * rather than one status badge with the rest buried behind dialogs.
 */
export type EnforcementTag = {
  /** Stable key, used as the React key and in tests. */
  key: string
  label: string
  tone: EnforcementTone
  /** Optional supporting text (ban reason, deletion date). */
  detail?: string
}

/** A membership joined to the organization it belongs to. */
export type UserOrgMembership = {
  membership: AdminMembership
  org: AdminOrganization | null
}

/**
 * A money figure carried as a decimal **string** end-to-end. Never a JS number —
 * a float turns `184200.00` into something that is not `184200.00`, and these
 * figures are read off a customer's account.
 */
export type MoneyAmount = {
  /** Decimal string, e.g. `"184200.00"`. */
  amount: string
  /** ISO 4217 code, e.g. `"JMD"`. */
  currency: string
}

/**
 * One (organization × app) relationship a person holds — the Layer 3 app profile
 * from `customer-architecture.md`, resolved for display.
 *
 * This is the row that answers "this consumer has a different profile with each
 * shipping company": one entry per courier they hold a mailbox with, plus one
 * per registry customer record. It lives on the *person*, because no single
 * organization page can show the set.
 *
 * Console never owns this data. Each owning app exposes it over its own internal
 * admin surface keyed by the opaque 876 `userId`, and Console resolves identity
 * details through `$876`. See `resolveUserRelationships`.
 */
export type UserRelationship = {
  /** Stable composite key — `${appSlug}:${orgId}`. */
  key: string
  appSlug: string
  appName: string
  appLogoUrl: string | null
  orgId: string
  orgSlug: string
  orgName: string
  orgLogoUrl: string | null
  /** The app's own handle for this person, e.g. `"Mailbox 4417"`. */
  profileLabel: string | null
  /** Secondary app detail, e.g. `"Kingston branch"`. */
  profileDetail: string | null
  /** Lifecycle status of the *profile*, not of the person or the org. */
  status: string
  /** Opaque registry id (`billing_customers`), when the app has linked one. */
  billingCustomerId: string | null
  /** Total this person has paid to this organization, when known. */
  lifetimePaid: MoneyAmount | null
  /** Count of the person's unresolved requests against this organization. */
  openRequests: number
  /** Unix seconds the relationship began. */
  since: number | null
}

/**
 * Which counterparty a request is against — the PayPal split.
 *
 * `support` — the subject is 876. An org or a consumer asking us for help; we
 * are a party from the moment it opens.
 *
 * `dispute` — the subject is an organization. A consumer raising a chargeback or
 * a service complaint against a courier. **876 is not a party until it is
 * escalated**, exactly as a PayPal dispute becomes a claim only when one side
 * asks PayPal to decide.
 *
 * One object, one inbox, one tab. The counterparty is a field, not a second
 * product.
 */
export type RequestClass = 'support' | 'dispute'

/** Where a request sits in its lifecycle. `escalated` means 876 is now arbitrating. */
export type RequestState =
  | 'open'
  | 'pending'
  | 'escalated'
  | 'resolved'
  | 'closed'

/**
 * A request as it appears in a list on a user or organization page. The full
 * record (messages, evidence, assignment) belongs to the 876 Desk service, which
 * is a shared platform service with its own bounded context — not the identity
 * API and not Console's datastore. See `.claude/rules/platform-services.md`.
 */
export type UserRequestSummary = {
  id: string
  class: RequestClass
  state: RequestState
  subject: string
  /**
   * The app the request was raised through. Always present — this is what lets a
   * future standalone Support Centre be *another appId* rather than a rewrite.
   */
  appSlug: string
  appName: string
  /** The organization the request is against, for a `dispute`. */
  orgSlug: string | null
  orgName: string | null
  createdAt: number
  updatedAt: number
}
