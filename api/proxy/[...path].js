// ═══════════════════════════════════════════════════════════
//  PANDU HUB — Same-origin proxy to the Discord bot backend
//
//  Kenapa file ini ada:
//  Sebelumnya index.html manggil BOT_SERVER_URL (URL tunnel
//  cloudflared) LANGSUNG dari browser. Itu artinya siapapun yang
//  buka DevTools -> Network bisa lihat URL asli + full request,
//  terus copy jadi curl/Postman/python script buat spam endpoint
//  /payment langsung, skip captcha, skip apapun di frontend.
//
//  Sekarang browser cuma manggil `/api/proxy/...` (same origin,
//  domain panduhub.vercel.app sendiri). File INI yang jalan di
//  server Vercel dan yang tahu BOT_URL asli — nilai itu cuma ada
//  di Environment Variable, gak pernah dikirim ke client sama
//  sekali. Ditambah header rahasia (PROXY_SECRET) yang disisipkan
//  di sini supaya walau tunnel url ke-expose lagi entah gimana,
//  bot.js di belakang tetap nolak request yang gak lewat proxy ini.
//
//  ENV VARS yang wajib di-set di Vercel dashboard:
//    BOT_URL        -> https://xxxx.trycloudflare.com (URL asli bot)
//    PROXY_SECRET   -> string random panjang, HARUS SAMA dengan
//                      PROXY_SECRET di .env bot.js
// ═══════════════════════════════════════════════════════════

// Body Vercel dibiarkan mentah (raw stream), biar bisa forward
// multipart/form-data (upload gambar bukti bayar) apa adanya
// tanpa perlu parse ulang di sini.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const BOT_URL = process.env.BOT_URL;
  const PROXY_SECRET = process.env.PROXY_SECRET;

  if (!BOT_URL) {
    return res.status(500).json({ success: false, message: 'Proxy misconfigured: BOT_URL not set' });
  }

  // FIX: ambil path langsung dari req.url, bukan dari req.query.path.
  // req.query.path kadang gak ke-populate dengan benar tergantung
  // runtime, jadi kita parse manual dari URL asli request masuk.
  // req.url contohnya: "/api/proxy/payment" atau "/api/proxy/payment?foo=bar"
  const rawUrl = req.url || '';
  const queryIndex = rawUrl.indexOf('?');
  const withoutQuery = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);
  const queryString = queryIndex === -1 ? '' : rawUrl.slice(queryIndex); // termasuk tanda '?'-nya
  const targetPath = withoutQuery.replace(/^\/api\/proxy\/?/, '');
  const targetUrl = `${BOT_URL.replace(/\/+$/, '')}/${targetPath.replace(/^\/+/, '')}${queryString}`;

  // Teruskan semua header dari client APA ADANYA (termasuk
  // Content-Type multipart dengan boundary-nya, dan header
  // cf-turnstile-token dari widget captcha), kecuali beberapa
  // header yang khusus untuk koneksi HTTP itu sendiri.
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (['host', 'connection', 'content-length', 'transfer-encoding'].includes(key)) continue;
    headers[key] = value;
  }
  // Sisipkan secret di sini — di server, bukan di browser.
  if (PROXY_SECRET) headers['x-proxy-secret'] = PROXY_SECRET;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
      // Diperlukan Node fetch saat body berupa stream.
      duplex: 'half',
      // Jangan menggantung selamanya: kalau bot/tunnel gak bales, putus & balas error JSON.
      signal: AbortSignal.timeout(50000),
    });

    const buf = Buffer.from(await upstreamRes.arrayBuffer());

    // Tunnel cloudflared mati / URL berubah = Cloudflare balas halaman HTML (530/502/1033),
    // bukan JSON dari bot. Ubah jadi JSON biar web bisa nampilin pesan yang jelas.
    const ct = String(upstreamRes.headers.get('content-type') || '');
    if (upstreamRes.status >= 500 && !ct.includes('application/json')) {
      console.error('[proxy] Upstream non-JSON error', upstreamRes.status, 'BOT_URL kemungkinan mati/berubah');
      return res.status(502).json({ success: false, message: 'Server bot sedang offline. Coba lagi sebentar atau hubungi admin.' });
    }

    res.status(upstreamRes.status);
    upstreamRes.headers.forEach((value, key) => {
      if (['content-encoding', 'transfer-encoding', 'content-length', 'connection'].includes(key)) return;
      res.setHeader(key, value);
    });
    res.send(buf);
  } catch (err) {
    console.error('[proxy] Error forwarding to bot:', err.message);
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return res.status(504).json({ success: false, message: 'Bot terlalu lama merespons. Coba lagi sebentar atau hubungi admin.' });
    }
    res.status(502).json({ success: false, message: 'Bad gateway: could not reach backend.' });
  }
}
