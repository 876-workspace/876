import { describe, expect, it } from 'vitest'

import {
  canDockAtWidth,
  isSizeLocked,
  normalizeSizePolicy,
  resolveAllowedSize,
  resolveWidgetWidth,
  shouldRememberSize,
  WIDGET_WIDTHS,
} from './widget-size'

describe('resolveWidgetWidth', () => {
  it('returns fixed token widths', () => {
    expect(
      resolveWidgetWidth({
        size: 'sm',
        presentation: 'popout',
        availableWidth: 1400,
        viewportWidth: 1400,
      })
    ).toBe(WIDGET_WIDTHS.sm)
    expect(
      resolveWidgetWidth({
        size: 'xl',
        presentation: 'docked',
        availableWidth: 1400,
        viewportWidth: 1400,
      })
    ).toBe(WIDGET_WIDTHS.xl)
  })

  it('fills docked space until the main column hits its minimum', () => {
    // available 1400 - rail 60 - min main 600 = 740
    expect(
      resolveWidgetWidth({
        size: 'fill',
        presentation: 'docked',
        availableWidth: 1400,
        viewportWidth: 1400,
      })
    ).toBe(740)
  })

  it('clamps docked fill to at least sm', () => {
    expect(
      resolveWidgetWidth({
        size: 'fill',
        presentation: 'docked',
        availableWidth: 700,
        viewportWidth: 700,
      })
    ).toBe(WIDGET_WIDTHS.sm)
  })

  it('caps popout fill against viewport and max fill width', () => {
    // viewport 2000 - rail 60 - gutters 48 = 1892, capped at 960
    expect(
      resolveWidgetWidth({
        size: 'fill',
        presentation: 'popout',
        availableWidth: 2000,
        viewportWidth: 2000,
      })
    ).toBe(960)
  })

  it('falls back to popout fill math when docked but availableWidth is null', () => {
    expect(
      resolveWidgetWidth({
        size: 'fill',
        presentation: 'docked',
        availableWidth: null,
        viewportWidth: 1200,
      })
    ).toBe(Math.min(1200 - 60 - 48, 960))
  })
})

describe('canDockAtWidth', () => {
  it('requires main column room after rail and panel', () => {
    // 1200 - 60 - 384 = 756 >= 600
    expect(canDockAtWidth(1200, WIDGET_WIDTHS.md)).toBe(true)
    // 1000 - 60 - 384 = 556 < 600
    expect(canDockAtWidth(1000, WIDGET_WIDTHS.md)).toBe(false)
    expect(canDockAtWidth(null, WIDGET_WIDTHS.md)).toBe(false)
  })
})

describe('normalizeSizePolicy / resolveAllowedSize', () => {
  it('falls back to a single default size when policy is missing', () => {
    expect(normalizeSizePolicy(undefined, 'md')).toEqual({
      default: 'md',
      allowed: ['md'],
    })
  })

  it('clamps default into allowed set', () => {
    const policy = normalizeSizePolicy({
      default: 'xl',
      allowed: ['sm', 'md'],
    })
    expect(policy.default).toBe('sm')
  })

  it('resolves stored size only when allowed', () => {
    const policy = normalizeSizePolicy({
      default: 'md',
      allowed: ['sm', 'md', 'lg'],
    })
    expect(resolveAllowedSize('lg', policy)).toBe('lg')
    expect(resolveAllowedSize('xl', policy)).toBe('md')
    expect(resolveAllowedSize(undefined, policy)).toBe('md')
  })

  it('detects locked and remember policies', () => {
    const locked = normalizeSizePolicy({ default: 'xl', allowed: ['xl'] })
    const multi = normalizeSizePolicy({
      default: 'md',
      allowed: ['sm', 'md', 'lg'],
    })
    expect(isSizeLocked(locked)).toBe(true)
    expect(shouldRememberSize(locked)).toBe(false)
    expect(isSizeLocked(multi)).toBe(false)
    expect(shouldRememberSize(multi)).toBe(true)
    expect(
      shouldRememberSize({
        default: 'md',
        allowed: ['sm', 'md'],
        remember: false,
      })
    ).toBe(false)
  })
})
