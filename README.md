# 📸 SIAK SnapSpace Photobooth

**Sistem Informasi Akuntansi pada Usaha Photobooth**

SnapSpace Photobooth adalah aplikasi web yang dirancang untuk membantu proses reservasi layanan photobooth sekaligus mendukung pencatatan penerimaan kas. Aplikasi ini memiliki tampilan yang modern dan sederhana agar pelanggan dapat memilih paket, menentukan jadwal reservasi, memilih outlet, dan menentukan metode pembayaran dengan mudah.

Project ini dikembangkan sebagai implementasi sistem informasi akuntansi berbasis web untuk mendukung pengelolaan data pelanggan, penyewaan layanan photobooth, dan laporan penerimaan kas.

## ✨ Fitur Utama

### 1. Reservasi Photobooth
- Mengisi data pelanggan, seperti nama lengkap, nomor HP, email, dan alamat.
- Menampilkan pilihan paket photobooth beserta durasi dan harga.
- Memilih tanggal, jam, dan outlet reservasi.
- Memeriksa ketersediaan jadwal dan mendeteksi bentrok waktu reservasi.
- Memilih metode pembayaran QRIS atau M-Banking.

### 2. Booking Summary
- Menampilkan ringkasan paket yang dipilih.
- Menampilkan durasi, tanggal, jam, dan outlet reservasi.
- Menghitung serta menampilkan total harga secara otomatis.

### 3. Konfirmasi Booking
- Menampilkan informasi reservasi setelah proses booking berhasil.
- Menampilkan kode booking sebagai identitas reservasi.
- Menyajikan ringkasan pelanggan, paket, jadwal, metode pembayaran, dan total pembayaran.

### 4. Laporan Penerimaan Kas
- Menampilkan daftar transaksi penerimaan kas.
- Menampilkan total transaksi dan total penerimaan.
- Menyajikan rekap penerimaan berdasarkan metode pembayaran QRIS dan M-Banking.
- Menampilkan informasi pembayaran dan detail reservasi.

## 🛠️ Teknologi yang Digunakan

- **HTML5** — membangun struktur halaman web.
- **CSS3** — mengatur tampilan dan desain antarmuka.
- **JavaScript** — mengatur interaksi pengguna, reservasi, dan ringkasan booking.
- **Node.js** — menjalankan logika backend dan menyediakan API aplikasi.
- **Supabase** — menyediakan layanan database untuk penyimpanan dan pengambilan data.
- **Git & GitHub** — mengelola versi kode dan repository project.
- **GitHub Pages & Vercel** — digunakan untuk menyiapkan publikasi frontend dan backend secara terpisah.

## 📂 Struktur Project

```text
SIAK_SnapSpacePhotobooth/
├── Backend/
│   ├── api/
│   │   ├── packages.js
│   │   ├── outlets.js
│   │   ├── availability.js
│   │   ├── bookings.js
│   │   └── reports/
│   │       └── cash.js
│   ├── app.js
│   ├── database.sql
│   └── package.json
├── Frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
└── README.md
```

## 🌐 Demo Aplikasi

Website SnapSpace Photobooth dapat diakses melalui GitHub Pages:

**[Buka SnapSpace Photobooth](https://indahcahyasari111.github.io/SIAK_SnapSpacePhotobooth/)**

## ⚙️ Konfigurasi dan Pengembangan

Untuk menjalankan aplikasi secara lokal, diperlukan Node.js versi 18 atau lebih baru serta konfigurasi database Supabase yang sesuai.

1. Clone repository dari GitHub.
2. Siapkan konfigurasi URL project dan kunci Supabase sesuai kebutuhan aplikasi.
3. Siapkan backend dan database berdasarkan struktur project.
4. Jalankan backend menggunakan perintah yang tersedia pada `package.json`.
5. Pastikan frontend mengarah ke alamat API backend yang benar.

**Catatan:** Fitur reservasi, pemuatan paket, dan laporan kas memerlukan koneksi backend serta Supabase yang berfungsi dengan benar. Pemilihan metode pembayaran pada aplikasi merupakan bagian dari pencatatan reservasi dan tidak dengan sendirinya memproses transaksi pembayaran secara langsung.

## 🎯 Tujuan Project

Project ini bertujuan untuk menerapkan konsep sistem
