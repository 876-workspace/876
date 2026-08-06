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

/**
 * The route-definition helper every module uses.
 *
 * One declaration produces three things that would otherwise drift apart: the
 * Express route, the request validation, and the OpenAPI operation. There is no
 * way to add a route without documenting it, and no way to document one that
 * does not exist.
 */

/** Auth tier, mapped to the OpenAPI security requirement for the operation. */
export type Security = 'public' | 'apiKey' | 'session' | 'admin'

/** The status-code key shape zod-openapi indexes its responses object by. */
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
  /** A concrete example rendered in the docs. */
  example?: unknown
}

export type RouteSpec<S extends ValidationSchemas> = {
  path: string
  summary: string
  description?: string
  /**
   * Stable operation identifier. Set it explicitly to match the identifier the
   * FastAPI service generated, so a consumer reading the spec sees no change
   * across the cutover.
   */
  operationId?: string
  security?: Security
  deprecated?: boolean
  request?: S
  responses: Record<number, ResponseSpec>
  /** Middleware that runs after auth and before validation — rate limits, raw-body capture. */
  middleware?: RequestHandler[]
  handler: (req: Request, res: Response) => unknown | Promise<unknown>
}

/**
 * Responses every enveloped route can produce. Declared once so 300+ operations
 * do not each restate them, and so the error contract in the published spec is
 * identical everywhere.
 */
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

export function createApiRouter(options: {
  /** OpenAPI tag applied to every operation on this router. */
  tag: string
  /** Prefix applied to both the Express path and the documented path. */
  prefix?: string
  /** Default auth tier for operations that do not override it. */
  security?: Security
  /** Guards prepended to every route — the auth middleware for this tier. */
  guards?: RequestHandler[]
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
      ...(options.guards ?? []),
      ...(spec.middleware ?? []),
      ...(spec.request ? [validate(spec.request)] : []),
      async (req, res, next) => {
        try {
          await spec.handler(req, res)
        } catch (error) {
          // Express 5 forwards async rejections itself, but only from the
          // handler it invoked; this keeps the behaviour explicit and identical
          // whether or not the handler is async.
          next(error)
        }
      },
    ]

    // The Express path and the documented path are both built from `fullPath`.
    // Registering `spec.path` here instead would leave the prefix applied to the
    // OpenAPI document only, so the spec would describe a URL the service does
    // not serve unless every mount site remembered to repeat the prefix.
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
