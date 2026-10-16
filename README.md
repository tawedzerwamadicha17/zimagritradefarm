# AgriTrade ZW — Zimbabwe Agricultural Trade Platform (MVP)

A React + Vite starter for a two-sided agricultural marketplace:
a **farmer portal** (prices, input costs, sell produce, find cheap inputs)
and a **customer portal** (source produce directly, compare against GMB/ZMX).

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5177

## What's inside

| Module | File | What it does |
|---|---|---|
| Price board | `src/components/PriceBoard.jsx` | GMB floor prices + ZMX weekly auction trend chart |
| Marketplace | `src/components/Marketplace.jsx` | Farm-gate listings, filter/sort, farmer add-listing form, % vs GMB floor |
| Cost calculator | `src/components/CostCalculator.jsx` | Per-hectare budgets (maize/soya/sunflower/wheat), editable input prices, breakeven yield, profit |
| Dealer locator | `src/components/DealerLocator.jsx` | Agro-dealer input prices, cheapest-source highlighting, comparison table |
| Seed data | `src/data/seed.js` | All prices/listings — **indicative demo data, replace with live feeds** |

## Data sources to connect (production)

- **GMB incentive producer prices** — announced each season (maize, soya, sunflower, wheat floors)
- **ZMX weekly auction results** — Zimbabwe Mercantile Exchange
- **Crowdsourced farm-gate & dealer prices** — via USSD/WhatsApp reporting line
- **Payments** — EcoCash / InnBucks / OneMoney (escrow in Phase 2)

## Roadmap

1. **MVP (this repo):** price dashboard, listings, calculator, dealer prices
2. **Phase 2:** real backend (Node/Django + PostgreSQL/PostGIS), USSD price checks,
   WhatsApp bot, escrow payments, Shona/Ndebele
3. **Phase 3:** logistics matching, warehouse receipts, price forecasting

> All figures in `src/data/seed.js` are indicative development data, not live market prices.
| Farm accounts | `src/components/Farm.jsx` | Crop + meat enterprises, expenses/purchases, sales, payroll (NSSA), budgets with overrun flags, foreman portal, CSV reports |
| Farm portals | `src/components/FarmExtra.jsx` | Stock & financial position, ageing (suppliers/customers), herd log, advertising & customer requests, customer portal, admin portal |
| Roles | `Header.jsx`, `App.jsx` | Farmer, Foreman, Buyer, Admin views over one shared store (`src/data/store.js`) |
| Ads & Requests | `src/components/Trade.jsx` | Farmer ads + sales/profit dashboard; buyer requests and quotes |
| Admin | `src/components/Admin.jsx` | PIN-locked settings, moderation, backup/restore |

## v4 — ERPNext-style desk

After login every role works inside a **desk**: left sidebar of modules, a global search bar (modules + records),
a workspace home with number cards / shortcuts / my tasks / recent activity, and breadcrumbs.
Home, Marketplace (browse only), About and Contact stay public.

| Module | Pages | Who |
|---|---|---|
| Selling | Marketplace, Ads & Requests, Orders (+ printable invoice), Customers & Leads, Sales Ledger | farmer, customer, admin |
| Buying | Suppliers, Purchases & Expenses, Find Inputs | farmer, admin |
| Stock | Stock Items, Harvest Records | farmer, admin (foreman: harvest) |
| Crops | Fields, Enterprises, Budgets, Quality Inspections, Cost Calculator | farmer, foreman, admin |
| Livestock | Herd Register | farmer, admin |
| Projects | Tasks (assign to foremen, foremen update status) | farmer, foreman, admin |
| HR & Payroll | Workers & Payroll, Foreman Farm Work | farmer, admin / foreman |
| Assets | Fixed Assets, Equipment, Maintenance Log (service-due alerts) | farmer, foreman, admin |
| Accounting | Financial Position | farmer, admin |
| Reports | 10 reports (sales, profitability, ageing, stock valuation, yield per field, tasks, service due...) with CSV/print | farmer, admin |
| Tools | Market Prices, Weather, Community, Guides | all |
| Settings | Users & Settings, Contact inbox, Activity Log | admin |

Suppliers, Customers & Leads, Fields, Harvests, Tasks, Equipment, Maintenance and Inspections are generated from one
config (`src/data/doctypes.js`) — add a new record type by adding one entry there and one line in `src/data/modules.js`.

**Default admin:** `admin@agritrade.zw` / `Admin@123` — you must change it at first login. Foreman/admin accounts are
created by an admin (Users & Settings). Forgotten password → admin resets it.

> ⚠️ Accounts and data live in this browser's localStorage. Passwords are hashed but this is not server security, and
> users on different devices do not share data. For real multi-user use add a backend (Node/Django + PostgreSQL) with
> server-side auth and replace `src/data/*` with API calls.

## Agricultural accounting (added in v12)

- **Agricultural Accounting** menu: Field & Crop Costing, Input Inventory Valuation (FIFO / weighted average), Harvest & Produce Stock, Grants / Subsidies / Insurance.
- **Accounts › Cash vs Accrual**: same ledger on both bases with the balances that explain the gap.
- **Biological assets (IAS 41)**: stages, revaluation history, physical vs price change, posted to the GL (1150 / 4210).
- New accounts: 1150, 1160, 2140, 4200 group (4210 / 4220 / 4230).
