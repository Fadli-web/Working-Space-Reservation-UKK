# DOKUMENTASI UJI KOMPETENSI KEAHLIAN (UKK) 2026/2027
## REKAYASA PERANGKAT LUNAK — SMK TELKOM MALANG
### PAKET B: APLIKASI RESERVASI COWORKING SPACE & WORKSTATION (SMARTSPACE HUB)

---

## 1. IDENTITAS PROYEK
* **Satuan Pendidikan**: SMK Telkom Malang
* **Kompetensi Keahlian**: Rekayasa Perangkat Lunak (RPL)
* **Paket Soal**: Paket B — Smart Space Booking (Coworking Space & Workstation)
* **Kategori Pengerjaan**: **Frontend (Web)** — Mengonsumsi RESTful API Panitia
* **Teknologi Utama**:
  * **Framework**: Next.js 16 (App Router & Turbopack)
  * **Bahasa**: TypeScript / React 19
  * **Styling**: Tailwind CSS & Modern Glassmorphism
  * **HTTP Client**: Axios (dengan Interceptor JWT Bearer & Multi-Tenancy `x-maker-key`)
  * **QR Code & E-Ticket**: `qrcode.react` (SVG QR Code Generator)

---

## 2. PENGATURAN ENVIRONMENT & API PANITIA

Aplikasi menggunakan konfigurasi variabel lingkungan yang tersimpan pada berkas `.env`:

```env
NEXT_PUBLIC_API_BASE_URL=https://learn.smktelkom-mlg.sch.id/coworking
NEXT_PUBLIC_MAKER_KEY=mk_bcfeead51c4a4395a643b3ed506ba933
```

* **App Maker**: `faddlimaker` (ID: 93 / `mk_bcfeead51c4a4395a643b3ed506ba933`).
* **Multi-Tenancy**: Header `x-maker-key` otomatis terpasang pada setiap panggilan API via `services/api.ts` untuk memastikan data terisolasi dan tidak bercampur antar siswa.
* **Autentikasi**: Token JWT Bearer otomatis disimpan di `localStorage` setelah login dan disuntikkan ke Header `Authorization: Bearer <token>`.

---

## 3. CARA MENJALANKAN APLIKASI SECARA LOKAL

### Prasyarat:
* Node.js versi 18 ke atas
* Koneksi internet untuk mengakses API Panitia

### Langkah Menjalankan:
1. Buka terminal pada direktori proyek:
   ```bash
   npm install
   ```
2. Jalankan server pengembangan (Development Mode):
   ```bash
   npm run dev
   ```
3. Buka browser pada alamat:
   ```
   http://localhost:3000
   ```

### Menjalankan Uji Produksi (Build):
```bash
npm run build
npm start
```

---

## 4. AKUN PENGUJIAN (DEMO ACCOUNTS)

### A. Akun Pengelola / Admin Space
* **Username**: `admin_faddli`
* **Password**: `Admin123!`
* **Hak Akses**:
  * Dashboard Ringkasan Pendapatan & Grafik Harian
  * Kelola Reservasi (Konfirmasi, Check-In Tamu, Check-Out Tamu)
  * CRUD Ruangan & Meja (Personal Focus Desk, Meeting Room VIP, dll.)
  * CRUD Kode Promo & Diskon Event
  * CRUD Data Member / Pelanggan
  * Profil Lokasi Coworking Space

### B. Akun Pelanggan / Member
* **Username**: `anton`
* **Password**: `password123`
* **Hak Akses**:
  * Katalog Ruangan Milik Pengelola
  * Reservasi Ruangan dengan Live Availability Check & Promo Aktif
  * Status Pemesanan & Pembatalan Pesanan
  * Histori Pemesanan Bulanan
  * E-Ticket Digital dengan QR Code Resmi

---

## 5. PEMETAAN FITUR & IMPLEMENTASI 50 ENDPOINT API

