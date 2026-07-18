import { beforeEach, describe, expect, it, vi } from 'vitest'

import { generateId, ID_PREFIXES } from './index'

const { createPrefixedId } = vi.hoisted(() => ({ createPrefixedId: vi.fn() }))

vi.mock('@876/core/id', () => ({ createPrefixedId }))

describe('Billing IDs', () => {
  beforeEach(() => {
    createPrefixedId.mockImplementation(
      (prefix: string) => `${prefix}_01JABCDEF`
    )
    vi.clearAllMocks()
  })

  it('publishes the complete local entity prefix catalog', () => {
    expect(ID_PREFIXES).toEqual({
      Tenant: 'ten',
      AppFinanceConnection: 'afc',
      Item: 'item',
      Customer: 'cus',
      Contact: 'con',
      Address: 'addr',
      Product: 'prod',
      Plan: 'plan',
      Addon: 'addon',
      PlanAddonAssociation: 'padd',
      Price: 'prc',
      PriceTier: 'ptier',
      PriceList: 'plist',
      PriceListEntry: 'plent',
      PriceListEntryTier: 'pltier',
      Quote: 'qt',
      QuoteLine: 'qtl',
      Invoice: 'inv',
      InvoiceLine: 'invl',
      Subscription: 'sub',
      SubscriptionItem: 'si',
      SubscriptionEvent: 'sev',
      SubscriptionAmendment: 'samd',
      SubscriptionAmendmentItem: 'sami',
      SubscriptionLifecycleSchedule: 'ssch',
      SubscriptionCharge: 'schg',
      SubscriptionNotificationOutbox: 'snot',
      SubscriptionCustomView: 'scv',
      SubscriptionCustomViewRule: 'scvr',
      SubscriptionCustomViewColumn: 'scvc',
      TaxAuthority: 'taxa',
      TaxRate: 'taxr',
      Role: 'role',
      Member: 'mem',
      Vendor: 'vend',
      Estimate: 'est',
      EstimateLine: 'estl',
      BankAccount: 'ba',
      BankTransaction: 'btxn',
      PaymentMode: 'pmode',
      Payment: 'pay',
      PaymentAllocation: 'palloc',
      CreditNote: 'cn',
      CreditNoteLine: 'cnl',
      CreditNoteAllocation: 'cnalloc',
      Refund: 'ref',
      PaymentTerm: 'pterm',
      Salesperson: 'salesp',
      Coupon: 'cpn',
      CouponCurrencyAmount: 'ccamt',
      CouponPlanApplicability: 'cpplan',
      CouponAddonApplicability: 'cpadd',
      CouponCustomerEligibility: 'cpelig',
      CouponRedemption: 'cpred',
      PromotionCode: 'promo',
      SubscriptionDiscount: 'sdisc',
      SubscriptionBillingRun: 'brun',
      PaymentProvider: 'pprov',
      PaymentProviderConnection: 'ppcon',
      PaymentAttempt: 'patm',
      PaymentProviderEvent: 'ppevt',
      CustomerLedgerEntry: 'cled',
      LateFeeAssessment: 'lfa',
    })
  })

  it.each(Object.entries(ID_PREFIXES))(
    'generates %s IDs using %s',
    (entity, prefix) => {
      const result = generateId(entity as keyof typeof ID_PREFIXES)

      expect(result).toBe(`${prefix}_01JABCDEF`)
      expect(createPrefixedId).toHaveBeenCalledTimes(1)
      expect(createPrefixedId).toHaveBeenCalledWith(prefix)
    }
  )
})
