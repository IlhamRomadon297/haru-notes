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
const noteContentEditor = document.getElementById('note-content-editor'); // <--- BERUBAH: DARI noteContentInput MENJADI noteContentEditor
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
                content: notesData[key].content, // Konten sekarang bisa berisi HTML dari editor
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

            // Menampilkan konten HTML dari editor
            // Gunakan innerHTML untuk merender HTML dari note.content
            // Untuk membatasi tampilan dan ellipsis, kita akan menggunakan textContent untuk preview dan CSS
            // Ini akan menghilangkan formatting di preview card, tapi memastikan tidak memanjang.
            // Jika ingin visual formatting di preview card, akan lebih kompleks (sanitasi HTML)
            const previewContent = document.createElement('div');
            previewContent.innerHTML = note.content;
            previewContent.classList.add('note-card-content');
            
            // Batasi tampilan konten di card agar tidak memanjang
            // Kita akan menggunakan textContent untuk membuang HTML saat memotong teks,
            // lalu apply CSS ellipsis. Ini akan membuat tampilan preview tetap rapi.
            const plainTextContent = previewContent.textContent || previewContent.innerText;
            const maxPreviewLength = 200; // Contoh: potong setelah 200 karakter
            let displayContent = plainTextContent;
            if (plainTextContent.length > maxPreviewLength) {
                displayContent = plainTextContent.substring(0, maxPreviewLength) + '...';
            }

            noteCard.innerHTML = `
                <h2 class="note-card-title">${note.title}</h2>
                <p class="note-card-content">${displayContent}</p>
                <p class="note-last-edited">${lastEditedText}</p>
            `;
            
            noteCard.addEventListener('click', () => openModal(note));
            notesContainer.appendChild(noteCard);
        });
    }
};

const openModal = (note = null) => {
    noteForm.reset();
    // Mengatur HTML dari editor, bukan value
    noteContentEditor.innerHTML = ''; // Kosongkan editor saat membuka modal baru
    if (note) {
        noteIdInput.value = note.id;
        noteTitleInput.value = note.title;
        noteContentEditor.innerHTML = note.content; // <--- Mengatur HTML konten
        deleteNoteBtn.classList.remove('hidden');
    } else {
        noteIdInput.value = '';
        deleteNoteBtn.classList.add('hidden'); 
    }
    // Periksa placeholder
    updatePlaceholder();
    modalContainer.classList.remove('hidden');
};

const closeModal = () => {
    modalContainer.classList.add('hidden');
};

// Fungsi untuk mengelola placeholder
function updatePlaceholder() {
    if (noteContentEditor.innerHTML.trim() === '') {
        noteContentEditor.classList.remove('has-content');
    } else {
        noteContentEditor.classList.add('has-content');
    }
}

// Panggil updatePlaceholder setiap kali konten editor berubah
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
    const content = noteContentEditor.innerHTML.trim(); // <--- Mengambil HTML dari editor

    // Periksa apakah konten editor kosong (setelah trim dan tanpa tag HTML)
    const plainTextContent = noteContentEditor.textContent.trim();
    if (!title || !plainTextContent) { // Periksa plainTextContent untuk validasi kosong
        alert('Judul dan Isi Catatan tidak boleh kosong!');
        return;
    }

    const noteData = { 
        title, 
        content, // Simpan konten sebagai HTML
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
            window.location.href = 'index.html'; 
        } catch (error) {
            console.error("Logout Error:", error);
            alert('Gagal logout: ' + error.message);
        }
    });
}

// --- START Text Styling Functions (Menggunakan execCommand) ---

boldBtn.addEventListener('click', () => {
    document.execCommand('bold', false, null);
    noteContentEditor.focus(); // Pastikan fokus kembali ke editor
    updatePlaceholder();
});

italicBtn.addEventListener('click', () => {
    document.execCommand('italic', false, null);
    noteContentEditor.focus(); // Pastikan fokus kembali ke editor
    updatePlaceholder();
});

uppercaseBtn.addEventListener('click', () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();

        if (selectedText) {
            const span = document.createElement('span');
            span.textContent = selectedText.toUpperCase();
            range.deleteContents();
            range.insertNode(span);

            // Reselect the new text to make it easy to apply other styles
            const newRange = document.createRange();
            newRange.selectNode(span);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    }
    noteContentEditor.focus(); // Pastikan fokus kembali ke editor
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