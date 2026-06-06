import { useState, useEffect } from 'react';
import { users as usersApi, companies as companiesApi } from '../api';
import type { AppUser, Company, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

const ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'PORTAL_USER', 'VIEWER'];
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  MANAGER: 'bg-indigo-100 text-indigo-800',
  STAFF: 'bg-green-100 text-green-800',
  PORTAL_USER: 'bg-yellow-100 text-yellow-800',
  VIEWER: 'bg-gray-100 text-gray-700',
};

const RESOURCES = ['DASHBOARD','ORDERS','SHIPMENTS','FLEET','CUSTOMERS','COMPANIES','USERS','TASKS','DOCUMENTS','UPDATES'];

export default function Users() {
  const { can, user: currentUser } = useAuth();
  const [list, setList] = useState<AppUser[]>([]);
  const [comps, setComps] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPerms, setShowPerms] = useState<AppUser | null>(null);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STAFF' as UserRole, companyId: '' });
  const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([usersApi.list(), companiesApi.list()]);
      setList(u);
      setComps(c);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'STAFF', companyId: '' });
    setError('');
    setShowForm(true);
  }

  function openEdit(u: AppUser) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, companyId: u.companyId || '' });
    setError('');
    setShowForm(true);
  }

  function openPerms(u: AppUser) {
    const initial: Record<string, Record<string, boolean>> = {};
    RESOURCES.forEach(r => {
      const p = u.permissions.find(x => x.resource === r);
      initial[r] = {
        canCreate: p?.canCreate ?? false,
        canRead: p?.canRead ?? true,
        canUpdate: p?.canUpdate ?? false,
        canDelete: p?.canDelete ?? false,
      };
    });
    setPerms(initial);
    setShowPerms(u);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const data: any = { ...form, companyId: form.companyId || null };
      if (editing) {
        if (!data.password) delete data.password;
        await usersApi.update(editing.id, data);
      } else {
        await usersApi.create(data);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.fieldErrors
        ? Object.values(e.response.data.error.fieldErrors).flat().join(', ')
        : 'Failed to save');
    } finally { setSaving(false); }
  }

  async function handleSavePerms() {
    if (!showPerms) return;
    setSaving(true);
    try {
      await usersApi.updatePermissions(showPerms.id, perms as any);
      setShowPerms(null);
      load();
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Permissions</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage staff and portal user access</p>
        </div>
        {can('USERS', 'canCreate') && (
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Add User
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['User', 'Role', 'Company', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.name}</div>
                    <div className="text-gray-400 text-xs">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {u.company ? (
                      <div>
                        <div>{u.company.name}</div>
                        <div className="text-gray-400">{u.company.type}</div>
                      </div>
                    ) : <span className="text-gray-400">Internal Staff</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${u.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    {u.isActive ? 'Active' : 'Inactive'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {can('USERS', 'canUpdate') && (
                        <button onClick={() => openEdit(u)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      )}
                      {can('USERS', 'canUpdate') && u.id !== currentUser?.id && (
                        <button onClick={() => openPerms(u)} className="text-indigo-600 hover:underline text-xs">Permissions</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit User modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit User' : 'Add User'}</h2>
            {error && <div className="mb-3 text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
            <div className="space-y-3">
              {[{ label: 'Full Name', key: 'name' }, { label: 'Email', key: 'email' }].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password {editing && <span className="text-gray-400">(leave blank to keep)</span>}
                </label>
                <input type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company (optional — blank = internal staff)</label>
                <select value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Internal Staff</option>
                  {comps.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions matrix modal */}
      {showPerms && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-1">Permissions — {showPerms.name}</h2>
            <p className="text-gray-500 text-sm mb-4">Role: {showPerms.role}</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Resource</th>
                  {['Read', 'Create', 'Update', 'Delete'].map(a => (
                    <th key={a} className="px-3 py-2 font-medium text-gray-600 text-center">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {RESOURCES.map(r => (
                  <tr key={r} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">{r}</td>
                    {(['canRead','canCreate','canUpdate','canDelete'] as const).map(a => (
                      <td key={a} className="px-3 py-2 text-center">
                        <input type="checkbox" checked={perms[r]?.[a] ?? false}
                          onChange={e => setPerms(p => ({ ...p, [r]: { ...p[r], [a]: e.target.checked } }))}
                          className="w-4 h-4 accent-blue-600 cursor-pointer" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowPerms(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSavePerms} disabled={saving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400">
                {saving ? 'Saving…' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
