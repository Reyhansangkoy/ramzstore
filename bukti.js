/* Bukti nyata: jumlah member Discord Pandu Hub, diambil langsung dari Discord.
   Kalau Discord tidak bisa dihubungi, tampilan tetap memakai angka statis di HTML
   (lengkap dengan tanggal), jadi tidak pernah menampilkan angka kosong atau palsu. */
(function () {
  var els = document.querySelectorAll('.pbk');
  if (!els.length) return;
  var fmt = function (n) { try { return n.toLocaleString('id-ID'); } catch (e) { return String(n); } };
  [].forEach.call(els, function (el) {
    var kode = el.getAttribute('data-kode');
    if (!kode || !window.fetch) return;
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
    fetch('https://discord.com/api/v10/invites/' + encodeURIComponent(kode) + '?with_counts=true', ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (d) {
        var m = d.approximate_member_count, o = d.approximate_presence_count;
        if (typeof m !== 'number' || m < 1) throw new Error('data');
        el.querySelector('.bk-m').textContent = fmt(m);
        if (typeof o === 'number' && o > 0) {
          el.querySelector('.bk-on').textContent = fmt(o);
          el.querySelector('.bk-o').hidden = false;
        }
        el.querySelector('.bk-tg').hidden = true;
        el.querySelector('.bk-lv').hidden = false;
      })
      .catch(function () { /* diam: tetap pakai angka statis */ })
      .then(function () { clearTimeout(t); });
  });
})();
