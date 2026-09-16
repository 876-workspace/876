import { getLogger } from '../../platform/logger.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import type { StatusCounts } from './metrics.repository.js'
import * as repository from './metrics.repository.js'

const log = getLogger('metrics')

const DAY_SECONDS = 24 * 3600
const WEEK_SECONDS = 7 * DAY_SECONDS

export type SubsystemSummary = {
  total: number
  failed: number
  failureRate: number
}

export type MetricsSummary = {
  object: 'projects.metrics-summary'
  windowDays: number
  generatedAt: number
  automationRuns: { last24h: SubsystemSummary; last7d: SubsystemSummary }
  webhookDeliveries: { last24h: SubsystemSummary; last7d: SubsystemSummary }
  importJobs: { last24h: SubsystemSummary; last7d: SubsystemSummary }
}

function summarize(counts: StatusCounts): SubsystemSummary {
  const total = counts.reduce((sum, row) => sum + row.count, 0)
  const failed = counts
    .filter((row) => row.status === 'failed')
    .reduce((sum, row) => sum + row.count, 0)
  return {
    total,
    failed,
    failureRate: total === 0 ? 0 : failed / total,
  }
}

function summarizeJobs(jobs: { total: number; failed: number }): SubsystemSummary {
  return {
    total: jobs.total,
    failed: jobs.failed,
    failureRate: jobs.total === 0 ? 0 : jobs.failed / jobs.total,
  }
}

export async function getMetricsSummary(
  nowSeconds: number = nowUnixSeconds()
): Promise<MetricsSummary> {
  const day = toDbUnixSeconds(nowSeconds - DAY_SECONDS)
  const week = toDbUnixSeconds(nowSeconds - WEEK_SECONDS)
  const [runsDay, runsWeek, deliveriesDay, deliveriesWeek, jobsDay, jobsWeek] =
    await Promise.all([
      repository.countAutomationRuns(day),
      repository.countAutomationRuns(week),
      repository.countWebhookDeliveries(day),
      repository.countWebhookDeliveries(week),
      repository.countImportJobs(day),
      repository.countImportJobs(week),
    ])
  const summary: MetricsSummary = {
    object: 'projects.metrics-summary',
    windowDays: 7,
    generatedAt: nowSeconds,
    automationRuns: { last24h: summarize(runsDay), last7d: summarize(runsWeek) },
    webhookDeliveries: {
      last24h: summarize(deliveriesDay),
      last7d: summarize(deliveriesWeek),
    },
    importJobs: {
      last24h: summarizeJobs(jobsDay),
      last7d: summarizeJobs(jobsWeek),
    },
  }
  log.info(
    {
      automation_runs_24h: summary.automationRuns.last24h.total,
      webhook_deliveries_24h: summary.webhookDeliveries.last24h.total,
      import_jobs_24h: summary.importJobs.last24h.total,
    },
    'metrics.summary_served'
  )
  return summary
}
