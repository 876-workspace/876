'use client'

import { create876AccountClient } from '@876/account'

/** Browser account client for Enterprise's same-origin auth bridge. */
export const account = create876AccountClient({ baseUrl: '/api' })
