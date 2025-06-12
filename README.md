# Haru Notes 🌸

<p align="center">
  <img src="https://i.imgur.com/your-logo-or-screenshot.png" alt="Haru Notes Banner" width="600"/>
</p>

<p align="center">
  Sebuah aplikasi web pencatatan yang simpel, minimalis, dan <i>real-time</i>. <br/>
  Terinspirasi dari "Haru" (春), musim semi di Jepang, yang melambangkan awal yang baru dan kesegaran.
</p>

<p align="center">
  <a href="https://<username-anda>.github.io/haru-notes/"><strong>Lihat Live Demo »</strong></a>
</p>

---

## Tentang Proyek

**Haru Notes** adalah proyek web app sederhana yang memungkinkan pengguna untuk membuat, mengedit, dan menghapus catatan dengan cepat. Awalnya dibangun sebagai aplikasi statis dengan penyimpanan data di `LocalStorage` browser, proyek ini kemudian berevolusi menjadi aplikasi web *full-stack* dengan menggunakan **Firebase Firestore** sebagai database, memungkinkan **sinkronisasi data secara real-time** antar perangkat.

Seluruh proses pembuatan, mulai dari konsep, desain, hingga penulisan kode, dibantu secara ekstensif oleh AI (Gemini) sebagai bagian dari eksperimen alur kerja pengembangan modern.

## Fitur Utama

* ✍️ **CRUD Penuh:** Buat (Create), Baca (Read), Update (Edit), dan Hapus (Delete) catatan dengan antarmuka yang intuitif.
* ⚡ **Sinkronisasi Real-Time:** Perubahan yang dibuat di satu perangkat akan langsung terlihat di perangkat lain yang membuka aplikasi, berkat kekuatan Firebase Firestore.
* 🎨 **Desain Minimalis:** Tampilan yang bersih dan fokus pada konten, tanpa distraksi.
* 📱 **Responsif:** Dapat digunakan dengan nyaman di desktop maupun perangkat mobile.
* ☁️ **Penyimpanan di Cloud:** Semua catatan Anda aman tersimpan di database Firestore.

## Teknologi yang Digunakan

* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Backend & Database:** Google Firebase (Firestore)
* **Deployment:** GitHub Pages
* **Bantuan Pengembangan:** Gemini AI (untuk pembuatan kode, konsep, dan dokumentasi)

## Cara Menjalankan Lokal

Jika Anda ingin menjalankan proyek ini di mesin lokal Anda, ikuti langkah-langkah berikut:

1.  **Clone repositori ini:**
    ```sh
    git clone [https://github.com/](https://github.com/)<username-anda>/haru-notes.git
    ```
    2.  **Buka folder proyek:**
    ```sh
    cd haru-notes
    ```

3.  **Konfigurasi Firebase:**
    Proyek ini memerlukan kredensial Firebase untuk terhubung ke database.
    * Buka file `script.js`.
    * Cari bagian `const firebaseConfig = { ... };`.
    * Ganti dengan konfigurasi Firebase dari proyek Anda sendiri. Jika Anda belum punya, Anda bisa membuatnya secara gratis di [Firebase Console](https://firebase.google.com).

4.  **Buka di Browser:**
    * Cukup buka file `index.html` langsung di browser favorit Anda.

## Proses Pembuatan

Proyek ini adalah studi kasus tentang bagaimana sebuah ide dapat diwujudkan dengan cepat menggunakan alat modern:
1.  **Versi 1 (Lokal):** Aplikasi dibangun hanya dengan HTML, CSS, dan JS. Data disimpan di `LocalStorage`, membatasi penggunaan hanya pada satu browser.
2.  **Versi 2 (Cloud & Real-Time):** Aplikasi dimigrasi untuk menggunakan Firebase Firestore. Ini mengubahnya dari aplikasi statis menjadi aplikasi dinamis dengan kemampuan sinkronisasi data antar perangkat.

## Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT. Lihat file `LICENSE` untuk detail lebih lanjut.

---