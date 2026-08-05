import Link from 'next/link'
import {
  Banknotes,
  Building2,
  KeyRound,
  LifeBuoy,
  Link2,
  RectangleGroup,
  User,
} from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'
import { OrgAvatar } from '@876/ui/org-avatar'
import { cn } from '@876/core/utils'

import type { MoneyAmount, UserRelationship } from '@/types/customer'
import type { UserViewData } from '../../_lib/view-data'
import { formatDate, statusBadgeClass } from '@/lib/format'
import { formatMoney } from '../../_lib/money'
import { Panel, PanelEmpty } from '../account/panel'
import { RequestList } from '../account/requests'
import {
  AppEnrollments,
  IdentityFacts,
  MembershipList,
  SignInMethods,
} from '../account/identity'

/**
 * Variant C — **Relationship**.
 *
 * The account-360 posture. It opens with what the person is *worth and owes* to
 * the platform, then gives each organization relationship a card of its own
 * rather than a table row — because the interesting unit here is not the person
 * and not the organization but the pair, and a row cannot hold a mailbox number,
 * a lifetime total and an open-dispute count without becoming unreadable.
 *
 * This is the layout for "who is this person to us", and it is the one that
 * scales as consumers accumulate profiles across many couriers.
 */
export function RelationshipVariant({ data }: { data: UserViewData }) {
  const lifetime = sumLifetimePaid(data.relationships)
  const openRequests = data.relationships.reduce(
    (total, relationship) => total + relationship.openRequests,
    0
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={Banknotes}
          label="Lifetime paid"
          value={lifetime ? formatMoney(lifetime) : '—'}
          tone="violet"
        />
        <Metric
          icon={Link2}
          label="Organizations served by"
          value={`${data.relationships.length}`}
          tone="sky"
        />
        <Metric
          icon={LifeBuoy}
          label="Open requests"
          value={`${data.requests.length + openRequests}`}
          tone="rose"
        />
        <Metric
          icon={Building2}
          label="Memberships"
          value={`${data.memberships.length}`}
          tone="amber"
        />
      </div>

      <section>
        <h2 className="876-section-title mb-3">Relationships</h2>
        {data.relationships.length === 0 ? (
          <div className="876-card">
            <PanelEmpty>No linked organizations yet</PanelEmpty>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.relationships.map((relationship) => (
              <RelationshipCard
                key={relationship.key}
                relationship={relationship}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Account" icon={User} tone="blue">
          <IdentityFacts user={data.user} />
        </Panel>

        <Panel
          title="Requests"
          icon={LifeBuoy}
          tone="rose"
          count={data.requests.length}
        >
          <RequestList requests={data.requests} dense />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Organizations"
          icon={Building2}
          tone="amber"
          count={data.memberships.length}
        >
          <MembershipList memberships={data.memberships} />
        </Panel>

        <Panel
          title="Sign-in methods"
          icon={KeyRound}
          tone="indigo"
          count={data.accounts.length}
        >
          <SignInMethods accounts={data.accounts} />
        </Panel>

        <Panel
          title="Apps"
          icon={RectangleGroup}
          tone="sky"
          count={data.apps.length}
        >
          <AppEnrollments apps={data.apps} />
        </Panel>
      </div>
    </div>
  )
}

function RelationshipCard({
  relationship,
}: {
  relationship: UserRelationship
}) {
  return (
    <article className="876-card space-y-3 p-4">
      <div className="flex items-start gap-3">
        <OrgAvatar
          name={relationship.orgName}
          src={relationship.orgLogoUrl}
          size="sm"
          className="size-9 shrink-0 rounded-[8px] text-xs"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/orgs/${relationship.orgSlug}`}
            className="block truncate text-sm font-medium hover:underline"
          >
            {relationship.orgName}
          </Link>
          <p className="text-muted-foreground truncate text-xs">
            {relationship.appName}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium',
            statusBadgeClass(relationship.status)
          )}
        >
          {relationship.status}
        </span>
      </div>

      {(relationship.profileLabel || relationship.profileDetail) && (
        <p className="text-sm">
          {relationship.profileLabel}
          {relationship.profileDetail && (
            <span className="text-muted-foreground">
              {relationship.profileLabel && ' · '}
              {relationship.profileDetail}
            </span>
          )}
        </p>
      )}

      <dl className="border-876-surface-border grid grid-cols-3 gap-2 border-t pt-3">
        <CardStat
          label="Paid"
          value={
            relationship.lifetimePaid
              ? formatMoney(relationship.lifetimePaid)
              : '—'
          }
        />
        <CardStat label="Open" value={`${relationship.openRequests}`} />
        <CardStat
          label="Since"
          value={relationship.since ? formatDate(relationship.since) : '—'}
        />
      </dl>
    </article>
  )
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-[0.6875rem]">{label}</dt>
      <dd className="truncate text-[0.8125rem] font-medium tabular-nums">
        {value}
      </dd>
    </div>
  )
}

const METRIC_TONES = {
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
} as const

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: IconComponent
  label: string
  value: string
  tone: keyof typeof METRIC_TONES
}) {
  return (
    <div className="876-card p-4">
      <span
        className={cn(
          'mb-3 flex size-9 items-center justify-center rounded-lg',
          METRIC_TONES[tone]
        )}
      >
        <Icon aria-hidden="true" className="size-[1.0625rem]" />
      </span>
      <p className="text-muted-foreground text-[0.6875rem] tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
        {value}
      </p>
    </div>
  )
}

/**
 * Total across relationships.
 *
 * Summed in **minor units as integers**, never as decimals — a float sum of
 * `184200.00` and `12400.50` does not reliably produce their sum, and this
 * figure sits on a customer's account. Integer cents stay exact well past any
 * plausible lifetime total.
 *
 * Mixed currencies are not added together. A JMD total and a USD total are not
 * one number, so only the first currency seen is summed; pretending otherwise
 * would be worse than showing nothing.
 */
function sumLifetimePaid(
  relationships: UserRelationship[]
): MoneyAmount | null {
  const paid = relationships
    .map((relationship) => relationship.lifetimePaid)
    .filter((money): money is MoneyAmount => money !== null)

  if (paid.length === 0) return null

  const currency = paid[0].currency
  const totalMinor = paid
    .filter((money) => money.currency === currency)
    .reduce((total, money) => total + toMinorUnits(money.amount), 0)

  return { amount: fromMinorUnits(totalMinor), currency }
}

function toMinorUnits(amount: string): number {
  const negative = amount.startsWith('-')
  const bare = negative ? amount.slice(1) : amount
  const [whole = '0', fraction = ''] = bare.split('.')
  const cents = fraction.padEnd(2, '0').slice(0, 2)
  const value = Number.parseInt(`${whole}${cents}`, 10)

  if (!Number.isSafeInteger(value)) return 0
  return negative ? -value : value
}

function fromMinorUnits(total: number): string {
  const negative = total < 0
  const bare = Math.abs(total).toString().padStart(3, '0')
  return `${negative ? '-' : ''}${bare.slice(0, -2)}.${bare.slice(-2)}`
}
