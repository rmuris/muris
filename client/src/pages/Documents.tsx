import { useState, useEffect, useRef } from 'react';
import { documents as docsApi } from '../api';
import type { Document, DocumentType } from '../types';
import { useAuth } from '../context/AuthContext';

const DOC_LABELS: Record<DocumentType, string> = {
  PEDIMENTO: 'Pedimento',
  US_CUSTOMS_ENTRY: 'US Customs Entry',
  COMMERCIAL_INVOICE: 'Commercial Invoice',
  BOL: 'Bill of Lading',
  PACKING_LIST: 'Packing List',
  CERTIFICATE_OF_ORIGIN: 'Certificate of Origin',
  OTHER: 'Other',
};

const DOC_COLORS: Record<DocumentType, string> = {
  PEDIMENTO: 'bg-purple-100 text-purple-800',
  US_CUSTOMS_ENTRY: 'bg-blue-100 text-blue-800',
  COMMERCIAL_INVOICE: 'bg-green-100 text-green-800',
  BOL: 'bg-orange-100 text-orange-800',
  PACKING_LIST: 'bg-yellow-100 text-yellow-800',
  CERTIFICATE_OF_ORIGIN: 'bg-teal-100 text-teal-800',
  OTHER: 'bg-gray-100 text-gray-700',
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function Documents() {
  const { can } = useAuth();
  const [list, setList] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ type: 'BOL' as DocumentType, description: '', isPublic: false });
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      setList(await docsApi.list(typeFilter ? { type: typeFilter } : {}));
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [typeFilter]);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', form.type);
      fd.append('description', form.description);
      fd.append('isPublic', String(form.isPublic));
      await docsApi.upload(fd);
      setShowUpload(false);
      setFile(null);
      setForm({ type: 'BOL', description: '', isPublic: false });
      load();
    } finally { setUploading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return;
    await docsApi.delete(id);
    load();
  }

  function handleDownload(id: string, name: string) {
    docsApi.download(id, name);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 text-sm mt-0.5">Pedimentos, entries, BOLs, invoices, packing lists</p>
        </div>
        {can('DOCUMENTS', 'canCreate') && (
          <button onClick={() => setShowUpload(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Upload Document
          </button>
        )}
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setTypeFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!typeFilter ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          All
        </button>
        {Object.entries(DOC_LABELS).map(([k, l]) => (
          <button key={k} onClick={() => setTypeFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === k ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['File', 'Type', 'Size', 'Company', 'Uploaded by', 'Date', 'Visibility', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 max-w-xs truncate" title={doc.originalName}>
                      {doc.originalName}
                    </div>
                    {doc.description && <div className="text-gray-400 text-xs">{doc.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${DOC_COLORS[doc.type as DocumentType]}`}>
                      {DOC_LABELS[doc.type as DocumentType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatBytes(doc.size)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {doc.company ? doc.company.name : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{doc.uploadedBy?.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${doc.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {doc.isPublic ? 'Shared' : 'Internal'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleDownload(doc.id, doc.originalName)}
                        className="text-blue-600 hover:underline text-xs">Download</button>
                      {can('DOCUMENTS', 'canDelete') && (
                        <button onClick={() => handleDelete(doc.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={8} className="text-center text-gray-400 py-8">No documents found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Upload Document</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Document Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as DocumentType }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(DOC_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">File</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  {file ? (
                    <div>
                      <div className="font-medium text-gray-800">{file.name}</div>
                      <div className="text-gray-400 text-xs">{formatBytes(file.size)}</div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      <div className="text-2xl mb-1">📄</div>
                      Click to select file
                      <div className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, XLSX, CSV — max 25MB</div>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv"
                  onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600" />
                <span className="text-sm text-gray-700">Share with assigned company (visible in portal)</span>
              </label>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => { setShowUpload(false); setFile(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !file}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400">
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
