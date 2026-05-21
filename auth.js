/**
 * Firebase + autentikasi (login & redirect)
 */

const firebaseConfig = {
    apiKey: 'AIzaSyArh4UTIxL3OItvkDB81Yji9rUdCWfXjao',
    authDomain: 'haru-notes-app.firebaseapp.com',
    databaseURL: 'https://haru-notes-app-default-rtdb.firebaseio.com/',
    projectId: 'haru-notes-app',
    storageBucket: 'haru-notes-app.firebasestorage.app',
    messagingSenderId: '229174022392',
    appId: '1:229174022392:web:a971acc7a6a65930e8eb0d'
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const database = firebase.database();

const getPage = () => {
    const path = (window.location.pathname || '').toLowerCase();
    const href = (window.location.href || '').toLowerCase();
    const isNotes = path.endsWith('notes.html') || href.includes('notes.html');
    const isLogin =
        !isNotes &&
        (path.endsWith('/') ||
            path.endsWith('index.html') ||
            path.endsWith('haru-notes') ||
            path.endsWith('haru-notes/') ||
            href.endsWith('index.html') ||
            (!path.includes('.html') && !href.includes('notes.html')));
    return { isNotes, isLogin };
};

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const registerButton = document.getElementById('register-button');
const messageDiv = document.getElementById('login-message');

function showMessage(msg, type) {
    if (!messageDiv) return;
    messageDiv.textContent = msg;
    messageDiv.className = 'message ' + type;
    setTimeout(() => {
        messageDiv.className = 'message';
        messageDiv.textContent = '';
    }, 5000);
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!emailInput || !passwordInput) return;

        try {
            await auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value);
            showMessage('Login berhasil!', 'success');
            window.location.href = 'notes.html';
        } catch (error) {
            showMessage('Login gagal: ' + error.message, 'error');
        }
    });

    registerButton?.addEventListener('click', async () => {
        if (!emailInput || !passwordInput) return;
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage('Email dan kata sandi wajib diisi.', 'error');
            return;
        }

        try {
            await auth.createUserWithEmailAndPassword(email, password);
            showMessage('Daftar berhasil! Silakan masuk.', 'success');
        } catch (error) {
            showMessage('Daftar gagal: ' + error.message, 'error');
        }
    });
}

auth.onAuthStateChanged((user) => {
    const { isNotes, isLogin } = getPage();

    if (user && isLogin) {
        window.location.href = 'notes.html';
    } else if (!user && isNotes) {
        window.location.href = 'index.html';
    }
});
