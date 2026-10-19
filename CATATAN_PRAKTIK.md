# CATATAN PRAKTIK — MSIM4401 Aktivitas 8
## Aplikasi Ionic + Vue: Prakiraan Cuaca 38 Provinsi Indonesia (Open-Meteo)

> Bagian 1–4 = pengerjaan dasar tugas (cuaca Jakarta, tabel 10 baris, ambil data
> lewat tombol). **Bagian 5 = pengembangan lanjutan** (tema terang, pilih provinsi,
> filter rentang tanggal, grafik Chart.js) beserta keputusan desain, masalah, dan
> analisisnya. Bagian 6 = cara menjalankan & mengunggah.

---

## 1. Langkah-Langkah Pengerjaan (urut — bahan narasi video)

1. **Cek Ionic CLI.** `ionic --version` tidak merespons (hang). Karena environment adalah WSL dengan PATH yang juga memuat Node.js Windows (`/mnt/c/Program Files/nodejs`), perintah `ionic` resolve ke wrapper Windows yang tidak bisa dijalankan bash.
2. **Install Ionic CLI global di sisi Linux:** `npm install -g @ionic/cli` → `ionic --version` = **7.2.1** (bin nvm berada sebelum path Windows di PATH, jadi otomatis men-shadow).
3. **Scaffold proyek non-interaktif:**
   `CI=1 ionic start cuaca-jakarta blank --type=vue --no-git -y --no-interactive`
   Hasil: proyek Vite + TypeScript (`tsconfig.json`, `vue-tsc`), ESLint, Vitest, Cypress. Tidak ada Capacitor/integrasi opsional, tidak ada git (apalagi remote).
4. **Install dependency.** `npm install` pertama gagal (lihat bagian 3). Setelah troubleshooting: `npm install --legacy-peer-deps --no-audit --no-fund --prefer-offline` → **622 paket, sukses (~10 menit)**.
5. **Install axios saja:** `npm install axios` (axios 1.20.0 sudah membawa type sendiri — `@types/axios` deprecated, tidak dipasang).
6. **Buat class service** `src/services/EndPointAccess/index.ts` (default export class `EndPointAccess`, properti `theUrl`, constructor menerima `url`, method `async getRes()` → `axios.get(this.theUrl)`).
7. **Tulis ulang `src/views/Home.vue`** dengan gaya Options API (`defineComponent` + `<script lang="ts">`), menggantikan `HomePage.vue` bawaan template yang memakai `<script setup>`.
8. **Sesuaikan file terkait:** `src/router/index.ts` (impor → `Home.vue`), `src/App.vue` (konversi ke Options API agar gaya konsisten), `index.html` (judul halaman), dan dua test bawaan yang meng-assert teks template lama.
9. **Verifikasi:**
   - `npm run build` (`vue-tsc && vite build`) → **lolos tanpa error TypeScript** (hanya warning chunk >500 kB dari bundel Ionic, bukan error).
   - `npm run lint` (`eslint .`) → **0 error**.
   - `npx vitest run` → **1 test passed**.
   - `ionic serve --no-open` di background → `curl http://localhost:8100/` = **HTTP 200**, modul `Home.vue` tersaji, `/home` → 200.
   - `curl` langsung ke API Open-Meteo → respons terkonfirmasi array paralel; logika zip + `slice(0, 10)` diuji dengan Node → **10 baris tampil dengan format "19 Okt 2026, 00:00"**.
   - Dev server **dihentikan** setelah verifikasi.

---

## 2. Alasan Memakai Class Service (`EndPointAccess`)

- **Pemisahan tanggung jawab (separation of concerns).** URL endpoint dan detail HTTP (axios) berada di satu tempat; `Home.vue` tidak perlu tahu cara akses jaringan — view cukup memanggil `new EndPointAccess(url).getRes()`.
- **Reusable & mudah diuji.** Endpoint lain (mis. geocoding, endpoint lain di aktivitas berikutnya) cukup membuat instance baru dengan URL berbeda, tanpa menyalin kode fetch. Service juga bisa di-mock terpisah saat unit test.
- **Konsistensi dengan pola modul.** Modul mengajarkan pola persis ini; menjaga arsitektur tetap dapat dibaca dan dinilai: service di `src/services/EndPointAccess/index.ts`, konsumsi dari method `ambilData` di `src/views/Home.vue`.

