import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import { Pencil } from '@876/ui/icons'

export function PackageActions({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  return (
    <Link
      href={`/${orgSlug}/packages/${id}/edit`}
      className={buttonVariants({ variant: 'outline' })}
    >
      <Pencil />
      Edit
    </Link>
  )
}
