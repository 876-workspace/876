import { isError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppHttpError } from '@/platform/errors'

const NOW = 1_785_100_000

const TENANT_ID = 'ten_reyes'
const PACKAGE_ID = 'pkg_kingston_1'
const ORGANIZATION_ID = 'org_reyes_1'
const CUSTOMER_EMAIL = 'alejandra.reyes@example.com'
const CUSTOMER_NAME = 'Alejandra Reyes'
const TEMPLATE_ID = 'etpl_system_shipment_received_default'
const SENDER_ID = 'snd_kingston_1'

function packageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PACKAGE_ID,
    tenantId: TENANT_ID,
    customerId: 'cprof_kingston',
    branchId: 'br_kingston',
    mailboxId: 'mbx_1001',
    categoryId: null,
    category: null,
    trackingNum: 'JM-REYES-1001',
    status: 'PRE_ALERT',
    packageType: 'CARTON',
    description: 'Jamaican Blue Mountain coffee filters',
    quantity: 1,
    actualWeight: 2.5,
    collectedAt: null,
    createdAt: NOW - 100,
    updatedAt: NOW - 100,
    ...overrides,
  }
}

function tenantRecord(overrides: Record<string, unknown> = {}) {
  return {
    object: 'tenant',
    id: TENANT_ID,
    org_id: ORGANIZATION_ID,
    slug: 'reyes-logistics',
    name: 'Reyes Logistics',
    mailbox_prefix: null,
    status: 'ACTIVE',
    created_at: NOW - 1000,
    updated_at: NOW - 1000,
    ...overrides,
  }
}

function registryCustomer(overrides: Record<string, unknown> = {}) {
  return {
    object: 'customer',
    id: 'cus_reyes_1',
    name: CUSTOMER_NAME,
    firstName: 'Alejandra',
    lastName: 'Reyes',
    companyName: null,
    email: CUSTOMER_EMAIL,
    ...overrides,
  }
}

const {
  packageModel,
  packageCategory,
  courierCustomerProfile,
  branch,
  mailbox,
  mockRetrieveTenant,
  mockRegistryRetrieve,
  mockCommunicationsService,
  mockTemplatesResolve,
  mockTemplatesRender,
  mockSendersList,
  mockDeliveriesCreate,
  mockLogger,
} = vi.hoisted(() => ({
  packageModel: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  packageCategory: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  courierCustomerProfile: { findFirst: vi.fn() },
  branch: { findFirst: vi.fn() },
  mailbox: { findFirst: vi.fn() },
  mockRetrieveTenant: vi.fn(),
  mockRegistryRetrieve: vi.fn(),
  mockCommunicationsService: vi.fn(),
  mockTemplatesResolve: vi.fn(),
  mockTemplatesRender: vi.fn(),
  mockSendersList: vi.fn(),
  mockDeliveriesCreate: vi.fn(),
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    package: packageModel,
    packageCategory,
    courierCustomerProfile,
    branch,
    mailbox,
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/modules/tenants', () => ({
  retrieveTenant: mockRetrieveTenant,
}))

vi.mock('@/providers/billing/customers', () => ({
  retrieveCustomer: mockRegistryRetrieve,
}))

vi.mock('@/lib/clients/communications', () => ({
  communicationsService: mockCommunicationsService,
}))

vi.mock('@/platform/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/platform/logger')>()
  return { ...actual, getLogger: () => mockLogger }
})

const { updatePackage } = await import('../packages.service')
const { buildShipmentVariables } = await import('../packages.notifications')
const { resetSettingsForTest } = await import('@/config')

const testEnv: NodeJS.ProcessEnv = {
  ENVIRONMENT: 'test',
  LOG_LEVEL: 'silent',
  PORT: '4001',
  DATABASE_URL: 'prisma://127.0.0.1:1/?api_key=test',
  DIRECT_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  API_876_KEY: '876_app_secret_test_key_for_couriers_api',
  API_INTERNAL_KEY: 'test-internal-key',
  SENTRY_DSN: '',
  COMMUNICATIONS_API_URL: 'http://127.0.0.1:4050',
  COMMUNICATIONS_INTERNAL_KEY: 'test-communications-internal-key',
}