---

## 3. Masalah / Error yang Ditemui dan Solusinya

| # | Masalah | Solusi |
|---|---------|--------|
| 1 | `ionic --version` **hang** di WSL — PATH menemukan wrapper Node.js Windows (`/mnt/c/Program Files/nodejs/ionic`) yang tidak valid untuk bash. | `npm install -g @ionic/cli` pada Node Linux (nvm); bin nvm mendahului path Windows sehingga `ionic` kini resolve ke versi 7.2.1. |
| 2 | `npm install` gagal: **`TypeError: Cannot read properties of null (reading 'edgesOut')`** di `@npmcli/arborist` (`build-ideal-tree.js#loadPeerSet`) — bug resolusi peer dependency npm 10.8.2 pada graf dependency proyek (vitest/`@vitest/*`). | Install ulang dengan **`npm install --legacy-peer-deps`** (melewati resolusi peer-dep yang bikin crash). |
| 3 | Install berikutnya menghasilkan ribuan warning **`npm warn tar TAR_ENTRY_ERROR ENOENT`** — tree `node_modules` rusak karena instalasi sebelumnya **di-kill di tengah reify** (timeout perintah). | Hapus total `node_modules` + `package-lock.json`, lalu **install bersih** dari nol → sukses. Catatan: fs Windows (`/mnt/d`) via 9p WSL lambat untuk banyak file kecil (~10 menit), jadi install dijalankan di background. |
| 4 | Saat `ionic start`, CLI **otomatis mencoba** `npm i --save -E @capacitor/core@latest`. | Perintah itu ikut gagal karena bug nomor 2, sehingga `package.json` **tidak pernah memuat Capacitor** dan `capacitor.config` tidak dibuat — sesuai requirement "tanpa Capacitor". Setelah install stabil pun Capacitor tidak ditambahkan. |
| 5 | ESLint: **`vue/multi-word-component-names`** — error pada `name: 'Home'`. | Ganti nama komponen menjadi `name: 'HomePage'` (file tetap `Home.vue` sesuai spesifikasi; route name `'Home'` tidak berubah). |
| 6 | Template starter memakai `<script setup lang="ts">` — bertentangan dengan gaya tugas (Options API). | Tulis ulang `Home.vue` (dan `App.vue`) dengan `defineComponent` + `<script lang="ts">`. |
| 7 | Risiko format jam: respons API default ber-**timezone GMT**, dan `new Date(iso)` + `getHours()` akan menghasilkan jam sesuai timezone mesin (tidak deterministik). | Parsing string ISO dilakukan **manual** (`split('T')` + array bulan Indonesia) sehingga `2026-10-19T00:00` selalu tampil `19 Okt 2026, 00:00` di mesin mana pun. |

---

## 4. Analisis Hasil

### a. Struktur JSON Open-Meteo vs JSONPlaceholder (perbedaan mendasar)
- **JSONPlaceholder** (dipakai di contoh modul): `GET /posts` menghasilkan **array of objects** — satu loop `v-for` langsung jalan (`item.title`, `item.body`).
- **Open-Meteo**: `res.data` adalah objek dengan `hourly` berisi **array paralel**: `hourly.time[i]` berpasangan dengan `hourly.temperature_2m[i]`. Tidak ada objek siap pakai.
- Konsekuensi: data **wajib di-zip dulu** — `hourly.time.map((time, i) => ({ time, temp: hourly.temperature_2m[i] }))` baru `.slice(0, 10)`. Jika salah memakai pola lama (`v-for` langsung di `res.data`), yang tampil justru objek meta (`latitude`, `generationtime_ms`, dll.). Index misalignment (array beda panjang) adalah risiko khas pola paralel — pada API ini kedua array sama panjang (168 jam = 7 hari), diverifikasi saat pengujian.

