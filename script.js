// script.js
// Pastikan firebase-config.js sudah dimuat sebelum script.js
// Tidak perlu mendeklarasikan `auth` dan `database` lagi di sini, cukup gunakan yang sudah ada dari firebase-config.js

const appWrapper = document.getElementById('app-wrapper'); 
const notesContainer = document.getElementById('notes-container'); 
const addNoteBtn = document.getElementById('add-note-btn');
const modalContainer = document.getElementById('modal-container');
const closeModalBtn = document.querySelector('.close-modal-btn');
const noteForm = document.getElementById('note-form');
const noteIdInput = document.getElementById('note-id');
const noteTitleInput = document.getElementById('note-title');
const noteContentEditor = document.getElementById('note-content-editor'); 
const deleteNoteBtn = document.getElementById('delete-note-btn');
const noNotesMessage = document.getElementById('no-notes-message');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email-display'); 
const mainHeader = document.querySelector('.main-header'); 

// New DOM Elements for Styling
const boldBtn = document.getElementById('bold-btn');
const italicBtn = document.getElementById('italic-btn');
const uppercaseBtn = document.getElementById('uppercase-btn');


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

            // --- PERUBAHAN UTAMA DI SINI ---
            // Langsung masukkan HTML content ke dalam div, lalu biarkan CSS yang membatasi
            const noteContentElement = document.createElement('div');
            noteContentElement.classList.add('note-card-content');
            noteContentElement.innerHTML = note.content; // Render HTML asli dari editor

            // Karena kita merender HTML, pemotongan konten harus dilakukan secara berbeda.
            // Kita akan menggunakan -webkit-line-clamp di CSS untuk pemotongan berbasis baris.
            // Tidak perlu lagi memotong string di JS.
            // Namun, untuk memastikan HTML yang terlalu panjang tidak membuat card terlalu tinggi
            // dan tetap menampilkan ellipsis, kita perlu memastikan CSS bekerja dengan baik.

            noteCard.innerHTML = `
                <h2 class="note-card-title">${note.title}</h2>
                <p class="note-last-edited">${lastEditedText}</p>
            `;
            // Masukkan elemen konten setelah judul
            noteCard.insertBefore(noteContentElement, noteCard.querySelector('.note-last-edited'));
            // --- AKHIR PERUBAHAN UTAMA ---
            
            noteCard.addEventListener('click', () => openModal(note));
            notesContainer.appendChild(noteCard);
        });
    }
};

const openModal = (note = null) => {
    noteForm.reset();
    noteContentEditor.innerHTML = ''; 
    if (note) {
        noteIdInput.value = note.id;
        noteTitleInput.value = note.title;
        noteContentEditor.innerHTML = note.content; 
        deleteNoteBtn.classList.remove('hidden');
    } else {
        noteIdInput.value = '';
        deleteNoteBtn.classList.add('hidden'); 
    }
    updatePlaceholder();
    noteContentEditor.focus(); 
    modalContainer.classList.remove('hidden');
};

const closeModal = () => {
    modalContainer.classList.add('hidden');
};

function updatePlaceholder() {
    // Memastikan placeholder berfungsi jika hanya ada tag HTML kosong atau spasi
    const contentCheckDiv = document.createElement('div');
    contentCheckDiv.innerHTML = noteContentEditor.innerHTML;
    // Mengambil plain text dan menghapus spasi
    const plainText = contentCheckDiv.textContent.trim(); 

    if (plainText === '' && noteContentEditor.innerHTML.indexOf('<img') === -1) { 
        // Cek jika plain text kosong dan tidak ada gambar (jika ada gambar yang mungkin disisipkan)
        noteContentEditor.classList.remove('has-content');
    } else {
        noteContentEditor.classList.add('has-content');
    }
}


noteContentEditor.addEventListener('input', updatePlaceholder);


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
    const content = noteContentEditor.innerHTML.trim(); 

    // Validasi isi catatan juga harus memeriksa plain text content
    const plainTextContentForValidation = noteContentEditor.textContent.trim();
    if (!title || !plainTextContentForValidation) { 
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
            await database.ref('notes/' + currentUserId).child(id).update(noteData); 
            console.log("Catatan berhasil diupdate!");
        } else {
            await database.ref('notes/' + currentUserId).push(noteData); 
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
        await database.ref('notes/' + currentUserId).child(id).remove(); 
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
            window.location.href = 'index.html'; 
        } catch (error) {
            console.error("Logout Error:", error);
            alert('Gagal logout: ' + error.message);
        }
    });
}

// --- START Text Styling Functions (Menggunakan execCommand) ---

boldBtn.addEventListener('click', (event) => {
    event.preventDefault(); 
    document.execCommand('bold', false, null);
    noteContentEditor.focus(); 
    updatePlaceholder();
});

italicBtn.addEventListener('click', (event) => {
    event.preventDefault(); 
    document.execCommand('italic', false, null);
    noteContentEditor.focus(); 
    updatePlaceholder();
});

uppercaseBtn.addEventListener('click', (event) => {
    event.preventDefault(); 
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();

        if (selectedText) {
            const span = document.createElement('span');
            span.style.textTransform = 'uppercase'; // Menerapkan CSS untuk uppercase
            span.textContent = selectedText;
            
            range.deleteContents();
            range.insertNode(span);

            const newRange = document.createRange();
            newRange.selectNode(span);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    }
    noteContentEditor.focus(); 
    updatePlaceholder();
});

// --- END Text Styling Functions ---


auth.onAuthStateChanged((user) => { 
    const currentPath = window.location.pathname;
    const isNotesPage = currentPath.endsWith('/notes.html') || currentPath.endsWith('/haru-notes/notes.html'); 

    if (isNotesPage) {
        if (user) {
            console.log('Pengguna login di halaman notes:', user.email, 'UID:', user.uid);
            currentUserId = user.uid;

            if (userEmailDisplay) {
                userEmailDisplay.textContent = user.email;
            }
            
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
            console.log('Pengguna belum login di halaman notes. Mengalihkan ke halaman login.');
            currentUserId = null;
            notesRef = null;

            requestAnimationFrame(() => {
                if (appWrapper) appWrapper.style.display = 'none'; 
                if (mainHeader) mainHeader.style.display = 'none'; 
            });

            setTimeout(() => {
                window.location.href = 'index.html'; 
            }, 100);
        }
    } else {
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