import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Printer, XCircle, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';
import { formatCurrency } from '../utils/formatters';

export default function PurchasesList() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const fetchPurchases = () => {
    setLoading(true);
    let url = `/api/purchases?page=${page}&limit=20`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (dateFrom) url += `&from=${dateFrom}`;
    if (dateTo) url += `&to=${dateTo}`;
    api.get(url)
      .then(res => {
        if (Array.isArray(res)) { setPurchases(res); }
        else { setPurchases(Array.isArray(res.data) ? res.data : Array.isArray(res.purchases) ? res.purchases : []); }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPurchases(); }, [page]);

  const handleFilter = () => { setPage(1); fetchPurchases(); };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this purchase? Stock will be reduced.')) return;
    try { await api.put(`/api/purchases/${id}/cancel`); toast.success('Purchase cancelled'); fetchPurchases(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" /> Purchase Invoices (खरिद बीजक)
        </h1>
        <Link to="/purchases/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
          <Plus className="w-4 h-4" /> New Purchase
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        <button onClick={handleFilter} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Filter</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier Inv.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date (BS)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Taxable</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">VAT</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {purchases.length === 0 ? (
                  <tr><td colSpan="9" className="px-4 py-12 text-center text-gray-400">No purchases found</td></tr>
                ) : purchases.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 ${p.is_cancelled ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2.5"><Link to={`/purchases/${p.id}`} className="text-indigo-600 hover:underline font-medium">{p.invoice_no}</Link></td>
                    <td className="px-4 py-2.5 text-gray-600">{p.supplier_invoice_no || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.date_bs}</td>
                    <td className="px-4 py-2.5 text-gray-700">{p.supplier_name || '-'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(p.taxable_amount)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(p.vat_amount)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(p.total_amount)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${p.is_cancelled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {p.is_cancelled ? 'Cancelled' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`/purchases/${p.id}`} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></Link>
                        {!p.is_cancelled && <button onClick={() => handleCancel(p.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><XCircle className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
