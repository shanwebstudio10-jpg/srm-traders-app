// Website script. Shop details and products come from the admin panel (database).
// The values below are used only if the server cannot be reached.
const DEFAULTS = {
  business_name: 'S.R.M. Traders', tagline: 'Corporate Gifts, Bags & Promotional Products',
  address: 'New #18, Old #66, Malayaperumal Street (Next to Mosque), Ranga Complex, Chennai - 600001',
  phone: '9444 534 944 / 7845 498 145', landline: '044 - 4203 8144 / 4005 9601',
  email: 'srmtraders1@yahoo.in', whatsapp: '919444534944',
};
const CATS = [
  { slug: 'diary', label: 'New Year Diaries' }, { slug: 'calendar', label: 'Calendars' },
  { slug: 'jute-bag', label: 'Jute Bags' }, { slug: 'net-bag', label: 'Net Bags' },
  { slug: 'travel-bag', label: 'Travel Bags' }, { slug: 'files', label: 'Files' },
  { slug: 'corporate-gifts', label: 'Corporate Gift Items' }, { slug: 'promotional', label: 'Promotional Products' },
];
const SAMPLE = [
  ['Executive Diary 2027', 'diary'], ['Table Calendar 2027', 'calendar'], ['Jute Bag Standard', 'jute-bag'], ['Net Bag Foldable', 'net-bag'],
  ['Travel Backpack', 'travel-bag'], ['Office File Folder', 'files'], ['Corporate Gift Set', 'corporate-gifts'], ['Promotional Pen', 'promotional'],
].map(([name, category], i) => ({ id: i + 1, name, category, description: '', min_qty: 1, iv: 0 }));

