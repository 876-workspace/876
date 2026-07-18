import { redirect } from 'next/navigation'

export default async function LegacyNotesWidgetSubpage({
  params,
}: {
  params: Promise<{ path: string[] }>
}) {
  const { path } = await params
  redirect(`/widgets/notepad/${path.map(encodeURIComponent).join('/')}`)
}
