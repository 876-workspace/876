import type { IconComponent } from '@876/ui/icons'
import {
  Calendar,
  CreditCard,
  Database,
  Globe,
  ReceiptPercent,
  ReceiptText,
  ShieldCheck,
} from '@876/ui/icons'
import { getResourceTypeColor } from '@/features/provisioning/finance-provisioning-utils'

export type ProvisioningSetupTab = {
  key: string
  label: string
  icon: IconComponent
  colorClass: string
}

export const PROVISIONING_SETUP_TABS: readonly ProvisioningSetupTab[] = [
  {
    key: 'workspace',
    label: 'Workspace',
    icon: Globe,
    colorClass: getResourceTypeColor('workspace'),
  },
  {
    key: 'currency',
    label: 'Currencies',
    icon: Database,
    colorClass: getResourceTypeColor('currency'),
  },
  {
    key: 'payment_mode',
    label: 'Payment modes',
    icon: CreditCard,
    colorClass: getResourceTypeColor('payment_mode'),
  },
  {
    key: 'payment_term',
    label: 'Payment terms',
    icon: Calendar,
    colorClass: getResourceTypeColor('payment_term'),
  },
  {
    key: 'invoice_preference',
    label: 'Invoice preferences',
    icon: ReceiptText,
    colorClass: getResourceTypeColor('invoice_preference'),
  },
  {
    key: 'tax_authority',
    label: 'Tax authorities',
    icon: ShieldCheck,
    colorClass: getResourceTypeColor('tax_authority'),
  },
  {
    key: 'tax_rate',
    label: 'Tax rates',
    icon: ReceiptPercent,
    colorClass: getResourceTypeColor('tax_rate'),
  },
] as const

export function getProvisioningSetupTabs(setupKey: string) {
  const base = `/settings/orgs/provisioning/${encodeURIComponent(setupKey)}`
  return PROVISIONING_SETUP_TABS.map((tab) => ({
    ...tab,
    href:
      tab.key === 'workspace' ? base : `${base}/${encodeURIComponent(tab.key)}`,
    isRoot: tab.key === 'workspace',
  }))
}
