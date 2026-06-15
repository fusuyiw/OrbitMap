# OrbitMap 🌐

OrbitMap adalah aplikasi berbasis web Geospatial (WebGIS) yang dirancang untuk kebutuhan visualisasi, pengelolaan, dan analisis data spasial modern. Platform ini menyediakan antarmuka interaktif yang ringan namun kuat untuk merender aset digital seperti 3D Digital Twin, Model Elevasi (DEM/DTM), hingga visualisasi Point Cloud hasil akuisisi data udara (LiDAR/Fotogrametri).

---

## 🚀 Fitur Utama

- **About / Dashboard**: Halaman beranda utama yang memberikan pengantar mengenai platform dan kapabilitas pemetaan proyek.
- **Digital Twin Visualizer**: Modul interaktif untuk menampilkan replika digital objek atau wilayah bumi secara 3D dan realistik.
- **Elevation Model**: Fitur analisis topografi untuk menampilkan kontur tanah dan model elevasi digital.
- **Point Cloud Viewer**: Integrasi visualisasi data titik ekstrim kerapatan tinggi (LiDAR) langsung pada browser tanpa membebani client-side secara berlebihan.

---

## 🛠️ Arsitektur & Teknologi

Aplikasi ini dibangun menggunakan arsitektur web statis yang dioptimalkan untuk performa maksimal dan keamanan jalur data:

- **Frontend**: HTML5, CSS3 (Custom Layout), JavaScript.
- **Backend Routing**: Apache `.htaccess` Engine yang dikonfigurasi untuk menangani _Clean URLs_ (akses halaman tanpa ekstensi `.php` atau `.html`).
- **Environment Management**: Manajemen konfigurasi lokal menggunakan berkas `.env` secara aman.

---

## 📁 Struktur Folder

```text
OrbitMap/
├── .htaccess          # Routing engine & proteksi file keamanan server
├── .gitignore         # Daftar file/folder terisolasi (.env & data besar)
├── .env.example       # Contoh berkas konfigurasi environment aplikasi
├── README.md          # Dokumentasi proyek
├── assets/            # Aset statis (CSS, JS, Gambar, Library)
│   └── potree/        # Tempat penyimpanan data point cloud (*Diabaikan oleh Git*)
└── views/             # Folder utama untuk komponen halaman web (.php)
    ├── about.php          # Halaman utama (Beranda)
    ├── digitaltwin.php    # Halaman visualisasi Digital Twin
    ├── elevationmodel.php # Halaman analisis Elevation Model
    └── pointcloud.php     # Halaman penampil Point Cloud
```
