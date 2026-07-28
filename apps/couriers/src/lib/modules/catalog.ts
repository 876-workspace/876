import { defineModuleCatalog, type ModuleDefinition } from '@876/settings'

const courierModules = [
  {
    key: 'general',
    label: 'General',
    optional: false,
    enabledByDefault: true,
    preferences: [
      {
        key: 'date_format',
        label: 'Date format',
        type: 'enum',
        default: 'dd/mm/yyyy',
        options: [
          { value: 'dd/mm/yyyy', label: 'DD/MM/YYYY' },
          { value: 'mm/dd/yyyy', label: 'MM/DD/YYYY' },
          { value: 'yyyy-mm-dd', label: 'YYYY-MM-DD' },
        ],
      },
      {
        key: 'timezone',
        label: 'Timezone',
        type: 'string',
        default: 'America/Jamaica',
        maxLength: 64,
      },
      {
        key: 'weight_unit',
        label: 'Weight unit',
        type: 'enum',
        default: 'lb',
        options: [
          { value: 'lb', label: 'Pounds (lb)' },
          { value: 'kg', label: 'Kilograms (kg)' },
        ],
      },
      {
        key: 'dimension_unit',
        label: 'Dimension unit',
        type: 'enum',
        default: 'in',
        options: [
          { value: 'in', label: 'Inches (in)' },
          { value: 'cm', label: 'Centimeters (cm)' },
        ],
      },
      {
        key: 'base_currency',
        label: 'Base currency',
        type: 'reference',
        default: 'JMD',
        namespace: 'currency',
      },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    optional: false,
    enabledByDefault: true,
    preferences: [
      {
        key: 'auto_assign_home_branch',
        label: 'Auto-assign home branch',
        type: 'boolean',
        default: true,
        hint: 'Assign new customers to the default branch.',
      },
      {
        key: 'mailbox_auto_assign',
        label: 'Auto-assign mailbox',
        type: 'boolean',
        default: true,
      },
      {
        key: 'mailbox_number_length',
        label: 'Mailbox number length',
        type: 'integer',
        default: 5,
        min: 3,
        max: 10,
      },
      {
        key: 'require_identification',
        label: 'Require identification',
        type: 'boolean',
        default: false,
        hint: 'Require a verified ID before releasing packages.',
      },
      {
        key: 'allow_duplicate_email',
        label: 'Allow duplicate email',
        type: 'boolean',
        default: false,
      },
    ],
  },
  {
    key: 'items',
    label: 'Items',
    optional: true,
    enabledByDefault: true,
    preferences: [
      {
        key: 'track_inventory',
        label: 'Track inventory',
        type: 'boolean',
        default: false,
      },
      {
        key: 'default_category',
        label: 'Default category',
        type: 'reference',
        default: 'general',
        namespace: 'package_category',
      },
    ],
  },
  {
    key: 'packages',
    label: 'Packages',
    optional: false,
    enabledByDefault: true,
    preferences: [
      {
        key: 'volumetric_divisor',
        label: 'Volumetric divisor',
        type: 'integer',
        default: 5000,
        min: 1000,
        max: 10000,
        hint: '5000 for courier, 6000 for air freight.',
      },
      {
        key: 'chargeable_weight_rule',
        label: 'Chargeable weight rule',
        type: 'enum',
        default: 'greater_of',
        options: [
          { value: 'greater_of', label: 'Greater of actual or volumetric' },
          { value: 'actual_only', label: 'Actual only' },
          { value: 'volumetric_only', label: 'Volumetric only' },
        ],
      },
      {
        key: 'require_tracking_number',
        label: 'Require tracking number',
        type: 'boolean',
        default: true,
      },
      {
        key: 'auto_generate_tracking',
        label: 'Auto-generate tracking number',
        type: 'boolean',
        default: false,
      },
    ],
  },
  {
    key: 'pre_alerts',
    label: 'Pre-alerts',
    optional: true,
    enabledByDefault: true,
    preferences: [
      {
        key: 'customer_can_create',
        label: 'Customer can create',
        type: 'boolean',
        default: true,
      },
      {
        key: 'require_invoice_upload',
        label: 'Require invoice upload',
        type: 'boolean',
        default: true,
        hint: 'Customs requires a supplier invoice.',
      },
      {
        key: 'require_declared_value',
        label: 'Require declared value',
        type: 'boolean',
        default: true,
      },
      {
        key: 'auto_match_on_tracking',
        label: 'Auto-match on tracking',
        type: 'boolean',
        default: true,
      },
    ],
  },
  {
    key: 'warehouse',
    label: 'Warehouse',
    optional: false,
    enabledByDefault: true,
    preferences: [
      {
        key: 'auto_notify_on_receipt',
        label: 'Auto-notify on receipt',
        type: 'boolean',
        default: true,
      },
      {
        key: 'storage_free_days',
        label: 'Storage free days',
        type: 'integer',
        default: 30,
        min: 0,
        max: 365,
      },
      {
        key: 'storage_fee_per_day',
        label: 'Storage fee per day',
        type: 'decimal',
        default: '0.00',
        min: '0',
      },
    ],
  },
  {
    key: 'manifests',
    label: 'Manifests',
    optional: true,
    enabledByDefault: true,
    preferences: [
      {
        key: 'auto_number',
        label: 'Auto-number',
        type: 'boolean',
        default: true,
      },
      {
        key: 'number_prefix',
        label: 'Number prefix',
        type: 'string',
        default: 'MF-',
        maxLength: 10,
      },
    ],
  },
  {
    key: 'deliveries',
    label: 'Deliveries',
    optional: true,
    enabledByDefault: true,
    preferences: [
      {
        key: 'allow_branch_pickup',
        label: 'Allow branch pickup',
        type: 'boolean',
        default: true,
      },
      {
        key: 'allow_home_delivery',
        label: 'Allow home delivery',
        type: 'boolean',
        default: true,
      },
      {
        key: 'default_delivery_method',
        label: 'Default delivery method',
        type: 'enum',
        default: 'branch_pickup',
        options: [
          { value: 'branch_pickup', label: 'Branch pickup' },
          { value: 'home_delivery', label: 'Home delivery' },
        ],
      },
      {
        key: 'require_signature',
        label: 'Require signature',
        type: 'boolean',
        default: true,
      },
      {
        key: 'delivery_fee',
        label: 'Delivery fee',
        type: 'decimal',
        default: '0.00',
        min: '0',
      },
    ],
  },
  {
    key: 'invoices',
    label: 'Invoices',
    optional: false,
    enabledByDefault: true,
    preferences: [
      {
        key: 'auto_invoice_on_ready',
        label: 'Auto-invoice on ready',
        type: 'boolean',
        default: true,
      },
      {
        key: 'invoice_prefix',
        label: 'Invoice prefix',
        type: 'string',
        default: 'INV-',
        maxLength: 10,
      },
      {
        key: 'payment_terms_days',
        label: 'Payment terms days',
        type: 'integer',
        default: 0,
        min: 0,
        max: 180,
      },
      {
        key: 'tax_inclusive_pricing',
        label: 'Tax-inclusive pricing',
        type: 'boolean',
        default: false,
      },
      {
        key: 'gct_rate',
        label: 'GCT rate',
        type: 'decimal',
        default: '15.00',
        min: '0',
        max: '100',
        hint: 'Jamaica General Consumption Tax rate.',
      },
    ],
  },
  {
    key: 'payments',
    label: 'Payments',
    optional: false,
    enabledByDefault: true,
    preferences: [
      {
        key: 'allow_partial_payment',
        label: 'Allow partial payment',
        type: 'boolean',
        default: true,
      },
      {
        key: 'require_payment_before_release',
        label: 'Require payment before release',
        type: 'boolean',
        default: true,
      },
    ],
  },
  {
    key: 'portal',
    label: 'Customer portal',
    optional: true,
    enabledByDefault: true,
    preferences: [
      {
        key: 'self_registration',
        label: 'Self-registration',
        type: 'boolean',
        default: true,
      },
      {
        key: 'require_email_verification',
        label: 'Require email verification',
        type: 'boolean',
        default: true,
      },
      {
        key: 'show_rates',
        label: 'Show rates',
        type: 'boolean',
        default: true,
      },
      {
        key: 'allow_prealert_create',
        label: 'Allow pre-alert creation',
        type: 'boolean',
        default: true,
      },
    ],
  },
] as const satisfies ModuleDefinition[]

type CourierModuleKey = (typeof courierModules)[number]['key']

export const COURIERS_MODULE_CATALOG = defineModuleCatalog([...courierModules])

export const COURIERS_MODULE_KEYS: readonly CourierModuleKey[] =
  COURIERS_MODULE_CATALOG.map((module) => module.key as CourierModuleKey)

const courierModuleKeys = new Set<string>(COURIERS_MODULE_KEYS)

export function isCourierModuleKey(value: string): value is CourierModuleKey {
  return courierModuleKeys.has(value)
}