let S = { ...DEFAULTS };
let PRODUCTS = SAMPLE;
let cart = [];
try { cart = JSON.parse(localStorage.getItem('srm_cart') || '[]'); } catch { cart = []; }

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wa = (msg) => `https://wa.me/${S.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
const tel = () => 'tel:+91' + S.phone.split('/')[0].replace(/\D/g, '');
const page = location.pathname.split('/').pop() || 'index.html';
const imgOf = (p) => (p.iv > 0 ? `/api/products/${p.id}/image?v=${p.iv}` : `/images/featured/${p.category}.jpg`);

function card(p) {
  return `<article class="card"><img src="${imgOf(p)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.visibility='hidden'">
    <h3>${esc(p.name)}</h3><small>${esc((p.description || '').slice(0, 60))}</small>
    <button class="btn btn-navy sm" data-quote="${p.id}">Get Quote</button>
    <button class="btn btn-outline sm" data-add="${p.id}">Add to enquiry</button></article>`;
}

function renderChrome() {
  const on = (f) => (page === f ? ' class="active"' : '');
  $('header').innerHTML = `
  <div class="topbar"><div class="wrap topbar-in">
    <span>📍 ${esc(S.address)}</span><span>📞 ${esc(S.phone)}</span><span>☎ ${esc(S.landline)}</span><span>✉ ${esc(S.email)}</span>
  </div></div>
  <div class="wrap nav-in">
    <a href="/" class="brand"><img src="/images/logo.png" alt="" width="60" height="60">
      <span><b>S.R.M. TRADERS</b><small>${esc(S.tagline)}</small></span></a>
    <nav class="links" id="links">
      <a href="/"${on('index.html')}>Home</a>
      <a href="/products.html"${on('products.html')}>Products</a>
      <a href="/products.html?cat=corporate-gifts">Corporate Gifting</a>
      <a href="/contact.html"${on('contact.html')}>Contact</a>
    </nav>
    <div class="nav-cta">
      <a class="btn btn-green" target="_blank" rel="noreferrer" href="${wa('Hi, I need a quote for bulk products.')}">WhatsApp Enquiry</a>
      <a class="btn btn-navy" href="${tel()}">📞 Call Now</a>
      <button class="btn btn-cart" id="cartBtn" aria-label="Enquiry cart">🛒 <span id="cartCount">0</span></button>
      <button class="burger" id="burger" aria-label="Menu">☰</button>
    </div>
  </div>`;
  const map = 'https://www.google.com/maps?q=' + encodeURIComponent(S.address);
  $('footer').innerHTML = `
  <div class="wrap foot-in">
    <div class="fb"><img src="/images/logo.png" alt="" width="56" height="56"><div><b>S.R.M. TRADERS</b><small>${esc(S.tagline)}</small></div></div>
    <div><h4>Contact Details</h4><p>📍 ${esc(S.address)}</p><p>📞 ${esc(S.phone)}</p><p>☎ ${esc(S.landline)}</p><p>✉ ${esc(S.email)}</p></div>
    <div class="fl"><h4>Quick Links</h4><a href="/">Home</a><a href="/products.html">Products</a><a href="/contact.html">Contact</a></div>
    <div><h4>Our Location</h4><iframe title="Map" class="map" loading="lazy" src="${map}&output=embed"></iframe>
      <a href="${map}" target="_blank" rel="noreferrer">View on Google Maps →</a></div>
    <div><h4>Get in Touch</h4><a class="btn btn-green sm" target="_blank" rel="noreferrer" href="${wa('Hi, I need a quote.')}">WhatsApp Enquiry</a>
      <p>Send us a message for bulk orders and custom quotes.</p></div>
  </div>
  <div class="copy wrap"><span>© ${new Date().getFullYear()} ${esc(S.business_name)}. All rights reserved.</span></div>`;
  $('cartBtn').onclick = openCart;
  $('burger').onclick = () => $('links').classList.toggle('open');
  updateCartCount();
}

function ensureShell() {
  if ($('fab')) return;
  const fab = document.createElement('a');
  fab.id = 'fab'; fab.className = 'wa'; fab.textContent = 'WhatsApp'; fab.target = '_blank';
  document.body.appendChild(fab);
  const d = document.createElement('div');
  d.className = 'drawer-bg'; d.id = 'drawerBg'; d.hidden = true;
  d.innerHTML = `<aside class="drawer"><div class="drawer-h"><h2>Enquiry cart</h2><button class="x" id="cartClose" aria-label="Close">×</button></div>
    <div id="cartBody"></div></aside>`;
  document.body.appendChild(d);
  d.onclick = (e) => { if (e.target === d) closeCart(); };
  $('cartClose').onclick = closeCart;
}

function saveCart() { localStorage.setItem('srm_cart', JSON.stringify(cart)); updateCartCount(); renderCart(); }
function updateCartCount() { const c = $('cartCount'); if (c) c.textContent = cart.length; }
function openCart() { renderCart(); $('drawerBg').hidden = false; }
function closeCart() { $('drawerBg').hidden = true; }

function renderCart() {
  if (!$('cartBody')) return;
  if (!cart.length) { $('cartBody').innerHTML = '<div class="empty"><p>Your enquiry cart is empty. Add products to get a bulk price.</p></div>'; return; }
  $('cartBody').innerHTML = `<ul class="lines">${cart.map((i, n) => `<li><b>${esc(i.name)}</b>
      <input class="qty" type="number" min="1" value="${i.qty}" data-qty="${n}"><button class="x" data-del="${n}" aria-label="Remove">×</button></li>`).join('')}</ul>
    <form class="cartform" id="cartForm"><input class="input" name="name" required placeholder="Your name *"><input class="input" name="phone" placeholder="Phone number">
      <button class="btn btn-green">Send enquiry on WhatsApp</button></form>`;
  $('cartForm').onsubmit = sendCart;
}

function logEnquiry(name, phone, items) {
  fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ name, phone, items }) }).catch(() => {});
}
function sendCart(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const items = cart.map(({ name, qty }) => ({ name, qty }));
  const msg = `Hi, I need a quote for:\n${items.map((i, n) => `${n + 1}. ${i.name} x ${i.qty}`).join('\n')}\n\nName: ${f.get('name')}\nPhone: ${f.get('phone')}`;
  logEnquiry(f.get('name'), f.get('phone'), items);
  window.open(wa(msg), '_blank');
  cart = []; saveCart(); closeCart();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-quote],[data-add],[data-del]');
  if (!t) return;
  if (t.dataset.del !== undefined) { cart.splice(+t.dataset.del, 1); saveCart(); return; }
  const p = PRODUCTS.find((x) => x.id === +(t.dataset.quote || t.dataset.add));
  if (!p) return;
  if (t.dataset.add) {
    const f = cart.find((i) => i.id === p.id);
    if (f) f.qty += p.min_qty || 1; else cart.push({ id: p.id, name: p.name, qty: p.min_qty || 1 });
    saveCart(); openCart();
  } else {
    logEnquiry('Quick quote', '', [{ name: p.name, qty: p.min_qty || 1 }]);
    window.open(wa('Hi, I need a quote for ' + p.name), '_blank');
  }
});
document.addEventListener('change', (e) => {
  if (e.target.dataset.qty !== undefined) { cart[+e.target.dataset.qty].qty = Math.max(1, +e.target.value || 1); localStorage.setItem('srm_cart', JSON.stringify(cart)); }
});

function renderPage() {
  $('fab').href = wa('Hi, I want to enquire about bulk products.');
  if ($('heroWa')) $('heroWa').href = wa('Hi, I need a quote for bulk products.');
  if ($('cats')) {
    $('cats').innerHTML = CATS.map((c) => `<a class="cat" href="/products.html?cat=${c.slug}"><img src="/images/cover/${c.slug}.jpg" alt=""><span>${c.label}</span></a>`).join('');
    $('featured').innerHTML = PRODUCTS.slice(0, 8).map(card).join('');
  }
  if ($('list')) {
    let cat = new URLSearchParams(location.search).get('cat') || '', q = '';
    const labels = [{ slug: '', label: 'All' }, ...CATS];
    const draw = () => {
      const list = PRODUCTS.filter((p) => (!cat || p.category === cat) && (!q || (p.name + ' ' + (p.description || '')).toLowerCase().includes(q)));
      $('list').innerHTML = list.length ? list.map(card).join('') : '<p>No products found.</p>';
      $('chips').innerHTML = labels.map((c) => `<button class="chip${cat === c.slug ? ' on' : ''}" data-c="${c.slug}">${c.label}</button>`).join('');
      document.querySelectorAll('.chip').forEach((b) => (b.onclick = () => { cat = b.dataset.c; draw(); }));
    };
    $('search').oninput = (e) => { q = e.target.value.toLowerCase(); draw(); };
    draw();
  }
  if ($('cinfo')) $('cinfo').innerHTML = `📍 ${esc(S.address)}<br>📞 ${esc(S.phone)}<br>☎ ${esc(S.landline)}<br>✉ ${esc(S.email)}`;
  if ($('cform')) $('cform').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ name: f.get('name'), phone: f.get('phone'), message: f.get('message'), items: [] }) }).catch(() => {});
    window.open(wa(`Name: ${f.get('name')}\nPhone: ${f.get('phone')}\n${f.get('message')}`), '_blank');
  };
}

(async function boot() {
  renderChrome(); ensureShell(); renderPage();
  try {
    const [s, p] = await Promise.all([fetch('/api/settings').then((r) => r.json()), fetch('/api/products').then((r) => r.json())]);
    if (s && !s.error) S = { ...DEFAULTS, ...s };
    if (Array.isArray(p)) PRODUCTS = p;
    renderChrome(); renderPage();
  } catch { /* keep defaults */ }
})();
