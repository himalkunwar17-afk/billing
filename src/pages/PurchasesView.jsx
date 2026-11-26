import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import api from '../hooks/useApi';
import InvoicePrint from '../components/InvoicePrint';

export default function PurchasesView() {
  const { id } = useParams();
  const [purchase, setPurchase] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/api/purchases/${id}`),
      api.get('/api/settings'),
    ]).then(([data, s]) => { setPurchase(data); setSettings(s); })
      .catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;
  if (!purchase) return <div className="text-center py-12 text-gray-500">Purchase not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 no-print">
        <div className="flex items-center gap-3">
          <Link to="/purchases" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl font-bold text-gray-800">Purchase: {purchase.invoice_no}</h1>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm">
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>
      <InvoicePrint data={purchase} type="purchase" copy="Original" companyInfo={settings} />
    </div>
  );
}
