import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'

export type HomeUser = {
  name: string
  email: string
  avatar: string | null
}

function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function initialsFor(user: HomeUser): string {
  if (user.name) {
    return user.name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }
  return user.email[0]?.toUpperCase() ?? 'U'
}

export function HomeHeader({
  user,
  today,
  orgName,
}: {
  user: HomeUser
  today: string
  orgName: string
}) {
  const greeting = `${greetingFor(new Date())}${user.name ? `, ${user.name.split(' ')[0]}` : ''}`

  return (
    <header className="mb-8 flex items-start justify-between gap-4 pt-1">
      <div className="min-w-0 flex-1">
        <h1 className="text-foreground text-[1.75rem] leading-tight font-bold tracking-tight">
          {greeting}
        </h1>
        <p className="text-muted-foreground mt-1.5 text-[0.9375rem]">
          {today} · {orgName}
        </p>
      </div>
      <Avatar size="lg" className="size-11 shadow-sm">
        {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
        <AvatarFallback className="text-base font-semibold">
          {initialsFor(user)}
        </AvatarFallback>
      </Avatar>
    </header>
  )
}
