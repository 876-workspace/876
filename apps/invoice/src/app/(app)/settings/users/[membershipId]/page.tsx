import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'
import { DetailCardSection, DetailCardSectionTitle } from '@876/ui/detail-card'
import { getInvoiceContext } from '@/lib/auth/context'
import { loadMember } from '../_data'

export default async function MemberOverviewPage({
  params,
}: {
  params: Promise<{ membershipId: string }>
}) {
  const { membershipId } = await params
  const context = await getInvoiceContext()
  if (!context) notFound()
  const result = await loadMember(context.orgId, membershipId)
  if (result.error)
    return (
      <AppError
        title="User could not be loaded"
        error={result.error}
        variant="section"
      />
    )
  if (!result.member) notFound()
  return (
    <DetailCardSection>
      <DetailCardSectionTitle>Organization role</DetailCardSectionTitle>
      <p className="text-sm capitalize">
        {result.member.role.replace(/[-_]/g, ' ')}
      </p>
    </DetailCardSection>
  )
}
