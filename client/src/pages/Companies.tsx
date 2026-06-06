import { useState, useEffect } from 'react';
import { companies as companiesApi } from '../api';
import type { Company, CompanyType, OnboardingStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const TYPE_LABELS: Record<CompanyType, string> = {
  CUSTOMER: 'Customer',
  SUPPLIER: 'Supplier',
  US_CARRIER: 'US Carrier',
  MX_CARRIER: 'MX Carrier',
  US_CUSTOMS_BROKER: 'US Customs Broker',
  MX_CUSTOMS_BROKER: 'MX Customs Broker',
};

const ONBOARDING_COLORS: Record<OnboardingStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const EMPTY: Partial<Company> = {
  name: '', type: 'CUSTOMER', email: '', phone: '', address: '', country: '', taxId: '',
};

export default function Companies() {
  const { can } = useAuth();
  const [list, setList] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<Partial<Company>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try { setList(await companiesApi.list()); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function openEdit(c: Company) {
    setEditing(c);
    setForm({ name: c.name, type: c.type, email: c.email, phone: c.phone, address: c.address, country: c.country, taxId: c.taxId });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await companiesApi.update(editing.id, form);
      } else {
        await companiesApi.create(form as any);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.fieldErrors
        ? Object.values(e.response.data.error.fieldErrors).flat().join(', ')
        : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, onboardingStatus: OnboardingStatus) {
    await companiesApi.update(id, { onboardingStatus } as any);
    load();
  }

  const filtered = list.filter(c =>
    c.name.toLowerCase().includes(filter.toLowerCase()) ||
    c.email.toLowerCase().includes(filter.toLowerCase()) ||
    c.type.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage partners, carriers, brokers, and suppliers</p>
        </div>
        {can('COMPANIES', 'canCreate') && (
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Add Company
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-3">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search by name, email, or type…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Company', 'Type', 'Country', 'Tax ID', 'Users', 'Onboarding', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-gray-400 text-xs">{c.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                      {TYPE_LABELS[c.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.country || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{c.taxId || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c._count?.users ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ONBOARDING_COLORS[c.onboardingStatus]}`}>
                      {c.onboardingStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {can('COMPANIES', 'canUpdate') && (
                        <button onClick={() => openEdit(c)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      )}
                      {can('COMPANIES', 'canUpdate') && c.onboardingStatus === 'IN_PROGRESS' && (
                        <button onClick={() => handleStatusChange(c.id, 'APPROVED')}
                          className="text-green-600 hover:underline text-xs">Approve</button>
                      )}
                      {can('COMPANIES', 'canUpdate') && c.onboardingStatus === 'IN_PROGRESS' && (
                        <button onClick={() => handleStatusChange(c.id, 'REJECTED')}
                          className="text-red-600 hover:underline text-xs">Reject</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">No companies found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Company' : 'Add Company'}</h2>
            {error && <div className="mb-3 text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Company Name', key: 'name', col: 2 },
                { label: 'Email', key: 'email', col: 2 },
                { label: 'Phone', key: 'phone', col: 1 },
                { label: 'Country (US/MX)', key: 'country', col: 1 },
                { label: 'Tax ID (RFC / EIN)', key: 'taxId', col: 1 },
              ].map(({ label, key, col }) => (
                <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    value={(form as any)[key] || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                <input
                  value={form.address || ''}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {!editing && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company Type</label>
                  <select
                    value={form.type || 'CUSTOMER'}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as CompanyType }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