### b. Pemanggilan data on-demand lewat tombol
Data **tidak** diambil saat halaman dibuka; hanya ketika `ion-button` diklik (`@click="ambilData"`). Ini memisahkan siklus hidup UI dari siklus hidup data: state `isLoading` men-disable tombol dan mengubah labelnya, `pesanError` menampilkan pesan singkat bila axios gagal (offline, CORS, dsb.), dan `dataCuaca` di-reset agar tidak menampilkan data lama saat error. UI tetap sederhana: satu tabel dua kolom (Waktu, Suhu), terpusat, tanpa komponen berlebihan.

### c. Konsistensi pola & gaya kode
Service class terpisah (`EndPointAccess`), konsumsi lewat method `ambilData` di view, Options API + TypeScript strict (`vue-tsc` lolos), `:key` unik memakai `time`, type `dataCuaca` diinisialisasi `[]` (bukan `null`) sehingga `v-if="dataCuaca.length > 0"` aman sejak render pertama. Tabel hanya menampilkan dua field sesuai spesifikasi — tanpa kolom nomor atau field turunan lain.

### d. Ide pengembangan lanjutan (di luar scope tugas)
1. **Pilih kota** — tambahkan Geocoding API Open-Meteo (`geocoding-api.open-meteo.com`) lalu bangun URL di `ambilData` dari hasil pencarian; `EndPointAccess` tetap dipakai apa adanya.
2. **Waktu lokal Indonesia** — tambahkan parameter `timezone=Asia/Jakarta` pada request agar field `time` sudah WIB, tidak perlu konversi.
3. **Visualisasi** — grafik garis suhu 24 jam ke depan (mis. Chart.js) dan/atau jumlah baris yang bisa dipilih user (10/24/48).
4. **Ketahanan** — cache respons ke `localStorage` (stale-while-revalidate) + unit test `EndPointAccess` dengan axios mock (`vi.mock('axios')`), karena method `getRes()` yang kecil sangat mudah dimock.

> **Catatan (iterasi 2):** butir **1 (pilih kota → kini provinsi)**, **2 (waktu lokal
> Indonesia → `timezone=auto`)** dan **3 (visualisasi Chart.js)** sudah
> diimplementasikan — lihat **Bagian 5**. Butir 4 **belum** dikerjakan karena di luar
> permintaan (tidak memakai `localStorage`).

---

## 5. Pengembangan Lanjutan (Iterasi 2 — Fitur Baru)

Empat perubahan yang diminta: **(a) tema terang cerah**, **(b) pilih provinsi
(default Kalimantan Timur)**, **(c) filter rentang tanggal (maks 7 hari)**,
**(d) grafik Chart.js**. Gaya kode tetap Options API + TypeScript, service `EndPointAccess`
tetap dipakai apa adanya (hanya URL yang dibangun berbeda).

### 5.1 File yang dibuat / diubah

| File | Status | Keterangan |
|------|--------|-----------|
| `src/views/Home.vue` | dirombak | 4 kartu: Filter, Ringkasan, Grafik, Tabel; `ion-select` provinsi; 2 `input type="date"`; validasi; auto-load di `mounted()`; tanpa `slice(0,10)` |
| `src/components/SuhuChart.vue` | **baru** | Komponen grafik garis Chart.js (Options API, ref canvas, `destroy()` sebelum redraw + `beforeUnmount`) |
| `src/data/provinsi.ts` | **baru** | 38 provinsi Indonesia (nama + koordinat ibu kota) + `PROVINSI_DEFAULT` |
| `src/theme/variables.css` | diubah | Palet terang biru langit, `color-scheme: light`, kontras dinaikkan |
| `src/main.ts` | diubah | Impor `dark.system.css` **dikomentari** agar mode gelap sistem tidak menimpa |
| `index.html` | diubah | `<meta name="color-scheme" content="light">` |
| `tests/unit/example.spec.ts` | diubah | Mock `@/services/EndPointAccess` **dan** `@/components/SuhuChart.vue`; 2 test (render + validasi rentang) |
| `tests/e2e/specs/test.cy.ts` | diubah | Assertion disesuaikan ("Tampilkan Data", "Ringkasan") |
| `package.json` | diubah | Tambah `chart.js` `^4.5.1` (runtime dependency) |

