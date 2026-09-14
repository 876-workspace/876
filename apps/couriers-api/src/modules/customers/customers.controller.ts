import type { Request, Response } from 'express'
import { deletedObject, listObject } from '@/http/envelope'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import * as service from './customers.service'
import type {
  CreateCustomerBody,
  CustomerParams,
  DeleteCustomerBody,
  ListCustomersQuery,
  MailboxCreateBody,
  MailboxUpdateBody,
  TenantParams,
  UpdateCustomerBody,
} from './customers.schemas'
export async function listCustomers(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  const result = await service.listCustomers(
    tenantId,
    validQuery<ListCustomersQuery>(req)
  )
  res.status(200).json(
    listObject({
      data: result.data,
      hasMore: result.hasMore,
      url: `/v1/tenants/${tenantId}/customers`,
    })
  )
}
export async function createCustomer(req: Request, res: Response) {
  const { tenantId } = validParams<TenantParams>(req)
  res
    .status(201)
    .json(
      await service.createCustomer(tenantId, validBody<CreateCustomerBody>(req))
    )
}
export async function retrieveCustomer(req: Request, res: Response) {
  const { tenantId, id } = validParams<CustomerParams>(req)
  res.status(200).json(await service.retrieveCustomer(tenantId, id))
}
export async function updateCustomer(req: Request, res: Response) {
  const { tenantId, id } = validParams<CustomerParams>(req)
  res
    .status(200)
    .json(
      await service.updateCustomer(
        tenantId,
        id,
        validBody<UpdateCustomerBody>(req)
      )
    )
}
export async function deleteCustomer(req: Request, res: Response) {
  const { tenantId, id } = validParams<CustomerParams>(req)
  const body = (req.valid?.body as DeleteCustomerBody | undefined) ?? {}
  const deleted = await service.deleteCustomer(tenantId, id, body)
  res.status(200).json(deletedObject('courier_customer_profile', deleted.id))
}
export async function listMailboxes(req: Request, res: Response) {
  const { tenantId, id } = validParams<CustomerParams>(req)
  res.status(200).json(
    listObject({
      data: await service.listMailboxes(tenantId, id),
      hasMore: false,
      url: `/v1/tenants/${tenantId}/customers/${id}/mailboxes`,
    })
  )
}
export async function createMailbox(req: Request, res: Response) {
  const { tenantId, id } = validParams<CustomerParams>(req)
  res
    .status(201)
    .json(
      await service.createMailbox(
        tenantId,
        id,
        validBody<MailboxCreateBody>(req)
      )
    )
}
export async function updateMailbox(req: Request, res: Response) {
  const { tenantId, id } = validParams<CustomerParams>(req)
  const mailboxId = String(req.params.mailboxId)
  res
    .status(200)
    .json(
      await service.updateMailbox(
        tenantId,
        id,
        mailboxId,
        validBody<MailboxUpdateBody>(req)
      )
    )
}
