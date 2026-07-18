import { beforeEach, describe, expect, it, vi } from 'vitest'

import { list as listCurrencies } from './currencies/list'
import { listSupported } from './currencies/list-supported'
import { listCustomers, listDocumentRecipients } from './customers/list'
import { retrieve as retrieveCustomer } from './customers/retrieve'
import { list as listInvoices } from './invoices/list'
import { retrieve as retrieveInvoice } from './invoices/retrieve'
import { list as listItems } from './items/list'
import { retrieve as retrieveItem } from './items/retrieve'
import { list as listMembers } from './members/list'
import { list as listPlans } from './plans/list'
import { retrieve as retrievePlan } from './plans/retrieve'
import { list as listPrices } from './prices/list'
import { retrieve as retrievePrice } from './prices/retrieve'
import { list as listProducts } from './products/list'
import { retrieve as retrieveProduct } from './products/retrieve'
import { list as listQuotes } from './quotes/list'
import { retrieve as retrieveQuote } from './quotes/retrieve'
import { listSubscriptions } from './subscriptions/list'
import { retrieve as retrieveSubscription } from './subscriptions/retrieve'
import { list as listTaxAuthorities } from './tax-authorities/list'
import { list as listTaxRates } from './tax-rates/list'
import {
  listByOrganizationIds,
  retrieveByOrganizationId,
  retrieveBySlug,
} from './tenants/retrieve'

const { prismaRef } = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return prismaRef.current
  },
}))

const RESULT = [{ id: 'row_123' }]

type QueryCase = {
  name: string
  act: () => unknown
  model: string
  method: string
  args: unknown
}

