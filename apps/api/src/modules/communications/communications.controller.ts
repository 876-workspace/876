import type { Request, Response } from 'express'

import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  CreateCallBody,
  CreateMessageBody,
  CreatePhoneLookupBody,
  ListCommunicationsQuery,
} from './communications.schemas'
import * as service from './communications.service'

export async function createPhoneLookup(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<CreatePhoneLookupBody>(req)

  res.status(200).json(await service.createPhoneLookup(body))
}

export async function createMessage(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<CreateMessageBody>(req)

  res.status(201).json(await service.createMessage(body))
}

export async function listMessages(req: Request, res: Response): Promise<void> {
  res
    .status(200)
    .json(await service.listMessages(validQuery<ListCommunicationsQuery>(req)))
}

export async function retrieveMessage(
  req: Request,
  res: Response
): Promise<void> {
  const { message_id } = validParams<{ message_id: string }>(req)

  res.status(200).json(await service.retrieveMessage(message_id))
}

export async function createCall(req: Request, res: Response): Promise<void> {
  const body = validBody<CreateCallBody>(req)

  res.status(201).json(await service.createCall(body))
}

export async function listCalls(req: Request, res: Response): Promise<void> {
  res
    .status(200)
    .json(await service.listCalls(validQuery<ListCommunicationsQuery>(req)))
}

export async function retrieveCall(req: Request, res: Response): Promise<void> {
  const { call_id } = validParams<{ call_id: string }>(req)

  res.status(200).json(await service.retrieveCall(call_id))
}
