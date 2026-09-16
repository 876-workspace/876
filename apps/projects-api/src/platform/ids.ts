import { randomUUID } from 'node:crypto'

export const ENTITY_PREFIXES = {
  tenant: 'prjten_',
  project: 'prj_',
  projectMember: 'prjmem_',
  issue: 'iss_',
  label: 'lbl_',
  comment: 'cmt_',
  issueEvent: 'isev_',
  workItemType: 'wit_',
  workflowState: 'wfs_',
  milestone: 'ms_',
  milestoneEvent: 'msev_',
  taskList: 'tl_',
  cycle: 'cyc_',
  customField: 'cf_',
  customFieldValue: 'cfv_',
  projectCustomField: 'pcf_',
  projectCustomFieldValue: 'pcfv_',
  layout: 'lay_',
  issueRelation: 'isr_',
  issueDependency: 'isd_',
  projectBaseline: 'prjbl_',
  projectBaselineItem: 'prjbli_',
  projectEvent: 'prjev_',
  eventAttendee: 'prjeva_',
  reminder: 'prjrem_',
  timeEntry: 'tme_',
  timesheet: 'tsh_',
  timesheetEvent: 'tshe_',
  projectBilling: 'prjbil_',
  budget: 'bdg_',
  rate: 'rte_',
  memberCapacity: 'cap_',
  projectTemplate: 'prjtpl_',
  projectTemplateVersion: 'prjtplv_',
  projectTemplateInstantiation: 'prjtpli_',
  workflowTransition: 'wft_',
  automationRule: 'arl_',
  automationEvent: 'aev_',
  automationRun: 'arn_',
  notification: 'ntf_',
  follower: 'flw_',
  discussion: 'dsc_',
  discussionPost: 'dpt_',
  discussionPostEdit: 'dpe_',
  wikiPage: 'wpg_',
  wikiRevision: 'wrv_',
  clientGrant: 'cgt_',
  attachmentLink: 'att_',
} as const

export type EntityType = keyof typeof ENTITY_PREFIXES

export function generateId(entityType: EntityType): string {
  const prefix = ENTITY_PREFIXES[entityType]
  if (!prefix) throw new Error(`Unknown entity type: ${entityType}`)

  return `${prefix}${randomUUID().replaceAll('-', '')}`
}
