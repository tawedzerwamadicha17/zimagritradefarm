// ============================================================
// AgriTrade ZW - Seed data
// NOTE: These are INDICATIVE figures for development/demo only.
// Replace with live feeds:
//   - GMB incentive producer prices (announced per season)
//   - ZMX weekly auction results (Zimbabwe Mercantile Exchange)
//   - Crowdsourced farm-gate & agro-dealer prices via USSD/WhatsApp
// ============================================================

export const fmtUSD = (n) =>
  'US$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })

// ---- GMB incentive producer prices (per metric tonne) ----
export const GMB_PRICES = [
  { crop: 'Maize',       price: 364.75, season: '2026/27', note: 'Buyer of last resort floor price' },
  { crop: 'Soyabean',    price: 583.01, season: '2026/27', note: 'Floor price' },
  { crop: 'Sunflower',   price: 670.46, season: '2026/27', note: 'Floor price' },
  { crop: 'Wheat',       price: 524.56, season: '2026/27', note: 'Winter crop floor price' },
  { crop: 'Sugar beans', price: 1900.0, season: '2026/27', note: 'Indicative' },
  { crop: 'Groundnuts',  price: 950.0,  season: '2026/27', note: 'Indicative' },
]

export const gmbPrice = (crop) => {
  const row = GMB_PRICES.find((g) => g.crop === crop)
  return row ? row.price : null
}

// ---- ZMX weekly auction trend (white corn, US$/MT, last 12 weeks) ----
export const ZMX_TREND = {
  labels: ['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12'],
  values: [348, 352, 345, 350, 355, 358, 352, 349, 346, 350, 353, 350],
  crop: 'White maize',
  source: 'ZMX weekly auctions (indicative)',
}

// ---- Marketplace listings (farm-gate, US$/MT) ----
export const LISTINGS = [
  { id: 1, crop: 'Maize',       tonnes: 12, grade: 'Grade A',   district: 'Bindura',      province: 'Mashonaland Central', farmer: 'T. Moyo',   phone: '+263 771 234 567', price: 340, date: '2026-10-10' },
  { id: 2, crop: 'Maize',       tonnes: 30, grade: 'Grade B',   district: 'Mt Darwin',    province: 'Mashonaland Central', farmer: 'R. Chikafu', phone: '+263 773 908 112', price: 330, date: '2026-10-11' },
  { id: 3, crop: 'Soyabean',    tonnes: 8,  grade: 'Grade A',   district: 'Chegutu',      province: 'Mashonaland West',    farmer: 'M. Chikore', phone: '+263 772 456 890', price: 560, date: '2026-10-09' },
  { id: 4, crop: 'Sugar beans', tonnes: 4,  grade: 'Handpicked',district: 'Rusape',       province: 'Manicaland',          farmer: 'P. Marowa', phone: '+263 718 333 445', price: 1850, date: '2026-10-08' },
  { id: 5, crop: 'Groundnuts',  tonnes: 6,  grade: 'Shelled',   district: 'Kadoma',       province: 'Mashonaland West',    farmer: 'J. Ncube',  phone: '+263 774 221 009', price: 900, date: '2026-10-11' },
  { id: 6, crop: 'Sunflower',   tonnes: 10, grade: 'Grade A',   district: 'Masvingo',     province: 'Masvingo',            farmer: 'S. Moyo',   phone: '+263 778 654 321', price: 640, date: '2026-10-07' },
  { id: 7, crop: 'Wheat',       tonnes: 15, grade: 'Grade B',   district: 'Nyamandlovu',  province: 'Matabeleland North',  farmer: 'K. Dube',   phone: '+263 779 112 233', price: 510, date: '2026-10-10' },
  { id: 8, crop: 'Maize',       tonnes: 20, grade: 'Grade A',   district: 'Guruve',       province: 'Mashonaland Central', farmer: 'A. Zhakata', phone: '+263 771 987 654', price: 335, date: '2026-10-11' },
  { id: 9, crop: 'Soyabean',    tonnes: 5,  grade: 'Grade B',   district: 'Gweru',        province: 'Midlands',            farmer: 'L. Sithole', phone: '+263 776 555 777', price: 570, date: '2026-10-06' },
  { id: 10, crop: 'Maize',      tonnes: 7,  grade: 'Popcorn',   district: 'Beatrice',     province: 'Mashonaland East',    farmer: 'V. Chari',  phone: '+263 770 888 999', price: 420, date: '2026-10-09' },
]

export const PROVINCES = [
  'Mashonaland Central', 'Mashonaland East', 'Mashonaland West',
  'Manicaland', 'Masvingo', 'Midlands',
  'Matabeleland North', 'Matabeleland South', 'Harare', 'Bulawayo',
]

