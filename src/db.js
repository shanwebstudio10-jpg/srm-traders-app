// Tables are created automatically on the first request, so no manual SQL is needed.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0, min_qty INTEGER DEFAULT 1, description TEXT DEFAULT '',
    image TEXT DEFAULT '', active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT DEFAULT '',
    message TEXT DEFAULT '', items TEXT DEFAULT '[]', status TEXT NOT NULL DEFAULT 'New',
    created_at TEXT DEFAULT (datetime('now')))`,
];

export const SETTING_KEYS = ['business_name', 'tagline', 'phone', 'landline', 'whatsapp', 'email', 'address'];
const DEFAULT_SETTINGS = {
  business_name: 'S.R.M. Traders',
  tagline: 'Corporate Gifts, Bags & Promotional Products',
  phone: '9444 534 944 / 7845 498 145',
  landline: '044 - 4203 8144 / 4005 9601',
  whatsapp: '919444534944',
  email: 'srmtraders1@yahoo.in',
  address: 'New #18, Old #66, Malayaperumal Street (Next to Mosque), Ranga Complex, Chennai - 600001',
};
const SAMPLE = [
  ['Executive Diary 2027', 'diary', 'A5 size, logo printing'],
  ['Table Calendar 2027', 'calendar', 'Custom company branding'],
  ['Jute Bag Standard', 'jute-bag', 'Laminated, cotton handles'],
  ['Net Bag Foldable', 'net-bag', 'Reusable shopping bag'],
  ['Travel Backpack', 'travel-bag', 'Water resistant'],
  ['Office File Folder', 'files', 'Printed with your logo'],
  ['Corporate Gift Set', 'corporate-gifts', 'Diary, pen and mug'],
  ['Promotional Pen', 'promotional', 'Logo print, bulk rates'],
];

let ready = null;
export function ensureDb(env) {
  ready ||= init(env).catch((e) => { ready = null; throw e; });
  return ready;
}

async function init(env) {
  await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)));
  const seeded = await env.DB.prepare("SELECT value FROM settings WHERE key='seeded'").first();
  if (seeded) return;
  const stmts = Object.entries(DEFAULT_SETTINGS).map(([k, v]) => env.DB.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').bind(k, v));
  const count = (await env.DB.prepare('SELECT COUNT(*) n FROM products').first()).n;
  if (!count) SAMPLE.forEach(([n, c, d]) => stmts.push(env.DB.prepare('INSERT INTO products (name,category,price,min_qty,description) VALUES (?,?,0,1,?)').bind(n, c, d)));
  stmts.push(env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('seeded','1')"));
  await env.DB.batch(stmts);
}
