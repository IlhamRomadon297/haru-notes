// script.js
// Pastikan firebase-config.js sudah dimuat sebelum script.js

const auth = firebase.auth();
const database = firebase.database(); 

const appWrapper = document.getElementById('app-wrapper'); 
const notesContainer = document.getElementById('notes-container');
const addNoteBtn = document.getElementById('add-note-btn');
const modalContainer = document.getElementById('modal-container');
const closeModalBtn = document.querySelector('.close-modal-btn');
const noteForm = document.getElementById('note-form');
const noteIdInput = document.getElementById('note-id');
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const deleteNoteBtn = document.getElementById('delete-note-btn');
const noNotesMessage = document.getElementById('no-notes-message');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email-display'); 
const mainHeader = document.querySelector('.main-header'); 

let currentUserId = null; 
let notesRef = null; 

const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Tidak diketahui';
    const date = new Date(timestamp);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    return date.toLocaleString('id-ID', options);
};

const renderNotes = (notesData) => {
    notesContainer.innerHTML = '';
    const notesArray = [];

    if (notesData) {
        Object.keys(notesData).forEach(key => {
            notesArray.push({
                id: key,
                title: notesData[key].title,
                content: notesData[key].content,
                timestamp: notesData[key].timestamp
            });
        });
        notesArray.sort((a, b) => b.timestamp - a.timestamp);
    }

    if (notesArray.length === 0) {
        noNotesMessage.classList.remove('hidden');
    } else {
        noNotesMessage.classList.add('hidden');
        notesArray.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.classList.add('note-card');
            noteCard.dataset.id = note.id;

            const lastEditedText = note.timestamp ? `Terakhir diedit: ${formatTimestamp(note.timestamp)}` : 'Tidak diketahui';

            noteCard.innerHTML = `
                <h2 class="note-card-title">${note.title}</h2>
                <p class="note-card-content">${note.content}</p>
                <p class="note-last-edited">${lastEditedText}</p>
            `;
            
            noteCard.addEventListener('click', () => openModal(note));
            notesContainer.appendChild(noteCard);
        });
    }
};

const openModal = (note = null) => {
    noteForm.reset();
    if (note) {
        noteIdInput.value = note.id;
        noteTitleInput.value = note.title;
        noteContentInput.value = note.content;
        deleteNoteBtn.classList.remove('hidden');
    } else {
        noteIdInput.value = '';
        deleteNoteBtn.classList.add('hidden'); 
    }
    modalContainer.classList.remove('hidden');
};

const closeModal = () => {
    modalContainer.classList.add('hidden');
};

addNoteBtn.addEventListener('click', () => openModal());
closeModalBtn.addEventListener('click', closeModal);

modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
        closeModal();
    }
});

noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUserId) {
        alert('Anda harus login untuk menyimpan catatan.');
        return;
    }

    const id = noteIdInput.value;
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();

    if (!title || !content) {
        alert('Judul dan Isi Catatan tidak boleh kosong!');
        return;
    }

    const noteData = { 
        title, 
        content, 
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        if (id) {
            await notesRef.child(id).update(noteData);
            console.log("Catatan berhasil diupdate!");
        } else {
            await notesRef.push(noteData);
            console.log("Catatan baru berhasil ditambahkan!");
        }
        closeModal();
    }
     catch (error) {
        console.error("Error menyimpan catatan:", error);
        alert("Gagal menyimpan catatan: " + error.message);
    }
});

deleteNoteBtn.addEventListener('click', async () => {
    const id = noteIdInput.value;
    if (!id || !confirm('Apakah Anda yakin ingin menghapus catatan ini?')) {
        return;
    }

    if (!currentUserId) {
        alert('Anda harus login untuk menghapus catatan.');
        return;
    }

    try {
        await notesRef.child(id).remove();
        console.log("Catatan berhasil dihapus!");
        closeModal();
    } catch (error) {
        console.error("Error menghapus catatan:", error);
        alert("Gagal menghapus catatan: " + error.message);
    }
});

if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            await auth.signOut();
            console.log('Pengguna berhasil logout.');
            // PENTING: Setelah logout, alihkan ke halaman login (index.html)
            window.location.href = 'index.html'; 
        } catch (error) {
            console.error("Logout Error:", error);
            alert('Gagal logout: ' + error.message);
        }
    });
}

// Listener utama untuk halaman notes.html (notes page)
auth.onAuthStateChanged((user) => {
    // Memastikan listener ini HANYA berjalan di halaman notes.html
    const currentPath = window.location.pathname;
    const isNotesPage = currentPath.endsWith('/notes.html') || currentPath.endsWith('/haru-notes/notes.html'); // Tambahkan juga path absolut jika diperlukan

    if (isNotesPage) {
        if (user) {
            // Pengguna sudah login
            console.log('Pengguna login di halaman notes:', user.email, 'UID:', user.uid);
            currentUserId = user.uid;

            if (userEmailDisplay) {
                userEmailDisplay.textContent = user.email;
            }
            
            // Tampilkan seluruh konten aplikasi Haru Notes setelah user dipastikan login
            // Gunakan requestAnimationFrame untuk memastikan DOM siap untuk perubahan display
            requestAnimationFrame(() => {
                if (appWrapper) appWrapper.style.display = 'block'; 
                if (mainHeader) mainHeader.style.display = 'flex'; 
            });

            notesRef = database.ref('notes/' + currentUserId);

            notesRef.on('value', (snapshot) => {
                const notesData = snapshot.val();
                renderNotes(notesData);
            }, (error) => {
                console.error("Error fetching notes:", error);
                alert("Gagal memuat catatan: " + error.message);
            });

        } else {
            // Pengguna belum login atau sudah logout
            console.log('Pengguna belum login di halaman notes. Mengalihkan ke halaman login.');
            currentUserId = null;
            notesRef = null;

            // Sembunyikan seluruh konten aplikasi Haru Notes
            requestAnimationFrame(() => {
                if (appWrapper) appWrapper.style.display = 'none'; 
                if (mainHeader) mainHeader.style.display = 'none'; 
            });

            // PENTING: Redirect ke halaman login (index.html)
            // Tambahkan sedikit delay untuk memastikan status Firebase Auth stabil
            setTimeout(() => {
                window.location.href = 'index.html'; 
            }, 100); // Delay 100ms
        }
    } else {
        // Jika script.js ini dijalankan di halaman lain (misalnya index.html)
        // Pastikan app-wrapper dan mainHeader tersembunyi secara default
        requestAnimationFrame(() => {
            if (appWrapper) appWrapper.style.display = 'none';
            if (mainHeader) mainHeader.style.display = 'none';
        });
    }
});


let lastScrollTop = 0;

window.addEventListener('scroll', () => {
    if (mainHeader && window.innerWidth <= 600) { 
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop === 0) {
            mainHeader.classList.remove('header-hidden');
            lastScrollTop = scrollTop;
            return;
        }

        if (scrollTop > lastScrollTop && scrollTop > mainHeader.offsetHeight) { 
            mainHeader.classList.add('header-hidden');
        } 
        else if (scrollTop < lastScrollTop) {
            mainHeader.classList.remove('header-hidden');
        }
        lastScrollTop = scrollTop;
    } else if (mainHeader) {
        mainHeader.classList.remove('header-hidden');
    }
});
