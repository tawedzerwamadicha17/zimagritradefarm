// [page id, label, icon, roles, optional customer label]. 'dt:x' = generic DocType list, 'farm:x' = tab of the farm accounts.
const A = ['farmer', 'foreman', 'customer', 'admin'], FA = ['farmer', 'admin'], FFA = ['farmer', 'foreman', 'admin'], FCA = ['farmer', 'customer', 'admin']
export const MODULES = [
  ['Home', [['workspace', 'Workspace', '🏠', A], ['farmhome', 'Farm Overview', '🌍', FA]]],
  ['Selling', [['erp:sales', 'Sales', '💼', FA, '', [['erp:sales:dash', 'Dashboard'], ['erp:sales:quote', 'Quotation'], ['erp:sales:sorder', 'Sales Order'], ['erp:sales:blanket', 'Blanket Order'], ['erp:sales:proforma', 'Proforma Invoice'], ['erp:sales:sinv', 'Sales Invoice'], ['erp:sales:cnote', 'Credit Note'], ['erp:sales:pay', 'Payment Entry'], ['erp:sales:rep', 'Reports'], ['erp:sales:set', 'Settings & Accounting']]], ['marketplace', 'Marketplace', '🛍️', FCA], ['trade', 'Ads & Requests', '📣', FCA, 'Browse & Request'], ['orders', 'Orders', '🧾', FCA, 'Cart & Orders'], ['dt:contact', 'Customers & Leads', '🤝', FA], ['dt:contract', 'Contracts', '📜', FA], ['farm:sales', 'Sales Ledger', '💵', FA]]],
  ['Buying', [['erp:buy', 'Purchases', '🧾', FA, '', [['erp:buy:dash', 'Dashboard'], ['erp:buy:pmreq', 'Purchase Request'], ['erp:buy:cmp', 'Supplier Comparison'], ['erp:buy:squote', 'Supplier Quote'], ['erp:buy:po', 'Purchase Order'], ['erp:buy:pinv', 'Purchase Invoice'], ['erp:buy:pay', 'Payment Entry'], ['erp:buy:rep', 'Reports'], ['erp:buy:set', 'Settings & Accounting']]], ['dt:supplier', 'Suppliers', '🏪', FA], ['farm:exp', 'Purchases & Expenses', '🛒', FA], ['dealers', 'Find Inputs', '🧪', FA]]],
  ['Stock', [['erp:stock', 'Stock', '🏬', FA, '', [['erp:stock:dash', 'Dashboard'], ['erp:stock:items', 'Items & Stock Value'], ['erp:stock:grv', 'GRV'], ['erp:stock:mreq', 'Material Request'], ['erp:stock:issue', 'Stock Issue'], ['erp:stock:damaged', 'Damaged Stock'], ['erp:stock:expired', 'Expired Stock'], ['erp:stock:recon', 'Stock Reconciliation'], ['erp:stock:rep', 'Reports'], ['erp:stock:set', 'Settings & Accounting']]], ['farm:stock', 'Stock Items', '📦', FA], ['dt:harvest', 'Harvest Records', '🌾', FFA], ['farm:trace', 'Traceability', '🔗', FA], ['dt:storage', 'Storage & Silos', '🏚️', FFA]]],
  ['Crops', [['dt:field', 'Fields', '🌱', FFA], ['dt:crop', 'Crop Cycles', '🌽', FFA], ['dt:operation', 'Field Operations', '🚜', FFA], ['dt:soil', 'Soil Tests', '🧪', FFA], ['dt:irrigation', 'Irrigation Log', '💧', FFA], ['dt:weather', 'Weather Log', '🌦️', FFA], ['farm:ent', 'Enterprises', '🗂️', FA], ['farm:bud', 'Budgets', '📊', FA], ['dt:inspection', 'Quality Inspections', '🔍', FFA], ['calculator', 'Cost Calculator', '🧮', FA]]],
  ['Livestock', [['dt:animal', 'Herd Register', '🐄', FFA], ['dt:health', 'Vet & Health', '💉', FFA], ['dt:production', 'Production (milk, eggs, weights)', '🥛', FFA], ['dt:feeding', 'Feeding Log', '🌾', FFA], ['farm:herd', 'Herd Movements', '📈', FA], ['farm:bio', 'Biological Assets', '🧬', FA]]],
  ['Projects', [['dt:task', 'Tasks', '✅', FFA], ['dt:project', 'Projects', '📁', FA], ['dt:costcenter', 'Cost Centers / Farms', '🏷️', FA]]],
  ['Farm Operations', [['farm', 'Farm Work', '👷', ['foreman']]]],
  ['Assets', [['farm:assets', 'Fixed Assets', '🏗️', FA], ['dt:equipment', 'Equipment', '🚜', FFA], ['dt:fuel', 'Fuel Log', '⛽', FFA], ['dt:maintenance', 'Maintenance Log', '🔧', FFA]]],
  ['Accounting', [['acct', 'Accounts (General Ledger)', '📒', FA, '', [['acct:dash', 'Accounting Home'], ['acct:coa', 'Chart of Accounts'], ['acct:je', 'Journal Entry'], ['acct:gl', 'General Ledger'], ['acct:tb', 'Trial Balance'], ['acct:pl', 'Profit and Loss'], ['acct:bs', 'Balance Sheet'], ['acct:basis', 'Cash vs Accrual']]], ['agacc', 'Agricultural Accounting', '🌾', FA, '', [['agacc:costing', 'Field & Crop Costing'], ['agacc:inv', 'Input Inventory Valuation'], ['agacc:produce', 'Harvest & Produce Stock'], ['agacc:grants', 'Grants, Subsidies & Insurance']]], ['farm:dash', 'Farm Dashboard', '📋', FA], ['farm:tax', 'Tax & Currency', '🧮', FA], ['farm:pays', 'Payments', '💳', FA], ['farm:fin', 'Financial Position', '🏦', FA]]],
  ['Reports', [['reports', 'Reports', '📈', FA], ['farm:rep', 'Farm Reports', '📑', FA]]],
  ['Tools', [['dashboard', 'Market Prices', '💹', FCA], ['weather', 'Weather', '⛅', A], ['community', 'Community', '💬', A], ['learn', 'Guides', '📚', A]]],
  ['Settings', [['admin', 'Users & Settings', '⚙️', ['admin']], ['activity', 'Activity Log', '🕘', ['admin']]]],
]
export const find = (id) => { for (const [g, it] of MODULES) { for (const i of it) { if (i[0] === id) return [g, i]; const c = (i[5] || []).find((x) => x[0] === id); if (c) return [g, [id, i[1] + ' › ' + c[1]]] } } return null }

