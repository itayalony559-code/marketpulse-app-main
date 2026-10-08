export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse-soft rounded-md bg-ink-700/60 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="surface p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-6 w-24" />
      <Skeleton className="mt-2 h-3 w-16" />
      <Skeleton className="mt-4 h-9 w-full" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-2.5 w-12" />
      </div>
    </div>
  );
}

export function NewsCardSkeleton() {
  return (
    <div className="surface p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="h-2.5 w-10" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-1 h-3 w-2/3" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-10 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="surface p-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-4 h-64 w-full rounded-lg" />
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
    </div>
  );
}
