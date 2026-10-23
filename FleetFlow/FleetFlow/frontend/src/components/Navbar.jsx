import { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Sun, Moon, LogOut, ChevronDown, Settings, User, Activity, Radio, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAlertCount } from '../hooks/useAlertCount';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/command-center': 'Command Center',
  '/fleet': 'Fleet',
  '/voyages': 'Voyages',
  '/cargo': 'Cargo',
  '/tracking': 'Live Tracking',
  '/maintenance': 'Maintenance',
  '/fuel': 'Fuel Monitoring',
  '/analytics': 'Analytics',
  '/profitability': 'Profitability',
  '/alerts': 'Alerts',
  '/assistant': 'FleetFlow Copilot',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const base = '/' + pathname.split('/')[1];
  return PAGE_TITLES[base] ? `${PAGE_TITLES[base]} · Detail` : 'FleetFlow';
}

function formatRole(role) {
  if (!role) return '';
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const alertCount = useAlertCount();

  const [menuOpen, setMenuOpen] = useState(false);
  const [timeStr, setTimeStr] = useState(() => new Date().toLocaleTimeString());
  const menuRef = useRef(null);

  const pageTitle = getPageTitle(location.pathname);

  // Live clock for operations sync
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-navy-800 bg-white/95 dark:bg-navy-900/95 backdrop-blur-md flex items-center justify-between px-4 shrink-0 gap-4 z-40">
      {/* Left: toggle + breadcrumb / page title */}
      <div className="flex items-center gap-3.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-navy-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 transition-all shrink-0 border border-slate-200 dark:border-navy-700"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-navy-400 dark:text-slate-500 font-medium">
            <span>FleetFlow</span>
            <span>/</span>
            <span className="text-navy-600 dark:text-teal-400 font-semibold">{pageTitle}</span>
          </div>
          <h1 className="text-sm font-bold text-navy-900 dark:text-slate-100 truncate leading-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Middle: Live Operations Online Indicator (hidden on small mobile) */}
      <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-100/80 dark:bg-navy-950/80 border border-slate-200 dark:border-navy-800/80 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider text-[10px]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          <span>SYSTEM ONLINE</span>
        </div>
        <span className="text-slate-300 dark:text-navy-700">|</span>
        <div className="flex items-center gap-1 text-[11px] text-navy-600 dark:text-slate-400 font-mono">
          <Clock className="w-3 h-3 text-navy-400 dark:text-slate-500" />
          <span>Sync: {timeStr}</span>
        </div>
      </div>

      {/* Right: actions & profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-navy-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 transition-all border border-slate-200 dark:border-navy-700"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4.5 h-4.5 text-amber-400" size={18} />
          ) : (
            <Moon className="w-4.5 h-4.5 text-navy-700" size={18} />
          )}
        </button>

        {/* Notifications */}
        <Link
          to="/alerts"
          className="relative p-2 rounded-xl text-navy-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 transition-all border border-slate-200 dark:border-navy-700"
          aria-label={alertCount > 0 ? `${alertCount} unread alerts` : 'Alerts'}
        >
          <Bell className="w-4.5 h-4.5" size={18} />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-status-critical text-white text-[10px] font-bold px-1 shadow-glow-critical animate-pulse leading-none">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 pl-2 pr-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-navy-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-navy-700"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sea-500 to-teal-600 text-white text-xs font-bold flex items-center justify-center shadow-sm shrink-0">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-xs font-bold leading-none truncate max-w-[120px] text-navy-900 dark:text-slate-100">
                {user?.name}
              </p>
              <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium leading-none mt-1 truncate max-w-[120px]">
                {formatRole(user?.role)}
              </p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-navy-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User info card */}
              <div className="px-3.5 py-2 mb-1">
                <p className="text-sm font-bold text-navy-900 dark:text-slate-100 truncate">{user?.name}</p>
                <p className="text-xs text-navy-500 dark:text-slate-400 truncate mt-0.5">{user?.email}</p>
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-400 border border-teal-500/20 uppercase tracking-wider">
                  {formatRole(user?.role)}
                </span>
              </div>
              <div className="border-t border-slate-100 dark:border-navy-800 my-1" />

              {user?.role === 'ADMIN' && (
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-navy-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-navy-400 dark:text-slate-400" />
                  Settings
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-status-critical hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
