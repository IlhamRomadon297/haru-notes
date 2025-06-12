// firebase-config.js (Pastikan ini adalah yang pertama)
// Pastikan variabel 'firebase' global sudah tersedia setelah SDK dimuat di HTML

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyArh4UTIxL3OItvkDB81Yji9rUdCWfXjao",
  authDomain: "haru-notes-app.firebaseapp.com",
  projectId: "haru-notes-app",
  storageBucket: "haru-notes-app.firebasestorage.app",
  messagingSenderId: "229174022392",
  appId: "1:229174022392:web:a971acc7a6a65930e8eb0d",
};

// Inisialisasi Firebase (hanya sekali)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase App initialized from firebase-config.js'); 
} else {
    console.log('Firebase App already initialized.');
}

// Dapatkan referensi untuk layanan yang akan digunakan
const auth = firebase.auth();
const database = firebase.database();

// console.log untuk debugging
console.log('auth object defined:', !!auth);
console.log('database object defined:', !!database);

// auth.js (Pastikan ini dimuat SETELAH firebase-config.js)

// Pastikan elemen-elemen login sudah ada
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const registerButton = document.getElementById('register-button');
const messageDiv = document.getElementById('login-message'); // Menambahkan elemen pesan

// Fungsi untuk menampilkan pesan
function showMessage(msg, type) {
    if (messageDiv) {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000); // Pesan hilang setelah 5 detik
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
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
}

if (registerButton) {
    registerButton.addEventListener('click', async () => {
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
            // Setelah mendaftar, mungkin langsung login atau biarkan pengguna login manual
            // window.location.href = 'notes.html'; // Opsional: langsung login setelah register
        } catch (error) {
            console.error('Pendaftaran gagal:', error);
            showMessage(`Pendaftaran gagal: ${error.message}`, 'error');
        }
    });
}

// Listener untuk mendeteksi perubahan status autentikasi
// Ini akan berjalan di kedua halaman (index.html dan notes.html)
auth.onAuthStateChanged((user) => {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('/haru-notes/') || currentPath.endsWith('/haru-notes/index.html');
    const isNotesPage = currentPath.endsWith('/notes.html') || currentPath.endsWith('/haru-notes/notes.html');

    if (user) {
        console.log('auth.js: Pengguna terdeteksi login:', user.email);
        if (isLoginPage) {
            // Jika pengguna login dan berada di halaman login, redirect ke notes.html
            console.log('auth.js: Redirecting to notes.html because user is logged in.');
            window.location.href = 'notes.html';
        }
    } else {
        console.log('auth.js: Pengguna tidak terdeteksi login.');
        if (isNotesPage) {
            // Jika pengguna tidak login dan berada di halaman notes.html, redirect ke index.html
            console.log('auth.js: Redirecting to index.html because user is not logged in.');
            window.location.href = 'index.html';
        }
    }
});