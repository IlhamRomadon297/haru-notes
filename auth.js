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

auth.onAuthStateChanged((user) => {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.endsWith('/haru-notes/') || currentPath.endsWith('/haru-notes'); 

    if (isLoginPage) {
        if (user) {
            console.log('Pengguna sudah login di halaman login, mengalihkan ke notes:', user.email);
            window.location.href = 'notes.html'; 
        } else {
            console.log('Pengguna belum login di halaman login.');
        }
    }
});