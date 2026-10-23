import { useEffect, useState } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

const ROLES = ['ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER', 'CAPTAIN'];

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users')
      .then((res) => setUsers(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load users.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(userId, role) {
    try {
      const res = await api.put(`/users/${userId}`, { role });
      setUsers((prev) => prev.map((u) => (u._id === userId ? res.data.data : u)));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update user.');
    }
  }

  async function toggleActive(user) {
    try {
      const res = await api.put(`/users/${user._id}`, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => (u._id === user._id ? res.data.data : u)));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update user.');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-navy-500 dark:text-slate-400">Manage user accounts and roles.</p>
      </div>

      {error && <p className="text-sm text-status-critical">{error}</p>}

      <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl shadow-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-navy-500 dark:text-slate-400">Loading users…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-navy-500 dark:text-slate-400 border-b border-slate-200 dark:border-navy-800">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-slate-100 dark:border-navy-800 last:border-0">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-navy-500 dark:text-slate-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className="rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-2 py-1 text-xs"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={u.isActive ? 'Active' : 'Offline'} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(u)} className="text-xs text-sea-500 hover:underline">
                      {u.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
