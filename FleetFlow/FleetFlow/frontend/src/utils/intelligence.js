// Shared, deterministic classification helpers for the Intelligence layer
// (Command Center, Fleet Health, Risk Intelligence, etc). Centralizing the
// thresholds here means every panel that shows a health/risk score agrees
// on what "Healthy" or "Critical" means — no magic numbers scattered
// across components.

// ---- Health score classification (0-100, higher is better) ----
export const HEALTH_BANDS = [
  { min: 90, label: 'Healthy', color: 'active' },
  { min: 75, label: 'Good', color: 'sea' },
  { min: 60, label: 'Attention', color: 'warning' },
  { min: 40, label: 'At Risk', color: 'signal' },
  { min: 0, label: 'Critical', color: 'critical' },
];

export function classifyHealth(score) {
  const s = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  const band = HEALTH_BANDS.find((b) => s >= b.min) || HEALTH_BANDS[HEALTH_BANDS.length - 1];
  return { score: s, label: band.label, color: band.color };
}

// ---- Risk score classification (0-100, higher is riskier) ----
export const RISK_BANDS = [
  { min: 75, label: 'Critical', color: 'critical' },
  { min: 55, label: 'High', color: 'signal' },
  { min: 35, label: 'Medium', color: 'warning' },
  { min: 0, label: 'Low', color: 'active' },
];

export function classifyRisk(score) {
  const s = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  const band = RISK_BANDS.find((b) => s >= b.min) || RISK_BANDS[RISK_BANDS.length - 1];
  return { score: s, label: band.label, color: band.color };
}

// Tailwind class lookups for the color keys above — kept in one place so
// every intelligence component renders the same palette consistently.
export const COLOR_CLASSES = {
  active: { text: 'text-status-active', bg: 'bg-status-active/10', ring: 'ring-status-active/30' },
  sea: { text: 'text-sea-500', bg: 'bg-sea-500/10', ring: 'ring-sea-500/30' },
  warning: { text: 'text-status-warning', bg: 'bg-status-warning/10', ring: 'ring-status-warning/30' },
  signal: { text: 'text-signal-600', bg: 'bg-signal-500/10', ring: 'ring-signal-500/30' },
  critical: { text: 'text-status-critical', bg: 'bg-status-critical/10', ring: 'ring-status-critical/30' },
  idle: { text: 'text-status-idle', bg: 'bg-status-idle/10', ring: 'ring-status-idle/30' },
};

// Relative time formatting for "Last updated: 12 seconds ago" style labels.
export function timeAgo(date) {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
