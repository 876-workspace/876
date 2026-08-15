import { Router } from 'express'

import { createGuardResolver, type AuthRepository } from '@/http/auth'
import {
  activeMemberAuthorization,
  createAccessRouter,
  createInternalAccessRouter,
} from '@/modules/access'
import { createBankingRouter } from '@/modules/banking'
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
import {
  createDocumentsRouter,
  createInternalDocumentsRouter,
} from '@/modules/documents'
import {
  activeConnectionAuthorization,
  createFinanceConnectionsRouter,
  createIntegrationBankAccountsRouter,
} from '@/modules/finance-connections'
import { createHealthRouter } from '@/modules/health'
import { createPaymentProvidersRouter } from '@/modules/payment-providers'
import { createPaymentsRouter } from '@/modules/payments'
import { createInternalReportingRouter } from '@/modules/reporting'
import { createSubscriptionsRouter } from '@/modules/subscriptions'
import {
  createIntegrationOrganizationRouter,
  createInternalTenantsRouter,
  createTenantsRouter,
  tenantAuthorizationByOrganizationId,
} from '@/modules/tenants'
import { createTaxRouter } from '@/modules/tax'
import { createVendorsRouter } from '@/modules/vendors'
import { HttpIdentityGateway } from '@/providers/identity'

export function buildRoutes(): Router {
  const root = Router()
  const repository: AuthRepository = {
    tenantByOrganizationId: tenantAuthorizationByOrganizationId,
    activeMember: activeMemberAuthorization,
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
  root.use('/api/v1', createCommercialRouter(resolveGuards))
  root.use('/api/v1', createBankingRouter(resolveGuards))
  root.use('/api/v1', createCatalogRouter(resolveGuards))
  root.use('/api/v1', createCurrenciesRouter(resolveGuards))
  root.use('/api/v1', createCustomersRouter(resolveGuards))
  root.use('/api/v1', createDiscountsRouter(resolveGuards))
  root.use('/api/v1', createDocumentsRouter(resolveGuards))
  root.use('/api/v1', createTaxRouter(resolveGuards))
  root.use('/api/v1', createPaymentProvidersRouter(resolveGuards))
  root.use('/api/v1', createPaymentsRouter(resolveGuards))
  root.use('/api/v1', createVendorsRouter(resolveGuards))
  root.use('/api/v1', createSubscriptionsRouter(resolveGuards))
  root.use('/api/v1', createBillingEngineRouter(resolveGuards))
  root.use('/internal', createInternalBillingEngineRouter(resolveGuards))
  root.use('/internal', createInternalTenantsRouter(resolveGuards))
  root.use('/internal', createInternalAccessRouter(resolveGuards))
  root.use('/internal', createInternalCustomersRouter(resolveGuards))
  root.use('/internal', createInternalDocumentsRouter(resolveGuards))
  root.use('/internal', createInternalReportingRouter(resolveGuards))
  return root
}