// ---- Agro-dealers with input prices ----
export const DEALERS = [
  {
    id: 1, name: 'Farmers World', district: 'Bindura', province: 'Mashonaland Central',
    phone: '+263 275 263 41', verified: true,
    inputs: [
      { name: 'Compound D 50kg', price: 46 },
      { name: 'Ammonium Nitrate 50kg', price: 48 },
      { name: 'Maize seed SC649 25kg', price: 95 },
      { name: 'Glyphosate 1L', price: 12 },
    ],
  },
  {
    id: 2, name: 'Croplink Harare', district: 'Graniteside', province: 'Harare',
    phone: '+263 242 774 700', verified: true,
    inputs: [
      { name: 'Compound D 50kg', price: 44 },
      { name: 'Ammonium Nitrate 50kg', price: 47 },
      { name: 'Soyabean seed 25kg', price: 70 },
      { name: 'Atrazine 1L', price: 9 },
    ],
  },
  {
    id: 3, name: 'AgriDeals Chegutu', district: 'Chegutu', province: 'Mashonaland West',
    phone: '+263 772 400 200', verified: false,
    inputs: [
      { name: 'Compound D 50kg', price: 45 },
      { name: 'Ammonium Nitrate 50kg', price: 46 },
      { name: 'Sunflower seed 1kg (hybrid)', price: 32 },
      { name: 'Vegetative top dressing 50kg', price: 52 },
    ],
  },
  {
    id: 4, name: 'Matabeleland Agro Supplies', district: 'Bulawayo', province: 'Bulawayo',
    phone: '+263 292 880 123', verified: true,
    inputs: [
      { name: 'Compound D 50kg', price: 47 },
      { name: 'Ammonium Nitrate 50kg', price: 49 },
      { name: 'Wheat seed 50kg', price: 65 },
      { name: 'Tebuconazole 1L', price: 14 },
    ],
  },
  {
    id: 5, name: 'Seed Co Shop Mutare', district: 'Mutare', province: 'Manicaland',
    phone: '+263 202 060 700', verified: true,
    inputs: [
      { name: 'Maize seed 25kg', price: 92 },
      { name: 'Soyabean seed 25kg', price: 68 },
      { name: 'Compound D 50kg', price: 45 },
      { name: 'Rhizobium inoculant', price: 8 },
    ],
  },
]

// ---- Per-hectare production budgets (editable in calculator) ----
export const CROP_BUDGETS = {
  Maize: [
    { name: 'Maize seed (25kg bag)', qty: 1, unit: 'bag', unitPrice: 95 },
    { name: 'Basal: Compound D (50kg)', qty: 6, unit: 'bag', unitPrice: 46 },
    { name: 'Top dressing: AN (50kg)', qty: 4, unit: 'bag', unitPrice: 47 },
    { name: 'Herbicides & pesticides', qty: 1, unit: 'season', unitPrice: 70 },
    { name: 'Land prep & tillage', qty: 1, unit: 'season', unitPrice: 160 },
    { name: 'Labour', qty: 1, unit: 'season', unitPrice: 120 },
    { name: 'Irrigation / fuel', qty: 1, unit: 'season', unitPrice: 100 },
    { name: 'Transport & misc', qty: 1, unit: 'season', unitPrice: 70 },
  ],
  Soyabean: [
    { name: 'Soyabean seed (25kg bag)', qty: 2, unit: 'bag', unitPrice: 70 },
    { name: 'Rhizobium inoculant', qty: 1, unit: 'season', unitPrice: 8 },
    { name: 'Basal: Compound D (50kg)', qty: 5, unit: 'bag', unitPrice: 46 },
    { name: 'Herbicides', qty: 1, unit: 'season', unitPrice: 50 },
    { name: 'Land prep & tillage', qty: 1, unit: 'season', unitPrice: 160 },
    { name: 'Labour', qty: 1, unit: 'season', unitPrice: 100 },
    { name: 'Transport & misc', qty: 1, unit: 'season', unitPrice: 60 },
  ],
  Sunflower: [
    { name: 'Sunflower seed (1kg hybrid)', qty: 4, unit: 'kg', unitPrice: 32 },
    { name: 'Basal: Compound D (50kg)', qty: 4, unit: 'bag', unitPrice: 46 },
    { name: 'Herbicides', qty: 1, unit: 'season', unitPrice: 40 },
    { name: 'Land prep & tillage', qty: 1, unit: 'season', unitPrice: 150 },
    { name: 'Labour', qty: 1, unit: 'season', unitPrice: 90 },
    { name: 'Transport & misc', qty: 1, unit: 'season', unitPrice: 50 },
  ],
  Wheat: [
    { name: 'Wheat seed (50kg)', qty: 2, unit: 'bag', unitPrice: 65 },
    { name: 'Basal: Compound D (50kg)', qty: 6, unit: 'bag', unitPrice: 46 },
    { name: 'Top dressing: AN (50kg)', qty: 4, unit: 'bag', unitPrice: 47 },
    { name: 'Fungicides & herbicides', qty: 1, unit: 'season', unitPrice: 50 },
    { name: 'Land prep & irrigation', qty: 1, unit: 'season', unitPrice: 220 },
    { name: 'Labour', qty: 1, unit: 'season', unitPrice: 100 },
    { name: 'Transport & misc', qty: 1, unit: 'season', unitPrice: 60 },
  ],
}