const cases: QueryCase[] = [
  {
    name: 'lists globally supported currencies',
    act: () => listSupported(),
    model: 'currency',
    method: 'findMany',
    args: { where: { isActive: true }, orderBy: { code: 'asc' } },
  },
  {
    name: 'lists enabled tenant currencies',
    act: () => listCurrencies('ten_123'),
    model: 'tenantCurrency',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123', isEnabled: true },
      include: { currency: true },
      orderBy: [{ isDefault: 'desc' }, { currencyCode: 'asc' }],
    },
  },
  {
    name: 'lists all customers without a status filter',
    act: () => listCustomers('ten_123'),
    model: 'customer',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123' },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'lists customers with a status filter',
    act: () => listCustomers('ten_123', 'ARCHIVED'),
    model: 'customer',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123', status: 'ARCHIVED' },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'lists active document recipients with billing details',
    act: () => listDocumentRecipients('ten_123'),
    model: 'customer',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123', status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        customerKind: true,
        companyName: true,
        salutation: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        workPhone: true,
        priceListId: true,
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          take: 1,
          select: {
            salutation: true,
            firstName: true,
            lastName: true,
            email: true,
            workPhone: true,
            mobilePhone: true,
          },
        },
        addresses: {
          where: { type: 'billing' },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          take: 1,
          select: {
            label: true,
            attention: true,
            line1: true,
            line2: true,
            city: true,
            state: true,
            postalCode: true,
            countryCode: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    },
  },
  {
    name: 'retrieves a tenant customer',
    act: () => retrieveCustomer('ten_123', 'cus_123'),
    model: 'customer',
    method: 'findFirst',
    args: {
      where: { id: 'cus_123', tenantId: 'ten_123' },
      include: {
        priceList: true,
        _count: {
          select: { invoices: true, quotes: true, subscriptions: true },
        },
      },
    },
  },
  {
    name: 'lists all items without an active filter',
    act: () => listItems('ten_123'),
    model: 'item',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123' },
      include: { prices: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'lists inactive items',
    act: () => listItems('ten_123', false),
    model: 'item',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123', isActive: false },
      include: { prices: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'retrieves a tenant item',
    act: () => retrieveItem('ten_123', 'item_123'),
    model: 'item',
    method: 'findFirst',
    args: {
      where: { id: 'item_123', tenantId: 'ten_123' },
      include: {
        _count: {
          select: { prices: true, quoteLines: true, invoiceLines: true },
        },
      },
    },
  },
  {
    name: 'lists all products without an active filter',
    act: () => listProducts('ten_123'),
    model: 'product',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123' },
      include: {
        fallbackPlan: true,
        addons: { orderBy: { createdAt: 'desc' } },
        plans: {
          include: { prices: { orderBy: { createdAt: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'lists active products',
    act: () => listProducts('ten_123', true),
    model: 'product',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123', isActive: true },
      include: {
        fallbackPlan: true,
        addons: { orderBy: { createdAt: 'desc' } },
        plans: {
          include: { prices: { orderBy: { createdAt: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'retrieves a tenant product',
    act: () => retrieveProduct('ten_123', 'prod_123'),
    model: 'product',
    method: 'findFirst',
    args: {
      where: { id: 'prod_123', tenantId: 'ten_123' },
      include: {
        _count: { select: { plans: true, addons: true, coupons: true } },
        fallbackPlan: true,
      },
    },
  },
  {
    name: 'lists plans without optional filters',
    act: () => listPlans('ten_123'),
    model: 'plan',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123' },
      include: {
        product: true,
        prices: { include: { tiers: { orderBy: { fromUnit: 'asc' } } } },
        addonAssociations: { include: { addon: true } },
      },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'lists inactive plans for a product',
    act: () => listPlans('ten_123', false, 'prod_123'),
    model: 'plan',
    method: 'findMany',
    args: {
      where: {
        tenantId: 'ten_123',
        productId: 'prod_123',
        isActive: false,
      },
      include: {
        product: true,
        prices: { include: { tiers: { orderBy: { fromUnit: 'asc' } } } },
        addonAssociations: { include: { addon: true } },
      },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'retrieves a tenant plan',
    act: () => retrievePlan('ten_123', 'plan_123'),
    model: 'plan',
    method: 'findFirst',
    args: {
      where: { id: 'plan_123', tenantId: 'ten_123' },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        _count: { select: { prices: true } },
        addonAssociations: { include: { addon: true } },
      },
    },
  },
  {
    name: 'lists prices without optional filters',
    act: () => listPrices('ten_123'),
    model: 'price',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123' },
      include: {
        item: true,
        plan: { include: { product: true } },
        addon: { include: { product: true } },
        tiers: { orderBy: { fromUnit: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'lists inactive item prices',
    act: () => listPrices('ten_123', false, { itemId: 'item_123' }),
    model: 'price',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123', itemId: 'item_123', isActive: false },
      include: {
        item: true,
        plan: { include: { product: true } },
        addon: { include: { product: true } },
        tiers: { orderBy: { fromUnit: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'retrieves a tenant price',
    act: () => retrievePrice('ten_123', 'prc_123'),
    model: 'price',
    method: 'findFirst',
    args: {
      where: { id: 'prc_123', tenantId: 'ten_123' },
      include: {
        tiers: true,
        item: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true, code: true } },
        addon: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            subscriptionItems: true,
            quoteLines: true,
            estimateLines: true,
            invoiceLines: true,
            creditNoteLines: true,
            priceListEntries: true,
          },
        },
      },
    },
  },
  {
    name: 'lists quotes without a status filter',
    act: () => listQuotes('ten_123'),
    model: 'quote',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123' },
      include: { customer: true, lines: true, convertedInvoice: true },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'lists accepted quotes',
    act: () => listQuotes('ten_123', 'ACCEPTED'),
    model: 'quote',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123', status: 'ACCEPTED' },
      include: { customer: true, lines: true, convertedInvoice: true },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'retrieves a tenant quote',
    act: () => retrieveQuote('ten_123', 'qt_123'),
    model: 'quote',
    method: 'findFirst',
    args: {
      where: { id: 'qt_123', tenantId: 'ten_123' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        lines: true,
      },
    },
  },
  {
    name: 'lists invoices without a status filter',
    act: () => listInvoices('ten_123'),
    model: 'invoice',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123' },
      include: { customer: true, quote: true, subscription: true, lines: true },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'lists paid invoices',
    act: () => listInvoices('ten_123', 'PAID'),
    model: 'invoice',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123', status: 'PAID' },
      include: { customer: true, quote: true, subscription: true, lines: true },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'retrieves a tenant invoice',
    act: () => retrieveInvoice('ten_123', 'inv_123'),
    model: 'invoice',
    method: 'findFirst',
    args: {
      where: { id: 'inv_123', tenantId: 'ten_123' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            addresses: {
              orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
              take: 1,
            },
          },
        },
        lines: true,
        lateFeeAssessment: {
          include: {
            sourceInvoice: { select: { id: true, number: true } },
          },
        },
        lateFeeAssessments: {
          include: {
            lateFeeInvoice: {
              select: { id: true, number: true, status: true },
            },
          },
        },
      },
    },
  },
  {
    name: 'lists subscriptions without filters',
    act: () => listSubscriptions('ten_123'),
    model: 'subscription',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123', deletedAt: null },
      include: {
        customer: true,
        items: {
          where: { isActive: true },
          include: {
            price: {
              include: { item: true, plan: { include: { product: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'lists active subscriptions for a customer',
    act: () =>
      listSubscriptions('ten_123', {
        status: 'ACTIVE',
        customerId: 'cus_123',
      }),
    model: 'subscription',
    method: 'findMany',
    args: {
      where: {
        tenantId: 'ten_123',
        status: 'ACTIVE',
        customerId: 'cus_123',
        deletedAt: null,
      },
      include: {
        customer: true,
        items: {
          where: { isActive: true },
          include: {
            price: {
              include: { item: true, plan: { include: { product: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    },
  },
  {
    name: 'retrieves a tenant subscription',
    act: () => retrieveSubscription('ten_123', 'sub_123'),
    model: 'subscription',
    method: 'findFirst',
    args: {
      where: { id: 'sub_123', tenantId: 'ten_123', deletedAt: null },
      include: {
        customer: true,
        invoices: {
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        events: { orderBy: { occurredAt: 'desc' } },
        amendments: {
          include: { items: { orderBy: { position: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        },
        lifecycleSchedules: { orderBy: { createdAt: 'desc' } },
        charges: { orderBy: { createdAt: 'desc' } },
        discounts: {
          include: {
            coupon: true,
            promotionCode: true,
            subscriptionItem: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        items: {
          where: { isActive: true },
          include: {
            price: {
              include: { item: true, plan: { include: { product: true } } },
            },
          },
        },
      },
    },
  },
  {
    name: 'lists workspace members oldest first',
    act: () => listMembers('ten_123'),
    model: 'member',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123' },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    },
  },
  {
    name: 'retrieves a tenant by organization ID',
    act: () => retrieveByOrganizationId('org_123'),
    model: 'tenant',
    method: 'findUnique',
    args: { where: { organizationId: 'org_123' } },
  },
  {
    name: 'retrieves a tenant by slug',
    act: () => retrieveBySlug('efesto-technologies'),
    model: 'tenant',
    method: 'findUnique',
    args: { where: { slug: 'efesto-technologies' } },
  },
  {
    name: 'lists tenants by organization IDs',
    act: () => listByOrganizationIds(['org_123', 'org_456']),
    model: 'tenant',
    method: 'findMany',
    args: {
      where: { organizationId: { in: ['org_123', 'org_456'] } },
    },
  },
  {
    name: 'lists tax authorities with defaults first',
    act: () => listTaxAuthorities('ten_123'),
    model: 'taxAuthority',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123' },
      orderBy: [{ isDefault: 'desc' }, { isActive: 'desc' }, { name: 'asc' }],
    },
  },
  {
    name: 'lists tax rates with authorities',
    act: () => listTaxRates('ten_123'),
    model: 'taxRate',
    method: 'findMany',
    args: {
      where: { tenantId: 'ten_123' },
      include: { taxAuthority: true },
      orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }, { name: 'asc' }],
    },
  },
]

describe('Billing service read models', () => {
  beforeEach(() => {
    const method = () => vi.fn().mockResolvedValue(RESULT)
    prismaRef.current = {
      currency: { findMany: method() },
      tenantCurrency: { findMany: method() },
      customer: { findMany: method(), findFirst: method() },
      invoice: { findMany: method(), findFirst: method() },
      item: { findMany: method(), findFirst: method() },
      member: { findMany: method() },
      plan: { findMany: method(), findFirst: method() },
      price: { findMany: method(), findFirst: method() },
      product: { findMany: method(), findFirst: method() },
      quote: { findMany: method(), findFirst: method() },
      subscription: { findMany: method(), findFirst: method() },
      taxAuthority: { findMany: method() },
      taxRate: { findMany: method() },
      tenant: { findMany: method(), findUnique: method() },
    }
    vi.clearAllMocks()
  })

  it.each(cases)('$name', async ({ act, model, method, args }) => {
    const result = await act()
    const query = (
      prismaRef.current as Record<
        string,
        Record<string, ReturnType<typeof vi.fn>>
      >
    )[model][method]

    expect(result).toEqual(RESULT)
    expect(query).toHaveBeenCalledTimes(1)
    expect(query).toHaveBeenCalledWith(args)
  })

  it('returns an empty tenant list without querying for empty organization IDs', () => {
    const tenantModel = (
      prismaRef.current as Record<
        string,
        Record<string, ReturnType<typeof vi.fn>>
      >
    ).tenant

    const result = listByOrganizationIds([])

    expect(result).toEqual([])
    expect(tenantModel.findMany).not.toHaveBeenCalled()
  })
})
