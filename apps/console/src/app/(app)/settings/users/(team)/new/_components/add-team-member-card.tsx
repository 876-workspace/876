'use client'

import { useRouter } from 'next/navigation'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIcon,
} from '@876/ui/detail-card'
import { UserPlusIcon } from '@876/ui/icons'

import { useTeamMemberLinks } from '../../_lib/use-team-member-links'
import { PromoteUserForm } from './promote-user-form'

/**
 * Create, rendered in the card slot by `/settings/users/new`.
 *
 * It owns its own navigation rather than taking callbacks: it is a route now,
 * so closing means going back to the list, carrying the list's query state.
 */
export function AddTeamMemberCard() {
  const router = useRouter()
  const linkTo = useTeamMemberLinks()

  return (
    <DetailCard aria-label="Add a Console user">
      <DetailCardHeader
        icon={
          <DetailCardIcon>
            <UserPlusIcon className="size-5" />
          </DetailCardIcon>
        }
        title="Add user"
        subtitle="Search for an 876 account and grant it a Console role."
        onClose={() => router.push(linkTo('/settings/users'))}
        closeLabel="Close user creation"
      />
      <DetailCardBody>
        <PromoteUserForm />
      </DetailCardBody>
    </DetailCard>
  )
}
