import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertTriangle, Package as PackageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';
import { formatCurrency } from '../utils/formatters';

const UNITS = ['pcs', 'kg', 'gm', 'ltr', 'ml', 'box', 'dz', 'set', 'm', 'ft', 'sq.ft', 'pair'];

const emptyProduct = {
  name: '', code: '', category_id: '', unit: 'pcs', purchase_price: '',
  selling_price: '', stock_quantity: '', min_stock_level: '0',
  hsn_code: '', is_vat_applicable: 1, description: '',
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyProduct });

  const fetchProducts = () => {
    let url = '/api/products?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (categoryFilter) url += `category_id=${categoryFilter}&`;
    api.get(url).then(setProducts).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/api/categories').then(setCategories).catch(console.error);
    fetchProducts();
  }, []);

  useEffect(() => { fetchProducts(); }, [search, categoryFilter]);

  const openAdd = () => { setEditing(null); setForm({ ...emptyProduct }); setShowModal(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, code: p.code || '', category_id: p.category_id || '',
      unit: p.unit || 'pcs', purchase_price: p.purchase_price || '',
      selling_price: p.selling_price || '', stock_quantity: p.stock_quantity || '',
      min_stock_level: p.min_stock_level || '0', hsn_code: p.hsn_code || '',
      is_vat_applicable: p.is_vat_applicable, description: p.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Product name is required');
    try {
      const payload = {
        ...form,
        purchase_price: parseFloat(form.purchase_price) || 0,
        selling_price: parseFloat(form.selling_price) || 0,
        stock_quantity: parseFloat(form.stock_quantity) || 0,
        min_stock_level: parseFloat(form.min_stock_level) || 0,
        category_id: form.category_id || null,
      };
      if (editing) {
        await api.put(`/api/products/${editing.id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/api/products', payload);
        toast.success('Product added');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.del(`/api/products/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) { toast.error(err.message); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <PackageIcon className="w-6 h-6" /> Products & Inventory
        </h1>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Buy Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Sell Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.length === 0 ? (
                <tr><td colSpan="8" className="px-4 py-12 text-center text-gray-400">No products found. Add your first product!</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.code}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{p.category_name || '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{p.unit}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(p.purchase_price)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-800 font-medium">{formatCurrency(p.selling_price)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`inline-flex items-center gap-1 font-medium ${p.stock_quantity <= p.min_stock_level ? 'text-red-600' : 'text-green-600'}`}>
                      {p.stock_quantity <= p.min_stock_level && <AlertTriangle className="w-3 h-3" />}
                      {p.stock_quantity} {p.unit}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => openEdit(p)} className="p-1 text-blue-600 hover:bg-blue-50 rounded mr-1"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">{editing ? 'Edit Product' : 'Add Product'}</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Enter product name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Auto-generated" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                  <input type="text" value={form.hsn_code} onChange={e => setForm({...form, hsn_code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                  <input type="number" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                  <input type="number" value={form.selling_price} onChange={e => setForm({...form, selling_price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                  <input type="number" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                  <input type="number" value={form.min_stock_level} onChange={e => setForm({...form, min_stock_level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="0" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="vat" checked={form.is_vat_applicable === 1}
                  onChange={e => setForm({...form, is_vat_applicable: e.target.checked ? 1 : 0})}
                  className="rounded border-gray-300 text-indigo-600" />
                <label htmlFor="vat" className="text-sm text-gray-700">VAT Applicable (13%)</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" rows="2" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                {editing ? 'Update' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
