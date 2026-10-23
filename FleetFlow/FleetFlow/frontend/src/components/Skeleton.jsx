// Generic skeleton placeholder built on the existing .ff-skeleton utility.
// Usage: <Skeleton className="h-4 w-24" /> or the row/card presets below.
export default function Skeleton({ className = '' }) {
  return <div className={`ff-skeleton ${className}`} />;
}

// Preset: a row of skeleton table cells, for tables that are loading.
export function SkeletonRow({ columns = 4 }) {
  return (
    <tr className="border-b border-slate-100 dark:border-navy-800 last:border-0">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[140px] rounded" />
        </td>
      ))}
    </tr>
  );
}

// Preset: a KPI/stat card skeleton (mirrors StatCard's own loading layout,
// exported here too so non-StatCard consumers, like the Command Center
// strip, can render the same shape before data arrives).
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`ff-card p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-7 w-16 rounded" />
        </div>
        <Skeleton className="w-8 h-8 rounded-lg ml-3 shrink-0" />
      </div>
    </div>
  );
}
