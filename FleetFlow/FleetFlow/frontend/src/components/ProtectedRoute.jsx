import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Frontend gating is a UX convenience only — the backend independently
// enforces role checks on every request via middleware/auth.js.
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-navy-500">Loading…</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
