import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import RiskBadge from './RiskBadge';

const SEVERITY_DOT = {
  Critical: 'bg-status-critical',
  High: 'bg-signal-500',
  Medium: 'bg-status-warning',
  Low: 'bg-status-active',
};

// A single ranked risk entry: severity dot, vessel + issue title, recommended
// action, and a link into the relevant vessel/voyage for follow-up.
export default function RiskCard({ risk }) {
  const linkTo = risk.voyageId ? `/voyages/${risk.voyageId}` : risk.vesselId ? `/fleet/${risk.vesselId}` : null;

  const content = (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors">
      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEVERITY_DOT[risk.severity] || 'bg-status-idle'}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {risk.vesselName && <span className="text-sm font-semibold text-navy-900 dark:text-slate-100">{risk.vesselName}</span>}
          <RiskBadge score={risk.score} label={risk.severity} />
        </div>
        <p className="text-sm text-navy-700 dark:text-slate-300 mt-0.5">{risk.title}</p>
        {risk.recommendedAction && (
          <p className="text-xs text-navy-500 dark:text-slate-400 mt-1">
            <span className="font-medium">Recommended:</span> {risk.recommendedAction}
          </p>
        )}
      </div>
      {linkTo && <ArrowRight className="w-4 h-4 text-navy-300 dark:text-navy-600 shrink-0 mt-1" />}
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }
  return content;
}
