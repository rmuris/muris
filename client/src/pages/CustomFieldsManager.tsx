import { useState, useEffect } from 'react';
import { customFields as cfApi } from '../api';
import type { CustomFieldDef, CustomFieldEntityType, CustomFieldType } from '../types';

const ENTITY_TYPES: CustomFieldEntityType[] = ['ORDER', 'SHIPMENT', 'CUSTOMER', 'COMPANY'];
const FIELD_TYPES: CustomFieldType[] = ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN'];

const ENTITY_LABELS: Record<CustomFieldEntityType, string> = {
  ORDER: 'Orders',
  SHIPMENT: 'Shipments',
  CUSTOMER: 'Customers',
  COMPANY: 'Companies',
};

const TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  DATE: 'Date',
  SELECT: 'Dropdown',
  BOOLEAN: 'Yes/No',
};

const empty = {
  entityType: 'ORDER' as CustomFieldEntityType,
  name: '',
  label: '',
  fieldType: 'TEXT' as CustomFieldType,
  options: [] as string[],
  required: false,
  position: 0,
};

export default function CustomFieldsManager() {
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  const [activeTab, setActiveTab] = useState<CustomFieldEntityType>('ORDER');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CustomFieldDef | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [optionInput, setOptionInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cfApi.list().then(setDefs).catch(() => {});
  }, []);

  const filtered = defs.filter(d => d.entityType === activeTab);

  function openNew() {
    setEditing(null);
    setForm({ ...empty, entityType: activeTab });
    setOptionInput('');
    setError('');
    setShowForm(true);
  }

  function openEdit(def: CustomFieldDef) {
    setEditing(def);
    setForm({
      entityType: def.entityType,
      name: def.name,
      label: def.label,
      fieldType: def.fieldType,
      options: def.options ? JSON.parse(def.options) : [],
      required: def.required,
      position: def.position,
    });
    setOptionInput('');
    setError('');
    setShowForm(true);
  }

  async function handleSave() {
    setError('');
    if (!form.name || !form.label) {
      setError('Name and label are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        options: form.fieldType === 'SELECT' ? form.options : undefined,
      };
      if (editing) {
        const updated = await cfApi.update(editing.id, payload);
        setDefs(d => d.map(x => x.id === updated.id ? updated : x));
      } else {
        const created = await cfApi.create(payload);
        setDefs(d => [...d, created]);
      }
      setShowForm(false);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(def: CustomFieldDef) {
    if (!confirm(`Delete field "${def.label}"? This won't remove existing data.`)) return;
    await cfApi.delete(def.id);
    setDefs(d => d.filter(x => x.id !== def.id));
  }

  function addOption() {
    const trimmed = optionInput.trim();
    if (!trimmed || form.options.includes(trimmed)) return;
    setForm(f => ({ ...f, options: [...f.options, trimmed] }));
    setOptionInput('');
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Fields</h1>
          <p className="text-sm text-gray-500 mt-1">Define extra fields that appear on records and list views.</p>
        </div>
        <button
          onClick={openNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Add Field
        </button>
      </div>

      {/* Entity tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {ENTITY_TYPES.map(et => (
          <button
            key={et}
            onClick={() => setActiveTab(et)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === et ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {ENTITY_LABELS[et]}
          </button>
        ))}
      </div>

      {/* Field list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🔧</div>
          <div className="font-medium">No custom fields for {ENTITY_LABELS[activeTab]}</div>
          <div className="text-sm mt-1">Click "Add Field" to create one.</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Label', 'Field Name', 'Type', 'Options', 'Required', 'Position', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.sort((a, b) => a.position - b.position).map(def => (
                <tr key={def.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{def.label}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{def.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{TYPE_LABELS[def.fieldType as CustomFieldType]}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {def.fieldType === 'SELECT' && def.options
                      ? (JSON.parse(def.options) as string[]).join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">{def.required ? <span className="text-green-600 font-medium">Yes</span> : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{def.position}</td>
                  <td className="px-4 py-3 text-sm flex gap-3 justify-end">
                    <button onClick={() => openEdit(def)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(def)} className="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? 'Edit Custom Field' : 'New Custom Field'}
            </h2>

            {error && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                <select
                  value={form.entityType}
                  onChange={e => setForm(f => ({ ...f, entityType: e.target.value as CustomFieldEntityType }))}
                  disabled={!!editing}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  {ENTITY_TYPES.map(et => <option key={et} value={et}>{ENTITY_LABELS[et]}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label <span className="text-red-500">*</span></label>
                  <input
                    value={form.label}
                    onChange={e => {
                      const label = e.target.value;
                      const autoName = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                      setForm(f => ({ ...f, label, ...(!editing ? { name: autoName } : {}) }));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. PO Number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field Name <span className="text-red-500">*</span></label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    disabled={!!editing}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="e.g. po_number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                  <select
                    value={form.fieldType}
                    onChange={e => setForm(f => ({ ...f, fieldType: e.target.value as CustomFieldType }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FIELD_TYPES.map(ft => <option key={ft} value={ft}>{TYPE_LABELS[ft]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="number"
                    value={form.position}
                    onChange={e => setForm(f => ({ ...f, position: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={0}
                  />
                </div>
              </div>

              {form.fieldType === 'SELECT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dropdown Options</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={optionInput}
                      onChange={e => setOptionInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Type and press Enter"
                    />
                    <button onClick={addOption} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {form.options.map(opt => (
                      <span key={opt} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                        {opt}
                        <button onClick={() => setForm(f => ({ ...f, options: f.options.filter(o => o !== opt) }))} className="text-blue-400 hover:text-blue-700">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.required}
                  onChange={e => setForm(f => ({ ...f, required: e.target.checked }))}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700">Required field</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editing ? 'Update Field' : 'Create Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
