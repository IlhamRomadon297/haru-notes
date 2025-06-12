// auth.js
// Pastikan firebase-config.js sudah dimuat sebelum auth.js

const auth = firebase.auth(); 

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const registerButton = document.getElementById('register-button');
const authMessage = document.getElementById('auth-message');

function showMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `message ${type}`;
    authMessage.style.display = 'block';
    setTimeout(() => {
        authMessage.style.display = 'none';
    }, 5000);
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        showMessage('Login berhasil! Mengalihkan...', 'success');
        // PENTING: Redirect ke notes.html
        // Pastikan Anda menggunakan nama file 'notes.html'
        window.location.href = 'notes.html'; 
    } catch (error) {
        let errorMessage;
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = 'Email atau kata sandi salah.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Format email tidak valid.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Akun Anda telah dinonaktifkan.';
                break;
            default:
                errorMessage = 'Login gagal: ' + error.message;
        }
        showMessage(errorMessage, 'error');
        console.error("Login Error:", error);
    }
});

registerButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        showMessage('Pendaftaran berhasil! Silakan login.', 'success');
        emailInput.value = '';
        passwordInput.value = '';
    } catch (error) {
        let errorMessage;
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Email sudah terdaftar. Coba login atau gunakan email lain.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Format email tidak valid.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Kata sandi terlalu lemah (minimal 6 karakter).';
                break;
            default:
                errorMessage = 'Pendaftaran gagal: ' + error.message;
        }
        showMessage(errorMessage, 'error');
        console.error("Register Error:", error);
    }
});

// Listener utama untuk halaman index.html (login page)
auth.onAuthStateChanged((user) => {
    // Gunakan regex untuk deteksi path yang lebih fleksibel, 
    // termasuk root project di GitHub Pages (misal: /haru-notes/ atau /haru-notes/index.html)
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('/haru-notes/'); // Sesuaikan '/haru-notes/' dengan nama repo Anda jika berbeda

    if (isLoginPage) {
        if (user) {
            // Pengguna sudah login, langsung alihkan ke notes.html
            console.log('Pengguna sudah login di halaman login, mengalihkan ke notes:', user.email);
            window.location.href = 'notes.html'; 
        } else {
            // Pengguna belum login, tetap di halaman login
            console.log('Pengguna belum login di halaman login.');
            // Tidak perlu melakukan apa-apa, biarkan UI login terlihat
        }
    }
});