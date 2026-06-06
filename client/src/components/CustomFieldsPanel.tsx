import { useState, useEffect } from 'react';
import { customFields as cfApi } from '../api';
import type { CustomFieldDef, CustomFieldEntityType } from '../types';

interface Props {
  entityType: CustomFieldEntityType;
  entityId: string;
  initialData?: string | null; // JSON string stored on the entity
  canEdit?: boolean;
}

export default function CustomFieldsPanel({ entityType, entityId, initialData, canEdit = true }: Props) {
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cfApi.list(entityType).then(setDefs).catch(() => {});
  }, [entityType]);

  useEffect(() => {
    try {
      if (initialData) setValues(JSON.parse(initialData));
    } catch {}
  }, [initialData]);

  if (defs.length === 0) return null;

  async function save() {
    setSaving(true);
    try {
      await cfApi.saveValues(entityType, entityId, values);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function renderField(def: CustomFieldDef) {
    const val = values[def.name] ?? '';

    if (!editing) {
      let display = val;
      if (def.fieldType === 'BOOLEAN') display = val ? 'Yes' : 'No';
      if (def.fieldType === 'DATE' && val) display = new Date(val).toLocaleDateString();
      return (
        <div key={def.id}>
          <dt className="text-xs text-gray-500">{def.label}</dt>
          <dd className="text-sm font-medium text-gray-900 mt-0.5">{display || <span className="text-gray-400 italic">—</span>}</dd>
        </div>
      );
    }

    const inputClass = "mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

    if (def.fieldType === 'BOOLEAN') {
      return (
        <div key={def.id}>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!!val}
              onChange={e => setValues(v => ({ ...v, [def.name]: e.target.checked }))}
              className="accent-blue-600 w-4 h-4"
            />
            {def.label}
          </label>
        </div>
      );
    }

    if (def.fieldType === 'SELECT') {
      const opts: string[] = def.options ? JSON.parse(def.options) : [];
      return (
        <div key={def.id}>
          <label className="text-xs text-gray-500">{def.label}</label>
          <select
            value={val}
            onChange={e => setValues(v => ({ ...v, [def.name]: e.target.value }))}
            className={inputClass}
          >
            <option value="">— select —</option>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }

    return (
      <div key={def.id}>
        <label className="text-xs text-gray-500">{def.label}</label>
        <input
          type={def.fieldType === 'NUMBER' ? 'number' : def.fieldType === 'DATE' ? 'date' : 'text'}
          value={val}
          onChange={e => setValues(v => ({ ...v, [def.name]: e.target.value }))}
          className={inputClass}
        />
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Custom Fields</h3>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:underline">Cancel</button>
            <button
              onClick={save}
              disabled={saving}
              className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
      <dl className={editing ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
        {defs.map(def => renderField(def))}
      </dl>
    </div>
  );
}
