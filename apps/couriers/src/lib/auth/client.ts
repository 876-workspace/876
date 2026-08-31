'use client'

import { create876AccountClient } from '@876/account'

/** Consumer-realm Account auth bridge (`/api/auth`). */
export const authClient = create876AccountClient({ baseUrl: '/api' })

/** Enterprise manage-realm Account auth bridge (`/api/manage-auth/auth`). */
export const manageAuthClient = create876AccountClient({
  baseUrl: '/api/manage-auth',
})
