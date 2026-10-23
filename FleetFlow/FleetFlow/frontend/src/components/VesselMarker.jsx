import L from 'leaflet';

/**
 * Normalizes heading angle differences to the shortest rotation path (-180 to 180 deg)
 * to avoid abrupt 360-degree spins when transitioning between 359° and 0°.
 */
export function getShortestAngle(targetAngle, currentAngle) {
  const diff = (targetAngle - currentAngle + 180) % 360 - 180;
  return currentAngle + (diff < -180 ? diff + 360 : diff);
}

export const VESSEL_STATUS_THEMES = {
  Active: {
    primary: '#14B8A6', // Teal
    secondary: '#0EA5E9', // Ocean blue
    glow: 'rgba(20, 184, 166, 0.45)',
    pulse: true,
    bgClass: 'bg-teal-500',
  },
  Idle: {
    primary: '#94A3B8', // Slate
    secondary: '#64748B',
    glow: 'rgba(148, 163, 184, 0.25)',
    pulse: false,
    bgClass: 'bg-slate-400',
  },
  Maintenance: {
    primary: '#F59E0B', // Amber
    secondary: '#D97706',
    glow: 'rgba(245, 158, 11, 0.45)',
    pulse: false,
    bgClass: 'bg-amber-500',
  },
  Offline: {
    primary: '#71717A', // Muted dark
    secondary: '#52525B',
    glow: 'rgba(113, 113, 122, 0.2)',
    pulse: false,
    bgClass: 'bg-zinc-500',
  },
  Critical: {
    primary: '#EF4444', // Red
    secondary: '#DC2626',
    glow: 'rgba(239, 68, 68, 0.55)',
    pulse: true,
    bgClass: 'bg-red-500',
  },
};

/**
 * Generates an SVG top-down vessel shape.
 */
export function renderVesselSvg(status = 'Active', heading = 0, isSelected = false) {
  const theme = VESSEL_STATUS_THEMES[status] || VESSEL_STATUS_THEMES.Active;
  const strokeColor = isSelected ? '#FFFFFF' : '#0B1524';
  const strokeWidth = isSelected ? 2 : 1.2;

  return `
    <div class="vessel-marker-container" style="position: relative; width: 34px; height: 34px;">
      ${
        theme.pulse
          ? `<div class="vessel-halo" style="position: absolute; inset: -4px; border-radius: 50%; background: ${theme.glow}; pointer-events: none;"></div>`
          : ''
      }
      <div class="vessel-svg-wrapper" style="width: 34px; height: 34px; transform: rotate(${Math.round(heading)}deg); transform-origin: center center;">
        <svg viewBox="0 0 32 32" width="34" height="34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Wake glow / shadow -->
          <ellipse cx="16" cy="18" rx="8" ry="12" fill="${theme.glow}" />
          
          <!-- Top-down Ship Hull -->
          <path
            d="M16 3 C18 9, 21 14, 21 23 C21 27, 19 28.5, 16 28.5 C13 28.5, 11 27, 11 23 C11 14, 14 3, 16 3 Z"
            fill="${theme.primary}"
            stroke="${strokeColor}"
            stroke-width="${strokeWidth}"
            stroke-linejoin="round"
          />

          <!-- Superstructure / Bridge -->
          <rect
            x="13.5"
            y="15"
            width="5"
            height="7"
            rx="1.5"
            fill="${theme.secondary}"
            stroke="#0B1524"
            stroke-width="0.75"
          />

          <!-- Bridge navigation windows -->
          <rect x="14.5" y="16" width="3" height="1.5" rx="0.5" fill="#E2E8F0" />

          <!-- Bow direction indicator point -->
          <circle cx="16" cy="6" r="1.2" fill="#FFFFFF" />
        </svg>
      </div>
    </div>
  `;
}

/**
 * Creates a Leaflet DivIcon for a vessel marker.
 */
export function createVesselDivIcon({
  status = 'Active',
  heading = 0,
  isSelected = false,
  showLabel = false,
  vesselName = '',
  speed = 0,
}) {
  const html = `
    <div class="relative group select-none">
      ${renderVesselSvg(status, heading, isSelected)}
      ${
        showLabel && vesselName
          ? `
        <div class="absolute left-1/2 -bottom-6 -translate-x-1/2 whitespace-nowrap bg-navy-950/90 border border-navy-700/80 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-200 pointer-events-none shadow-md backdrop-blur-sm flex items-center gap-1 z-30">
          <span>${vesselName}</span>
          ${speed != null ? `<span class="text-sea-300 font-mono">${Number(speed).toFixed(1)}kn</span>` : ''}
        </div>
      `
          : ''
      }
    </div>
  `;

  return L.divIcon({
    className: 'custom-vessel-leaflet-icon',
    html,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}
