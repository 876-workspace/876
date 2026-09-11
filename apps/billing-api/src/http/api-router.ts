import {
  Router,
  type Request,
  type RequestHandler,
  type Response,
} from 'express'
import type { ZodType } from 'zod'
import type {
  ZodOpenApiOperationObject,
  ZodOpenApiResponsesObject,
} from 'zod-openapi'

import { validate, type ValidationSchemas } from '@/http/middleware/validate'
import {
  registerOperation,
  toOpenApiPath,
  type HttpMethod,
  type RegistryKind,
} from '@/http/openapi/registry'
import {
  renderV1OperationCompatibility,
  v1Operation,
  type V1OpenApiOperation,
} from '@/http/openapi/v1-contract'

export type BillingSecurity =
  | { kind: 'public' }
  | { kind: 'tenant'; permission: string }
  | { kind: 'organizationMember' }
  | { kind: 'integration'; scope: string }
  | { kind: 'admin' }
  | { kind: 'scheduler'; bearer?: 'cron' }

type StatusCode = `${1 | 2 | 3 | 4 | 5}${string}`

export type ResponseSpec = {
  description: string
  schema?: ZodType
  example?: unknown
}

export type RouteSpec<S extends ValidationSchemas> = {
  path: string
  summary: string
  description?: string
  operationId?: string
  tags?: readonly string[]
  security: BillingSecurity
  request?: S
  /** Preserve a frozen v1 operation that intentionally omitted its body docs. */
  documentBody?: false
  responses: Partial<Record<StatusCode, ResponseSpec>>
  middleware?: RequestHandler[]
  handler: (req: Request, res: Response) => unknown | Promise<unknown>
}

export type GuardResolver = (security: BillingSecurity) => RequestHandler[]

function openApiSecurity(
  security: BillingSecurity
): Array<Record<string, string[]>> {
  switch (security.kind) {
    case 'public':
      return []
    case 'tenant':
    case 'organizationMember':
      return [{ tenantOAuth: [] }]
    case 'admin':
      return [{ internalKey: [] }]
    case 'scheduler':
      return security.bearer === 'cron'
        ? [{ cronSecret: [] }]
        : [{ schedulerKey: [] }]
    case 'integration':
      return [
        { internalKey: [] },
        { appApiKey: [] },
        { tenantOAuth: [security.scope] },
      ]
  }
}

export function createApiRouter(options: {
  tag: string
  prefix?: string
  registry?: RegistryKind
  resolveGuards?: GuardResolver
}) {
  const router = Router({ mergeParams: true })
  const prefix = options.prefix ?? ''
  const registry = options.registry ?? 'public'

  function define<S extends ValidationSchemas>(
    method: HttpMethod,
    spec: RouteSpec<S>
  ) {
    const fullPath = `${prefix}${spec.path}`
    const responses: ZodOpenApiResponsesObject = {}
    for (const [status, response] of Object.entries(spec.responses)) {
      if (!response) continue
      responses[status as StatusCode] = {
        description: response.description,
        ...(response.schema
          ? {
              content: {
                'application/json': {
                  schema: response.schema,
                  ...(response.example === undefined
                    ? {}
                    : { example: response.example }),
                },
              },
            }
          : {}),
      }
    }

    const metadata =
      registry === 'public' ? v1Operation(method, fullPath) : undefined
    const operation: ZodOpenApiOperationObject = {
      tags: metadata?.tags
        ? [...metadata.tags]
        : spec.tags
          ? [...spec.tags]
          : [options.tag],
      summary: metadata?.summary ?? spec.summary,
      ...(metadata?.description
        ? { description: metadata.description }
        : spec.description
          ? { description: spec.description }
          : {}),
      ...(metadata?.operationId
        ? { operationId: metadata.operationId }
        : spec.operationId
          ? { operationId: spec.operationId }
          : {}),
      ...(openApiSecurity(spec.security).length
        ? { security: openApiSecurity(spec.security) }
        : {}),
      ...(spec.request?.params || spec.request?.query
        ? {
            requestParams: {
              ...(spec.request.params ? { path: spec.request.params } : {}),
              ...(spec.request.query ? { query: spec.request.query } : {}),
            },
          }
        : {}),
      ...(spec.request?.body && spec.documentBody !== false
        ? {
            requestBody: {
              required: true,
              content: { 'application/json': { schema: spec.request.body } },
            },
          }
        : {}),
      responses,
    }

    const compatibleOperation =
      registry === 'public'
        ? renderV1OperationCompatibility({
            method,
            path: fullPath,
            operation: operation as V1OpenApiOperation,
            hasRuntimeBody: spec.request?.body !== undefined,
            documentBody: spec.documentBody !== false,
          })
        : operation

    registerOperation(registry, {
      method,
      path: toOpenApiPath(fullPath),
      operation: compatibleOperation as ZodOpenApiOperationObject,
    })

    const chain: RequestHandler[] = [
      ...(options.resolveGuards?.(spec.security) ?? []),
      ...(spec.middleware ?? []),
      ...(spec.request ? [validate(spec.request)] : []),
      (req, res, next) =>
        Promise.resolve(spec.handler(req, res)).then(() => undefined, next),
    ]
    router[method](fullPath, ...chain)
  }

  return {
    router,
    get: <S extends ValidationSchemas>(spec: RouteSpec<S>) =>
      define('get', spec),
    post: <S extends ValidationSchemas>(spec: RouteSpec<S>) =>
      define('post', spec),
    put: <S extends ValidationSchemas>(spec: RouteSpec<S>) =>
      define('put', spec),
    patch: <S extends ValidationSchemas>(spec: RouteSpec<S>) =>
      define('patch', spec),
    delete: <S extends ValidationSchemas>(spec: RouteSpec<S>) =>
      define('delete', spec),
  }
}
