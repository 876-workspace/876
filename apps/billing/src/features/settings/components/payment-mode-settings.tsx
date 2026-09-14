'use client'

import { PaymentModeSettingsPanel } from '@876/billing-ui/panels/payment-mode-settings-panel'
import type { PaymentMode } from '@876/billing'
import { useRouter } from 'next/navigation'

import { client } from '@/lib/client'

export function PaymentModeSettings({
  modes,
  canManage,
}: {
  modes: PaymentMode[]
  canManage: boolean
}) {
  const router = useRouter()
  return (
    <PaymentModeSettingsPanel
      modes={modes}
      canManage={canManage}
      onCreate={client.paymentModes.create}
      onUpdate={client.paymentModes.update}
      onDelete={client.paymentModes.delete}
      onUploadImage={client.paymentModes.uploadImage}
      onSuccess={() => router.refresh()}
    />
  )
}
