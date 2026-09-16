import { ClientVisibleToggle } from '@/features/collaboration/components/client-visible-toggle'
import { FollowButton } from '@/features/collaboration/components/follow-button'

/**
 * Follow switch plus client-visibility toggle for a work item.
 *
 * State is loaded by the parent server component and passed as plain
 * values, so this component stays synchronous: the toggle writes through
 * the permission-checked visibility route.
 */
export function IssueVisibilityData({
  issueRef,
  issueTitle,
  canToggleVisibility,
  following,
  visible,
}: {
  issueRef: string
  issueTitle: string
  canToggleVisibility: boolean
  following: boolean
  visible: boolean | null
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FollowButton
        subjectType="work-item"
        subjectId={issueRef}
        initialFollowing={following}
      />
      {canToggleVisibility && visible !== null ? (
        <ClientVisibleToggle
          endpoint={`/api/issues/${encodeURIComponent(issueRef)}/visibility`}
          initialVisible={visible}
          label={issueTitle}
        />
      ) : null}
    </div>
  )
}
