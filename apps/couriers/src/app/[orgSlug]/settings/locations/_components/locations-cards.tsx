import Link from 'next/link'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { formatPhone } from '@876/core/phone'

import { formatAddressLine, needsRegionReview } from '@/lib/address/format'
import type { BranchView } from '@/types/branch'

type Props = {
  branches: BranchView[]
  orgSlug: string
  emptyState?: React.ReactNode
}

export function LocationsCards({ branches, orgSlug, emptyState }: Props) {
  if (branches.length === 0) return <>{emptyState}</>

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {branches.map((branch) => (
        <div key={branch.id} className="876-card flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="font-medium">{branch.name}</span>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  href={`/${orgSlug}/settings/locations/${branch.id}/edit`}
                />
              }
            >
              Edit
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {branch.isDefault ? <Badge>Default</Badge> : null}
            {branch.isActive ? null : (
              <Badge variant="secondary">Inactive</Badge>
            )}
            {needsRegionReview(branch.address) ? (
              <Badge variant="secondary">Region needs review</Badge>
            ) : null}
          </div>

          <div className="text-muted-foreground space-y-1 text-sm">
            <p>{formatAddressLine(branch.address)}</p>
            <p>{branch.address.countryCode}</p>
            <p>
              {branch.phone
                ? formatPhone(branch.phone, branch.address.countryCode)
                : '—'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
