import { redirect } from 'next/navigation'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

export default async function PortalRegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const returnTo = firstParam(params[AUTH_RETURN_TO_PARAM])

  if (!returnTo) redirect('/portal/login')

  const nextParams = new URLSearchParams({
    [AUTH_RETURN_TO_PARAM]: returnTo,
  })
  redirect(`/portal/login?${nextParams.toString()}`)
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}
