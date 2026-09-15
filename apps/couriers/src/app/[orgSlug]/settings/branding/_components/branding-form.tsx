'use client'

import { useRouter } from 'next/navigation'

import type { Branding } from '@876/core/branding'
import { BrandingSettingsForm } from '@876/billing-ui/documents/branding-settings-form'

import { financeBranding } from '@/lib/client/finance'

interface BrandingFormProps {
  orgSlug: string
  initial: Branding
  logoUrl: string | null
  logoHref: string | null
}

/** Client boundary for the shared branding form; callbacks stay in here. */
export function BrandingForm({
  orgSlug,
  initial,
  logoUrl,
  logoHref,
}: BrandingFormProps) {
  const router = useRouter()

  async function handleSubmit(value: Branding) {
    const result = await financeBranding.update(orgSlug, value)
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
