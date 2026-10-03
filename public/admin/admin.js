const TOKEN = 'srm_admin_token';
const CATS = [['diary', 'New Year Diaries'], ['calendar', 'Calendars'], ['jute-bag', 'Jute Bags'], ['net-bag', 'Net Bags'],
  ['travel-bag', 'Travel Bags'], ['files', 'Files'], ['corporate-gifts', 'Corporate Gift Items'], ['promotional', 'Promotional Products']];
const FIELDS = [['business_name', 'Business name'], ['tagline', 'Tagline'], ['phone', 'Mobile numbers'], ['landline', 'Landline numbers'],
  ['whatsapp', 'WhatsApp number (91 + 10 digits, no + sign)'], ['email', 'Email'], ['address', 'Address']];
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let imgData; // undefined = keep, '' = remove, 'data:...' = new photo
let cache = { products: [], enquiries: [] };

async function api(path, opts = {}) {
  const r = await fetch('/api' + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem(TOKEN) || '') }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== '/login') { localStorage.removeItem(TOKEN); location.reload(); }
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
function csv(name, rows) {
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click();
}
function resize(file, max = 640) {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = img.width * k; c.height = img.height * k;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/jpeg', 0.78));
    };
    img.src = URL.createObjectURL(file);
  });
}

// ---------- login ----------
$('#login').onsubmit = async (e) => {
  e.preventDefault(); $('#lerr').textContent = '';
  try { const r = await api('/login', { method: 'POST', body: { username: $('#u').value, password: $('#p').value } }); localStorage.setItem(TOKEN, r.token); start(); }
  catch (ex) { $('#lerr').textContent = ex.message; }
};
$('#logout').onclick = () => { localStorage.removeItem(TOKEN); location.reload(); };
document.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));

function start() {
  const on = !!localStorage.getItem(TOKEN);
  $('#login').hidden = on; $('#app').hidden = !on;
  if (on) go('dashboard');
}
async function go(v) {
  document.querySelectorAll('[data-go]').forEach((b) => b.classList.toggle('on', b.dataset.go === v));
  $('#view').innerHTML = '<p class="muted">Loading...</p>';
  try { await ({ dashboard, products, enquiries, settings }[v])(); } catch (ex) { $('#view').innerHTML = `<p class="err">${esc(ex.message)}</p>`; }
}

// ---------- dashboard ----------
async function dashboard() {
  const [s, enq] = await Promise.all([api('/stats'), api('/enquiries')]);
  $('#view').innerHTML = `<h1>Dashboard</h1><div class="stats">
    <div class="stat"><small>Total products</small><b>${s.products}</b></div>
    <div class="stat"><small>New enquiries</small><b>${s.newEnquiries}</b></div>
    <div class="stat"><small>All enquiries</small><b>${s.enquiries}</b></div></div>
    <h2>Latest enquiries</h2>${enqTable(enq.slice(0, 5), false)}`;
}

