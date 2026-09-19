import { SenderListPanel } from '@876/communications-ui/panels/sender-list-panel'

import { communicationsService } from '@/lib/clients/communications'

interface SendersDataProps {
  organizationId: string
  baseHref: string
}

function toError(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const typed = error as { code: string; message: string }
    return { code: typed.code, message: typed.message }
  }
  return {
    code: 'email/load-failed',
    message: 'Senders could not be loaded. Try again.',
  }
}

export async function SendersData({ organizationId, baseHref }: SendersDataProps) {
  try {
    const result = await communicationsService().senders.list(organizationId)
    if (result.error || !result.data)
      return (
        <SenderListPanel
          state={{ status: 'error', error: toError(result.error) }}
          baseHref={baseHref}
        />
      )
    if (result.data.data.length === 0)
      return <SenderListPanel state={{ status: 'empty' }} baseHref={baseHref} />
    return (
      <SenderListPanel
        state={{ status: 'ready', data: result.data.data }}
        baseHref={baseHref}
      />
    )
  } catch (error) {
    return (
      <SenderListPanel
        state={{ status: 'error', error: toError(error) }}
        baseHref={baseHref}
      />
    )
  }
}
