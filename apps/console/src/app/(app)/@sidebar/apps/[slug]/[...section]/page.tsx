import { AppSidebarSlot } from '../_app-sidebar'

export default async function AppSidebarSection({
  params,
}: {
  params: Promise<{ slug: string; section: string[] }>
}) {
  const { slug } = await params
  return <AppSidebarSlot slug={slug} />
}
