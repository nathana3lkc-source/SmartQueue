# SmartQueue — Sistem Manajemen Antrean Terintegrasi
#### Sistem manajemen antrean digital terdistribusi berbasis **WebSocket** dan strategi **Offline-First** untuk layanan publik di Indonesia.
---
## Daftar Isi
- [Video Demo](#video-demo)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Cara Instalasi dan Menjalankan](#cara-instalasi-dan-menjalankan)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Perancangan Sistem](#perancangan-sistem)
- [Model Data Utama](#model-data-utama)

---
## Video Demo
Demo penggunaan SmartQueue tersedia di:  
🎬 [Google Drive — Video Demo SmartQueue](https://drive.google.com/drive/folders/19NIN1jm2WgmWCOGzU2huf2DnJeacO01C)

---
## Arsitektur Sistem

```
┌─────────────────────────────────────────────┐
│                 Client Layer                │
│   ┌──────────────────┐  ┌────────────────┐  │
│   │  Warga Client    │  │ Petugas Client │  │
│   │  HTML + Socket.io│  │ Staff Dashboard│  │
│   └────────┬─────────┘  └───────┬────────┘  │
└────────────┼────────────────────┼───────────┘
             │     WebSocket      │
┌────────────▼────────────────────▼───────────┐
│              Node.js Local Server           │
│  ┌──────────┐ ┌───────────┐ ┌───────────┐   │
│  │In-Memory │ │  Queue    │ │   Auth    │   │
│  │  DB      │ │  Manager  │ │  Manager  │   │
│  └──────────┘ └───────────┘ └───────────┘   │
│                ┌───────────┐                │
│                │   Sync    │ (async)        │
│                │  Manager  │────────────►   │
│                └───────────┘   Cloud API    │
└─────────────────────────────────────────────┘
```
- *In-Memory Storage* pada server lokal → response ultra-cepat tanpa overhead database
- WebSocket *full-duplex* → pembaruan data ke semua klien dalam hitungan milidetik
- Sinkronisasi cloud dilakukan **asinkron di background**, tidak memblokir operasional utama
- Klien menggunakan IndexedDB sebagai fallback saat koneksi ke server lokal terganggu
---

## Cara Instalasi dan Menjalankan
### Prasyarat
- **Node.js** versi 18 atau lebih baru
- **npm** (sudah termasuk dalam instalasi Node.js)
### Langkah Instalasi
```bash
# 1. Clone repository
git clone https://github.com/jecotacos/SmartQueue.git
cd SmartQueue
# 2. Install dependensi
npm install
# 3. Jalankan server
npm start
# atau: node server.js
```
### Mengakses Aplikasi
Setelah server berjalan, buka browser dan akses: http://localhost:3000

### Akun Demo
**Warga (sudah terdaftar):**
| Email | Password |
|---|---|
| jeco@binus.edu | 123 |
---
Atau daftar akun baru melalui tombol "Daftar di sini".
**Petugas (PIN per instansi):**
| PIN | Instansi |
|---|---|
| `PKJJECO1310` | Puskesmas Kebon Jeruk |
| `KKMSTAFF001` | Kelurahan Kemanggisan |
| `DDKSTAFF9901` | Dinas Dukcapil |
| `PKBSTAFF002` | Puskesmas Kebayoran Baru |
| `DJSSTAFF003` | Dukcapil Jakarta Selatan |
---
## Teknologi yang Digunakan
| Lapisan | Teknologi | Fungsi |
|---|---|---|
| Backend Runtime | Node.js | Server-side JavaScript runtime |
| HTTP Framework | Express.js v5 | Melayani file statis & routing |
| Real-Time | Socket.io v4 | Komunikasi WebSocket dua arah |
| Frontend | HTML5 + Vanilla JS | Antarmuka pengguna |
| Styling | Tailwind CSS (CDN) | Utility-first CSS framework |
| Penyimpanan Lokal | IndexedDB (browser) | Offline-First fallback storage |
| Cloud Sync Target | JSONPlaceholder API | Simulasi endpoint cloud eksternal |
| VCS | Git + GitHub | Version control & kolaborasi tim |
Seluruh dependensi bersifat **open-source dan bebas lisensi berbayar**.
---
## Perancangan Sistem
### Socket.io Events
| Event | Arah | Deskripsi |
|---|---|---|
| `connection` | Server ← Client | Klien terhubung; server mengirim `updateData` awal |
| `registerWarga` | Client → Server | Registrasi akun warga baru |
| `loginWarga` | Client → Server | Login warga dengan email + password |
| `loginPetugas` | Client → Server | Login petugas dengan PIN instansi |
| `ambilAntrean` | Client → Server | Warga mengambil nomor antrean |
| `panggilBerikutnya` | Client → Server | Petugas memanggil nomor berikutnya |
| `batalAntrean` | Client → Server | Warga membatalkan tiket aktif |
| `toggleLoket` | Client → Server | Petugas membuka/menutup loket |
| `updateData` | Server → All | Broadcast pembaruan data ke semua klien |
| `tiketDikonfirmasi` | Server → Client | Konfirmasi tiket ke warga yang mengambil antrean |
| `nomorDipanggil` | Server → All | Notifikasi nomor yang dipanggil petugas |
---
## Model Data Utama
```javascript
// instansiDatabase (in-memory, per instansi)
{
  nomorSekarang: Number,   // Nomor sedang dilayani
  totalDilayani: Number,   // Akumulasi total hari ini
  isTutup: Boolean,        // Status loket
  avgTime: Number,         // Estimasi menit per orang
  listMenunggu: [{ id: String, waktu: String }]
}
// Struktur Tiket Warga
{
  instansi: String,        // Nama instansi layanan
  idNum: Number,           // Nomor urut
  formattedId: String      // Format: "A-{number}"
}
```