'use client'

import { useRouter } from 'next/navigation'

import type { Branding } from '@876/core/branding'
import { BrandingSettingsForm } from '@876/billing-ui/documents/branding-settings-form'

import { client } from '@/lib/client'

interface BrandingFormProps {
  initial: Branding
  logoUrl: string | null
  logoHref: string | null
}

/** Client boundary for the shared branding form; callbacks stay in here. */
export function BrandingForm({
  initial,
  logoUrl,
  logoHref,
}: BrandingFormProps) {
  const router = useRouter()

  async function handleSubmit(value: Branding) {
    const result = await client.branding.update(value)
    if (result.error) return { error: { message: result.error.message } }
    router.refresh()
    return { error: null }
  }

  return (
    <BrandingSettingsForm
      initial={initial}
      logoUrl={logoUrl}
      logoHref={logoHref}
      onSubmit={handleSubmit}
    />
  )
}
