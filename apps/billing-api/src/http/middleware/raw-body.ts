import type { Request } from 'express'

const rawBodies = new WeakMap<Request, string>()

export function captureRawJson(
  req: Request,
  _res: unknown,
  buffer: Buffer
): void {
  rawBodies.set(req, buffer.toString('utf8'))
}

export function rawJsonBody(req: Request): string {
  const body = rawBodies.get(req)
  if (body === undefined)
    throw new Error('The raw JSON request body was not captured.')

  return body
}
