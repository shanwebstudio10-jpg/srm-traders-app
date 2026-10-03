import { checkLogin, isAuthed } from './auth.js';
import { ensureDb, SETTING_KEYS } from './db.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const err = (msg, status = 400) => json({ error: msg }, status);
const clip = (v, n) => String(v ?? '').trim().slice(0, n);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      await ensureDb(env);
      return await route(req, env, url);
    } catch (e) {
      return err(e.message || 'Server error', 500);
    }
  },
};

async function route(req, env, url) {
  const [, res, id, sub] = url.pathname.split('/').filter(Boolean);
  const m = req.method;
  const PUB = 'SELECT id,name,category,price,min_qty,description,active,length(image) AS iv FROM products';

  // ---------- public ----------
  if (res === 'login' && m === 'POST') {
    const b = await req.json().catch(() => ({}));
    const r = await checkLogin(env, b.username, b.password);
    if (r.error) { await new Promise((ok) => setTimeout(ok, 500)); return err(r.error, 401); }
    return json(r);
  }
  if (res === 'settings' && m === 'GET') {
    const { results } = await env.DB.prepare('SELECT key,value FROM settings').all();
    const out = Object.fromEntries(results.map((r) => [r.key, r.value]));
    delete out.seeded;
    return json(out);
  }
  if (res === 'products' && m === 'GET') {
    if (id && sub === 'image') {
      const row = await env.DB.prepare('SELECT image FROM products WHERE id=?').bind(id).first();
      if (!row || !row.image) return new Response('Not found', { status: 404 });
      const mt = /^data:(image\/[a-z+.-]+);base64,(.*)$/.exec(row.image);
      if (!mt) return Response.redirect(new URL(row.image, url).toString(), 302);
      const bytes = Uint8Array.from(atob(mt[2]), (c) => c.charCodeAt(0));
      return new Response(bytes, { headers: { 'Content-Type': mt[1], 'Cache-Control': 'public, max-age=86400' } });
    }
    if (id) {
      const row = await env.DB.prepare(PUB + ' WHERE id=?').bind(id).first();
      return row ? json(row) : err('Product not found', 404);
    }
    const all = url.searchParams.get('all') === '1' && (await isAuthed(req, env));
    const { results } = await env.DB.prepare(PUB + (all ? '' : ' WHERE active=1') + ' ORDER BY id').all();
    return json(results);
  }
  if (res === 'enquiries' && m === 'POST') {
    const b = await req.json().catch(() => ({}));
    const name = clip(b.name, 100);
    if (!name) return err('Name is required');
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 50).map((i) => ({ name: clip(i.name, 120), qty: Math.max(1, Math.min(100000, +i.qty || 1)) }));
    await env.DB.prepare('INSERT INTO enquiries (name,phone,message,items) VALUES (?,?,?,?)').bind(name, clip(b.phone, 30), clip(b.message, 1500), JSON.stringify(items)).run();
    return json({ ok: true }, 201);
  }

  // ---------- admin ----------
  if (!(await isAuthed(req, env))) return err('Unauthorized', 401);

  if (res === 'stats') {
    const one = async (sql) => (await env.DB.prepare(sql).first()).n;
    return json({
      products: await one('SELECT COUNT(*) n FROM products'),
      newEnquiries: await one("SELECT COUNT(*) n FROM enquiries WHERE status='New'"),
      enquiries: await one('SELECT COUNT(*) n FROM enquiries'),
    });
  }
  if (res === 'products') {
    if (m === 'POST' || m === 'PUT') {
      const b = await req.json().catch(() => ({}));
      const name = clip(b.name, 120), category = clip(b.category, 40);
      if (!name || !category) return err('Name and category are required');
      if (b.image && String(b.image).length > 450000) return err('Photo is too large. Choose a smaller photo.');
      const vals = [name, category, +b.price || 0, Math.max(1, +b.min_qty || 1), clip(b.description, 500), b.active === 0 ? 0 : 1];
      if (m === 'POST') {
        const r = await env.DB.prepare('INSERT INTO products (name,category,price,min_qty,description,active,image) VALUES (?,?,?,?,?,?,?)').bind(...vals, b.image || '').run();
        return json({ id: r.meta.last_row_id }, 201);
      }
      if (b.image !== undefined) await env.DB.prepare('UPDATE products SET name=?,category=?,price=?,min_qty=?,description=?,active=?,image=? WHERE id=?').bind(...vals, b.image, id).run();
      else await env.DB.prepare('UPDATE products SET name=?,category=?,price=?,min_qty=?,description=?,active=? WHERE id=?').bind(...vals, id).run();
      return json({ ok: true });
    }
    if (m === 'DELETE') { await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run(); return json({ ok: true }); }
  }
  if (res === 'enquiries') {
    if (m === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM enquiries ORDER BY id DESC LIMIT 300').all();
      return json(results.map((r) => ({ ...r, items: JSON.parse(r.items || '[]') })));
    }
    if (m === 'PUT') {
      const b = await req.json().catch(() => ({}));
      if (!['New', 'Contacted', 'Done'].includes(b.status)) return err('Invalid status');
      await env.DB.prepare('UPDATE enquiries SET status=? WHERE id=?').bind(b.status, id).run();
      return json({ ok: true });
    }
    if (m === 'DELETE') { await env.DB.prepare('DELETE FROM enquiries WHERE id=?').bind(id).run(); return json({ ok: true }); }
  }
  if (res === 'settings' && m === 'PUT') {
    const b = await req.json().catch(() => ({}));
    const stmts = SETTING_KEYS.filter((k) => k in b).map((k) => env.DB.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').bind(k, clip(b[k], 300)));
    if (stmts.length) await env.DB.batch(stmts);
    return json({ ok: true });
  }
  return err('Not found', 404);
}
