# CATATAN PRAKTIK — MSIM4401 Aktivitas 8
## Aplikasi Ionic + Vue: Prakiraan Cuaca Jakarta (Open-Meteo)

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

---

## 5. Cara Menjalankan & Mengunggah

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
│   ├── services/EndPointAccess/index.ts    ← class service (axios)
│   ├── theme/
│   └── views/Home.vue                      ← halaman utama (Options API)
└── tests/
```

Perintah satu baris (Linux/WSL):

```bash
zip -r cuaca-jakarta.zip cuaca-jakarta -x "cuaca-jakarta/node_modules/*" "cuaca-jakarta/dist/*" "cuaca-jakarta/.vscode/*"
```
