const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('D:/Downloads/Modern/phase13_project/data/2026-WHOLESALE_UPDATED_JAN_DEC_DATA_REFERENCE.json', 'utf8'));
const recs = raw.records;
const sectionMap = {
  'CHARGE SALES INVOICE SERIES': 'CHSI',
  'CASH SALES INVOICE SERIES': 'CASI',
  'DELIVERY RECEIPT (WHOLESALE)': 'DR_WHOLESALE',
  'DELIVERY RECEIPT (SEAFOOD ONLINE) - DR No.': 'DR_SEAFOOD_DR',
  'DELIVERY RECEIPT (SEAFOOD ONLINE) - CHSI No.': 'DR_SEAFOOD_CHSI',
  'DELIVERY RECEIPT (LOCAL SALES)': 'DR_LOCAL'
};
const converted = recs.map((r) => {
  let status = 'NOTDUE';
  if (r.status === 'PAID') status = 'PAID';
  else if (r.status === 'PASTDUE') status = 'PASTDUE';
  else if (r.status === 'NOT DUE') status = 'NOTDUE';
  const receivable = Math.max(Number(r.net_receivables || 0), 0);
  return {
    sourceSheet: r.month || '',
    sourceRow: r.source_row || 0,
    invNo: r.document_no || '',
    customer: r.customer_name || '',
    tin: r.tin || '',
    date: r.invoice_receipt_date || '',
    gross: Math.round((r.gross_sales || 0) * 100) / 100,
    freight: 0,
    salesReturn: 0,
    discountDM: 0,
    returnsDisc: 0,
    notes: '',
    netDeduction: Math.round((r.net_of_deduction || 0) * 100) / 100,
    ewt: Math.round((r.ewt_1_percent || 0) * 100) / 100,
    netSales: Math.round((r.net_sales || 0) * 100) / 100,
    depositDate: r.date_deposit_remitted || '',
    bank: r.deposited_to_bank || '',
    crDetails: '',
    payment: Math.round((r.total_payments || 0) * 100) / 100,
    dueDate: r.due_date || '',
    daysPastDue: 0,
    status,
    receivable: Math.round(receivable * 100) / 100,
    section: sectionMap[r.section] || r.section || '',
    terms: Number(r.terms_of_payment || 30),
  };
});
const jsContent = 'window.WHOLESALE_INVOICE_DATABASE = ' + JSON.stringify(converted, null, 2) + ';';
fs.writeFileSync('D:/Downloads/Modern/phase13_project/data/invoice-database.js', jsContent);
console.log('Converted', converted.length, 'records');
console.log('Sections:', [...new Set(converted.map(r => r.section))].join(', '));
console.log('Gross:', converted.reduce((s, r) => s + r.gross, 0).toLocaleString());
console.log('Receivables:', converted.reduce((s, r) => s + r.receivable, 0).toLocaleString());
console.log('Customers:', new Set(converted.map(r => r.customer)).size);
