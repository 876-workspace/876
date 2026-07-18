import type { AdminUser } from '@876/admin'

import { formatDate } from '@/lib/format'
import { Fact, FactGrid, StatusBadge } from './overview-ui'
import { LazyProfileFacts } from './overview-lazy'

export function AccountFactsPanel({ user }: { user: AdminUser }) {
  return (
    <FactGrid>
      <Fact label="First name" value={user.first_name || '-'} />
      {user.middle_name && (
        <Fact label="Middle name" value={user.middle_name} />
      )}
      <Fact label="Last name" value={user.last_name || '-'} />
      <LazyProfileFacts userId={user.id} />
      <Fact label="Email" value={user.email} />
      <Fact label="Email verified" value={user.email_verified ? 'Yes' : 'No'} />
      <Fact
        label="Username"
        value={user.username ? `@${user.username}` : '-'}
        mono
      />
      <Fact
        label="Status"
        value={<StatusBadge status={user.banned ? 'banned' : user.status} />}
      />
      <Fact label="Joined" value={formatDate(user.created_at)} />
      <Fact label="Platform ID" value={user.id} mono />
      <Fact label="WorkOS ID" value={user.workos_user_id} mono />
      {user.stripe_customer_id && (
        <Fact label="Stripe customer" value={user.stripe_customer_id} mono />
      )}
    </FactGrid>
  )
}
