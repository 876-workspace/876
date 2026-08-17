import { PlatformUnavailable } from '@/components/platform-unavailable'

export default function UnavailablePage() {
  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <PlatformUnavailable />
      </div>
    </div>
  )
}
