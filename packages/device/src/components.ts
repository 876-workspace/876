/**
 * Entropy sources for the first-party device collector.
 *
 * Each source contributes a short **digest**, never raw data — no canvas data
 * URL, no font list, no IP, nothing personally identifying leaves the browser.
 * Every source is individually guarded: a source that throws (blocked API,
 * hardened browser, privacy extension) contributes nothing rather than failing
 * the whole collection.
 *
 * The set is deliberately broader than screen + language. Those two alone
 * collide across millions of ordinary users, and a colliding fingerprint is
 * actively harmful here — it would show unrelated accounts as sharing one
 * device on the fraud screen.
 */

import { fnv1a } from './hash.ts'

const FONT_PROBE_LIST = [
  'Arial',
  'Arial Black',
  'Calibri',
  'Cambria',
  'Comic Sans MS',
  'Consolas',
  'Courier New',
  'Georgia',
  'Helvetica Neue',
  'Impact',
  'Lucida Console',
  'Menlo',
  'Monaco',
  'Palatino',
  'Roboto',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
] as const

const FALLBACK_FONTS = ['monospace', 'sans-serif', 'serif'] as const
const PROBE_TEXT = 'mmmmmmmmmmlli876'

function safe(source: () => string | null): string | null {
  try {
    return source()
  } catch {
    return null
  }
}

export function screenComponent(): string | null {
  return safe(() =>
    fnv1a(
      [
        screen.width,
        screen.height,
        screen.availWidth,
        screen.availHeight,
        screen.colorDepth,
        window.devicePixelRatio,
      ].join(':')
    )
  )
}

export function localeComponent(): string | null {
  return safe(() => {
    const resolved = Intl.DateTimeFormat().resolvedOptions()
    return fnv1a(
      [
        navigator.languages?.join(',') ?? navigator.language,
        resolved.timeZone,
        resolved.locale,
        new Date().getTimezoneOffset(),
      ].join(':')
    )
  })
}

export function platformComponent(): string | null {
  return safe(() => {
    const nav = navigator as Navigator & { deviceMemory?: number }
    return fnv1a(
      [
        navigator.hardwareConcurrency ?? '',
        nav.deviceMemory ?? '',
        navigator.maxTouchPoints ?? '',
        navigator.pdfViewerEnabled ?? '',
        navigator.cookieEnabled,
      ].join(':')
    )
  })
}

/**
 * Canvas text + gradient render digest.
 *
 * Renders identically on identical GPU/driver/font-stack combinations, which
 * is what makes it one of the highest-entropy sources available without a
 * permission prompt.
 */
export function canvasComponent(): string | null {
  return safe(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 60
    const context = canvas.getContext('2d')
    if (!context) return null

    context.textBaseline = 'top'
    context.font = '14px "Arial"'
    context.fillStyle = '#f60'
    context.fillRect(0, 0, 100, 30)
    context.fillStyle = '#069'
    context.fillText(PROBE_TEXT, 2, 15)
    context.fillStyle = 'rgba(102, 204, 0, 0.7)'
    context.fillText(PROBE_TEXT, 4, 20)

    const gradient = context.createLinearGradient(0, 0, 240, 60)
    gradient.addColorStop(0, '#f0f')
    gradient.addColorStop(1, '#0ff')
    context.fillStyle = gradient
    context.fillRect(120, 30, 120, 30)

    return fnv1a(canvas.toDataURL())
  })
}

/** WebGL vendor/renderer/parameter digest — identifies the GPU family. */
export function webglComponent(): string | null {
  return safe(() => {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl') ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return null

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const parts = [
      gl.getParameter(gl.VENDOR),
      gl.getParameter(gl.RENDERER),
      gl.getParameter(gl.VERSION),
      gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '',
      debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '',
      (gl.getSupportedExtensions() ?? []).join(','),
    ]

    return fnv1a(parts.join(':'))
  })
}

/**
 * Font-availability probe.
 *
 * Measures each candidate font against three fallbacks; a width difference
 * means the font is installed. The installed set is a strong signal of OS,
 * locale, and installed software.
 */
export function fontsComponent(): string | null {
  return safe(() => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return null

    const baseline = new Map<string, number>()
    for (const fallback of FALLBACK_FONTS) {
      context.font = `72px ${fallback}`
      baseline.set(fallback, context.measureText(PROBE_TEXT).width)
    }

    const available: string[] = []
    for (const font of FONT_PROBE_LIST) {
      const detected = FALLBACK_FONTS.some((fallback) => {
        context.font = `72px "${font}", ${fallback}`
        return context.measureText(PROBE_TEXT).width !== baseline.get(fallback)
      })
      if (detected) available.push(font)
    }

    return fnv1a(available.join(','))
  })
}

/**
 * Offline audio-render digest.
 *
 * Renders a short oscillator through a compressor; the floating-point output
 * varies by audio stack. Async because `startRendering` is, and bounded by the
 * caller's timeout.
 */
export async function audioComponent(): Promise<string | null> {
  try {
    const AudioContextClass =
      globalThis.OfflineAudioContext ??
      (globalThis as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext
    if (!AudioContextClass) return null

    const context = new AudioContextClass(1, 5000, 44100)
    const oscillator = context.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.value = 10000

    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -50
    compressor.knee.value = 40
    compressor.ratio.value = 12
    compressor.attack.value = 0
    compressor.release.value = 0.25

    oscillator.connect(compressor)
    compressor.connect(context.destination)
    oscillator.start(0)

    const buffer = await context.startRendering()
    const channel = buffer.getChannelData(0)

    let sum = 0
    for (let index = 2500; index < channel.length; index += 1) {
      sum += Math.abs(channel[index] ?? 0)
    }

    return fnv1a(sum.toString())
  } catch {
    return null
  }
}
