import { resolveRelativeReturnTo } from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'

import { isAccountUsable } from '@/lib/auth/account-validity'
import { getCommerceSession } from '@/lib/auth/session'

import { EmbeddedAuth } from './_components/embedded-auth'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[]; return_to?: string }>
}) {
  const params = await searchParams
  const rawReturnTo = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : (params.returnTo ?? params.return_to)
  const returnTo = resolveRelativeReturnTo(rawReturnTo, '/')
  const session = await getCommerceSession()
  if (session && (await isAccountUsable(session.userId))) redirect(returnTo)

  return <EmbeddedAuth returnTo={returnTo} />
}