### 5.2 (a) Tema terang cerah

**Langkah.** (1) `dark.system.css` tidak lagi diimpor di `main.ts` (template Ionic
memuatnya sebagai media-query `prefers-color-scheme` — inilah penyebab tampilan ikut
gelap saat OS gelap, jadi harus dimatikan, bukan sekadar ditimpa variabel).
(2) `variables.css` diberi `color-scheme: light` + palet terang. (3) `index.html`
diberi meta `color-scheme` agar kontrol form bawaan browser (date picker) juga terang.

**Palet.** latar halaman `#f0f9ff` (sky-50), kartu putih `#ffffff`, teks utama
`#0f172a` (slate-900), aksen primary `#0369a1` (sky-700), toolbar biru + teks putih,
header tabel `#0369a1` + teks putih.

**Keputusan: mengapa primary digelapkan setelah jadi.** Warna awal `#0284c7`
(sky-600) terlihat lebih "cerah", tetapi saat **kontras dihitung** teks putih di
atasnya hanya **4.10:1** — di bawah ambang WCAG AA (4.5:1) untuk teks normal.
Primary diganti `#0369a1` (sky-700) → **5.93:1**. Semua kombinasi teks/latar dihitung
dengan rumus *relative luminance* WCAG:

| Pasangan | Rasio | Status |
|----------|-------|--------|
| Teks utama `#0f172a` di latar `#f0f9ff` | 16.75:1 | AA |
| Teks utama `#0f172a` di kartu `#ffffff` | 17.85:1 | AA |
| Header tabel: putih di `#0369a1` | 5.93:1 | AA |
| Tombol: putih di `#0369a1` | 5.93:1 | AA |
| Suhu dingin `#1e3a8a` di `#dbeafe` | 8.49:1 | AA |
| Suhu sejuk `#14532d` di `#dcfce7` | 8.30:1 | AA |
| Suhu panas `#7c2d12` di `#ffedd5` | 8.18:1 | AA |
| Suhu sangat panas `#7f1d1d` di `#fee2e2` | 8.20:1 | AA |
| Nilai ringkasan `#0369a1` di `#f8fafc` | 5.67:1 | AA |
| Pesan error `#b91c1c` di `#fef2f2` | 5.91:1 | AA |

**Warna suhu pada tabel** (fitur pendukung agar tabel mudah dibaca):
`<24 °C` biru, `24–30 °C` hijau, `31–34 °C` oranye, `>34 °C` merah — tiap kelas
memakai teks gelap di latar pastel sehingga tetap lolos AA (lihat tabel di atas).

### 5.3 (b) Pilih provinsi — default Kalimantan Timur

**Langkah.** `src/data/provinsi.ts` berisi `interface Provinsi { nama, latitude, longitude }`
dan 38 provinsi Indonesia **urut alfabetis** (sesuai daftar resmi 38 provinsi), plus
`export const PROVINSI_DEFAULT: string = 'Kalimantan Timur'`. Di `Home.vue`,
`ion-select` + `v-for` `ion-select-option` terikat ke `provinsiTerpilih`
(diinisialisasi `PROVINSI_DEFAULT`, jadi halaman pertama kali dibuka langsung
menampilkan data Kalimantan Timur).

**Keputusan desain & alasannya.**
1. **Koordinat ibu kota sebagai titik cuaca.** Open-Meteo butuh `latitude`/`longitude`,
   bukan nama provinsi, dan API forecast tidak menyediakan pencarian nama wilayah.
   Memakai geocoding saat runtime akan menambah satu request + titik gagal baru, dan
   hasil pencarian nama provinsi tidak konsisten. Karena itu koordinat **dibekukan**
   di file data (tetap satu request per tampilan).