// Module home pages (ERPNext "workspace"): sections of links shown under the number cards.
export const HOMES = {
  Selling: [['Documents', [['Quotation', 'erp:sales:quote'], ['Sales Order', 'erp:sales:sorder'], ['Blanket Order', 'erp:sales:blanket'], ['Proforma Invoice', 'erp:sales:proforma'], ['Sales Invoice', 'erp:sales:sinv'], ['Credit Note', 'erp:sales:cnote'], ['Payment Entry', 'erp:sales:pay']]],
    ['Customers & Contracts', [['Customers & Leads', 'dt:contact'], ['Contracts', 'dt:contract'], ['Marketplace', 'marketplace'], ['Ads & Requests', 'trade'], ['Orders', 'orders']]],
    ['Sales Reports', [['Sales Dashboard', 'erp:sales:dash'], ['Sales Reports', 'erp:sales:rep'], ['Sales Ledger', 'farm:sales'], ['Customer Aging', 'farm:fin'], ['Farm Reports', 'farm:rep']]],
    ['Setup', [['Sales Settings & Accounting', 'erp:sales:set'], ['Tax & Currency', 'farm:tax'], ['Payments', 'farm:pays']]]],
  Buying: [['Documents', [['Purchase Request', 'erp:buy:pmreq'], ['Supplier Quote', 'erp:buy:squote'], ['Supplier Comparison', 'erp:buy:cmp'], ['Purchase Order', 'erp:buy:po'], ['Purchase Invoice', 'erp:buy:pinv'], ['Payment Entry', 'erp:buy:pay']]],
    ['Suppliers & Inputs', [['Suppliers', 'dt:supplier'], ['Purchases & Expenses', 'farm:exp'], ['Find Inputs', 'dealers']]],
    ['Buying Reports', [['Purchase Dashboard', 'erp:buy:dash'], ['Purchase Reports', 'erp:buy:rep'], ['Supplier Aging', 'farm:fin'], ['Expense Reports', 'farm:rep']]],
    ['Setup', [['Purchase Settings & Accounting', 'erp:buy:set'], ['Tax & Currency', 'farm:tax']]]],
  Stock: [['Transactions', [['GRV', 'erp:stock:grv'], ['Material Request', 'erp:stock:mreq'], ['Stock Issue', 'erp:stock:issue'], ['Damaged Stock', 'erp:stock:damaged'], ['Expired Stock', 'erp:stock:expired'], ['Stock Reconciliation', 'erp:stock:recon']]],
    ['Items & Produce', [['Items & Stock Value', 'erp:stock:items'], ['Stock Items', 'farm:stock'], ['Harvest Records', 'dt:harvest'], ['Storage & Silos', 'dt:storage'], ['Traceability', 'farm:trace']]],
    ['Stock Reports', [['Stock Dashboard', 'erp:stock:dash'], ['Stock Reports', 'erp:stock:rep'], ['Input Inventory Valuation', 'agacc:inv'], ['Harvest & Produce Stock', 'agacc:produce']]],
    ['Setup', [['Stock Settings & Accounting', 'erp:stock:set']]]],
  Crops: [['Masters', [['Fields', 'dt:field'], ['Crop Cycles', 'dt:crop'], ['Enterprises', 'farm:ent'], ['Soil Tests', 'dt:soil']]],
    ['Field Work', [['Field Operations', 'dt:operation'], ['Irrigation Log', 'dt:irrigation'], ['Weather Log', 'dt:weather'], ['Quality Inspections', 'dt:inspection']]],
    ['Costing & Planning', [['Field & Crop Costing', 'agacc:costing'], ['Budgets', 'farm:bud'], ['Cost Calculator', 'calculator'], ['Harvest Records', 'dt:harvest']]]],
  Livestock: [['Herd', [['Herd Register', 'dt:animal'], ['Herd Movements', 'farm:herd'], ['Production', 'dt:production'], ['Feeding Log', 'dt:feeding']]],
    ['Health', [['Vet & Health', 'dt:health']]], ['Valuation', [['Biological Assets (IAS 41)', 'farm:bio'], ['Grants, Subsidies & Insurance', 'agacc:grants']]]],
  'Farm Operations': [['Daily work', [['Farm Work', 'farm']]]],
  Assets: [['Assets', [['Fixed Assets', 'farm:assets'], ['Equipment', 'dt:equipment']]], ['Running Costs', [['Fuel Log', 'dt:fuel'], ['Maintenance Log', 'dt:maintenance']]]],
  Accounting: [['Accounting Masters', [['Chart of Accounts', 'acct:coa'], ['Journal Entry', 'acct:je'], ['General Ledger', 'acct:gl']]],
    ['Financial Reports', [['Trial Balance', 'acct:tb'], ['Profit and Loss', 'acct:pl'], ['Balance Sheet', 'acct:bs'], ['Cash vs Accrual', 'acct:basis'], ['Financial Position', 'farm:fin']]],
    ['Agricultural Accounting', [['Field & Crop Costing', 'agacc:costing'], ['Input Inventory Valuation', 'agacc:inv'], ['Harvest & Produce Stock', 'agacc:produce'], ['Grants, Subsidies & Insurance', 'agacc:grants'], ['Biological Assets (IAS 41)', 'farm:bio']]],
    ['Other', [['Farm Dashboard', 'farm:dash'], ['Tax & Currency', 'farm:tax'], ['Payments', 'farm:pays']]]],
  Projects: [['Work', [['Tasks', 'dt:task'], ['Projects', 'dt:project'], ['Cost Centers / Farms', 'dt:costcenter']]]],
}
// Sidebar entries for one module: top-level pages, with sub-pages (Quotation, Trial Balance…) listed directly.
export const sideItems = (group, role, custLabel) => (MODULES.find((m) => m[0] === group)?.[1] || []).filter((i) => i[3].includes(role)).flatMap((i) =>
  i[5] ? i[5].map(([id, l]) => ({ id, label: l, ic: /:dash$/.test(id) ? '▦' : /:rep$/.test(id) ? '▤' : /:set$/.test(id) ? '⚙' : '▢' })) : [{ id: i[0], label: custLabel && i[4] ? i[4] : i[1], ic: '▢' }])
