export function MetricCard({
  label,
  value,
  color,
  trend,
}: {
  label: string
  value: string
  color: string
  trend?: string
}) {
  return (
    <div className="876-card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40 ${color.split(' ')[0]}`}
      />
      <div className="mb-4 flex items-start justify-between">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        {trend && (
          <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
            {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  )
}
