import { classifyHealth, COLOR_CLASSES } from '../utils/intelligence';

// Displays a 0-100 health score with its classification label.
// `size`: 'sm' for inline table use, 'lg' for hero KPI display.
export default function HealthScore({ score, size = 'sm', showLabel = true }) {
  const { score: s, label, color } = classifyHealth(score);
  const classes = COLOR_CLASSES[color] || COLOR_CLASSES.idle;

  if (size === 'lg') {
    return (
      <div className="flex items-baseline gap-2">
        <span className={`font-display font-semibold text-4xl tabular-nums ${classes.text}`}>{s}</span>
        <span className="text-lg text-navy-400 dark:text-slate-500">/ 100</span>
        {showLabel && (
          <span className={`ml-2 text-sm font-medium px-2 py-0.5 rounded-full ${classes.bg} ${classes.text}`}>
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`font-semibold tabular-nums ${classes.text}`}>{s}</span>
      {showLabel && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${classes.bg} ${classes.text}`}>{label}</span>
      )}
    </span>
  );
}
