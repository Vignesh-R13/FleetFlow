import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Radar,
  Ship,
  Navigation,
  MapPin,
  Fuel,
  Wrench,
  Package,
  BarChart3,
  DollarSign,
  Bell,
  Settings,
  FileText,
  Sparkles,
  Anchor,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlertCount } from '../hooks/useAlertCount';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: null },
      { to: '/command-center', label: 'Command Center', icon: Radar, roles: null, highlight: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/fleet', label: 'Fleet', icon: Ship, roles: null },
      { to: '/voyages', label: 'Voyages', icon: Navigation, roles: null },
      { to: '/cargo', label: 'Cargo', icon: Package, roles: ['ADMIN', 'FLEET_MANAGER'] },
      { to: '/tracking', label: 'Tracking', icon: MapPin, roles: null },
    ],
  },
  {
    label: 'Maintenance',
    items: [
      { to: '/maintenance', label: 'Maintenance', icon: Wrench, roles: null },
      { to: '/fuel', label: 'Fuel', icon: Fuel, roles: null },
      { to: '/alerts', label: 'Alerts', icon: Bell, roles: null, badge: true },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER'] },
      { to: '/profitability', label: 'Profitability', icon: DollarSign, roles: ['ADMIN', 'FLEET_MANAGER'] },
      { to: '/assistant', label: 'AI Assistant', icon: Sparkles, roles: null },
    ],
  },
  {
    label: 'Reporting',
    items: [
      { to: '/reports', label: 'Reports', icon: FileText, roles: null },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
    ],
  },
];

function formatRole(role) {
  if (!role) return '';
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export default function Sidebar({ collapsed, onNavigate }) {
  const { user } = useAuth();
  const alertCount = useAlertCount();

  return (
    <aside
      className={`h-full bg-navy-950 text-slate-300 flex flex-col transition-all duration-300 select-none border-r border-navy-800/80 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo Brand Header */}
      <div
        className={`flex items-center h-16 border-b border-navy-800/80 shrink-0 ${
          collapsed ? 'justify-center px-0' : 'gap-3 px-5'
        }`}
      >
        <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-sea-500/25 to-teal-500/10 border border-sea-500/30 flex items-center justify-center shadow-glow-teal">
          <Anchor className="w-5 h-5 text-teal-400" strokeWidth={2} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-display text-lg font-bold text-white tracking-tight leading-none block">
              FleetFlow
            </span>
            <span className="block text-[10px] font-semibold text-teal-400/90 tracking-widest uppercase leading-none mt-1">
              Bridge View Control
            </span>
          </div>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 scrollbar-thin">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(user?.role)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="mb-2">
              {!collapsed && (
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold tracking-widest text-navy-500 uppercase">
                  {section.label}
                </p>
              )}
              {collapsed && <div className="my-2 border-t border-navy-800/70" />}

              <div className="space-y-0.5">
                {visibleItems.map(({ to, label, icon: Icon, badge, highlight }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onNavigate}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `relative group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        isActive
                          ? 'bg-gradient-to-r from-navy-850 to-navy-800 text-white shadow-sm border border-navy-700/60 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-1 before:rounded-r-full before:bg-teal-400 before:shadow-glow-teal'
                          : highlight
                            ? 'text-amber-400/90 hover:bg-navy-900 hover:text-amber-300 border border-amber-500/20'
                            : 'text-slate-400 hover:bg-navy-900/80 hover:text-slate-100 hover:border-navy-800 border border-transparent'
                      }`
                    }
                  >
                    <span className="relative shrink-0 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5" size={18} />
                      {highlight && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-75" />
                      )}
                      {badge && alertCount > 0 && collapsed && (
                        <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-status-critical shadow-glow-critical animate-pulse" />
                      )}
                    </span>
                    {!collapsed && (
                      <span className="truncate flex-1 font-medium text-[13px]">{label}</span>
                    )}
                    {!collapsed && highlight && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Live
                      </span>
                    )}
                    {!collapsed && badge && alertCount > 0 && (
                      <span className="ml-auto shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-status-critical text-white text-[10px] font-bold px-1 shadow-glow-critical animate-pulse">
                        {alertCount > 99 ? '99+' : alertCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className={`border-t border-navy-800/80 p-3 shrink-0 bg-navy-950/60 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <div
            title={`${user?.name} · ${formatRole(user?.role)}`}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-sea-500 to-teal-600 text-white text-xs font-bold flex items-center justify-center cursor-default shadow-sm"
          >
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0 p-1 rounded-xl hover:bg-navy-900/60 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sea-500 to-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-100 truncate leading-tight">
                {user?.name}
              </p>
              <p className="text-[10px] text-teal-400 font-medium truncate leading-tight mt-0.5">
                {formatRole(user?.role)}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
