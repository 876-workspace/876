import { describe, expect, it } from 'vitest'

import {
  budgetVarianceReportToCsv,
  capacityMinutesForPeriod,
  classifyHealth,
  escapeCsvCell,
  guardCsvCell,
  healthReportToCsv,
  rangesOverlap,
  timeReportToCsv,
  toCsv,
  utilisationPercentFor,
  workloadReportToCsv,
  workReportToCsv,
} from '../reports.serializers.js'

describe('escapeCsvCell', () => {
  it('leaves a plain cell untouched', () => {
    expect(escapeCsvCell('Alpha')).toBe('Alpha')
  })

  it('quotes a cell containing a comma', () => {
    expect(escapeCsvCell('Alpha, Beta')).toBe('"Alpha, Beta"')
  })

  it('doubles embedded quotes and wraps the cell', () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""')
  })

  it('quotes a cell containing a newline', () => {
    expect(escapeCsvCell('line one\nline two')).toBe('"line one\nline two"')
  })
})

describe('guardCsvCell', () => {
  it('prefixes a cell starting with =', () => {
    expect(guardCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)")
  })

  it('prefixes cells starting with + and @', () => {
    expect(guardCsvCell('+cmd')).toBe("'+cmd")
    expect(guardCsvCell('@mention')).toBe("'@mention")
  })

  it('prefixes a text cell starting with -', () => {
    expect(guardCsvCell('-alert')).toBe("'-alert")
  })

  it('leaves a plain negative number unguarded', () => {
    expect(guardCsvCell('-500')).toBe('-500')
  })
})

describe('toCsv', () => {
  it('emits a header row plus CRLF-terminated lines', () => {
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('a,b\r\n1,x\r\n')
  })
})

describe('classifyHealth', () => {
  it('reports unknown with no open items and no budget', () => {
    expect(
      classifyHealth({
        openItems: 0,
        overdue: 0,
        budgetConsumedPercent: null,
        budgetOverThreshold: false,
        budgetOverBudget: false,
      })
    ).toBe('unknown')
  })

  it('reports off-track when overdue items exceed 20% of open', () => {
    expect(
      classifyHealth({
        openItems: 4,
        overdue: 1,
        budgetConsumedPercent: null,
        budgetOverThreshold: false,
        budgetOverBudget: false,
      })
    ).toBe('off-track')
  })

  it('reports at-risk rather than off-track at exactly 20% overdue', () => {
    expect(
      classifyHealth({
        openItems: 5,
        overdue: 1,
        budgetConsumedPercent: null,
        budgetOverThreshold: false,
        budgetOverBudget: false,
      })
    ).toBe('at-risk')
  })

  it('reports off-track when the budget is consumed past 100%', () => {
    expect(
      classifyHealth({
        openItems: 3,
        overdue: 0,
        budgetConsumedPercent: 125,
        budgetOverThreshold: true,
        budgetOverBudget: true,
      })
    ).toBe('off-track')
  })

  it('reports at-risk when the budget passes its threshold', () => {
    expect(
      classifyHealth({
        openItems: 3,
        overdue: 0,
        budgetConsumedPercent: 85,
        budgetOverThreshold: true,
        budgetOverBudget: false,
      })
    ).toBe('at-risk')
  })

  it('reports on-track for a healthy project', () => {
    expect(
      classifyHealth({
        openItems: 3,
        overdue: 0,
        budgetConsumedPercent: 40,
        budgetOverThreshold: false,
        budgetOverBudget: false,
      })
    ).toBe('on-track')
  })
})

describe('rangesOverlap', () => {
  it('detects an inner range overlap', () => {
    expect(
      rangesOverlap(
        { effectiveFrom: 100, effectiveTo: 200 },
        { effectiveFrom: 150, effectiveTo: 250 }
      )
    ).toBe(true)
  })

  it('treats a null end as open-ended', () => {
    expect(
      rangesOverlap(
        { effectiveFrom: 100, effectiveTo: null },
        { effectiveFrom: 500, effectiveTo: 600 }
      )
    ).toBe(true)
  })

  it('allows ranges that only touch at the boundary', () => {
    expect(
      rangesOverlap(
        { effectiveFrom: 100, effectiveTo: 200 },
        { effectiveFrom: 200, effectiveTo: 300 }
      )
    ).toBe(false)
  })
})

