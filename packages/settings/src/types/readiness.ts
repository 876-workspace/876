export type SetupSeverity = 'required' | 'recommended' | 'optional'

export interface SetupRequirement {
  key: string
  label: string
  severity: SetupSeverity
  /** Where the admin goes to satisfy it. */
  href: string
  module?: string
}

export interface SetupTask extends SetupRequirement {
  isSatisfied: boolean
}

export interface SetupReadiness {
  tasks: SetupTask[]
  outstandingRequired: number
  outstandingRecommended: number
  /** True when no `required` task is outstanding. */
  isReady: boolean
  /** True when nothing at all is outstanding, required or recommended. */
  isComplete: boolean
}
