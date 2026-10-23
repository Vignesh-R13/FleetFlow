import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in. Check your credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-navy-950 text-slate-100 p-12 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <Anchor className="w-7 h-7 text-signal-500" strokeWidth={1.75} />
          <span className="font-display text-2xl tracking-tight">FleetFlow</span>
        </div>
        <div className="max-w-sm">
          <h1 className="font-display text-4xl leading-tight mb-4">
            The bridge view for your entire fleet.
          </h1>
          <p className="text-navy-600/90 text-slate-300 text-sm leading-relaxed">
            Track vessels, voyages, fuel, and maintenance in one place — built for
            operations teams who need to know what's happening at sea right now.
          </p>
        </div>
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} FleetFlow Maritime Systems</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-8 bg-white dark:bg-navy-900">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Anchor className="w-6 h-6 text-sea-500" />
            <span className="font-display text-xl">FleetFlow</span>
          </div>

          <h2 className="text-xl font-semibold mb-1">Sign in</h2>
          <p className="text-sm text-navy-600 dark:text-slate-400 mb-6">
            Use your FleetFlow account to access the dashboard.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sea-500"
                placeholder="you@fleetflow.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-sea-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-700 dark:text-slate-400"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-status-critical bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-navy-900 dark:bg-sea-500 text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-xs text-navy-500 dark:text-slate-500 border-t border-slate-200 dark:border-navy-700 pt-4">
            <p className="font-medium mb-1">Demo accounts (seeded)</p>
            <p>admin@fleetflow.com · manager@fleetflow.com · maintenance@fleetflow.com · captain@fleetflow.com</p>
            <p>Password: see backend/README for the seeded demo password</p>
          </div>
        </div>
      </div>
    </div>
  );
}
