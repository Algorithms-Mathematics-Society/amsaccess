export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`ams-skeleton ${className}`} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-white/10 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-4">
              <Skeleton className="h-4 w-full opacity-50" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function PageSkeleton() {
  return (
    <main className="relative mx-auto max-w-6xl px-5 py-6">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-24" />
      </header>
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </main>
  );
}
