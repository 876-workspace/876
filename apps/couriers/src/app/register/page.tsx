import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { APP_NAME } from '@/lib/app-name'
import { getManageContext } from '@/lib/auth/manage-context'

import { BusinessOnboarding } from './business-onboarding'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `Create workspace | ${APP_NAME}`,
  description: `Set up your courier business on ${APP_NAME}.`,
  robots: { index: false, follow: true },
}

export default async function RegisterPage() {
  const ctx = await getManageContext()
  if (ctx?.accessStatus === 'active') redirect('/')

  return <BusinessOnboarding />
}
