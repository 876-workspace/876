'use client'

import type { AppError } from '@876/core'
import { toast } from 'sonner'

/** Shows a registered app error without dropping its stable support code. */
export function showAppErrorToast(
  error: AppError,
  options: { title?: string } = {}
) {
  toast.error(options.title ?? error.message, {
    description: options.title ? `${error.message} · ${error.code}` : error.code,
  })
}
