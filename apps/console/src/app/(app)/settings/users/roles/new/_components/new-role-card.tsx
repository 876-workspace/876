'use client'

import { useRouter } from 'next/navigation'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIcon,
} from '@876/ui/detail-card'
import { ShieldCheck } from '@876/ui/icons'

import { CreateRoleForm } from './create-role-form'

/**
 * Create, rendered in the card slot by `/settings/users/roles/new`.
 *
 * It owns its own navigation: closing returns to the roles list, and the form
 * itself routes to the role once it exists.
 */
export function NewRoleCard() {
  const router = useRouter()

  return (
    <DetailCard aria-label="New role">
      <DetailCardHeader
        icon={
          <DetailCardIcon>
            <ShieldCheck className="size-5" />
          </DetailCardIcon>
        }
        title="New role"
        subtitle="Create a custom role with a tailored permission set."
        onClose={() => router.push('/settings/users/roles')}
        closeLabel="Close role creation"
      />
      <DetailCardBody>
        <CreateRoleForm />
      </DetailCardBody>
    </DetailCard>
  )
}
