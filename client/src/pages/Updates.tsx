import { useState, useEffect } from 'react';
import { updates as updatesApi } from '../api';
import type { OperationUpdate, UpdateType, UpdateVisibility } from '../types';
import { useAuth } from '../context/AuthContext';

const TYPE_ICONS: Record<UpdateType, string> = {
  NOTE: '📝',
  STATUS_CHANGE: '🔄',
  DOCUMENT_UPLOAD: '📄',
  TASK_UPDATE: '✅',
  CUSTOMS_UPDATE: '🛃',
  CARRIER_UPDATE: '🚛',
  EXCEPTION: '⚠️',
  CHECKPOINT: '📍',
};

const VIS_COLORS: Record<UpdateVisibility, string> = {
  INTERNAL: 'bg-gray-100 text-gray-600',
  ALL: 'bg-green-100 text-green-700',
  CUSTOMER: 'bg-blue-100 text-blue-700',
  CARRIER: 'bg-orange-100 text-orange-700',
  CUSTOMS_BROKER: 'bg-purple-100 text-purple-700',
};

export default function Updates() {
  const { can, isInternal } = useAuth();
  const [list, setList] = useState<OperationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'NOTE' as UpdateType,
    content: '',
    visibility: 'INTERNAL' as UpdateVisibility,
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setList(await updatesApi.list()); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      await updatesApi.create(form);
      setForm({ type: 'NOTE', content: '', visibility: 'INTERNAL' });
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this update?')) return;
    await updatesApi.delete(id);
    load();
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(date).toLocaleDateString();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operation Updates</h1>
          <p className="text-gray-500 text-sm mt-0.5">Activity feed across all shipments and operations</p>
        </div>
        {can('UPDATES', 'canCreate') && (
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Post Update
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {list.map(u => (
            <div key={u.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5 shrink-0">{TYPE_ICONS[u.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{u.author?.name}</span>
                    {u.company && (
                      <span className="text-gray-400 text-xs">({u.company.name})</span>
                    )}
                    <span className="text-gray-400 text-xs">·</span>
                    <span className="text-gray-400 text-xs">{u.type.replace('_', ' ')}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${VIS_COLORS[u.visibility]}`}>
                      {u.visibility}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{u.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-gray-400 text-xs">{timeAgo(u.createdAt)}</span>
                    {can('UPDATES', 'canDelete') && (
                      <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center text-gray-400">No updates yet</div>
          )}
        </div>
      )}

      {/* Post update modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Post Operation Update</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as UpdateType }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.entries(TYPE_ICONS).map(([k, icon]) => (
                      <option key={k} value={k}>{icon} {k.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                {isInternal() && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Visibility</label>
                    <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value as UpdateVisibility }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {(['INTERNAL','ALL','CUSTOMER','CARRIER','CUSTOMS_BROKER'] as UpdateVisibility[]).map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Message *</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={4} placeholder="Describe the update, checkpoint, or note…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.content.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400">
                {saving ? 'Posting…' : 'Post Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
