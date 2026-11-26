import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';
import { formatCurrency, numberToWordsEnglish, getLocalDateString } from '../utils/formatters';

const emptyItem = {
  product_id: '', product_name: '', hsn_code: '', quantity: 1,
  unit: 'pcs', rate: 0, amount: 0, discount_pct: 0,
  discount_amount: 0, taxable_amount: 0, vat_pct: 13, vat_amount: 0, total: 0,
};

export default function PurchasesCreate() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  const [dateAd, setDateAd] = useState(() => getLocalDateString());
  const [dateBs, setDateBs] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierPan, setSupplierPan] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);

  useEffect(() => {
    Promise.all([api.get('/api/suppliers'), api.get('/api/products')])
      .then(([s, p]) => { setSuppliers(s); setProducts(p); }).catch(console.error);
    api.get(`/api/convert-date?date=${dateAd}`).then(d => setDateBs(d.bs || '')).catch(() => {});
  }, []);

  useEffect(() => {
    if (dateAd) api.get(`/api/convert-date?date=${dateAd}`).then(d => setDateBs(d.bs || '')).catch(() => {});
  }, [dateAd]);

  const handleSupplierSelect = (id) => {
    setSupplierId(id);
    if (id) {
      const s = suppliers.find(s => s.id === parseInt(id));
      if (s) { setSupplierName(s.name); setSupplierAddress(s.address || ''); setSupplierPan(s.pan_no || ''); }
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        item.product_name = product.name;
        item.rate = product.purchase_price || 0;
        item.unit = product.unit || 'pcs';
        item.hsn_code = product.hsn_code || '';
        item.vat_pct = product.is_vat_applicable ? 13 : 0;
      }
    }
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const discPct = parseFloat(item.discount_pct) || 0;
    item.amount = Math.round(qty * rate * 100) / 100;
    item.discount_amount = Math.round(item.amount * discPct / 100 * 100) / 100;
    item.taxable_amount = Math.round((item.amount - item.discount_amount) * 100) / 100;
    item.vat_amount = Math.round(item.taxable_amount * (parseFloat(item.vat_pct) || 0) / 100 * 100) / 100;
    item.total = Math.round((item.taxable_amount + item.vat_amount) * 100) / 100;
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (i) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };

  const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
  const totalDiscount = items.reduce((s, i) => s + (i.discount_amount || 0), 0);
  const taxableAmount = items.reduce((s, i) => s + (i.taxable_amount || 0), 0);
  const vatAmount = items.reduce((s, i) => s + (i.vat_amount || 0), 0);
  const grandTotal = items.reduce((s, i) => s + (i.total || 0), 0);

  const handleSave = async () => {
    const validItems = items.filter(i => i.product_name && i.quantity > 0 && i.rate > 0);
    if (validItems.length === 0) return toast.error('Add at least one item');
    setSaving(true);
    try {
      const result = await api.post('/api/purchases', {
        date_ad: dateAd, supplier_invoice_no: supplierInvoiceNo,
        supplier_id: supplierId || null, supplier_name: supplierName,
        supplier_address: supplierAddress, supplier_pan: supplierPan,
        payment_method: paymentMethod, payment_status: paymentStatus, notes,
        items: validItems.map(i => ({
          product_id: i.product_id || null, product_name: i.product_name,
          hsn_code: i.hsn_code || '', quantity: parseFloat(i.quantity),
          unit: i.unit, rate: parseFloat(i.rate),
          discount_pct: parseFloat(i.discount_pct) || 0, vat_pct: parseFloat(i.vat_pct) || 13,
        })),
      });
      toast.success(`Purchase ${result.invoice_no} created!`);
      navigate(`/purchases/${result.id}`);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/purchases')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold text-gray-800">Create Purchase Invoice (खरिद बीजक)</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date (AD)</label>
            <input type="date" value={dateAd} onChange={e => setDateAd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date (BS)</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-indigo-700">{dateBs || '...'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Invoice No.</label>
            <input type="text" value={supplierInvoiceNo} onChange={e => setSupplierInvoiceNo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Vendor's invoice #" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="cash">Cash</option><option value="credit">Credit</option>
              <option value="bank">Bank Transfer</option><option value="cheque">Cheque</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Supplier Details (आपूर्तिकर्ता विवरण)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <select value={supplierId} onChange={e => handleSupplierSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">Select Supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Name" /></div>
          <div><input type="text" value={supplierAddress} onChange={e => setSupplierAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Address" /></div>
          <div><input type="text" value={supplierPan} onChange={e => setSupplierPan(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="PAN No." /></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Purchase Items</h3>
          <button onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-xs text-gray-500 w-8">S.N.</th>
                <th className="px-2 py-2 text-left text-xs text-gray-500 min-w-[180px]">Product</th>
                <th className="px-2 py-2 text-xs text-gray-500 w-16">Qty</th>
                <th className="px-2 py-2 text-xs text-gray-500 w-14">Unit</th>
                <th className="px-2 py-2 text-right text-xs text-gray-500 w-24">Rate</th>
                <th className="px-2 py-2 text-right text-xs text-gray-500 w-24">Amount</th>
                <th className="px-2 py-2 text-xs text-gray-500 w-16">Disc%</th>
                <th className="px-2 py-2 text-right text-xs text-gray-500 w-24">Taxable</th>
                <th className="px-2 py-2 text-right text-xs text-gray-500 w-20">VAT</th>
                <th className="px-2 py-2 text-right text-xs text-gray-500 w-24">Total</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="px-2 py-1.5 text-center text-gray-500">{index + 1}</td>
                  <td className="px-2 py-1.5">
                    <select value={item.product_id} onChange={e => updateItem(index, 'product_id', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm">
                      <option value="">Select...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5"><input type="number" value={item.quantity} min="0"
                    onChange={e => updateItem(index, 'quantity', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-center" /></td>
                  <td className="px-2 py-1.5 text-center text-xs text-gray-500">{item.unit}</td>
                  <td className="px-2 py-1.5"><input type="number" value={item.rate} min="0" step="0.01"
                    onChange={e => updateItem(index, 'rate', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right" /></td>
                  <td className="px-2 py-1.5 text-right font-medium">{item.amount.toFixed(2)}</td>
                  <td className="px-2 py-1.5"><input type="number" value={item.discount_pct} min="0" max="100"
                    onChange={e => updateItem(index, 'discount_pct', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-center" /></td>
                  <td className="px-2 py-1.5 text-right">{item.taxable_amount.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right text-indigo-600">{item.vat_amount.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right font-bold">{item.total.toFixed(2)}</td>
                  <td className="px-2 py-1.5">{items.length > 1 && (
                    <button onClick={() => removeItem(index)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="3"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal:</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">Discount:</span><span className="text-red-600">-{formatCurrency(totalDiscount)}</span></div>
          <div className="flex justify-between text-sm border-t pt-2"><span className="text-gray-600">Taxable:</span><span>{formatCurrency(taxableAmount)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">VAT (13%):</span><span className="text-indigo-600">{formatCurrency(vatAmount)}</span></div>
          <div className="flex justify-between text-lg border-t-2 pt-2"><span className="font-bold">Grand Total:</span><span className="font-bold text-indigo-700">{formatCurrency(grandTotal)}</span></div>
          <p className="text-xs text-gray-500 italic pt-1">{numberToWordsEnglish(grandTotal)}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-6">
        <button onClick={() => navigate('/purchases')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Purchase'}
        </button>
      </div>
    </div>
  );
}
