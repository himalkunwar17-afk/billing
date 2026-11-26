import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import api from '../hooks/useApi';
import InvoicePrint from '../components/InvoicePrint';

export default function SalesView() {
  const { id } = useParams();
  const [sale, setSale] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copyType, setCopyType] = useState('Original');

  useEffect(() => {
    Promise.all([
      api.get(`/api/sales/${id}`),
      api.get('/api/settings'),
    ]).then(([saleData, settingsData]) => {
      setSale(saleData);
      setSettings(settingsData);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;
  }

  if (!sale) {
    return <div className="text-center py-12 text-gray-500">Invoice not found</div>;
  }

  return (
    <div>
      {/* Controls - hidden on print */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
        <div className="flex items-center gap-3">
          <Link to="/sales" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl font-bold text-gray-800">Invoice: {sale.invoice_no}</h1>
          {sale.is_cancelled ? <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">CANCELLED</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={copyType}
            onChange={(e) => setCopyType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="Original">Original (Customer Copy)</option>
            <option value="Office Copy">Office Copy (Copy of Original)</option>
            <option value="Tax Office Copy">Tax Office Copy (Copy of Original)</option>
          </select>
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm">
            <Printer className="w-4 h-4" /> Print Invoice
          </button>
        </div>
      </div>

      {/* Invoice Print Area */}
      <InvoicePrint data={sale} type="sale" copy={copyType} companyInfo={settings} />
    </div>
  );
}
