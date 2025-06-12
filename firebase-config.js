// firebase-config.js
// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyArh4UTIxL3OItvkDB81Yji9rUdCWfXjao",
  authDomain: "haru-notes-app.firebaseapp.com",
  projectId: "haru-notes-app",
  storageBucket: "haru-notes-app.firebasestorage.app",
  messagingSenderId: "229174022392",
  appId: "1:229174022392:web:a971acc7a6a65930e8eb0d",
  databaseURL: "https://haru-notes-app-default-rtdb.firebaseio.com"
};

// Inisialisasi Firebase hanya sekali
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Deklarasikan dan ekspor instance auth dan database
const auth = firebase.auth();
const database = firebase.database();

// Sekarang, 'auth' dan 'database' akan tersedia secara global
// untuk file script lainnya yang dimuat setelah ini.
// Tidak perlu 'window.auth = auth;' karena defer script akan membuatnya global
// jika tidak ada modul, atau bisa pakai export/import jika sudah pakai modul.
// Untuk saat ini, asumsikan mereka global karena defer.