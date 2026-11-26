import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Truck as TruckIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', pan_no: '', is_vat_registered: 0 });

  const fetchSuppliers = () => {
    const url = search ? `/api/suppliers?search=${encodeURIComponent(search)}` : '/api/suppliers';
    api.get(url).then(setSuppliers).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchSuppliers(); }, [search]);

  const openAdd = () => { setEditing(null); setForm({ name: '', address: '', phone: '', email: '', pan_no: '', is_vat_registered: 0 }); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, address: s.address || '', phone: s.phone || '', email: s.email || '', pan_no: s.pan_no || '', is_vat_registered: s.is_vat_registered || 0 }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Supplier name is required');
    try {
      if (editing) { await api.put(`/api/suppliers/${editing.id}`, form); toast.success('Supplier updated'); }
      else { await api.post('/api/suppliers', form); toast.success('Supplier added'); }
      setShowModal(false); fetchSuppliers();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this supplier?')) return;
    try { await api.del(`/api/suppliers/${id}`); toast.success('Deleted'); fetchSuppliers(); }
    catch (err) { toast.error(err.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><TruckIcon className="w-6 h-6" /> Suppliers</h1>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">PAN</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">VAT Reg.</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {suppliers.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-gray-400">No suppliers found</td></tr>
              ) : suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{s.address || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{s.phone || '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-sm text-gray-600">{s.pan_no || '-'}</td>
                  <td className="px-4 py-2.5 text-center">
                    {s.is_vat_registered ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Yes</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => openEdit(s)} className="p-1 text-blue-600 hover:bg-blue-50 rounded mr-1"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Supplier' : 'Add Supplier'}</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {[
                { label: 'Name *', key: 'name', placeholder: 'Supplier name' },
                { label: 'Address', key: 'address', placeholder: 'Address' },
                { label: 'Phone', key: 'phone', placeholder: 'Phone number' },
                { label: 'Email', key: 'email', placeholder: 'Email address', type: 'email' },
                { label: 'PAN Number', key: 'pan_no', placeholder: 'PAN number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder={f.placeholder} />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sVatReg" checked={form.is_vat_registered === 1}
                  onChange={e => setForm({...form, is_vat_registered: e.target.checked ? 1 : 0})} className="rounded border-gray-300 text-indigo-600" />
                <label htmlFor="sVatReg" className="text-sm text-gray-700">VAT Registered</label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">{editing ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
