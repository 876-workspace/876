import { forwardRef, type SVGProps } from 'react'
import type { WidgetSize } from '../types/widget-size'

type IconProps = SVGProps<SVGSVGElement> & { title?: string }

/**
 * Soft per-size accents for the size palette.
 * Icons use a shared shell layout so sizes read as “how wide the panel is.”
 */
export const WIDGET_SIZE_ICON_COLORS: Record<
  WidgetSize,
  { fill: string; stroke: string; accent: string }
> = {
  sm: { fill: '#EDE9FE', stroke: '#7C3AED', accent: '#8B5CF6' },
  md: { fill: '#E0F2FE', stroke: '#0284C7', accent: '#0EA5E9' },
  lg: { fill: '#CCFBF1', stroke: '#0F766E', accent: '#14B8A6' },
  xl: { fill: '#FFE4E6', stroke: '#E11D48', accent: '#F43F5E' },
  fill: { fill: '#FEF3C7', stroke: '#B45309', accent: '#F59E0B' },
}

const CHROME = {
  frame: '#94A3B8',
  main: '#F1F5F9',
  sidebar: '#CBD5E1',
  rail: '#94A3B8',
}

type ShellProps = IconProps & {
  widgetWidth: number
  accent: string
  stroke: string
  fill: string
  showExpand?: boolean
}

/**
 * Mini app shell: left sidebar · main · widget panel · right rail.
 * `widgetWidth` is the filled panel width in the 20×20 grid (before the rail).
 */
const ShellSizeIcon = forwardRef<SVGSVGElement, ShellProps>(
  function ShellSizeIcon(
    { title, widgetWidth, accent, stroke, fill, showExpand, ...props },
    ref
  ) {
    const left = 1.75
    const top = 3
    const height = 14
    const right = 18.25
    const sidebarW = 2.25
    const railW = 1.75
    const railX = right - railW
    const widgetX = railX - widgetWidth
    const mainX = left + sidebarW
    const mainW = Math.max(1.5, widgetX - mainX)

    return (
      <svg
        ref={ref}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden={title ? undefined : true}
        {...props}
      >
        {title ? <title>{title}</title> : null}

        {/* Outer chrome */}
        <rect
          x={left}
          y={top}
          width={right - left}
          height={height}
          rx="2"
          fill={CHROME.main}
          stroke={CHROME.frame}
          strokeWidth="1"
        />

        {/* Left sidebar */}
        <path
          d={`M${left + 1.5} ${top} H${left + sidebarW} V${top + height} H${left + 1.5} Q${left} ${top + height} ${left} ${top + height - 1.5} V${top + 1.5} Q${left} ${top} ${left + 1.5} ${top} Z`}
          fill={CHROME.sidebar}
        />
        <line
          x1={left + sidebarW}
          y1={top}
          x2={left + sidebarW}
          y2={top + height}
          stroke={CHROME.frame}
          strokeWidth="0.75"
        />

        {/* Main content hint */}
        {mainW > 1.2 ? (
          <rect
            x={mainX + 0.4}
            y={top + 2.4}
            width={Math.max(0.8, mainW - 0.8)}
            height={1.8}
            rx="0.45"
            fill={CHROME.sidebar}
            opacity="0.5"
          />
        ) : null}

        {/* Widget panel — the part that grows */}
        <rect
          x={widgetX}
          y={top}
          width={widgetWidth}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth="1.15"
        />
        <rect
          x={widgetX + 0.9}
          y={top + 2.1}
          width={Math.max(1.1, widgetWidth - 1.8)}
          height={1.3}
          rx="0.35"
          fill={accent}
          opacity="0.9"
        />
        <rect
          x={widgetX + 0.9}
          y={top + 4.3}
          width={Math.max(0.9, widgetWidth - 2.6)}
          height={1.05}
          rx="0.3"
          fill={accent}
          opacity="0.45"
        />
        <rect
          x={widgetX + 0.9}
          y={top + 6.25}
          width={Math.max(0.7, widgetWidth - 3.4)}
          height={1.05}
          rx="0.3"
          fill={accent}
          opacity="0.28"
        />

        {/* Right icon rail */}
        <path
          d={`M${railX} ${top} H${right - 1.5} Q${right} ${top} ${right} ${top + 1.5} V${top + height - 1.5} Q${right} ${top + height} ${right - 1.5} ${top + height} H${railX} Z`}
          fill={CHROME.rail}
        />
        <circle
          cx={railX + railW / 2}
          cy={top + height / 2}
          r="0.55"
          fill="#F8FAFC"
        />

        {showExpand ? (
          <path
            d={`M${widgetX - 0.2} ${top + height / 2 - 2.5} L${widgetX - 1.7} ${top + height / 2} L${widgetX - 0.2} ${top + height / 2 + 2.5}`}
            stroke={stroke}
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}
      </svg>
    )
  }
)

/** Progressive panel widths — clearly stepped so sizes don't look the same. */
const PANEL_WIDTH: Record<Exclude<WidgetSize, 'fill'>, number> = {
  sm: 3.1,
  md: 4.8,
  lg: 6.6,
  xl: 8.5,
}

function makeSizeIcon(size: Exclude<WidgetSize, 'fill'>) {
  const SizeIcon = forwardRef<SVGSVGElement, IconProps>(function SizeIcon(
    { title, ...props },
    ref
  ) {
    const c = WIDGET_SIZE_ICON_COLORS[size]
    return (
      <ShellSizeIcon
        ref={ref}
        title={title}
        widgetWidth={PANEL_WIDTH[size]}
        accent={c.accent}
        stroke={c.stroke}
        fill={c.fill}
        {...props}
      />
    )
  })
  SizeIcon.displayName = `WidgetSize${size.toUpperCase()}Icon`
  return SizeIcon
}

const SizeFillIcon = forwardRef<SVGSVGElement, IconProps>(function SizeFillIcon(
  { title, ...props },
  ref
) {
  const c = WIDGET_SIZE_ICON_COLORS.fill
  return (
    <ShellSizeIcon
      ref={ref}
      title={title}
      widgetWidth={10.6}
      accent={c.accent}
      stroke={c.stroke}
      fill={c.fill}
      showExpand
      {...props}
    />
  )
})

export const WIDGET_SIZE_ICONS = {
  sm: makeSizeIcon('sm'),
  md: makeSizeIcon('md'),
  lg: makeSizeIcon('lg'),
  xl: makeSizeIcon('xl'),
  fill: SizeFillIcon,
} as const
