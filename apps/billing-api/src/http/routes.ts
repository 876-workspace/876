import { Router } from 'express'

import { createGuardResolver, type AuthRepository } from '@/http/auth'
import {
  createAccessRouter,
  createInternalAccessRouter,
  effectiveMemberAuthorization,
} from '@/modules/access'
import {
  createAccountingProvidersRouter,
  createInternalAccountingProvidersRouter,
} from '@/modules/accounting-providers'
import {
  createBankingDirectoryRouter,
  createBankingEngineRouter,
  createBankingRouter,
  createBankingStatementFileRouter,
} from '@/modules/banking'
import {
  createBillingEngineRouter,
  createInternalBillingEngineRouter,
} from '@/modules/billing-engine'
import { createCatalogRouter } from '@/modules/catalog'
import { createCommercialRouter } from '@/modules/commercial'
import { createCurrenciesRouter } from '@/modules/currencies'
import {
  createCustomersRouter,
  createInternalCustomersRouter,
} from '@/modules/customers'
import { createDiscountsRouter } from '@/modules/discounts'
import { createInternalDocumentsRouter } from '@/modules/documents/documents.internal-routes'
import { createDocumentsRouter } from '@/modules/documents/documents.routes'
import { createQuoteLifecycleRouter } from '@/modules/documents/quote-lifecycle.routes'
import { createRecurringInvoicesRouter } from '@/modules/documents/recurring-invoices.routes'
import { createSalesOrdersRouter } from '@/modules/documents/sales-orders.routes'
import { createSalesReceiptsRouter } from '@/modules/documents/sales-receipts.routes'
import {
  activeConnectionAuthorization,
  createFinanceConnectionsRouter,
  createIntegrationBankAccountsRouter,
} from '@/modules/finance-connections'
import { createHealthRouter } from '@/modules/health'
import { createPaymentIntentsRouter } from '@/modules/payment-intents'
import { createPaymentMethodsRouter } from '@/modules/payment-methods'
import { createPaymentProvidersRouter } from '@/modules/payment-providers'
import { createPaymentsRouter } from '@/modules/payments/payments.routes'
import {
  createInternalReportingRouter,
  createReportingRouter,
} from '@/modules/reporting'
import { createSubscriptionsRouter } from '@/modules/subscriptions'
import { createTaxRouter } from '@/modules/tax'
import {
  createIntegrationOrganizationRouter,
  createInternalTenantsRouter,
  createTenantsRouter,
  tenantAuthorizationByOrganizationId,
} from '@/modules/tenants'
import { createVendorsRouter } from '@/modules/vendors'
import { HttpIdentityGateway } from '@/providers/identity'

export function buildRoutes(): Router {
  const root = Router()
  const repository: AuthRepository = {
    tenantByOrganizationId: tenantAuthorizationByOrganizationId,
    effectiveMember: effectiveMemberAuthorization,
    activeConnection: activeConnectionAuthorization,
  }
  const resolveGuards = createGuardResolver({
    repository,
    identity: new HttpIdentityGateway(),
  })

  root.use(createHealthRouter())
  root.use('/api/v1', createAccessRouter(resolveGuards))
  root.use('/api/v1', createTenantsRouter(resolveGuards))
  root.use('/api/v1', createIntegrationOrganizationRouter(resolveGuards))
  root.use('/api/v1', createFinanceConnectionsRouter(resolveGuards))
  root.use('/api/v1', createIntegrationBankAccountsRouter(resolveGuards))
  root.use('/api/v1', createAccountingProvidersRouter(resolveGuards))
  root.use('/api/v1', createCommercialRouter(resolveGuards))
  root.use('/api/v1', createBankingRouter(resolveGuards))
  root.use('/api/v1', createBankingDirectoryRouter(resolveGuards))
  root.use('/api/v1', createBankingEngineRouter(resolveGuards))
  root.use('/api/v1', createBankingStatementFileRouter(resolveGuards))
  root.use('/api/v1', createCatalogRouter(resolveGuards))
  root.use('/api/v1', createCurrenciesRouter(resolveGuards))
  root.use('/api/v1', createCustomersRouter(resolveGuards))
  root.use('/api/v1', createDiscountsRouter(resolveGuards))
  root.use('/api/v1', createDocumentsRouter(resolveGuards))
  root.use('/api/v1', createQuoteLifecycleRouter(resolveGuards))
  root.use('/api/v1', createSalesReceiptsRouter(resolveGuards))
  root.use('/api/v1', createSalesOrdersRouter(resolveGuards))
  root.use('/api/v1', createRecurringInvoicesRouter(resolveGuards))
  root.use('/api/v1', createTaxRouter(resolveGuards))
  root.use('/api/v1', createPaymentProvidersRouter(resolveGuards))
  root.use('/api/v1', createPaymentMethodsRouter(resolveGuards))
  root.use('/api/v1', createPaymentIntentsRouter(resolveGuards))
  root.use('/api/v1', createPaymentsRouter(resolveGuards))
  root.use('/api/v1', createReportingRouter(resolveGuards))
  root.use('/api/v1', createVendorsRouter(resolveGuards))
  root.use('/api/v1', createSubscriptionsRouter(resolveGuards))
  root.use('/api/v1', createBillingEngineRouter(resolveGuards))
  root.use('/internal', createInternalBillingEngineRouter(resolveGuards))
  root.use('/internal', createInternalAccountingProvidersRouter(resolveGuards))
  root.use('/internal', createInternalTenantsRouter(resolveGuards))
  root.use('/internal', createInternalAccessRouter(resolveGuards))
  root.use('/internal', createInternalCustomersRouter(resolveGuards))
  root.use('/internal', createInternalDocumentsRouter(resolveGuards))
  root.use('/internal', createInternalReportingRouter(resolveGuards))
  return root
}