2. **Koordinat diverifikasi dulu, bukan dikira-kira.** Setiap ibu kota dicek ke
   Geocoding API Open-Meteo (`geocoding-api.open-meteo.com/v1/search`). Dua entri
   **salah dan dikoreksi**: Aceh `4.59, 96.71` → **`5.54, 95.33`** (Banda Aceh;
   koordinat lama meleset ~186 km ke pedalaman) dan Kepulauan Riau `1.05, 104.52`
   → **`0.92, 104.46`** (Tanjung Pinang; meleset ~16 km di laut). Palangka Raya tidak
   ada di geocoder Open-Meteo → diverifikasi lewat Nominatim/OpenStreetMap
   (`-2.2073, 113.9164`). Ejaan juga dirapikan (mis. "Pangkalpinang").
3. **`timezone=auto`** ditambahkan ke URL supaya jam yang ditampilkan benar-benar
   waktu lokal provinsi itu, dan API mengembalikan nama zona (`Asia/Makassar`,
   `Asia/Jayapura`, …). UI menampilkan `timezone` + `timezone_abbreviation` sebagai
   bukti. **Catatan temuan:** field `timezone_abbreviation` Open-Meteo berisi
   **`GMT+8`/`GMT+9`**, bukan `WITA`/`WIT` — jadi label zona ditampilkan dalam bentuk
   `Asia/Makassar (GMT+8)`, bukan singkatan WIB/WITA/WIT.

### 5.4 (c) Filter rentang tanggal (maks 7 hari)

**Langkah.** Dua `input type="date"` (`tanggalMulai`, `tanggalAkhir`) + satu tombol
**"Tampilkan Data"**. Nilai awal = **hari ini menurut waktu lokal perangkat**, dihitung
dari `getFullYear/getMonth/getDate` (bukan `toISOString()` yang memakai UTC dan bisa
menggeser tanggal satu hari di WIB/WITA/WIT). Data diambil sekali saat `mounted()`
(default: Kalimantan Timur, hari ini) dan setiap tombol diklik.

**Validasi (di klien, sebelum request):**

| Kondisi | Pesan |
|---------|-------|
| salah satu tanggal kosong | "Silakan pilih tanggal mulai dan tanggal akhir." |
| akhir < mulai | "Tanggal akhir tidak boleh lebih awal dari tanggal mulai." |
| rentang > 7 hari | "Rentang maksimal 7 hari (mis. 19–25 Oktober)." |
| akhir > hari ini + 15 hari | "Prakiraan hanya tersedia sampai 15 hari ke depan." |

**Keputusan.**
1. **`input type="date"` bawaan browser**, bukan `ion-datetime`/modal: paling mudah
   diuji, tanpa dependensi tambahan, dan nilai yang dihasilkan sudah format
   `YYYY-MM-DD` yang langsung diterima API.
2. **Batas 7 hari** dipilih agar tabel (dan grafik) tetap terbaca: 7 hari = 168 titik.
   API sendiri mengizinkan 16 hari.
3. **Validasi ganda.** Klien memvalidasi agar pesannya ramah dan tidak membuang
   request, tetapi kode **tetap menangani HTTP 400** dari API (ditemukan saat
   verifikasi: `end_date` di luar jangkauan → `{"error":true,"reason":"Parameter
   'end_date' is out of allowed range from ... to ..."}`) dan menampilkan pesan
   "maksimal 15 hari ke depan" — jadi batas API sesungguhnya tetap benar walau
   validasi klien berubah.
4. **`URLSearchParams`** untuk menyusun URL (parameter otomatis ter-encode, urutan
   tidak penting) dan `slice(0, 10)` **dihapus** karena jumlah baris kini ditentukan
   rentang tanggal (24 baris/hari × jumlah hari).
