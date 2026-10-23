import { classifyRisk, COLOR_CLASSES } from '../utils/intelligence';

// Shows a risk classification (Low/Medium/High/Critical) derived from a
// 0-100 risk score. Distinct from StatusBadge, which shows operational
// statuses (Active/Delayed/etc) rather than a calculated risk level.
export default function RiskBadge({ score, label }) {
  const { label: computedLabel, color } = classifyRisk(score);
  const finalLabel = label || computedLabel;
  const classes = COLOR_CLASSES[color] || COLOR_CLASSES.idle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${classes.bg} ${classes.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${classes.text.replace('text-', 'bg-')}`} aria-hidden="true" />
      {finalLabel}
      {typeof score === 'number' && <span className="opacity-70 tabular-nums">{Math.round(score)}</span>}
    </span>
  );
}
