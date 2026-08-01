import type { ReactNode } from 'react'
import { Page } from '@876/ui/page'

import { LocationsNavigation } from './locations-navigation'

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function LocationsLayout({ children, params }: Props) {
  const { orgSlug } = await params

  return (
    <Page>
      <LocationsNavigation orgSlug={orgSlug} />
      {children}
    </Page>
  )
}
