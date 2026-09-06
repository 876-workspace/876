import { Request } from '../request'
import type { Runtime } from '../runtime'
import { MemberUpdatedSchema } from '../schemas'
import type {
  MemberUpdateParams,
  MemberUpdated,
  RequestOptions,
} from '../types'

/**
 * `billing.members.*` — one signed-in member changing another's workspace grant.
 *
 * Only the write lives at session authority. The roster and effective-access
 * resolution are internal projections that join identity data, so they belong
 * to the server client (`create876BillingServerClient().members`).
 *
 * The API refuses a caller changing their own grant, so a settings surface must
 * render its own row without member actions rather than relying on the error.
 */
export function createMembersResource(runtime: Runtime) {
  return {
    update(
      userId: string,
      params: MemberUpdateParams,
      options?: RequestOptions
    ) {
      return Request<MemberUpdated>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/members/${encodeURIComponent(userId)}`,
          body: params,
          signal: options?.signal,
        },
        MemberUpdatedSchema
      )
    },
  }
}
