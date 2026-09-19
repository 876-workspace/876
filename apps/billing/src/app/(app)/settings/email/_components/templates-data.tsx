import { TemplateListPanel } from '@876/communications-ui/panels/template-list-panel'

import { communicationsService } from '@/lib/clients/communications'

interface TemplatesDataProps {
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
    message: 'Email templates could not be loaded. Try again.',
  }
}

export async function TemplatesData({
  organizationId,
  baseHref,
}: TemplatesDataProps) {
  try {
    const result = await communicationsService().templates.list(organizationId)
    if (result.error || !result.data)
      return (
        <TemplateListPanel
          state={{ status: 'error', error: toError(result.error) }}
          baseHref={baseHref}
        />
      )
    if (result.data.data.length === 0)
      return (
        <TemplateListPanel state={{ status: 'empty' }} baseHref={baseHref} />
      )
    return (
      <TemplateListPanel
        state={{ status: 'ready', data: result.data.data }}
        baseHref={baseHref}
      />
    )
  } catch (error) {
    return (
      <TemplateListPanel
        state={{ status: 'error', error: toError(error) }}
        baseHref={baseHref}
      />
    )
  }
}
