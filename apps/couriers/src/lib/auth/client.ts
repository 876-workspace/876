'use client'

import { create876Client } from '@876/sdk'

/** Consumer-realm auth bridge (/api/auth). */
export const authClient = create876Client({ baseUrl: '/api' })

/** Enterprise (manage) realm auth bridge (/api/manage-auth/auth). */
export const manageAuthClient = create876Client({ baseUrl: '/api/manage-auth' })
