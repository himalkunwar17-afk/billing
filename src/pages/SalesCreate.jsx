import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';
import { formatCurrency, numberToWordsEnglish, getLocalDateString } from '../utils/formatters';

const emptyItem = {
  product_id: '', product_name: '', hsn_code: '', quantity: 1,
  unit: 'pcs', rate: 0, amount: 0, discount_pct: 0,
  discount_amount: 0, taxable_amount: 0, vat_pct: 13, vat_amount: 0, total: 0,
};

export default function SalesCreate() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [dateAd, setDateAd] = useState(() => getLocalDateString());
  const [dateBs, setDateBs] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPan, setCustomerPan] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);

  useEffect(() => {
    Promise.all([
      api.get('/api/customers'),
      api.get('/api/products'),
    ]).then(([c, p]) => { setCustomers(c); setProducts(p); }).catch(console.error);

    // Convert today's date to BS
    api.get(`/api/convert-date?date=${dateAd}`)
      .then(data => setDateBs(data.bs || ''))
      .catch(() => setDateBs(''));
  }, []);

  useEffect(() => {
    if (dateAd) {
      api.get(`/api/convert-date?date=${dateAd}`)
        .then(data => setDateBs(data.bs || ''))
        .catch(() => {});
    }
  }, [dateAd]);

  // Customer selection
  const handleCustomerSelect = (id) => {
    setCustomerId(id);
    if (id) {
      const c = customers.find(c => c.id === parseInt(id));
      if (c) {
        setCustomerName(c.name);
        setCustomerAddress(c.address || '');
        setCustomerPan(c.pan_no || '');
      }
    }
  };

  // Item management
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    // If product selected
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        item.product_name = product.name;
        item.rate = product.selling_price || 0;
        item.unit = product.unit || 'pcs';
        item.hsn_code = product.hsn_code || '';
        item.vat_pct = product.is_vat_applicable ? 13 : 0;
      }
    }

    // Recalculate
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
  const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

  // Totals
  const subtotal = items.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalDiscount = items.reduce((sum, i) => sum + (i.discount_amount || 0), 0);
  const taxableAmount = items.reduce((sum, i) => sum + (i.taxable_amount || 0), 0);
  const vatAmount = items.reduce((sum, i) => sum + (i.vat_amount || 0), 0);
  const grandTotal = items.reduce((sum, i) => sum + (i.total || 0), 0);
  const amountInWords = numberToWordsEnglish(grandTotal);

  const handleSave = async (andPrint = false) => {
    // Validation
    const validItems = items.filter(i => i.product_name && i.quantity > 0 && i.rate > 0);
    if (validItems.length === 0) return toast.error('Add at least one item with quantity and rate');

    setSaving(true);
    try {
      const payload = {
        date_ad: dateAd,
        customer_id: customerId || null,
        customer_name: customerName,
        customer_address: customerAddress,
        customer_pan: customerPan,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes,
        items: validItems.map(i => ({
          product_id: i.product_id || null,
          product_name: i.product_name,
          hsn_code: i.hsn_code || '',
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          rate: parseFloat(i.rate),
          discount_pct: parseFloat(i.discount_pct) || 0,
          vat_pct: parseFloat(i.vat_pct) || 13,
        })),
      };

      const result = await api.post('/api/sales', payload);
      toast.success(`Invoice ${result.invoice_no} created!`);
      navigate(`/sales/${result.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/sales')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Create Sales Invoice (बिक्री बीजक)</h1>
      </div>

      {/* Invoice Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date (AD)</label>
            <input type="date" value={dateAd} onChange={e => setDateAd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date (BS) मिति</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-indigo-700">
              {dateBs || 'Converting...'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
            <div className="flex gap-2">
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Customer Details (ग्राहक विवरण)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Select Customer</label>
            <select value={customerId} onChange={e => handleCustomerSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">Walk-in Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.pan_no ? `(${c.pan_no})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Customer name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
            <input type="text" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Address" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">PAN No.</label>
            <input type="text" value={customerPan} onChange={e => setCustomerPan(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="PAN number" />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Invoice Items (सामानको विवरण)</h3>
          <button onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 w-8">S.N.</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 min-w-[180px]">Product</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 w-16">Qty</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 w-14">Unit</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 w-24">Rate</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 w-24">Amount</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 w-16">Disc%</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 w-24">Taxable</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 w-20">VAT 13%</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 w-24">Total</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="px-2 py-1.5 text-gray-500 text-center">{index + 1}</td>
                  <td className="px-2 py-1.5">
                    <select value={item.product_id} onChange={e => updateItem(index, 'product_id', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm">
                      <option value="">Select product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.stock_quantity} {p.unit})</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" value={item.quantity} min="0" step="1"
                      onChange={e => updateItem(index, 'quantity', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-center" />
                  </td>
                  <td className="px-2 py-1.5 text-center text-gray-500 text-xs">{item.unit}</td>
                  <td className="px-2 py-1.5">
                    <input type="number" value={item.rate} min="0" step="0.01"
                      onChange={e => updateItem(index, 'rate', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right" />
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-700 font-medium">{item.amount.toFixed(2)}</td>
                  <td className="px-2 py-1.5">
                    <input type="number" value={item.discount_pct} min="0" max="100" step="0.5"
                      onChange={e => updateItem(index, 'discount_pct', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-center" />
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-700">{item.taxable_amount.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right text-indigo-600 font-medium">{item.vat_amount.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right font-bold text-gray-900">{item.total.toFixed(2)}</td>
                  <td className="px-2 py-1.5">
                    {items.length > 1 && (
                      <button onClick={() => removeItem(index)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes / Remarks</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="4"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Additional notes..." />
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount:</span>
              <span className="font-medium text-red-600">-{formatCurrency(totalDiscount)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-600">Taxable Amount:</span>
              <span className="font-medium">{formatCurrency(taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT (13%):</span>
              <span className="font-medium text-indigo-600">{formatCurrency(vatAmount)}</span>
            </div>
            <div className="flex justify-between text-lg border-t-2 border-indigo-200 pt-2">
              <span className="font-bold text-gray-800">Grand Total:</span>
              <span className="font-bold text-indigo-700">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">In Words:</p>
              <p className="text-xs font-medium text-gray-700 italic">{amountInWords}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <button onClick={() => navigate('/sales')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm">
          Cancel
        </button>
        <button onClick={() => handleSave(false)} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Invoice'}
        </button>
        <button onClick={() => handleSave(true)} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-50">
          <Printer className="w-4 h-4" /> Save & Print
        </button>
      </div>
    </div>
  );
}
