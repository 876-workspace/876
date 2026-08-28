import { describe, expect, it } from 'vitest'
import {
  formatAge,
  formatCustomerType,
  formatDueDate,
  formatSource,
  fromDateTimeLocal,
  isOverdue,
  toDateTimeLocal,
} from './request-format'

describe('request-format', () => {
  describe('formatSource', () => {
    it('formats known sources', () => {
      expect(formatSource('CRM')).toBe('CRM')
      expect(formatSource('EMAIL')).toBe('Email')
      expect(formatSource('PHONE')).toBe('Phone')
      expect(formatSource('CHAT')).toBe('Chat')
      expect(formatSource('WEB')).toBe('Web form')
      expect(formatSource('API')).toBe('API')
    })
  })

  describe('formatCustomerType', () => {
    it('formats customer types correctly', () => {
      expect(formatCustomerType('CORE_ORGANIZATION')).toBe('876 organization')
      expect(formatCustomerType('CORE_USER')).toBe('876 user')
      expect(formatCustomerType(undefined)).toBe('External customer')
    })
  })

  describe('formatAge', () => {
    it('formats recent timestamps as just now or minutes', () => {
      const now = Math.floor(Date.now() / 1000)
      expect(formatAge(now)).toBe('just now')
      expect(formatAge(now - 120)).toBe('2m ago')
      expect(formatAge(now - 7200)).toBe('2h ago')
      expect(formatAge(now - 86400 * 3)).toBe('3d ago')
    })
  })

  describe('formatDueDate and isOverdue', () => {
    it('determines overdue status correctly', () => {
      const past = Math.floor(Date.now() / 1000) - 3600
      const future = Math.floor(Date.now() / 1000) + 3600

      expect(isOverdue(past)).toBe(true)
      expect(isOverdue(future)).toBe(false)
    })

    it('formats due dates nicely', () => {
      const timestamp = new Date('2026-05-15T14:30:00Z').getTime() / 1000
      expect(formatDueDate(timestamp)).toBeTruthy()
    })
  })

  describe('toDateTimeLocal and fromDateTimeLocal', () => {
    it('converts to datetime-local string and roundtrips', () => {
      const unix = Math.floor(Date.now() / 1000)
      const localStr = toDateTimeLocal(unix)
      expect(localStr).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)

      const parsed = fromDateTimeLocal(localStr)
      expect(parsed).not.toBeNull()
      // Within 60 seconds precision because datetime-local drops seconds
      expect(Math.abs((parsed ?? 0) - unix)).toBeLessThanOrEqual(60)
    })

    it('handles empty input', () => {
      expect(fromDateTimeLocal('')).toBeNull()
      expect(fromDateTimeLocal('invalid')).toBeNull()
    })
  })
})
