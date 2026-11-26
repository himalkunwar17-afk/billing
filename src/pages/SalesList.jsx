import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Printer, XCircle, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';
import { formatCurrency } from '../utils/formatters';

export default function SalesList() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSales = () => {
    setLoading(true);
    let url = `/api/sales?page=${page}&limit=20`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (dateFrom) url += `&from=${dateFrom}`;
    if (dateTo) url += `&to=${dateTo}`;
    api.get(url)
      .then(res => {
        if (Array.isArray(res)) { setSales(res); setTotalPages(1); }
        else {
          setSales(Array.isArray(res.data) ? res.data : Array.isArray(res.sales) ? res.sales : []);
          setTotalPages(res.pagination?.totalPages || res.totalPages || 1);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSales(); }, [page]);

  const handleFilter = () => { setPage(1); fetchSales(); };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this invoice? Stock will be restored.')) return;
    try {
      await api.put(`/api/sales/${id}/cancel`);
      toast.success('Invoice cancelled');
      fetchSales();
    } catch (err) { toast.error(err.message); }
  };

  // Calculate totals
  const totals = sales.reduce((acc, s) => {
    if (!s.is_cancelled) {
      acc.taxable += s.taxable_amount || 0;
      acc.vat += s.vat_amount || 0;
      acc.total += s.total_amount || 0;
    }
    return acc;
  }, { taxable: 0, vat: 0, total: 0 });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Receipt className="w-6 h-6" /> Sales Invoices (बिक्री बीजक)
        </h1>
        <Link to="/sales/new" className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm">
          <Plus className="w-4 h-4" /> New Sale
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search invoice or customer..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="From" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="To" />
        <button onClick={handleFilter} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Filter</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date (BS)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Taxable</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">VAT</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sales.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-12 text-center text-gray-400">No sales invoices found</td></tr>
                ) : sales.map(sale => (
                  <tr key={sale.id} className={`hover:bg-gray-50 ${sale.is_cancelled ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2.5">
                      <Link to={`/sales/${sale.id}`} className="text-indigo-600 hover:underline font-medium">{sale.invoice_no}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{sale.date_bs}</td>
                    <td className="px-4 py-2.5 text-gray-700">{sale.customer_name || 'Walk-in'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(sale.taxable_amount)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(sale.vat_amount)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">{formatCurrency(sale.total_amount)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium
                        ${sale.is_cancelled ? 'bg-red-100 text-red-700' : sale.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {sale.is_cancelled ? 'Cancelled' : sale.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`/sales/${sale.id}`} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye className="w-4 h-4" /></Link>
                        <Link to={`/sales/${sale.id}`} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Print"><Printer className="w-4 h-4" /></Link>
                        {!sale.is_cancelled && (
                          <button onClick={() => handleCancel(sale.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Cancel">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {sales.length > 0 && (
                <tfoot className="bg-indigo-50 border-t-2 border-indigo-100">
                  <tr>
                    <td colSpan="3" className="px-4 py-2.5 text-right text-xs font-bold text-indigo-700 uppercase">Page Totals:</td>
                    <td className="px-4 py-2.5 text-right font-bold text-indigo-700">{formatCurrency(totals.taxable)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-indigo-700">{formatCurrency(totals.vat)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-indigo-700">{formatCurrency(totals.total)}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50 hover:bg-gray-50">Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50 hover:bg-gray-50">Next</button>
        </div>
      )}
    </div>
  );
}
