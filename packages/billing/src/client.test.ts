import { describe, expect, it, vi } from 'vitest'

import { create876Client } from './client'

describe('create876Client', () => {
  it('calls the versioned invoice endpoint with session credentials', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'invoice', id: 'blinv_1' },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    const result = await client.invoices.create({
      customerId: 'blcus_1',
      lines: [{ description: 'Dinner', unitAmount: 2500 }],
    })

    expect(result).toEqual({
      data: { object: 'invoice', id: 'blinv_1' },
      error: null,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/invoices',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          customerId: 'blcus_1',
          lines: [{ description: 'Dinner', unitAmount: 2500 }],
        }),
      })
    )
  })

  it('updates invoice preferences through the versioned tenant API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'invoice_preference', tenantId: 'blten_1' },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })
    const params = {
      defaultTaxBehavior: 'EXCLUSIVE' as const,
      defaultNotes: 'Thank you for your business.',
      defaultTerms: null,
      allowEditingSentInvoices: false,
      lateFeesEnabled: true,
      lateFeeCalculationType: 'PERCENTAGE' as const,
      lateFeePercent: 2.5,
      lateFeeAmount: null,
      lateFeeGraceDays: 5,
      lateFeeGenerateAsDraft: true,
    }

    const result = await client.invoicePreferences.update(params)

    expect(result.data).toEqual({
      object: 'invoice_preference',
      tenantId: 'blten_1',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/invoice-preferences',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(params) })
    )
  })

  it('returns a structured error when Billing sends an invalid success body', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'invoice' },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    const result = await client.invoices.create({
      customerId: 'blcus_1',
      lines: [{ description: 'Dinner', unitAmount: 2500 }],
    })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'billing/invalid-response',
        message: 'The Billing service returned an invalid response.',
      },
    })
  })

  it('rejects a success resource without the canonical result envelope', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ object: 'invoice', id: 'blinv_1' }))
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    const result = await client.invoices.create({
      customerId: 'blcus_1',
      lines: [{ description: 'Dinner', unitAmount: 2500 }],
    })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'billing/invalid-response',
        message: 'The Billing service returned an invalid response.',
      },
    })
  })

  it('rejects additional result-envelope fields', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'invoice', id: 'blinv_1' },
        error: null,
        status: 200,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    const result = await client.invoices.create({
      customerId: 'blcus_1',
      lines: [{ description: 'Dinner', unitAmount: 2500 }],
    })

    expect(result.error?.code).toBe('billing/invalid-response')
  })

  it('creates a tax rate through the versioned tenant API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'tax_rate', id: 'bltaxr_1' },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    const result = await client.taxRates.create({
      name: 'Standard GCT',
      rate: '15',
      taxAuthorityId: 'bltaxa_1',
      inclusive: false,
    })

    expect(result).toEqual({
      data: { object: 'tax_rate', id: 'bltaxr_1' },
      error: null,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/tax-rates',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Standard GCT',
          rate: '15',
          taxAuthorityId: 'bltaxa_1',
          inclusive: false,
        }),
      })
    )
  })

  it('creates a bank account through the canonical banking path', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'bank_account', id: 'blba_1' },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    const result = await client.bankAccounts.create({
      name: 'Undeposited Funds',
      accountType: 'UNDEPOSITED_FUNDS',
      currency: 'JMD',
    })

    expect(result.data).toEqual({ object: 'bank_account', id: 'blba_1' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/banking/accounts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Undeposited Funds',
          accountType: 'UNDEPOSITED_FUNDS',
          currency: 'JMD',
        }),
      })
    )
  })

  it('records a payment through the canonical payments path', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'payment', id: 'blpay_1' },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })
    const params = {
      customerId: 'blcus_1',
      paymentModeId: 'blpmode_1',
      depositAccountId: 'blba_1',
      amount: '10000',
      currency: 'JMD',
      paymentDate: 1_788_825_600,
      allocations: [{ invoiceId: 'blinv_1', amount: '10000' }],
    }

    const result = await client.payments.create(params)

    expect(result.data).toEqual({ object: 'payment', id: 'blpay_1' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/payments',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })

  it('idempotently bills a due subscription through the versioned API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'invoice', id: 'inv_1' },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    const result = await client.subscriptions.bill('sub/monthly')

    expect(result.data).toEqual({ object: 'invoice', id: 'inv_1' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/subscriptions/sub%2Fmonthly/bill',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('bulk-updates subscription invoice modes through the typed preferences resource', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'subscription_bulk_update', updated: 2 },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })
    const params = {
      subscriptionIds: ['sub_1', 'sub_2'],
      invoiceModeOverride: 'DRAFT' as const,
    }

    const result =
      await client.subscriptions.preferences.bulkUpdateInvoiceModes(params)

    expect(result.data).toEqual({
      object: 'subscription_bulk_update',
      updated: 2,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/subscription-preferences/invoice-modes',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(params) })
    )
  })

  it('deletes a caller-owned saved subscription view', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'subscription_view', id: 'view/1', deleted: true },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    const result = await client.subscriptions.views.delete('view/1')

    expect(result.data).toEqual({
      object: 'subscription_view',
      id: 'view/1',
      deleted: true,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/subscription-views/view%2F1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('creates a provider-neutral merchant connection', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'payment_provider_connection', id: 'ppcon_1' },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })
    const params = {
      providerId: 'pprov_amber_pay',
      name: 'Amber Pay Jamaica',
      environment: 'SANDBOX' as const,
      credentialsReference: 'secret://billing/amber-pay',
    }

    const result = await client.paymentProviders.connections.create(params)

    expect(result.data).toEqual({
      object: 'payment_provider_connection',
      id: 'ppcon_1',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/payment-providers/connections',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })

  it('clones a plan through the typed catalog resource', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'plan', id: 'plan_copy' },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })
    const params = { code: 'growth-copy', name: 'Growth copy' }

    const result = await client.plans.clone('plan/growth', params)

    expect(result.data).toEqual({ object: 'plan', id: 'plan_copy' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/plans/plan%2Fgrowth/clone',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })

  it('updates add-on plan availability atomically', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: {
          object: 'plan_addon_association_batch',
          id: 'addon_storage',
          updated: 2,
        },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })
    const associations = [
      { planId: 'plan_basic', associationType: 'OPTIONAL' as const },
      { planId: 'plan_pro', associationType: 'MANDATORY' as const },
    ]

    const result = await client.addons.upsertAssociations(
      'addon/storage',
      associations
    )

    expect(result.data).toMatchObject({
      object: 'plan_addon_association_batch',
      updated: 2,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/addons/addon%2Fstorage/associations',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ associations }),
      })
    )
  })

  it('resolves a customer price list without floating-point transport', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: {
          object: 'resolved_price',
          currency: 'JMD',
          amount: '12500',
          price_list_id: 'plist_partner',
        },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    const result = await client.priceLists.resolve(
      'plist/partner',
      'prc_growth',
      5
    )

    expect(result.data?.amount).toBe('12500')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/price-lists/plist%2Fpartner/resolve',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ priceId: 'prc_growth', quantity: 5 }),
      })
    )
  })
})
