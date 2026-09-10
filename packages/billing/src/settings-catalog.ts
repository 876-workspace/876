import { FINANCE_MODULES } from '@876/core/modules'
import type { AppModuleDefinition } from '@876/core/types/modules'
import {
  defineModuleCatalog,
  type PreferenceDefinition,
} from '@876/settings'

type ModuleSettings = {
  optional: boolean
  enabledByDefault: boolean
  preferences: readonly PreferenceDefinition[]
}

function withSettings<
  const TDefinition extends AppModuleDefinition,
  const TSettings extends ModuleSettings,
>(definition: TDefinition, settings: TSettings): TDefinition & TSettings {
  return { ...definition, ...settings }
}

const SHARED_FINANCE_MODULE_CATALOG = defineModuleCatalog([
  withSettings(FINANCE_MODULES.invoices, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
  withSettings(FINANCE_MODULES.quotes, {
    optional: true,
    enabledByDefault: true,
    preferences: [
      {
        key: 'accepted-quote-conversion',
        label: 'Accepted quote conversion',
        type: 'enum',
        default: 'manual',
        hint: 'Choose whether accepting a quote only records the decision or also creates a draft invoice.',
        options: [
          { value: 'manual', label: 'Convert manually' },
          {
            value: 'draft-invoice-on-accept',
            label: 'Create a draft invoice on acceptance',
          },
        ],
      },
    ],
  }),
  withSettings(FINANCE_MODULES.payments, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
  withSettings(FINANCE_MODULES.expenses, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
  withSettings(FINANCE_MODULES.items, {
    optional: true,
    enabledByDefault: true,
    preferences: [
      {
        key: 'product-variants',
        label: 'Product variants',
        type: 'boolean',
        default: false,
        hint: 'Allow goods to have multiple sellable versions such as size or color.',
      },
    ],
  }),
  withSettings(FINANCE_MODULES.salesReceipts, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
  withSettings(FINANCE_MODULES.timeTracking, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
  withSettings(FINANCE_MODULES.customers, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
  withSettings(FINANCE_MODULES.crm, {
    optional: true,
    enabledByDefault: false,
    preferences: [],
  }),
])

const BILLING_ONLY_MODULE_CATALOG = defineModuleCatalog([
  withSettings(FINANCE_MODULES.subscriptions, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
  withSettings(FINANCE_MODULES.banking, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
  withSettings(FINANCE_MODULES.creditNotes, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
  withSettings(FINANCE_MODULES.purchases, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
  withSettings(FINANCE_MODULES.payroll, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
  withSettings(FINANCE_MODULES.priceLists, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
  withSettings(FINANCE_MODULES.discounts, {
    optional: true,
    enabledByDefault: true,
    preferences: [],
  }),
])

export const INVOICE_MODULE_CATALOG = SHARED_FINANCE_MODULE_CATALOG

export const BILLING_MODULE_CATALOG = defineModuleCatalog([
  ...SHARED_FINANCE_MODULE_CATALOG,
  ...BILLING_ONLY_MODULE_CATALOG,
])
