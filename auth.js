// auth.js
// Tidak perlu mendeklarasikan `auth` lagi di sini, cukup gunakan yang sudah ada dari firebase-config.js

auth.onAuthStateChanged((user) => {
    // Current path
    const currentPath = window.location.pathname;

    // Check if the current page is index.html
    const isLoginPage = currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('/haru-notes/');

    if (user) {
        // User is signed in.
        console.log('User logged in:', user.email);
        if (isLoginPage) {
            window.location.href = 'notes.html'; // Redirect to notes page if on login page
        }
    } else {
        // User is signed out.
        console.log('User logged out.');
        if (!isLoginPage) {
            window.location.href = 'index.html'; // Redirect to login page if not on login page
        }
    }
});