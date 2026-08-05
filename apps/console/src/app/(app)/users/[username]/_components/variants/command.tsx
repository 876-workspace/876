import {
  Building2,
  KeyRound,
  LifeBuoy,
  Link2,
  RectangleGroup,
  User,
} from '@876/ui/icons'

import type { UserViewData } from '../../_lib/view-data'
import { StatTile } from '@/components/patterns/detail/stat-tile'
import { Panel } from '../account/panel'
import { RelationshipList } from '../account/relationships'
import { RequestList } from '../account/requests'
import {
  AppEnrollments,
  IdentityFacts,
  MembershipList,
  SignInMethods,
} from '../account/identity'

/**
 * Variant A — **Command**.
 *
 * Dense, ops-first, no rail: a stat strip, then every section flat on one
 * surface at equal weight. This is the Stripe-dashboard posture — the view for
 * "something is wrong with this account and I need to find it", where scanning
 * beats narrative and nothing should require a click to become visible.
 *
 * Section order follows account shape rather than a fixed list, so the sections
 * that matter for this person sit at the top.
 */
export function CommandVariant({ data }: { data: UserViewData }) {
  const consumerFirst = data.shape !== 'enterprise'

  const relationships = (
    <Panel
      title="Relationships"
      icon={Link2}
      tone="violet"
      count={data.relationships.length}
    >
      <RelationshipList relationships={data.relationships} dense />
    </Panel>
  )

  const memberships = (
    <Panel
      title="Organizations"
      icon={Building2}
      tone="amber"
      count={data.memberships.length}
    >
      <MembershipList memberships={data.memberships} />
    </Panel>
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Building2}
          label="Organizations"
          value={data.memberships.length}
        />
        <StatTile
          icon={Link2}
          label="Relationships"
          value={data.relationships.length}
        />
        <StatTile
          icon={LifeBuoy}
          label="Open requests"
          value={data.requests.length}
        />
        <StatTile
          icon={RectangleGroup}
          label="Apps used"
          value={data.apps.length}
        />
      </div>

      <Panel title="Account" icon={User} tone="blue">
        <IdentityFacts user={data.user} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {consumerFirst ? relationships : memberships}
        {consumerFirst ? memberships : relationships}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Requests"
          icon={LifeBuoy}
          tone="rose"
          count={data.requests.length}
        >
          <RequestList requests={data.requests} dense />
        </Panel>

        <Panel
          title="Sign-in methods"
          icon={KeyRound}
          tone="indigo"
          count={data.accounts.length}
        >
          <SignInMethods accounts={data.accounts} />
        </Panel>
      </div>

      <Panel
        title="Apps"
        icon={RectangleGroup}
        tone="sky"
        count={data.apps.length}
      >
        <AppEnrollments apps={data.apps} />
      </Panel>
    </div>
  )
}
