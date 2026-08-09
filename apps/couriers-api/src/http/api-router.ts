import {
  Router,
  type RequestHandler,
  type Request,
  type Response,
} from 'express'
import type { ZodType } from 'zod'
import type {
  ZodOpenApiOperationObject,
  ZodOpenApiResponsesObject,
} from 'zod-openapi'

import { errorEnvelopeSchema } from '@/http/envelope'
import { validate, type ValidationSchemas } from '@/http/middleware/validate'
import {
  registerOperation,
  toOpenApiPath,
  type HttpMethod,
} from '@/http/openapi/registry'

export type Security = 'public' | 'apiKey' | 'session' | 'admin'

type StatusCode = `${1 | 2 | 3 | 4 | 5}${string}`

const SECURITY_REQUIREMENTS: Record<
  Security,
  { [scheme: string]: string[] }[] | undefined
> = {
  public: [],
  apiKey: [{ ApiKey: [] }],
  session: [{ BearerToken: [] }, { InternalKey: [] }],
  admin: [{ InternalKey: [] }],
}

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
  security?: Security
  deprecated?: boolean
  request?: S
  responses: Record<number, ResponseSpec>
  middleware?: RequestHandler[]
  handler: (req: Request, res: Response) => unknown | Promise<unknown>
}

function standardErrorResponses(security: Security): ZodOpenApiResponsesObject {
  const unauthorized = {
    description: 'Missing or invalid credentials.',
    content: { 'application/json': { schema: errorEnvelopeSchema } },
  }
  const forbidden = {
    description: 'The caller is authenticated but not permitted.',
    content: { 'application/json': { schema: errorEnvelopeSchema } },
  }
  const unprocessable = {
    description: 'The request failed validation.',
    content: { 'application/json': { schema: errorEnvelopeSchema } },
  }
  return {
    ...(security === 'public' ? {} : { '401': unauthorized, '403': forbidden }),
    '422': unprocessable,
  }
}

export type ApiRouter = {
  readonly router: Router
  get<S extends ValidationSchemas>(spec: RouteSpec<S>): ApiRouter
  post<S extends ValidationSchemas>(spec: RouteSpec<S>): ApiRouter
  put<S extends ValidationSchemas>(spec: RouteSpec<S>): ApiRouter
  patch<S extends ValidationSchemas>(spec: RouteSpec<S>): ApiRouter
  delete<S extends ValidationSchemas>(spec: RouteSpec<S>): ApiRouter
}

export type GuardResolver = (security: Security) => RequestHandler[]

export function createApiRouter(options: {
  tag: string
  prefix?: string
  security?: Security
  resolveGuards?: GuardResolver
}): ApiRouter {
  const router = Router({ mergeParams: true })
  const prefix = options.prefix ?? ''

  function define<S extends ValidationSchemas>(
    method: HttpMethod,
    spec: RouteSpec<S>
  ): ApiRouter {
    const security = spec.security ?? options.security ?? 'apiKey'
    const fullPath = `${prefix}${spec.path}`
    const responses: ZodOpenApiResponsesObject = {
      ...standardErrorResponses(security),
    }
    for (const [status, response] of Object.entries(spec.responses)) {
      responses[status as StatusCode] = {
        description: response.description,
        ...(response.schema
          ? {
              content: {
                'application/json': {
                  schema: response.schema,
                  ...(response.example !== undefined
                    ? { example: response.example }
                    : {}),
                },
              },
            }
          : {}),
      }
    }
    const operation: ZodOpenApiOperationObject = {
      tags: [options.tag],
      summary: spec.summary,
      ...(spec.description ? { description: spec.description } : {}),
      ...(spec.operationId ? { operationId: spec.operationId } : {}),
      ...(spec.deprecated ? { deprecated: true } : {}),
      ...(SECURITY_REQUIREMENTS[security]?.length
        ? { security: SECURITY_REQUIREMENTS[security] }
        : {}),
      ...(spec.request?.params || spec.request?.query
        ? {
            requestParams: {
              ...(spec.request.params ? { path: spec.request.params } : {}),
              ...(spec.request.query ? { query: spec.request.query } : {}),
            },
          }
        : {}),
      ...(spec.request?.body
        ? {
            requestBody: {
              required: true,
              content: { 'application/json': { schema: spec.request.body } },
            },
          }
        : {}),
      responses,
    }
    registerOperation({ method, path: toOpenApiPath(fullPath), operation })
    const chain: RequestHandler[] = [
      ...(options.resolveGuards?.(security) ?? []),
      ...(spec.middleware ?? []),
      ...(spec.request ? [validate(spec.request)] : []),
      spec.handler,
    ]
    router[method](fullPath, ...chain)
    return api
  }

  const api: ApiRouter = {
    router,
    get: (spec) => define('get', spec),
    post: (spec) => define('post', spec),
    put: (spec) => define('put', spec),
    patch: (spec) => define('patch', spec),
    delete: (spec) => define('delete', spec),
  }
  return api
}
