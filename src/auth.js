const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

function same(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function sign(data, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export async function checkLogin(env, username, password) {
  if (!env.ADMIN_PASSWORD || !env.JWT_SECRET) return { error: 'ADMIN_PASSWORD and JWT_SECRET are not set in Cloudflare (Settings > Variables and Secrets)' };
  if (!same(String(username || ''), env.ADMIN_USER || 'admin') || !same(String(password || ''), env.ADMIN_PASSWORD)) return { error: 'Wrong username or password' };
  const body = b64u(enc.encode(JSON.stringify({ sub: 'admin', exp: Date.now() + 7 * 24 * 3600 * 1000 })));
  return { token: body + '.' + (await sign(body, env.JWT_SECRET)) };
}

export async function isAuthed(req, env) {
  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const [body, sig] = token.split('.');
    if (!body || !sig || !env.JWT_SECRET || !same(await sign(body, env.JWT_SECRET), sig)) return false;
    return JSON.parse(unb64u(body)).exp > Date.now();
  } catch { return false; }
}
