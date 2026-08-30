import {
  Router,
  type Request,
  type RequestHandler,
  type Response,
} from 'express'

export type WorkSecurity =
  | { kind: 'operator' }
  | {
      kind: 'integration'
      scope: string
      /** Host-app permissions accepted when the caller also presents a user session. */
      sessionPermissions?: readonly string[]
    }

export type GuardResolver = (security: WorkSecurity) => RequestHandler[]

type RouteSpec = {
  path: string
  security: WorkSecurity
  handler: (req: Request, res: Response) => unknown | Promise<unknown>
}

export function createApiRouter(resolveGuards: GuardResolver) {
  const router = Router({ mergeParams: true })

  function define(
    method: 'get' | 'post' | 'patch' | 'delete',
    spec: RouteSpec
  ) {
    router[method](
      spec.path,
      ...resolveGuards(spec.security),
      (req, res, next) =>
        Promise.resolve(spec.handler(req, res)).then(() => undefined, next)
    )
  }

  return {
    router,
    get: (spec: RouteSpec) => define('get', spec),
    post: (spec: RouteSpec) => define('post', spec),
    patch: (spec: RouteSpec) => define('patch', spec),
    delete: (spec: RouteSpec) => define('delete', spec),
  }
}
