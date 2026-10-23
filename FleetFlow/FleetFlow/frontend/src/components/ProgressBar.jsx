import { COLOR_CLASSES } from '../utils/intelligence';

// Generic horizontal progress/utilization bar. `value` and `max` are plain
// numbers (not pre-computed percentages) so callers don't need to do the
// division themselves — and it stays correct if max is ever non-100.
export default function ProgressBar({ value = 0, max = 100, color = 'sea', label, showValue = true, className = '' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const classes = COLOR_CLASSES[color] || COLOR_CLASSES.sea;
  const barColorClass = classes.text.replace('text-', 'bg-');

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-navy-500 dark:text-slate-400">{label}</span>}
          {showValue && <span className="text-xs font-medium text-navy-700 dark:text-slate-300 tabular-nums">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className="h-1.5 rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full transition-all ${barColorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
