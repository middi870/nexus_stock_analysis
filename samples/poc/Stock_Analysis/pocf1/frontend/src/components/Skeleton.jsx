export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-lg ${className}`} />
}

export function CardSkeleton() {
  return (
    <div className="bg-bg-card border border-bg-border rounded-2xl p-5 space-y-3 animate-fade-in">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-2 w-16" />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-52 w-full" />
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="border-b border-bg-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-3 w-full max-w-[80px]" />
        </td>
      ))}
    </tr>
  )
}
