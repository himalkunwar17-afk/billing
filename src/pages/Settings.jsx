import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';

const fiscalYears = ['2079/80', '2080/81', '2081/82', '2082/83', '2083/84', '2084/85', '2085/86'];

export default function Settings() {
  const [form, setForm] = useState({
    company_name: '', company_name_np: '', address: '', phone: '', email: '',
    pan_no: '', bank_name: '', bank_account: '', fiscal_year: '2081/82', invoice_prefix: 'INV',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/settings')
      .then(data => setForm({
        company_name: data.company_name || '',
        company_name_np: data.company_name_np || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        pan_no: data.pan_no || '',
        bank_name: data.bank_name || '',
        bank_account: data.bank_account || '',
        fiscal_year: data.fiscal_year || '2081/82',
        invoice_prefix: data.invoice_prefix || 'INV',
      }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings', form);
      toast.success('Settings saved successfully!');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="w-6 h-6 text-gray-600" />
        <h1 className="text-xl font-bold text-gray-800">Company Settings</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name (English)</label>
            <input type="text" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="My Company Pvt. Ltd." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">कम्पनी नाम (Nepali)</label>
            <input type="text" value={form.company_name_np} onChange={e => setForm({...form, company_name_np: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="मेरो कम्पनी प्रा. लि." />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Kathmandu, Nepal" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="01-XXXXXXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="info@company.com" />
          </div>
        </div>

        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <label className="block text-sm font-bold text-indigo-800 mb-1">PAN / VAT Number</label>
          <input type="text" value={form.pan_no} onChange={e => setForm({...form, pan_no: e.target.value})}
            className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-lg"
            placeholder="XXXXXXXXX" maxLength="9" />
          <p className="text-xs text-indigo-600 mt-1">This PAN number will appear on all invoices as per IRD requirement</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
            <input type="text" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account Number</label>
            <input type="text" value={form.bank_account} onChange={e => setForm({...form, bank_account: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year (आर्थिक वर्ष)</label>
            <select value={form.fiscal_year} onChange={e => setForm({...form, fiscal_year: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
              {fiscalYears.map(fy => <option key={fy} value={fy}>{fy} BS</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix</label>
            <input type="text" value={form.invoice_prefix} onChange={e => setForm({...form, invoice_prefix: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder="INV" maxLength="10" />
            <p className="text-xs text-gray-500 mt-1">Invoices will be numbered as: {form.invoice_prefix}-0001</p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
