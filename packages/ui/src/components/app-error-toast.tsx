'use client'

import { toast } from 'sonner'

type AppErrorValue = {
  code: string
  message: string
}

/** Shows a registered app error without dropping its stable support code. */
export function showAppErrorToast(
  error: AppErrorValue,
  options: { title?: string } = {}
) {
  toast.error(options.title ?? error.message, {
    description: options.title ? `${error.message} · ${error.code}` : error.code,
  })
}
