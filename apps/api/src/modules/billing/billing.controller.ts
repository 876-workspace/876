import type { Request, Response } from 'express'

import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  BillingAccountCreate,
  BillingAccountUpdate,
  FinanceProvisioningReconcileRequest,
  SubscriptionCreate,
  SubscriptionItemCreate,
  SubscriptionItemUpdate,
  SubscriptionUpdate,
} from './billing.schemas'
import * as service from './billing.service'

export async function dispatchBillingCustomerSync(
  _req: Request,
  res: Response
) {
  const result = await service.dispatchBillingCustomerSync()
  res.json({ object: 'billing_customer_sync_dispatch', ...result })
}

export async function reconcileBillingCustomerSync(
  _req: Request,
  res: Response
) {
  const result = await service.reconcileBillingCustomerSync()
  res.json({ object: 'billing_customer_sync_reconcile', ...result })
}

export async function reconcileFinanceProvisioning(
  req: Request,
  res: Response
) {
  const body = validBody<FinanceProvisioningReconcileRequest>(req)
  const result = await service.reconcileFinanceProvisioning(body)
  res.json({ object: 'finance_provisioning_reconciliation', ...result })
}

export async function dispatchFinanceProvisioning(
  _req: Request,
  res: Response
) {
  const result = await service.dispatchFinanceProvisioning()
  res.json({ object: 'finance_provisioning_dispatch', ...result })
}

export async function listBillingAccounts(req: Request, res: Response) {
  const query = validQuery<{ organization_id?: string; limit: number }>(req)
  const result = await service.listBillingAccounts(query)
  res.json(result)
}

export async function createBillingAccount(req: Request, res: Response) {
  const body = validBody<BillingAccountCreate>(req)
  const data = await service.createBillingAccount(body)
  res.status(201).json(data)
}

export async function retrieveBillingAccount(req: Request, res: Response) {
  const { account_id } = validParams<{ account_id: string }>(req)
  const data = await service.retrieveBillingAccount(account_id)
  res.json(data)
}

export async function updateBillingAccount(req: Request, res: Response) {
  const { account_id } = validParams<{ account_id: string }>(req)
  const body = validBody<BillingAccountUpdate>(req)
  const data = await service.updateBillingAccount(account_id, body)
  res.json(data)
}

export async function deleteBillingAccount(req: Request, res: Response) {
  const { account_id } = validParams<{ account_id: string }>(req)
  const data = await service.deleteBillingAccount(account_id)
  res.json(data)
}

export async function createSubscription(req: Request, res: Response) {
  const body = validBody<SubscriptionCreate>(req)
  const data = await service.createSubscription(body)
  res.status(201).json(data)
}

export async function listSubscriptions(req: Request, res: Response) {
  const query = validQuery<{
    organization_id?: string
    app_id?: string
    limit: number
  }>(req)
  const result = await service.listSubscriptions(query)
  res.json(result)
}

export async function retrieveSubscription(req: Request, res: Response) {
  const { subscription_id } = validParams<{ subscription_id: string }>(req)
  const data = await service.retrieveSubscription(subscription_id)
  res.json(data)
}

export async function updateSubscription(req: Request, res: Response) {
  const { subscription_id } = validParams<{ subscription_id: string }>(req)
  const body = validBody<SubscriptionUpdate>(req)
  const data = await service.updateSubscription(subscription_id, body)
  res.json(data)
}

export async function deleteSubscription(req: Request, res: Response) {
  const { subscription_id } = validParams<{ subscription_id: string }>(req)
  const data = await service.deleteSubscription(subscription_id)
  res.json(data)
}

export async function createSubscriptionItem(req: Request, res: Response) {
  const { subscription_id } = validParams<{ subscription_id: string }>(req)
  const body = validBody<SubscriptionItemCreate>(req)
  const data = await service.createSubscriptionItem(subscription_id, body)
  res.status(201).json(data)
}

export async function updateSubscriptionItem(req: Request, res: Response) {
  const { subscription_id, item_id } = validParams<{
    subscription_id: string
    item_id: string
  }>(req)
  const body = validBody<SubscriptionItemUpdate>(req)
  const data = await service.updateSubscriptionItem(
    subscription_id,
    item_id,
    body
  )
  res.json(data)
}

export async function deleteSubscriptionItem(req: Request, res: Response) {
  const { subscription_id, item_id } = validParams<{
    subscription_id: string
    item_id: string
  }>(req)
  const data = await service.deleteSubscriptionItem(subscription_id, item_id)
  res.json(data)
}
