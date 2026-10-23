import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Small trend chip: "+4% vs last week" style. `positive` controls color
// independently of sign, since for some metrics (e.g. delay %) a decrease
// is the good direction — the caller decides, this component just renders.
export default function TrendIndicator({ direction = 'flat', text, positive = true }) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const colorClass = direction === 'flat'
    ? 'text-navy-400 dark:text-slate-500'
    : positive
      ? 'text-status-active'
      : 'text-status-critical';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      {text}
    </span>
  );
}