describe('utilisationPercentFor', () => {
  it('rounds down a repeating utilisation', () => {
    expect(utilisationPercentFor(60, 180)).toBe(33)
  })

  it('rounds up a repeating utilisation', () => {
    expect(utilisationPercentFor(120, 180)).toBe(67)
  })

  it('returns null without capacity', () => {
    expect(utilisationPercentFor(120, null)).toBeNull()
  })

  it('returns null when prorated capacity rounds to zero', () => {
    expect(utilisationPercentFor(10, 0)).toBeNull()
  })
})

describe('capacityMinutesForPeriod', () => {
  it('keeps weekly minutes for an exact week', () => {
    expect(
      capacityMinutesForPeriod(2400, { from: 1000, to: 1000 + 604800 })
    ).toBe(2400)
  })

  it('prorates weekly minutes across the period length', () => {
    expect(
      capacityMinutesForPeriod(2400, { from: 1000, to: 1000 + 302400 })
    ).toBe(1200)
  })
})

describe('report csv encoders', () => {
  it('encodes a work report with section rows and a summary', () => {
    const csv = workReportToCsv({
      object: 'projects.work-report',
      period: { from: 1, to: 2 },
      byState: [{ key: 'todo', label: 'todo', count: 2 }],
      byType: [],
      byAssignee: [],
      overdue: 1,
      total: 2,
    })
    expect(csv).toContain('section,key,label,count')
    expect(csv).toContain('state,todo,todo,2')
    expect(csv).toContain('summary,total,Total issues,2')
  })

  it('encodes a health report with one row per project', () => {
    const csv = healthReportToCsv({
      object: 'projects.health-report',
      data: [
        {
          projectId: 'prj_1',
          name: 'Alpha, "Inc"',
          health: 'at-risk',
          progressPercent: 50,
          overdue: 1,
          openItems: 2,
          budgetConsumedPercent: null,
        },
      ],
    })
    expect(csv).toContain('projectId,name,health,progressPercent,overdue,openItems,budgetConsumedPercent')
    expect(csv).toContain('"Alpha, ""Inc"""')
  })

  it('encodes a time report with minute columns', () => {
    const csv = timeReportToCsv({
      object: 'projects.time-report',
      groupBy: 'user',
      period: { from: 1, to: 2 },
      data: [
        { key: 'usr_1', label: 'usr_1', billableMinutes: 60, nonBillableMinutes: 30 },
      ],
    })
    expect(csv).toContain('key,label,billableMinutes,nonBillableMinutes')
    expect(csv).toContain('usr_1,usr_1,60,30')
  })

  it('encodes a budget variance report with money as strings', () => {
    const csv = budgetVarianceReportToCsv({
      object: 'projects.budget-variance-report',
      period: { from: 1, to: 2 },
      data: [
        {
          projectId: 'prj_1',
          name: 'Alpha',
          currency: 'USD',
          budgetMinor: '10000',
          actualCostMinor: '12500',
          varianceMinor: '2500',
          budgetMinutes: null,
          actualMinutes: 120,
        },
      ],
    })
    expect(csv).toContain('projectId,name,currency,budgetMinor,actualCostMinor,varianceMinor,budgetMinutes,actualMinutes')
    expect(csv).toContain('prj_1,Alpha,USD,10000,12500,2500,,120')
  })

  it('encodes a workload report with utilisation columns', () => {
    const csv = workloadReportToCsv({
      object: 'projects.workload-report',
      period: { from: 1, to: 2 },
      data: [
        {
          userId: 'usr_1',
          label: 'usr_1',
          assignedOpenItems: 2,
          plannedMinutes: 5,
          loggedMinutes: 60,
          capacityMinutes: 2400,
          utilisationPercent: 3,
        },
      ],
    })
    expect(csv).toContain('userId,label,assignedOpenItems,plannedMinutes,loggedMinutes,capacityMinutes,utilisationPercent')
    expect(csv).toContain('usr_1,usr_1,2,5,60,2400,3')
  })
})
