/* Statistik pengunjung RamzStore — Umami Cloud (tanpa cookie).
   CARA AKTIFKAN: daftar gratis di https://cloud.umami.is, tambah website
   "ramzstore12.my.id", salin "Website ID" (bentuk: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx),
   lalu tempel di bawah ini. Selama masih kosong, tidak ada data yang dikirim ke mana pun. */
(function () {
  var WEBSITE_ID = '8103f2ff-e17c-477e-83d5-58d6fe67e651';                       // <-- tempel Website ID di sini
  var DOMAIN = 'ramzstore12.my.id';          // hanya hitung kunjungan dari domain ini
  if (!WEBSITE_ID) return;
  var h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h !== DOMAIN && h !== 'www.' + DOMAIN) return;
  var s = document.createElement('script');
  s.defer = true;
  s.src = 'https://cloud.umami.is/script.js';
  s.setAttribute('data-website-id', WEBSITE_ID);
  s.setAttribute('data-domains', DOMAIN + ',www.' + DOMAIN);
  document.head.appendChild(s);
})();
