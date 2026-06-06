import { useState, useEffect } from 'react';
import { tasks as tasksApi, companies as companiesApi } from '../api';
import type { Task, Company, TaskStatus, TaskPriority } from '../types';
import { useAuth } from '../context/AuthContext';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function Tasks() {
  const { can } = useAuth();
  const [list, setList] = useState<Task[]>([]);
  const [comps, setComps] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', assignedToCompanyId: '',
    priority: 'MEDIUM' as TaskPriority, dueDate: '',
    checklistItems: [{ text: '' }],
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([
        tasksApi.list(statusFilter ? { status: statusFilter } : {}),
        companiesApi.list(),
      ]);
      setList(t);
      setComps(c);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function handleCreate() {
    setSaving(true);
    try {
      await tasksApi.create({
        ...form,
        assignedToCompanyId: form.assignedToCompanyId || undefined,
        dueDate: form.dueDate || undefined,
        checklistItems: form.checklistItems.filter(i => i.text.trim()),
      });
      setShowForm(false);
      setForm({ title: '', description: '', assignedToCompanyId: '', priority: 'MEDIUM', dueDate: '', checklistItems: [{ text: '' }] });
      load();
    } finally { setSaving(false); }
  }

  async function handleStatusChange(id: string, status: TaskStatus) {
    await tasksApi.update(id, { status });
    load();
  }

  async function toggleChecklist(taskId: string, itemId: string, isCompleted: boolean) {
    await tasksApi.toggleChecklistItem(taskId, itemId, isCompleted);
    load();
  }

  const completed = (t: Task) => t.checklistItems.filter(i => i.isCompleted).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 text-sm mt-0.5">Checklists and tasks per company / shipment</p>
        </div>
        {can('TASKS', 'canCreate') && (
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + New Task
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : (
        <div className="space-y-3">
          {list.map(task => (
            <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === task.id ? null : task.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{task.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.status]}`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs mt-1 flex items-center gap-3 flex-wrap">
                      {task.assignedToCompany && (
                        <span>Company: <strong>{task.assignedToCompany.name}</strong></span>
                      )}
                      {task.dueDate && (
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      )}
                      {task.checklistItems.length > 0 && (
                        <span>{completed(task)}/{task.checklistItems.length} done</span>
                      )}
                    </div>
                  </div>
                  {can('TASKS', 'canUpdate') && (
                    <select value={task.status}
                      onChange={e => { e.stopPropagation(); handleStatusChange(task.id, e.target.value as TaskStatus); }}
                      onClick={e => e.stopPropagation()}
                      className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0">
                      {(['PENDING','IN_PROGRESS','COMPLETED','CANCELLED'] as TaskStatus[]).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Checklist progress bar */}
                {task.checklistItems.length > 0 && (
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(completed(task) / task.checklistItems.length) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Expanded checklist */}
              {expanded === task.id && task.checklistItems.length > 0 && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
                  {task.description && (
                    <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                  )}
                  {task.checklistItems.map(item => (
                    <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={e => toggleChecklist(task.id, item.id, e.target.checked)}
                        disabled={!can('TASKS', 'canUpdate')}
                        className="mt-0.5 w-4 h-4 accent-green-600 cursor-pointer"
                      />
                      <span className={`text-sm ${item.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          {list.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center text-gray-400">No tasks found</div>
          )}
        </div>
      )}

      {/* New Task modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">New Task</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Assign to Company</label>
                  <select value={form.assignedToCompanyId} onChange={e => setForm(f => ({ ...f, assignedToCompanyId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— None —</option>
                    {comps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {(['LOW','MEDIUM','HIGH','URGENT'] as TaskPriority[]).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Checklist Items</label>
                <div className="space-y-2">
                  {form.checklistItems.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={item.text}
                        onChange={e => setForm(f => ({ ...f, checklistItems: f.checklistItems.map((x, j) => j === i ? { text: e.target.value } : x) }))}
                        placeholder={`Item ${i + 1}`}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      {form.checklistItems.length > 1 && (
                        <button onClick={() => setForm(f => ({ ...f, checklistItems: f.checklistItems.filter((_, j) => j !== i) }))}
                          className="text-red-500 hover:text-red-700 px-2">✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setForm(f => ({ ...f, checklistItems: [...f.checklistItems, { text: '' }] }))}
                    className="text-blue-600 hover:underline text-xs mt-1">+ Add item</button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.title}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400">
                {saving ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
