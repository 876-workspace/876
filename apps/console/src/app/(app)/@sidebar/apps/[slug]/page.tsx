import { AppSidebarSlot } from './_app-sidebar'

export default async function AppSidebarBase({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <AppSidebarSlot slug={slug} />
}
