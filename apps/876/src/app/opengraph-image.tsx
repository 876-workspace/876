import { ImageResponse } from 'next/og'

export const alt = '876'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#0f172a',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          color: '#ffffff',
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        876
      </div>
      <div
        style={{
          color: '#94a3b8',
          fontSize: 32,
          marginTop: 16,
        }}
      >
        A Progressive Web App built with Next.js
      </div>
    </div>,
    {
      ...size,
    }
  )
}
