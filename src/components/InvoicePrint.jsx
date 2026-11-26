import { formatCurrency } from '../utils/formatters';

function splitRupeesPaisa(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return ['0', '00'];
  const formatted = formatCurrency(num).replace(/^(-?)Rs\.\s*/, '$1');
  const [rs = '0', ps = '00'] = formatted.split('.');
  return [rs, ps];
}

function formatRate(rate) {
  const num = parseFloat(rate);
  if (isNaN(num)) return '';
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function getEnglishWords(amountInWords) {
  if (!amountInWords) return '';
  return amountInWords.split('|')[0].trim();
}

function DigitBoxes({ value = '', length = 9, size = 19 }) {
  const chars = String(value || '').replace(/\s+/g, '').slice(0, length).split('');
  return (
    <span style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
      {Array.from({ length }).map((_, idx) => (
        <span
          key={idx}
          style={{
            width: `${size}px`,
            height: `${size + 1}px`,
            borderTop: '1px solid #1f2937',
            borderBottom: '1px solid #1f2937',
            borderLeft: '1px solid #1f2937',
            borderRight: idx === length - 1 ? '1px solid #1f2937' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: 'monospace',
            lineHeight: 1,
            color: '#111827',
            backgroundColor: '#ffffff',
          }}
        >
          {chars[idx] || ''}
        </span>
      ))}
    </span>
  );
}

/**
 * Nepal VAT Tax Invoice Print Template
 * Styled to match standard printed Nepali Tax Invoice bill pad format
 *
 * Props:
 * - data: sale or purchase object with items array
 * - type: "sale" | "purchase"
 * - copy: "Original" | "Office Copy" | "Tax Office Copy"
 * - companyInfo: settings object with company details
 */
export default function InvoicePrint({ data, type = 'sale', copy = 'Original', companyInfo = {} }) {
  if (!data) return null;

  const items = data.items || [];
  const isSale = type === 'sale';
  const partyLabel = isSale ? "Customer's Name" : "Supplier's Name";
  const partyPanLabel = isSale ? "Customer's PAN" : "Supplier's PAN";
  const partyName = isSale ? data.customer_name : data.supplier_name;
  const partyAddress = isSale ? data.customer_address : data.supplier_address;
  const partyPan = isSale ? data.customer_pan : data.supplier_pan;

  const subtotal = parseFloat(data.subtotal) || 0;
  const taxableAmount = parseFloat(data.taxable_amount) || 0;
  const computedDiscount = Math.max(0, Math.round((subtotal - taxableAmount) * 100) / 100) || (parseFloat(data.discount_amount) || 0);

  const [subRs, subPs] = splitRupeesPaisa(subtotal);
  const [discRs, discPs] = computedDiscount > 0 ? splitRupeesPaisa(computedDiscount) : ['', ''];
  const [taxRs, taxPs] = splitRupeesPaisa(taxableAmount);
  const [vatRs, vatPs] = splitRupeesPaisa(data.vat_amount);
  const [grandRs, grandPs] = splitRupeesPaisa(data.total_amount);

  const paymentRaw = (data.payment_method || 'cash').toLowerCase();
  const activePayment =
    paymentRaw === 'cash' ? 'Cash' :
    paymentRaw === 'credit' ? 'Credit' :
    paymentRaw === 'cheque' ? 'Cheque' : 'Others';

  const paymentModes = ['Cash', 'Credit', 'Cheque', 'Others'];
  const minRows = 10;
  const emptyRowCount = Math.max(0, minRows - items.length);
  const wordsText = getEnglishWords(data.amount_in_words);

  const headerSubline = [
    companyInfo?.address,
    companyInfo?.phone ? `Ph: ${companyInfo.phone}` : '',
  ].filter(Boolean).join('  ');

  const summaryRows = [
    { label: 'Total', rs: subRs, ps: subPs, bold: false },
    { label: 'Discount', rs: discRs, ps: discPs, bold: false },
    { label: 'Taxable Amount', rs: taxRs, ps: taxPs, bold: false },
    { label: '13 % VAT', rs: vatRs, ps: vatPs, bold: false },
    { label: 'Grand Total', rs: grandRs, ps: grandPs, bold: true },
  ];

  const cellVerticalBorder = {
    borderLeft: '1px solid #1f2937',
    borderRight: '1px solid #1f2937',
    borderTop: 'none',
    borderBottom: 'none',
  };

  return (
    <div
      className="print-area bg-white text-gray-900 shadow-sm border border-gray-200 print:shadow-none print:border-0"
      style={{
        maxWidth: '210mm',
        margin: '0 auto',
        padding: '28px 34px',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        position: 'relative',
        color: '#111827',
      }}
    >
      {/* Watermark for copies */}
      {copy !== 'Original' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-35deg)',
            fontSize: '46px',
            fontWeight: 'bold',
            color: 'rgba(0,0,0,0.06)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 0,
            letterSpacing: '8px',
          }}
        >
          COPY OF ORIGINAL
        </div>
      )}

      {/* Cancelled watermark */}
      {data.is_cancelled ? (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-35deg)',
            fontSize: '64px',
            fontWeight: 'bold',
            color: 'rgba(220,38,38,0.16)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          CANCELLED
        </div>
      ) : null}

      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* ═══ HEADER ═══ */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <h1
            style={{
              fontSize: '23px',
              fontWeight: '700',
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: '0.2px',
              color: '#111827',
            }}
          >
            {companyInfo?.company_name || 'Company Name'}
          </h1>
          {headerSubline && (
            <p
              style={{
                fontSize: '13px',
                fontWeight: '600',
                margin: '3px 0 0',
                color: '#1f2937',
              }}
            >
              {headerSubline}
            </p>
          )}
        </div>

        {/* Invoice No / Tax Invoice / Date + VAT No */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'end',
            gap: '8px',
            marginTop: '6px',
            marginBottom: '10px',
          }}
        >
          {/* Left: Invoice No + VAT No */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '500' }}>Invoice No.</span>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#b91c1c',
                  letterSpacing: '0.5px',
                }}
              >
                {data.invoice_no}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: '500', whiteSpace: 'nowrap' }}>VAT No.</span>
              <DigitBoxes value={companyInfo?.pan_no} length={9} size={18} />
            </div>
          </div>

          {/* Center: Tax Invoice */}
          <div style={{ textAlign: 'center', paddingBottom: '4px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
              Tax Invoice
            </div>
            {copy !== 'Original' && (
              <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '1px' }}>
                ({copy})
              </div>
            )}
          </div>

          {/* Right: Date */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: '6px', paddingBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Date</span>
            <span
              style={{
                minWidth: '125px',
                borderBottom: '1.5px dotted #1f2937',
                textAlign: 'center',
                fontSize: '12.5px',
                fontWeight: '500',
                paddingBottom: '1px',
                letterSpacing: '0.6px',
              }}
            >
              {data.date_bs || data.date_ad || ''}
            </span>
          </div>
        </div>

        {/* ═══ CUSTOMER / SUPPLIER DETAILS ═══ */}
        <div style={{ marginBottom: '8px', fontSize: '12.5px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
            <span style={{ whiteSpace: 'nowrap', fontWeight: '500' }}>{partyLabel}</span>
            <span
              style={{
                flex: 1,
                borderBottom: '1.5px dotted #1f2937',
                paddingLeft: '6px',
                paddingBottom: '1px',
                minHeight: '18px',
                fontWeight: '500',
              }}
            >
              {partyName || ''}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '7px' }}>
            <span style={{ whiteSpace: 'nowrap', fontWeight: '500' }}>Address</span>
            <span
              style={{
                flex: 1,
                borderBottom: '1.5px dotted #1f2937',
                paddingLeft: '6px',
                paddingBottom: '1px',
                minHeight: '18px',
                fontWeight: '500',
              }}
            >
              {partyAddress || ''}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
            <span style={{ whiteSpace: 'nowrap', fontWeight: '500' }}>{partyPanLabel}</span>
            <DigitBoxes value={partyPan} length={9} size={21} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', fontSize: '12px' }}>
            <span style={{ fontWeight: '500', marginRight: '4px' }}>Payment Mode:</span>
            {paymentModes.map((mode, idx) => {
              const isSelected = mode === activePayment;
              return (
                <span key={mode} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span
                    style={
                      isSelected
                        ? {
                            border: '1.5px solid #1f2937',
                            borderRadius: '9999px',
                            padding: '0 6px',
                            fontWeight: '600',
                            lineHeight: 1.35,
                          }
                        : { padding: '0 2px' }
                    }
                  >
                    {mode}
                    {mode === 'Others' && paymentRaw === 'bank' ? ' (Bank)' : ''}
                  </span>
                  {idx < paymentModes.length - 1 && <span style={{ margin: '0 2px' }}>/</span>}
                </span>
              );
            })}
          </div>
        </div>

        {/* ═══ ITEMS & SUMMARY TABLE ═══ */}
        <table
          className="nepal-bill-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            fontSize: '12px',
          }}
        >
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '39%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} style={{ border: '1px solid #1f2937', padding: '5px 4px', textAlign: 'center', fontWeight: '600' }}>
                S.N.
              </th>
              <th rowSpan={2} style={{ border: '1px solid #1f2937', padding: '5px 4px', textAlign: 'center', fontWeight: '600' }}>
                H.S. Code
              </th>
              <th rowSpan={2} style={{ border: '1px solid #1f2937', padding: '5px 8px', textAlign: 'center', fontWeight: '600' }}>
                Particulars
              </th>
              <th rowSpan={2} style={{ border: '1px solid #1f2937', padding: '5px 4px', textAlign: 'center', fontWeight: '600' }}>
                Qty.
              </th>
              <th rowSpan={2} style={{ border: '1px solid #1f2937', padding: '5px 4px', textAlign: 'center', fontWeight: '600' }}>
                Rate
              </th>
              <th colSpan={2} style={{ border: '1px solid #1f2937', padding: '3px 4px', textAlign: 'center', fontWeight: '600' }}>
                Amount
              </th>
            </tr>
            <tr>
              <th style={{ border: '1px solid #1f2937', padding: '2px 4px', textAlign: 'center', fontWeight: '600' }}>
                Rs.
              </th>
              <th style={{ border: '1px solid #1f2937', padding: '2px 4px', textAlign: 'center', fontWeight: '600' }}>
                Ps.
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const lineAmount = parseFloat(item.amount ?? (item.quantity * item.rate)) || 0;
              const [itemRs, itemPs] = splitRupeesPaisa(lineAmount);
              return (
                <tr key={index}>
                  <td style={{ ...cellVerticalBorder, padding: '6px 4px', textAlign: 'center', verticalAlign: 'top' }}>
                    {index + 1}.
                  </td>
                  <td style={{ ...cellVerticalBorder, padding: '6px 4px', textAlign: 'center', verticalAlign: 'top', fontFamily: 'monospace', fontSize: '11px' }}>
                    {item.hsn_code || ''}
                  </td>
                  <td style={{ ...cellVerticalBorder, padding: '6px 8px', textAlign: 'left', verticalAlign: 'top', wordBreak: 'break-word' }}>
                    {item.product_name}
                  </td>
                  <td style={{ ...cellVerticalBorder, padding: '6px 4px', textAlign: 'center', verticalAlign: 'top' }}>
                    {item.quantity}
                    {item.unit ? <span style={{ fontSize: '10px', color: '#4b5563', marginLeft: '2px' }}>{item.unit}</span> : null}
                  </td>
                  <td style={{ ...cellVerticalBorder, padding: '6px 6px', textAlign: 'right', verticalAlign: 'top' }}>
                    {formatRate(item.rate)}
                  </td>
                  <td style={{ ...cellVerticalBorder, padding: '6px 6px', textAlign: 'right', verticalAlign: 'top' }}>
                    {itemRs}
                  </td>
                  <td style={{ ...cellVerticalBorder, padding: '6px 4px', textAlign: 'center', verticalAlign: 'top' }}>
                    {itemPs}
                  </td>
                </tr>
              );
            })}

            {Array.from({ length: emptyRowCount }).map((_, idx) => (
              <tr key={`empty-${idx}`}>
                <td style={{ ...cellVerticalBorder, height: '24px' }}>&nbsp;</td>
                <td style={cellVerticalBorder}></td>
                <td style={cellVerticalBorder}></td>
                <td style={cellVerticalBorder}></td>
                <td style={cellVerticalBorder}></td>
                <td style={cellVerticalBorder}></td>
                <td style={cellVerticalBorder}></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {summaryRows.map((row, idx) => (
              <tr key={row.label}>
                {idx === 0 && (
                  <td
                    colSpan={3}
                    rowSpan={summaryRows.length}
                    style={{
                      border: '1px solid #1f2937',
                      padding: '8px 10px',
                      verticalAlign: 'top',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ position: 'relative', minHeight: '72px' }}>
                      {/* 3 underlying dotted lines */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1, pointerEvents: 'none' }}>
                        <div style={{ height: '22px', borderBottom: '1.5px dotted #1f2937' }} />
                        <div style={{ height: '24px', borderBottom: '1.5px dotted #1f2937' }} />
                        <div style={{ height: '24px', borderBottom: '1.5px dotted #1f2937' }} />
                      </div>
                      {/* Flowing Amount in Words text aligned to the lines */}
                      <div
                        style={{
                          position: 'relative',
                          zIndex: 2,
                          lineHeight: '24px',
                          fontSize: '12px',
                          minHeight: '72px',
                        }}
                      >
                        <span style={{ backgroundColor: '#ffffff', paddingRight: '6px', fontWeight: '500' }}>
                          Amount in Words
                        </span>
                        <span style={{ fontStyle: 'italic' }}>{wordsText}</span>
                      </div>
                    </div>
                  </td>
                )}
                <td
                  colSpan={2}
                  style={{
                    border: '1px solid #1f2937',
                    padding: '4px 8px',
                    textAlign: 'right',
                    fontWeight: row.bold ? '700' : '500',
                    fontSize: '12px',
                  }}
                >
                  {row.label}
                </td>
                <td
                  style={{
                    border: '1px solid #1f2937',
                    padding: '4px 6px',
                    textAlign: 'right',
                    fontWeight: row.bold ? '700' : '500',
                    fontSize: '12px',
                  }}
                >
                  {row.rs}
                </td>
                <td
                  style={{
                    border: '1px solid #1f2937',
                    padding: '4px 4px',
                    textAlign: 'center',
                    fontWeight: row.bold ? '700' : '500',
                    fontSize: '12px',
                  }}
                >
                  {row.ps}
                </td>
              </tr>
            ))}
          </tfoot>
        </table>

        {/* ═══ FOOTER ═══ */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: '10px',
            padding: '0 2px',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: '500' }}>E. &amp; O. E.</p>
            {data.notes && (
              <p style={{ margin: '4px 0 0', fontSize: '10.5px', color: '#4b5563' }}>
                Remarks: {data.notes}
              </p>
            )}
          </div>

          <div style={{ textAlign: 'center', minWidth: '215px', marginTop: '24px' }}>
            <div style={{ borderTop: '1.5px dotted #1f2937', marginBottom: '4px' }} />
            <p style={{ margin: 0, fontSize: '12px', fontWeight: '500' }}>
              For: {companyInfo?.company_name || 'Company Name'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