| No | Endpoint API | Method | Fitur pada Aplikasi | Halaman / Komponen |
| :---: | :--- | :---: | :--- | :--- |
| **8** | `/api/auth/register/member` | POST | Pendaftaran akun member baru lengkap | `app/Auth/register/page.tsx` |
| **9** | `/api/auth/register/admin-space` | POST | Pendaftaran pengelola & coworking | `app/Auth/registeradmin/page.tsx` |
| **10** | `/api/auth/login` | POST | Login multi-role (Member & Admin) | `app/Auth/login/page.tsx` |
| **11** | `/api/auth/profile` | GET | Validasi hak akses & session profil | `context/authcontext.tsx` |
| **12** | `/api/spaces/types` | GET | Sinkronisasi daftar kategori ruangan | `app/member/spaces/page.tsx` |
| **13** | `/api/spaces/availability` | GET | Cek ketersediaan jadwal bentrok real-time | `app/member/spaces/[id]/page.tsx` |
| **14** | `/api/spaces` | GET | Katalog ruangan publik (?tipe & ?search) | `app/member/spaces/page.tsx` |
| **15** | `/api/spaces/{id}` | GET | Detail spesifikasi & fasilitas ruangan | `app/member/spaces/[id]/page.tsx` |
| **16** | `/api/diskon/active` | GET | Daftar promo aktif untuk quick selector | `app/member/spaces/[id]/page.tsx` |
| **17** | `/api/diskon/check` | POST | Validasi kode voucher & diskon | `app/member/spaces/[id]/page.tsx` |
| **19** | `/api/reservasi` | POST | Pembuatan transaksi booking baru | `app/member/spaces/[id]/page.tsx` |
| **20** | `/api/reservasi/my` | GET | Monitoring status pemesanan member | `app/member/reservasi/page.tsx` |
| **21** | `/api/reservasi/my/history` | GET | Histori bulanan (?month & ?year) | `app/member/histori/page.tsx` |
| **22** | `/api/reservasi/{id}/e-ticket` | GET | Penerbitan tiket digital & QR Code | `app/member/reservasi/[id]/page.tsx` |
| **24** | `/api/reservasi/{id}/cancel` | PATCH | Pembatalan pesanan mandiri oleh member | `app/member/reservasi/page.tsx` |
| **25** | `/api/admin/profile` | GET | Lihat profil lokasi coworking admin | `app/admin/profile/page.tsx` |
| **26** | `/api/admin/profile` | PUT | Perbarui profil coworking space | `app/admin/profile/page.tsx` |
| **27** | `/api/admin/members` | GET | Daftar seluruh member pelanggan (?search) | `app/admin/members/page.tsx` |
| **28** | `/api/admin/members` | POST | Tambah data member baru oleh admin | `app/admin/members/page.tsx` |
| **29** | `/api/admin/members/{id}` | GET | Detail data member pelanggan | `app/admin/members/page.tsx` |
| **30** | `/api/admin/members/{id}` | PUT | Edit informasi member pelanggan | `app/admin/members/page.tsx` |
| **31** | `/api/admin/members/{id}` | DELETE | Hapus data member pelanggan | `app/admin/members/page.tsx` |
| **32** | `/api/admin/spaces` | GET | Daftar seluruh ruangan milik admin | `app/admin/spaces/page.tsx` |
| **33** | `/api/admin/spaces` | POST | Tambah ruangan baru (+ fasilitas & foto) | `app/admin/spaces/page.tsx` |
| **34** | `/api/admin/spaces/{id}` | GET | Detail ruangan & fasilitas | `app/admin/spaces/page.tsx` |
| **35** | `/api/admin/spaces/{id}` | PUT | Perbarui spesifikasi ruangan & harga | `app/admin/spaces/page.tsx` |
| **36** | `/api/admin/spaces/{id}` | DELETE | Hapus ruangan dari sistem | `app/admin/spaces/page.tsx` |
| **37** | `/api/admin/diskon` | GET | Daftar semua promo diskon event | `app/admin/diskon/page.tsx` |
| **38** | `/api/admin/diskon` | POST | Buat kode promo & periode baru | `app/admin/diskon/page.tsx` |
| **39** | `/api/admin/diskon/{id}` | GET | Detail kode promo diskon | `app/admin/diskon/page.tsx` |
| **40** | `/api/admin/diskon/{id}` | PUT | Perbarui besaran diskon & masa berlaku | `app/admin/diskon/page.tsx` |
| **41** | `/api/admin/diskon/{id}` | DELETE | Hapus kode promo diskon | `app/admin/diskon/page.tsx` |
| **42** | `/api/admin/reservasi` | GET | Filter reservasi (bulan, tahun, status, q) | `app/admin/reservasi/page.tsx` |
| **43** | `/api/admin/reservasi/{id}/status` | PATCH | Konfirmasi / batalkan pesanan tamu | `app/admin/reservasi/page.tsx` |
| **44** | `/api/admin/reservasi/{id}/check-in` | POST | Check-in tamu di lokasi (status: aktif) | `app/admin/reservasi/page.tsx` |
| **45** | `/api/admin/reservasi/{id}/check-out` | POST | Check-out tamu di lokasi (status: selesai) | `app/admin/reservasi/page.tsx` |
| **46** | `/api/admin/reports/monthly` | GET | Rekapitulasi pendapatan & distribusi space | `app/admin/dashboard/page.tsx` |
| **48-50**| `/api/upload/*` | POST | Upload foto ruangan dan avatar member | Komponen upload media |

---

## 6. KESESUAIAN DENGAN WIREFRAME SOAL (HALAMAN 42)

1. **A.1 Register Akun**: Form register dengan preview foto profil & password toggle.
2. **A.2 Login Akun**: Layar autentikasi bersih dengan link register member/pengelola.
3. **A.3 Ketersediaan Space**: Kartu ruangan, filter kategori, badge harga per jam.
4. **A.4 Pesan Space**: Pemilihan tanggal, jam, durasi, live availability check, dan pilihan diskon promo.
5. **A.5 Status Pemesanan**: Kartu reservasi lengkap dengan badge status dan tombol E-Ticket / Batalkan.
6. **A.6 Histori Pemesanan**: Filter bulan/tahun dan total riwayat pengeluaran.
7. **A.7 E-Ticket**: Tiket digital dengan QR Code SVG resmi, rincian biaya, dan tombol cetak/unduh nota.
8. **B.1 - B.2 Register & Login Admin**: Pendaftaran mitra pengelola dan login terpisah.
9. **B.3 Profil Lokasi**: Formulir profil tempat coworking dan penanggung jawab.
10. **B.4 Data Member**: Manajemen CRUD pelanggan dengan avatar dan pencarian.
11. **B.5 Data Diskon**: Manajemen CRUD kode promo dan periode berlakunya.
12. **B.6 - B.8 Kelola Reservasi**: Filter lengkap dan aksi operasional check-in/check-out.
13. **B.9 Rekapitulasi Pendapatan**: Kartu total transaksi, pendapatan bersih, grafik tren pendapatan harian, dan distribusi per jenis space.

---
*Dibuat untuk kelengkapan Ujian Kompetensi Keahlian (UKK) Rekayasa Perangkat Lunak 2026/2027.*