5. **Nilai kosong (`null`) ditangani**: apabila API mengembalikan suhu `null` (mis.
   kekosongan data), tabel menampilkan `-`, dan nilai itu **dikecualikan** dari
   perhitungan min/maks/rata-rata; grafik memakai `spanGaps: false` agar tidak
   menyambung garis menyeberangi data kosong.

### 5.5 (d) Grafik Chart.js

**Langkah.** `npm install chart.js` → 4.5.1 (chart.js v4 tidak punya peer
dependency yang bermasalah, jadi opsi `--legacy-peer-deps` **tidak diperlukan**
untuk paket ini). Komponen `src/components/SuhuChart.vue`:

- **Options API + `defineComponent`**, `props: { data: { type: Array as PropType<TitikSuhu[]>, required: true } }`.
- **Impor modular** (`CategoryScale`, `LinearScale`, `PointElement`, `LineElement`,
  `LineController`, `Tooltip`, `Chart`) lalu masing-masing diregistrasi dengan
  `Chart.register(...)`. Hanya modul yang dipakai ikut terbundel (tree-shaking),
  jadi tidak perlu memuat `chart.js/auto` (~1 MB).
- **Ref ke instance chart non-reaktif** (`chartInstan`, bukan `ref()`), `destroy()`
  dipanggil **sebelum** menggambar ulang dan di `beforeUnmount` — mencegah kanvas
  ganda/`Chart.getChart` warning saat data berubah.
- `watch` pada `props.data` (deep) → gambar ulang saat user menekan "Tampilkan Data".
- Opsi: `responsive: true` + `maintainAspectRatio: false` di dalam wadah 300px
  (agar tinggi terkendali di layar sempit), garis `#0369a1` + `tension: 0.3`,
  `spanGaps: false`, sumbu X label "19 Okt 14:00" dengan `maxTicksLimit: 8`
  (label tidak tumpang tindih di layar kecil), sumbu Y diberi judul "Suhu (°C)",
  tooltip menampilkan tanggal **dan** jam lengkap + `°C`.

**Keputusan.**
1. **Chart.js langsung, bukan `vue-chartjs`/`chart.vue` wrapper** — diminta tugas,
   dan wrapper menyembunyikan siklus hidup kanvas padahal justru itu bagian yang
   perlu dikendalikan (`destroy`).
2. **Grafik & tabel tampil bersamaan** (bukan `ion-segment` 2 mode): satu tampilan
   menunjukkan dua bentuk data sekaligus — garis untuk pola, tabel untuk angka
   presisi; juga menghindari state UI tambahan yang tidak diminta.
3. **Ringkasan singkat** (min, maks, rata-rata, suhu terakhir) ditambahkan di atas
   grafik karena pertanyaan "misal suhu maksimum dapat dilihat melalui chart" lebih
   cepat dijawab dengan angka daripada memelototi titik tertinggi.

### 5.6 ⚠️ URL sekarang BERBEDA dari URL pada soal — dan mengapa

**URL awal (soal):**
```
https://api.open-meteo.com/v1/forecast?latitude=-6.2&longitude=106.8&hourly=temperature_2m
```
**URL sekarang (default: Kalimantan Timur, hari ini):**
```
https://api.open-meteo.com/v1/forecast?latitude=-0.5&longitude=117.15&hourly=temperature_2m&timezone=auto&start_date=2026-10-19&end_date=2026-10-19
```
Perbedaan: (1) **koordinat** mengikuti provinsi terpilih (titik ibu kota provinsi),
(2) **`start_date`/`end_date`** dari filter rentang tanggal, (3) **`timezone=auto`**
agar jam/zona sesuai wilayah. Endpoint dan parameter `hourly=temperature_2m` tetap
sama; kelas `EndPointAccess` tidak berubah — hanya string URL yang dibangun
`Home.vue` lewat `URLSearchParams`. Perubahan ini **konsekuensi langsung dari tiga
fitur yang diminta** (provinsi, rentang tanggal, tampilan waktu lokal), bukan penambahan
di luar permintaan.