function mockTransition(
  fromStatus: string,
  toStatus: string,
  updatedOverrides: Record<string, unknown> = {}
) {
  packageModel.findFirst.mockResolvedValue(packageRow({ status: fromStatus }))
  packageModel.update.mockResolvedValue(
    packageRow({ status: toStatus, ...updatedOverrides })
  )
}

function mockResolveResult(templateId: string, senderId: string | null) {
  mockTemplatesResolve.mockResolvedValue({
    data: { id: templateId, senderId },
    error: null,
  })
}

function mockRenderResult(subject: string, html: string, text: string) {
  mockTemplatesRender.mockResolvedValue({
    data: {
      object: 'email_composition',
      templateId: TEMPLATE_ID,
      senderId: SENDER_ID,
      subject,
      html,
      text,
    },
    error: null,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetSettingsForTest(testEnv)

  packageModel.findFirst.mockResolvedValue(packageRow())
  packageModel.update.mockResolvedValue(packageRow({ status: 'RECEIVED' }))
  courierCustomerProfile.findFirst.mockResolvedValue({
    id: 'cprof_kingston',
    tenantId: TENANT_ID,
    billingCustomerId: 'cus_reyes_1',
  })
  branch.findFirst.mockResolvedValue({
    id: 'br_kingston',
    tenantId: TENANT_ID,
    name: 'Kingston',
  })
  mockRetrieveTenant.mockResolvedValue(tenantRecord())
  mockRegistryRetrieve.mockResolvedValue({
    data: registryCustomer(),
    error: null,
  })
  mockCommunicationsService.mockReturnValue({
    templates: {
      resolve: mockTemplatesResolve,
      render: mockTemplatesRender,
    },
    senders: { list: mockSendersList },
    deliveries: { create: mockDeliveriesCreate },
  })
  mockResolveResult(TEMPLATE_ID, SENDER_ID)
  mockRenderResult(
    'Package JM-REYES-1001 received by Reyes Logistics',
    '<p>Hello Alejandra Reyes,</p><p>Reyes Logistics has received Jamaican Blue Mountain coffee filters (tracking JM-REYES-1001).</p>',
    'Hello Alejandra Reyes,\n\nReyes Logistics has received Jamaican Blue Mountain coffee filters (tracking JM-REYES-1001).'
  )
  mockSendersList.mockResolvedValue({
    data: {
      object: 'list',
      data: [{ id: 'snd_default_1', isActive: true, isDefault: true }],
      has_more: false,
      total_count: 1,
      url: '',
    },
    error: null,
  })
  mockDeliveriesCreate.mockResolvedValue({
    data: { object: 'email_delivery', id: 'dlv_1' },
    error: null,
  })
})

describe('package shipment notifications', () => {
  it('sends shipment-received with the exact Communications arguments on RECEIVED', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toEqual({
      object: 'package',
      id: PACKAGE_ID,
      tenant_id: TENANT_ID,
      customer_id: 'cprof_kingston',
      branch_id: 'br_kingston',
      mailbox_id: 'mbx_1001',
      category_id: null,
      category: null,
      tracking_num: 'JM-REYES-1001',
      status: 'RECEIVED',
      package_type: 'CARTON',
      description: 'Jamaican Blue Mountain coffee filters',
      quantity: 1,
      actual_weight: 2.5,
      collected_at: null,
      created_at: NOW - 100,
      updated_at: NOW - 100,
    })
    expect(mockTemplatesResolve).toHaveBeenCalledTimes(1)
    expect(mockTemplatesResolve).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      'shipment-received'
    )
    expect(mockTemplatesRender).toHaveBeenCalledTimes(1)
    expect(mockTemplatesRender).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      TEMPLATE_ID,
      {
        variables: {
          organizationName: 'Reyes Logistics',
          customerName: CUSTOMER_NAME,
          trackingNumber: 'JM-REYES-1001',
          packageDescription: 'Jamaican Blue Mountain coffee filters',
          statusLabel: 'received',
          branchName: 'Kingston',
        },
      }
    )
    expect(mockSendersList).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).toHaveBeenCalledTimes(1)
    expect(mockDeliveriesCreate).toHaveBeenCalledWith(ORGANIZATION_ID, {
      senderId: SENDER_ID,
      to: [{ email: CUSTOMER_EMAIL, name: CUSTOMER_NAME }],
      cc: [],
      bcc: [],
      subject: 'Package JM-REYES-1001 received by Reyes Logistics',
      html: '<p>Hello Alejandra Reyes,</p><p>Reyes Logistics has received Jamaican Blue Mountain coffee filters (tracking JM-REYES-1001).</p>',
      text: 'Hello Alejandra Reyes,\n\nReyes Logistics has received Jamaican Blue Mountain coffee filters (tracking JM-REYES-1001).',
      resourceType: 'package',
      resourceId: PACKAGE_ID,
      templateId: TEMPLATE_ID,
      idempotencyKey: expect.stringMatching(
        /^couriers-shipment-received:[0-9a-f]{64}$/
      ),
    })
  })

  it('sends shipment-ready on READY_FOR_PICKUP', async () => {
    // ARRANGE
    mockTransition('ARRIVED', 'READY_FOR_PICKUP')
    mockResolveResult('etpl_system_shipment_ready_default', SENDER_ID)
    mockRenderResult(
      'Package JM-REYES-1001 ready for pickup at Reyes Logistics',
      '<p>Ready for pickup.</p>',
      'Ready for pickup.'
    )

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'READY_FOR_PICKUP',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'READY_FOR_PICKUP' })
    expect(mockTemplatesResolve).toHaveBeenCalledTimes(1)
    expect(mockTemplatesResolve).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      'shipment-ready'
    )
    expect(mockTemplatesRender).toHaveBeenCalledTimes(1)
    expect(mockTemplatesRender).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      'etpl_system_shipment_ready_default',
      {
        variables: expect.objectContaining({ statusLabel: 'ready for pickup' }),
      }
    )
    expect(mockDeliveriesCreate).toHaveBeenCalledTimes(1)
    expect(mockDeliveriesCreate).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      expect.objectContaining({
        templateId: 'etpl_system_shipment_ready_default',
        resourceId: PACKAGE_ID,
        idempotencyKey: expect.stringMatching(
          /^couriers-shipment-ready:[0-9a-f]{64}$/
        ),
      })
    )
  })

  it('sends shipment-delivered on COLLECTED with a branch fallback', async () => {
    // ARRANGE
    mockTransition('READY_FOR_PICKUP', 'COLLECTED', { branchId: null })
    mockResolveResult('etpl_system_shipment_delivered_default', SENDER_ID)

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'COLLECTED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'COLLECTED' })
    expect(mockTemplatesResolve).toHaveBeenCalledTimes(1)
    expect(mockTemplatesResolve).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      'shipment-delivered'
    )
    expect(mockTemplatesRender).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      'etpl_system_shipment_delivered_default',
      {
        variables: expect.objectContaining({
          statusLabel: 'collected',
          branchName: 'your branch',
        }),
      }
    )
    expect(branch.findFirst).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).toHaveBeenCalledTimes(1)
    expect(mockDeliveriesCreate).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(
          /^couriers-shipment-delivered:[0-9a-f]{64}$/
        ),
      })
    )
  })

  it('sends nothing on IN_TRANSIT', async () => {
    // ARRANGE
    mockTransition('RECEIVED', 'IN_TRANSIT')

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'IN_TRANSIT',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'IN_TRANSIT' })
    expect(mockTemplatesResolve).not.toHaveBeenCalled()
    expect(mockTemplatesRender).not.toHaveBeenCalled()
    expect(mockSendersList).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
  })

  it('sends nothing on PRE_ALERT', async () => {
    // ARRANGE
    mockTransition('IN_TRANSIT', 'PRE_ALERT')

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'PRE_ALERT',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'PRE_ALERT' })
    expect(mockTemplatesResolve).not.toHaveBeenCalled()
    expect(mockTemplatesRender).not.toHaveBeenCalled()
    expect(mockSendersList).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
  })

  it('sends nothing on UNCLAIMED', async () => {
    // ARRANGE
    mockTransition('COLLECTED', 'UNCLAIMED')

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'UNCLAIMED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'UNCLAIMED' })
    expect(mockTemplatesResolve).not.toHaveBeenCalled()
    expect(mockTemplatesRender).not.toHaveBeenCalled()
    expect(mockSendersList).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
  })

  it('sends nothing on ARRIVED', async () => {
    // ARRANGE
    mockTransition('IN_TRANSIT', 'ARRIVED')

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'ARRIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'ARRIVED' })
    expect(mockTemplatesResolve).not.toHaveBeenCalled()
    expect(mockTemplatesRender).not.toHaveBeenCalled()
    expect(mockSendersList).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
  })

  it('sends nothing when the transition targets the current status', async () => {
    // ARRANGE
    mockTransition('RECEIVED', 'RECEIVED')

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'RECEIVED' })
    expect(packageModel.update).toHaveBeenCalledTimes(1)
    expect(mockTemplatesResolve).not.toHaveBeenCalled()
    expect(mockTemplatesRender).not.toHaveBeenCalled()
    expect(mockSendersList).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
  })

  it('reuses the same idempotency key when RECEIVED repeats after IN_TRANSIT', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')
    await updatePackage(TENANT_ID, PACKAGE_ID, { status: 'RECEIVED' })
    mockTransition('RECEIVED', 'IN_TRANSIT')
    await updatePackage(TENANT_ID, PACKAGE_ID, { status: 'IN_TRANSIT' })
    mockTransition('IN_TRANSIT', 'RECEIVED')

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(mockDeliveriesCreate).toHaveBeenCalledTimes(2)
    const firstKey = mockDeliveriesCreate.mock.calls[0]?.[1]
      ?.idempotencyKey as string
    const secondKey = mockDeliveriesCreate.mock.calls[1]?.[1]
      ?.idempotencyKey as string
    expect(firstKey).toMatch(/^couriers-shipment-received:[0-9a-f]{64}$/)
    expect(secondKey).toBe(firstKey)
  })

  it('skips the send without failing the update when the customer has no email', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')
    mockRegistryRetrieve.mockResolvedValue({
      data: registryCustomer({ email: null }),
      error: null,
    })

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'RECEIVED' })
    expect(mockTemplatesResolve).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, packageId: PACKAGE_ID }),
      'packages.notification_skipped'
    )
  })

  it('still updates the package and logs the code when Communications returns an error', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')
    mockDeliveriesCreate.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/provider-rejected',
        message: 'The provider rejected the message.',
      },
    })

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'RECEIVED' })
    expect(mockDeliveriesCreate).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        packageId: PACKAGE_ID,
        errorCode: 'communications/provider-rejected',
      }),
      'packages.notification_delivery_failed'
    )
  })

  it('still updates the package when the Communications client throws', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')
    mockDeliveriesCreate.mockRejectedValue(new Error('connection reset'))

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'RECEIVED' })
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, packageId: PACKAGE_ID }),
      'packages.notification_failed'
    )
  })

  it('still updates the package with no rejection when Communications is unconfigured', async () => {
    // ARRANGE
    resetSettingsForTest({
      ...testEnv,
      COMMUNICATIONS_API_URL: '',
      COMMUNICATIONS_INTERNAL_KEY: '',
    })
    const actual = await vi.importActual<
      typeof import('@/lib/clients/communications')
    >('@/lib/clients/communications')
    actual.resetCommunicationsServiceForTest()
    mockCommunicationsService.mockImplementationOnce(() =>
      actual.communicationsService()
    )
    mockTransition('PRE_ALERT', 'RECEIVED')

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'RECEIVED' })
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        packageId: PACKAGE_ID,
        errorCode: 'communications/not-configured',
      }),
      'packages.notification_template_unavailable'
    )
    actual.resetCommunicationsServiceForTest()
  })

  it('passes an exact flat primitive variable map with no undefined values', async () => {
    // ARRANGE
    mockTransition('ARRIVED', 'READY_FOR_PICKUP')
    mockResolveResult('etpl_system_shipment_ready_default', SENDER_ID)

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'READY_FOR_PICKUP',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(mockTemplatesRender).toHaveBeenCalledTimes(1)
    const variables = mockTemplatesRender.mock.calls[0]?.[2]
      ?.variables as Record<string, unknown>
    expect(variables).toEqual({
      organizationName: 'Reyes Logistics',
      customerName: CUSTOMER_NAME,
      trackingNumber: 'JM-REYES-1001',
      packageDescription: 'Jamaican Blue Mountain coffee filters',
      statusLabel: 'ready for pickup',
      branchName: 'Kingston',
    })
    for (const value of Object.values(variables)) {
      expect(typeof value).toBe('string')
      expect(value).not.toBeUndefined()
    }
  })

  it('does not notify a package id from another tenant', async () => {
    // ARRANGE
    packageModel.findFirst.mockResolvedValue(null)

    // ACT
    const result = await updatePackage('ten_other', PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(true)
    expect(result).toMatchObject({ code: 'package/not-found' })
    expect(packageModel.update).not.toHaveBeenCalled()
    expect(mockTemplatesResolve).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
  })

  it('uses the organization default sender when the template has none', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')
    mockResolveResult(TEMPLATE_ID, null)

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(mockSendersList).toHaveBeenCalledTimes(1)
    expect(mockSendersList).toHaveBeenCalledWith(ORGANIZATION_ID)
    expect(mockDeliveriesCreate).toHaveBeenCalledTimes(1)
    expect(mockDeliveriesCreate).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      expect.objectContaining({ senderId: 'snd_default_1' })
    )
  })

  it('skips the send without failing the update when no sender is available', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')
    mockResolveResult(TEMPLATE_ID, null)
    mockSendersList.mockResolvedValue({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '',
      },
      error: null,
    })

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'RECEIVED' })
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, packageId: PACKAGE_ID }),
      'packages.notification_sender_missing'
    )
  })

  it('skips the send and logs when template rendering fails', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')
    mockTemplatesRender.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/template-render-failed',
        message: 'A variable is missing.',
      },
    })

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'RECEIVED' })
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        packageId: PACKAGE_ID,
        errorCode: 'communications/template-render-failed',
      }),
      'packages.notification_render_failed'
    )
  })

  it('skips the send without failing the update when the registry lookup fails', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')
    mockRegistryRetrieve.mockResolvedValue({
      data: null,
      error: { code: 'customer/not-found', message: 'Customer not found.' },
    })

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'RECEIVED' })
    expect(mockTemplatesResolve).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        packageId: PACKAGE_ID,
        errorCode: 'customer/not-found',
      }),
      'packages.notification_registry_unavailable'
    )
  })

  it('builds the fallback variable map with no undefined values', () => {
    // ACT
    const variables = buildShipmentVariables({
      organizationName: 'Reyes Logistics',
      customerName: 'Customer',
      trackingNumber: null,
      packageDescription: null,
      category: 'shipment-delivered',
      branchName: null,
      packageId: PACKAGE_ID,
    })

    // ASSERT
    expect(variables).toEqual({
      organizationName: 'Reyes Logistics',
      customerName: 'Customer',
      trackingNumber: PACKAGE_ID,
      packageDescription: 'your package',
      statusLabel: 'collected',
      branchName: 'your branch',
    })
  })

  it('skips the send without failing the update when the tenant is missing', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')
    mockRetrieveTenant.mockRejectedValueOnce(
      new AppHttpError({
        code: 'tenant/not-found',
        message: 'Not found.',
        httpStatus: 404,
      })
    )

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'RECEIVED' })
    expect(mockRegistryRetrieve).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, packageId: PACKAGE_ID }),
      'packages.notification_tenant_missing'
    )
  })

  it('skips the send without failing the update when the customer profile is missing', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')
    courierCustomerProfile.findFirst.mockResolvedValue(null)

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'RECEIVED' })
    expect(mockRegistryRetrieve).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, packageId: PACKAGE_ID }),
      'packages.notification_customer_missing'
    )
  })

  it('skips the send and logs when template resolution fails', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')
    mockTemplatesResolve.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/template-not-found',
        message: 'No template.',
      },
    })

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'RECEIVED' })
    expect(mockTemplatesRender).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        packageId: PACKAGE_ID,
        errorCode: 'communications/template-not-found',
      }),
      'packages.notification_template_unavailable'
    )
  })

  it('skips the send and logs when sender listing fails', async () => {
    // ARRANGE
    mockTransition('PRE_ALERT', 'RECEIVED')
    mockResolveResult(TEMPLATE_ID, null)
    mockSendersList.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/sender-not-found',
        message: 'No sender.',
      },
    })

    // ACT
    const result = await updatePackage(TENANT_ID, PACKAGE_ID, {
      status: 'RECEIVED',
    })

    // ASSERT
    expect(isError(result)).toBe(false)
    expect(result).toMatchObject({ status: 'RECEIVED' })
    expect(mockTemplatesRender).not.toHaveBeenCalled()
    expect(mockDeliveriesCreate).not.toHaveBeenCalled()
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        packageId: PACKAGE_ID,
        errorCode: 'communications/sender-not-found',
      }),
      'packages.notification_sender_unavailable'
    )
  })
})
