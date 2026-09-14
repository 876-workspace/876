import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { PackageForm } from '../../_components/package-form'
import { loadPackageFormOptions } from '../../_lib/package-form-data'
import { resolvePackage } from '../_lib/package-data'

type Props = { params: Promise<{ orgSlug: string; id: string }> }

export default async function EditPackagePage({ params }: Props) {
  const { orgSlug, id } = await params
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full" />}>
      <EditPackageData orgSlug={orgSlug} id={id} />
    </Suspense>
  )
}

async function EditPackageData({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const [resolved, options] = await Promise.all([
    resolvePackage(orgSlug, id),
    loadPackageFormOptions(orgSlug),
  ])
  if (!resolved) notFound()

  const categories =
    resolved.pkg.category &&
    !options.categories.some(
      (category) => category.value === resolved.pkg.category_id
    )
      ? [
          ...options.categories,
          {
            value: resolved.pkg.category.id,
            label: resolved.pkg.category.name,
          },
        ]
      : options.categories

  return (
    <PackageForm
      orgSlug={orgSlug}
      {...options}
      categories={categories}
      pkg={resolved.pkg}
    />
  )
}