### 5.7 Masalah yang Ditemui pada Iterasi Ini & Solusinya

| # | Masalah | Solusi |
|---|---------|--------|
| 1 | `TS2322`: instance `Chart` tidak kompatibel dengan tipe `ChartJS` default (generik ganjil `Chart<"line", (number \| null)[], string>`) | Alias tipe eksplisit `type ChartInstan = ChartJS<'line', (number \| null)[], string>` untuk field instance |
| 2 | `TS2307: Cannot find module '../components/SuhuChart'` | Impor memakai ekstensi eksplisit: `'../components/SuhuChart.vue'` |
| 3 | ESLint `@typescript-eslint/no-this-alias` (`const rujuk = this`) | Hapus alias; gunakan **arrow function** pada callback agar `this` tetap komponen |
| 4 | ESLint `BULAN_INDONESIA` tidak terpakai (penomoran manual digantikan format tanggal ringkasan) | Ringkasan memakai `toLocaleDateString('id-ID')`, konstanta manual **dihapus** |
| 5 | **Runtime (bukan TypeScript): `"line" is not a registered controller`** — kanvas kosong. Tertangkap saat verifikasi di browser headless (console error) | Tambah impor + `Chart.register(LineController)`; registrasi per-controller wajib di chart.js v4 saat memakai impor modular |
| 6 | Dev server tetap menyajikan modul **basi** setelah file diubah (watcher Vite melewatkan event `inotify` di filesystem `/mnt/d` via 9p) | **Restart `ionic serve`** setiap selesai mengubah file; dibuktikan dengan `curl http://localhost:8100/src/components/SuhuChart.vue | grep -c LineController` |
| 7 | Unit test gagal karena mock `@/components/SuhuChart` tidak cocok dengan impor asli `.../SuhuChart.vue` | Path mock disamakan: `vi.mock('@/components/SuhuChart.vue', ...)`; mock service juga disamakan dengan `@/services/EndPointAccess` |
| 8 | Kontras tombol putih di `#0284c7` hanya 4.10:1 (gagal AA teks normal) | Primary digelapkan ke `#0369a1` → 5.93:1 |

### 5.8 Analisis Hasil (Iterasi 2)

**a. Struktur respons tetap array paralel, kini diperkaya metadata.** `hourly.time[i]`
berpasangan dengan `hourly.temperature_2m[i]`, ditambah `timezone`,
`timezone_abbreviation`, dan `utc_offset_seconds`. Jumlah titik = **24 × jumlah hari**
(diverifikasi: 1 hari → 24 titik, 3 hari → 72 titik), jadi grafik/tabel konsisten
dengan rentang yang dipilih. Contoh nyata (Kalimantan Timur, `Asia/Makassar (GMT+8)`):
**min 24.5 °C pukul 06:00, maks 31.9 °C pukul 12:00, rata-rata 27.9 °C** dalam sehari.

**b. Pola suhu harian.** Kurva berbentuk mangkuk: terendah pada dini hari hingga
pagi (± 24.5–27 °C antara 00:00–06:00) dan naik ke puncak pada tengah hari
(± 31.9 °C sekitar 12:00), lalu menurun menjelang malam; amplitudo harian ± 7 °C.
Grafik garis menampilkan pola ini jauh lebih cepat dicerna daripada membaca 24 baris
tabel — inilah nilai tambah visualisasi terhadap data tabular.

**c. Perbedaan zona waktu nyata terlihat.** Papua (`Asia/Jayapura`) mengembalikan
`GMT+9` sementara Kalimantan Timur `GMT+8`; karena `timezone=auto`, jam pada tabel
adalah **jam lokal wilayah tersebut**, dan label zona ikut ditampilkan sehingga tidak
ada ambiguitas ("jam 12:00 di mana?").

**d. Kualitas penanganan data jelek.** `null` dari API tidak membuat grafik pecah
(`spanGaps:false`) maupun perhitungan ringkasan salah (nilai kosong disaring), dan
permintaan di luar jangkauan API menghasilkan pesan bahasa manusia, bukan `[object Object]`.