// ---------- products ----------
async function products() {
  cache.products = await api('/products?all=1');
  $('#view').innerHTML = `<div class="bar"><h1>Products</h1><button class="btn" id="add">Add product</button></div>
    <div class="scroll"><table><thead><tr><th>Photo</th><th>Name</th><th>Category</th><th>Min qty</th><th>Live</th><th></th></tr></thead><tbody>
    ${cache.products.map((p) => `<tr><td>${p.iv > 0 ? `<img class="thumb" src="/api/products/${p.id}/image?v=${p.iv}" alt="">` : '-'}</td>
      <td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${p.min_qty}</td><td>${p.active ? 'Yes' : 'Hidden'}</td>
      <td><button class="link" data-edit="${p.id}">Edit</button> <button class="link red" data-del="${p.id}">Delete</button></td></tr>`).join('')}
    </tbody></table></div>`;
  $('#add').onclick = () => productForm();
  document.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => productForm(cache.products.find((p) => p.id === +b.dataset.edit))));
  document.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
    if (confirm('Delete this product?')) { await api('/products/' + b.dataset.del, { method: 'DELETE' }); products(); }
  }));
}
function productForm(p) {
  imgData = undefined;
  const cur = p && p.iv > 0 ? `/api/products/${p.id}/image?v=${p.iv}` : '';
  $('#view').innerHTML = `<form class="form" id="pf"><h1>${p ? 'Edit' : 'Add'} product</h1>
    <label>Name<input name="name" required value="${esc(p?.name)}"></label>
    <label>Category<select name="category">${CATS.map(([v, l]) => `<option value="${v}"${p?.category === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
    <label>Minimum order quantity<input name="min_qty" type="number" min="1" value="${p?.min_qty || 1}"></label>
    <label>Description<textarea name="description" rows="3">${esc(p?.description)}</textarea></label>
    <label>Photo<input type="file" id="file" accept="image/*"></label>
    <div><img class="preview" id="prev" src="${cur}" alt="" ${cur ? '' : 'hidden'}> <button type="button" class="link red" id="rm" ${cur ? '' : 'hidden'}>Remove photo</button></div>
    <label class="inline"><input type="checkbox" name="active" ${!p || p.active ? 'checked' : ''}> Show on website</label>
    <p class="err" id="perr"></p><div><button class="btn">Save</button> <button type="button" class="btn ghost" id="cancel">Cancel</button></div></form>`;
  $('#file').onchange = async (e) => { if (e.target.files[0]) { imgData = await resize(e.target.files[0]); $('#prev').src = imgData; $('#prev').hidden = false; $('#rm').hidden = false; } };
  $('#rm').onclick = () => { imgData = ''; $('#prev').hidden = true; $('#rm').hidden = true; };
  $('#cancel').onclick = products;
  $('#pf').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = { name: f.get('name'), category: f.get('category'), min_qty: +f.get('min_qty'), description: f.get('description'), active: f.get('active') ? 1 : 0, price: 0 };
    if (imgData !== undefined) body.image = imgData;
    try { await api(p ? '/products/' + p.id : '/products', { method: p ? 'PUT' : 'POST', body }); products(); }
    catch (ex) { $('#perr').textContent = ex.message; }
  };
}

// ---------- enquiries ----------
function enqTable(list, editable = true) {
  if (!list.length) return '<p class="muted">No enquiries yet. Enquiries sent from the website appear here.</p>';
  return `<div class="scroll"><table><thead><tr><th>Date</th><th>Name / Phone</th><th>Items / Message</th><th>Status</th>${editable ? '<th></th>' : ''}</tr></thead><tbody>
    ${list.map((q) => `<tr><td>${esc(q.created_at.slice(0, 10))}</td>
      <td>${esc(q.name)}<br>${q.phone ? `<a href="https://wa.me/91${esc(q.phone.replace(/\D/g, '').slice(-10))}" target="_blank">${esc(q.phone)}</a>` : '<small>-</small>'}</td>
      <td>${q.items.map((i) => `${esc(i.name)} × ${i.qty}`).join('<br>')}${q.message ? `<br><i>${esc(q.message)}</i>` : ''}</td>
      <td>${editable ? `<select data-st="${q.id}">${['New', 'Contacted', 'Done'].map((s) => `<option${q.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select>` : `<span class="tag">${esc(q.status)}</span>`}</td>
      ${editable ? `<td><button class="link red" data-qdel="${q.id}">Delete</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
async function enquiries() {
  cache.enquiries = await api('/enquiries');
  $('#view').innerHTML = `<div class="bar"><h1>Enquiries</h1><button class="btn ghost" id="exp">Download Excel (CSV)</button></div>${enqTable(cache.enquiries)}`;
  $('#exp').onclick = () => csv('enquiries.csv', [['Date', 'Name', 'Phone', 'Items', 'Message', 'Status'], ...cache.enquiries.map((q) => [q.created_at, q.name, q.phone, q.items.map((i) => `${i.name} x ${i.qty}`).join('; '), q.message, q.status])]);
  document.querySelectorAll('[data-st]').forEach((s) => (s.onchange = () => api('/enquiries/' + s.dataset.st, { method: 'PUT', body: { status: s.value } })));
  document.querySelectorAll('[data-qdel]').forEach((b) => (b.onclick = async () => { if (confirm('Delete this enquiry?')) { await api('/enquiries/' + b.dataset.qdel, { method: 'DELETE' }); enquiries(); } }));
}

// ---------- settings ----------
async function settings() {
  const s = await api('/settings');
  $('#view').innerHTML = `<form class="form" id="sf"><h1>Settings</h1>${FIELDS.map(([k, l]) => `<label>${l}<input name="${k}" value="${esc(s[k])}"></label>`).join('')}
    <p class="ok" id="sok"></p><button class="btn">Save settings</button></form>`;
  $('#sf').onsubmit = async (e) => { e.preventDefault(); await api('/settings', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }); $('#sok').textContent = 'Saved. The website now shows the new details.'; };
}

start();
