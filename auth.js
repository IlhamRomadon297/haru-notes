// auth.js
// Ini adalah satu-satunya file yang berisi konfigurasi Firebase dan inisialisasi
// Pastikan variabel 'firebase' global sudah tersedia setelah SDK dimuat di HTML

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyArh4UTIxL3OItvkDB81Yji9rUdCWfXjao",
  authDomain: "haru-notes-app.firebaseapp.com",
  databaseURL: "https://haru-notes-app-default-rtdb.firebaseio.com/", // Ganti dengan Database URL Anda
  projectId: "haru-notes-app",
  storageBucket: "haru-notes-app.firebasestorage.app",
  messagingSenderId: "229174022392",
  appId: "1:229174022392:web:a971acc7a6a65930e8eb0d",
};

// Inisialisasi Firebase (hanya sekali)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase App initialized from auth.js'); 
} else {
    console.log('Firebase App already initialized. From auth.js');
}

// Dapatkan referensi untuk layanan yang akan digunakan
const auth = firebase.auth();
const database = firebase.database();

// console.log untuk debugging
console.log('auth object defined from auth.js:', !!auth);
console.log('database object defined from auth.js:', !!database);

// Dapatkan referensi ke elemen login (ini mungkin null jika di notes.html)
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const registerButton = document.getElementById('register-button');
const messageDiv = document.getElementById('login-message'); 

// Fungsi untuk menampilkan pesan (bisa digunakan di kedua halaman jika elemennya ada)
function showMessage(msg, type) {
    if (messageDiv) { // Pastikan messageDiv ada sebelum mencoba menggunakannya
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000); 
    } else {
        // Fallback jika messageDiv tidak ada (misalnya di notes.html)
        console.log(`Pesan: ${msg} (tipe: ${type})`);
        // Anda bisa menambahkan alert di sini untuk debugging, tapi biasanya tidak diinginkan di produksi
        // alert(msg);
    }
}


// --- BAGIAN INI HANYA AKAN DIEKSEKUSI JIKA ELEMEN LOGIN FORM ADA DI HALAMAN ---
if (loginForm) {
    console.log('auth.js: loginForm ditemukan. Menyiapkan event listeners.');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Pastikan emailInput dan passwordInput ada sebelum mengakses .value
        if (!emailInput || !passwordInput) {
            console.error('Email atau Password input tidak ditemukan.');
            showMessage('Error: Form input tidak lengkap.', 'error');
            return;
        }
        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            console.log('Login berhasil:', email);
            showMessage('Login berhasil!', 'success');
            // Redirect ke halaman notes setelah login berhasil
            window.location.href = 'notes.html';
        } catch (error) {
            console.error('Login gagal:', error);
            showMessage(`Login gagal: ${error.message}`, 'error');
        }
    });

    if (registerButton) { // Pastikan registerButton ada
        registerButton.addEventListener('click', async () => {
            // Pastikan emailInput dan passwordInput ada sebelum mengakses .value
            if (!emailInput || !passwordInput) {
                console.error('Email atau Password input tidak ditemukan untuk pendaftaran.');
                showMessage('Error: Form input tidak lengkap untuk pendaftaran.', 'error');
                return;
            }
            const email = emailInput.value;
            const password = passwordInput.value;

            if (!email || !password) {
                showMessage('Email dan kata sandi tidak boleh kosong.', 'error');
                return;
            }

            try {
                await auth.createUserWithEmailAndPassword(email, password);
                console.log('Pendaftaran berhasil:', email);
                showMessage('Pendaftaran berhasil! Silakan login.', 'success');
            } catch (error) {
                console.error('Pendaftaran gagal:', error);
                showMessage(`Pendaftaran gagal: ${error.message}`, 'error');
            }
        });
    }

} else {
    console.log('auth.js: loginForm tidak ditemukan di halaman ini. Melewati inisialisasi form.');
}
// --- AKHIR BAGIAN SPESIFIK UNTUK HALAMAN LOGIN ---


// Listener untuk mendeteksi perubahan status autentikasi
// Ini akan berjalan di kedua halaman (index.html dan notes.html)
// Karena auth.onAuthStateChanged adalah bagian dari Firebase SDK,
// ia akan berjalan terlepas dari keberadaan elemen DOM login.
auth.onAuthStateChanged((user) => {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('/haru-notes/') || currentPath.endsWith('/haru-notes/index.html');
    const isNotesPage = currentPath.endsWith('/notes.html') || currentPath.endsWith('/haru-notes/notes.html');

    if (user) {
        console.log('auth.js (onAuthStateChanged): Pengguna terdeteksi login:', user.email);
        if (isLoginPage) {
            console.log('auth.js (onAuthStateChanged): Redirecting from login page to notes.html.');
            window.location.href = 'notes.html';
        }
    } else {
        console.log('auth.js (onAuthStateChanged): Pengguna tidak terdeteksi login.');
        if (isNotesPage) {
            console.log('auth.js (onAuthStateChanged): Redirecting from notes page to index.html.');
            window.location.href = 'index.html';
        }
    }
});