**e. Bukti verifikasi yang dijalankan.**

| Pemeriksaan | Hasil |
|-------------|-------|
| `npm run build` (`vue-tsc && vite build`) | exit 0 (hanya warning ukuran chunk, bukan error) |
| `npm run lint` (`eslint .`) | exit 0 |
| `npx vitest run` | 1 file, **2 test passed** (mock service + komponen chart) |
| URL API (replika `URLSearchParams`) | Kaltim 1 hari = 24 titik `GMT+8`; 3 hari = 72 titik; Papua `GMT+9`; `end_date` +20 hari → **HTTP 400** sesuai asumsi validasi |
| Render headless Chrome — **build produksi** (`vite preview`) | `--dump-dom` (viewport 390×844): `<canvas>` = 1, `<tr>` = 25 (1 header + **24 baris**), `GMT+8` = 1, default provinsi Kalimantan Timur tampil |
| Console browser | **bersih** (tanpa error) baik di dev server maupun build produksi |
| CSS hasil bundel (`dist/assets/*.css`) | `position:sticky`, `max-height:420px` (wadah tabel), kelas warna suhu **ada** di bundel |
| Kontras | seluruh pasangan teks/latar ≥ 4.5:1 (tabel di §5.2) |
| Server | dev server & preview **dihentikan** setelah verifikasi (`curl` → `HTTP 000`) |

**f. Keterbatasan catatan ini (transparansi).** Screenshot hasil render disimpan di
`C:\Users\Hares\AppData\Local\Temp\opencode-cuaca\` (`final-desktop.png` 1440×1000,
`final-mobile.png` 390×844, keduanya dari build produksi). Asisten penyusun catatan
ini tidak dapat menampilkan/membaca gambar, sehingga bukti visual diverifikasi
**secara terstruktur** (DOM hasil `--dump-dom`, console browser, aturan CSS di bundel,
perhitungan kontras) alih-alih dengan mata — **bukan** diklaim dari pengamatan gambar.

**g. Twist yang dipertahankan sengaja.** Teks judul di toolbar/halaman (`ion-title`
+ `h1`) saat ini masih berbunyi "Prakiraan Cuaca Sumatra" — **sengaja tidak
diubah** dan bukan bug: pemilik proyek menyatakan akan menggantinya sendiri.
Semua bagian lain (data 38 provinsi, grafik, filter) sudah final.

## 6. Cara Menjalankan & Mengunggah

```bash
# menjalankan dev server (buka http://localhost:8100)
ionic serve --no-open     # atau: npm run dev

# produksi
npm run build             # vue-tsc + vite build
npm run preview           # cek hasil build

# kualitas kode
npm run lint
npx vitest run            # unit test
```

**Arsip untuk upload source code** — zip isi folder `cuaca-jakarta` **kecuali** `node_modules/`, `dist/`, dan `.vscode/`:

```
cuaca-jakarta/
├── CATATAN_PRAKTIK.md
├── index.html, package.json, package-lock.json
├── tsconfig.json, tsconfig.node.json, vite.config.ts
├── cypress.config.ts, ionic.config.json, ionic.starter.json
├── .browserslistrc, .eslintignore, .eslintrc.cjs, .gitignore
├── public/
├── src/
│   ├── App.vue, main.ts, vite-env.d.ts
│   ├── router/index.ts
│   ├── data/provinsi.ts                    ← BARU: 38 provinsi + PROVINSI_DEFAULT
│   ├── components/SuhuChart.vue            ← BARU: grafik garis Chart.js
│   ├── services/EndPointAccess/index.ts    ← class service (axios)
│   ├── theme/
│   └── views/Home.vue                      ← halaman utama (Options API)
└── tests/
```

Perintah satu baris (Linux/WSL):

```bash
zip -r cuaca-jakarta.zip cuaca-jakarta -x "cuaca-jakarta/node_modules/*" "cuaca-jakarta/dist/*" "cuaca-jakarta/.vscode/*"
```
