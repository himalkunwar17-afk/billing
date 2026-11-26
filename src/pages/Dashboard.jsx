import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Plus, Receipt, ShoppingCart } from 'lucide-react';
import api from '../hooks/useApi';
import { formatCurrency } from '../utils/formatters';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-gray-500 py-12">Failed to load dashboard data</div>;
  }

  const stats = [
    { label: "Today's Sales", value: formatCurrency(data.todaySales || 0), color: 'border-green-500', bg: 'bg-green-50', icon: TrendingUp, iconColor: 'text-green-600' },
    { label: "Month's Sales", value: formatCurrency(data.monthSales || 0), color: 'border-blue-500', bg: 'bg-blue-50', icon: TrendingUp, iconColor: 'text-blue-600' },
    { label: "Today's Purchases", value: formatCurrency(data.todayPurchases || 0), color: 'border-orange-500', bg: 'bg-orange-50', icon: TrendingDown, iconColor: 'text-orange-600' },
    { label: 'VAT Collected', value: formatCurrency(data.vatCollected || 0), color: 'border-purple-500', bg: 'bg-purple-50', icon: DollarSign, iconColor: 'text-purple-600' },
    { label: 'Net VAT Payable', value: formatCurrency(data.netVat || 0), color: 'border-red-500', bg: 'bg-red-50', icon: DollarSign, iconColor: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white rounded-xl shadow-sm border-l-4 ${stat.color} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link to="/sales/new" className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm shadow-sm">
          <Plus className="w-4 h-4" /> New Sale
        </Link>
        <Link to="/purchases/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm">
          <Plus className="w-4 h-4" /> New Purchase
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Recent Sales
            </h3>
            <Link to="/sales" className="text-sm text-indigo-600 hover:text-indigo-800">View All →</Link>
          </div>
          <div className="overflow-x-auto">
            {data.recentSales && data.recentSales.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Invoice</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Customer</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link to={`/sales/${sale.id}`} className="text-indigo-600 hover:underline font-medium">
                          {sale.invoice_no}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{sale.date_bs}</td>
                      <td className="px-4 py-2 text-gray-700">{sale.customer_name || '-'}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatCurrency(sale.total_amount)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium
                          ${sale.is_cancelled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {sale.is_cancelled ? 'Cancelled' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-400 py-8">No sales yet. Create your first invoice!</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts
            </h3>
          </div>
          <div className="p-4">
            {data.lowStockProducts && data.lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {data.lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{p.stock_quantity} {p.unit}</p>
                      <p className="text-xs text-gray-500">Min: {p.min_stock_level}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-6 text-sm">All stock levels are healthy ✓</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-indigo-600">{data.totalProducts || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Total Products</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-indigo-600">{data.totalCustomers || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Customers</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(data.monthSales || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Monthly Revenue</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(data.vatCollected || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">VAT This Month</p>
        </div>
      </div>
    </div>
  );
}
