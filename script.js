// script.js

const appWrapper = document.getElementById('app-wrapper');
const notesContainer = document.getElementById('notes-container');
const addNoteBtn = document.getElementById('add-note-btn');
const fabAddNoteBtn = document.getElementById('fab-add-note');
const composeBar = document.getElementById('compose-bar');
const modalContainer = document.getElementById('modal-container');
const closeModalBtn = document.querySelector('.close-modal-btn');
const closeNoteBtn = document.getElementById('close-note-btn');
const noteForm = document.getElementById('note-form');
const noteIdInput = document.getElementById('note-id');
const noteTitleInput = document.getElementById('note-title');
const noteContentEditor = document.getElementById('note-content-editor');
const deleteNoteBtn = document.getElementById('delete-note-btn');
const noNotesMessage = document.getElementById('no-notes-message');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email-display');
const mainHeader = document.querySelector('.main-header');
const autosaveStatus = document.getElementById('autosave-status');

const boldBtn = document.getElementById('bold-btn');
const italicBtn = document.getElementById('italic-btn');
const uppercaseBtn = document.getElementById('uppercase-btn');

let currentUserId = null;
let notesRef = null;
let notesListener = null;

const AUTO_SAVE_DELAY_MS = 900;
let autoSaveTimeout = null;
let isAutoSaving = false;
let lastSavedSnapshot = { title: '', content: '' };
let isModalOpen = false;

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

const getPlainTextFromHtml = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return {
        plainText: doc.body.textContent.trim(),
        hasImage: !!doc.body.querySelector('img')
    };
};

const getNoteSnapshot = () => ({
    title: noteTitleInput.value.trim(),
    content: noteContentEditor.innerHTML.trim()
});

const snapshotsEqual = (a, b) => a.title === b.title && a.content === b.content;

const isNoteValid = (snapshot) => {
    const { plainText, hasImage } = getPlainTextFromHtml(snapshot.content);
    return snapshot.title.length > 0 && (plainText.length > 0 || hasImage);
};

const setAutosaveStatus = (state, message = '') => {
    if (!autosaveStatus) return;
    autosaveStatus.className = 'autosave-status';
    const labels = {
        idle: '',
        pending: 'Perubahan belum disimpan',
        saving: 'Menyimpan...',
        saved: 'Tersimpan',
        error: message || 'Gagal menyimpan'
    };
    const text = labels[state] ?? '';
    autosaveStatus.textContent = text;
    if (state && state !== 'idle') {
        autosaveStatus.classList.add(`autosave-${state}`);
    }
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

            const noteContentElement = document.createElement('div');
            noteContentElement.classList.add('note-card-content');
            noteContentElement.innerHTML = note.content;

            noteCard.innerHTML = `
                <h2 class="note-card-title">${note.title}</h2>
                <p class="note-last-edited">${lastEditedText}</p>
            `;
            noteCard.insertBefore(noteContentElement, noteCard.querySelector('.note-last-edited'));

            noteCard.addEventListener('click', () => openModal(note));
            notesContainer.appendChild(noteCard);
        });
    }
};

const resetAutoSaveState = () => {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = null;
    lastSavedSnapshot = { title: '', content: '' };
    setAutosaveStatus('idle');
};

const openModal = (note = null) => {
    noteForm.reset();
    noteContentEditor.innerHTML = '';
    resetAutoSaveState();

    if (note) {
        noteIdInput.value = note.id;
        noteTitleInput.value = note.title;
        noteContentEditor.innerHTML = note.content;
        deleteNoteBtn.classList.remove('hidden');
        lastSavedSnapshot = {
            title: note.title,
            content: note.content
        };
        setAutosaveStatus('saved');
    } else {
        noteIdInput.value = '';
        deleteNoteBtn.classList.add('hidden');
    }

    updatePlaceholder();
    isModalOpen = true;
    document.body.classList.add('modal-open');
    modalContainer.classList.remove('hidden');
    noteTitleInput.focus();
};

const closeModal = async () => {
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = null;
        await performAutoSave(true);
    }

    isModalOpen = false;
    document.body.classList.remove('modal-open');
    modalContainer.classList.add('hidden');
    resetAutoSaveState();
};

const performAutoSave = async (silent = false) => {
    if (!isModalOpen || !currentUserId || isAutoSaving) {
        return false;
    }

    const snapshot = getNoteSnapshot();

    if (!isNoteValid(snapshot)) {
        if (!silent) {
            setAutosaveStatus('pending');
        }
        return false;
    }

    if (snapshotsEqual(snapshot, lastSavedSnapshot)) {
        if (!silent) setAutosaveStatus('saved');
        return true;
    }

    isAutoSaving = true;
    setAutosaveStatus('saving');

    const noteData = {
        title: snapshot.title,
        content: snapshot.content,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        const id = noteIdInput.value;

        if (id) {
            await database.ref('notes/' + currentUserId).child(id).update(noteData);
        } else {
            const newRef = database.ref('notes/' + currentUserId).push();
            await newRef.set(noteData);
            noteIdInput.value = newRef.key;
            deleteNoteBtn.classList.remove('hidden');
        }

        lastSavedSnapshot = { ...snapshot };
        setAutosaveStatus('saved');
        return true;
    } catch (error) {
        console.error('Error auto-save catatan:', error);
        setAutosaveStatus('error', 'Gagal menyimpan');
        return false;
    } finally {
        isAutoSaving = false;
    }
};

const scheduleAutoSave = () => {
    if (!isModalOpen) return;

    const snapshot = getNoteSnapshot();

    if (!isNoteValid(snapshot)) {
        setAutosaveStatus('pending');
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = null;
        return;
    }

    if (snapshotsEqual(snapshot, lastSavedSnapshot)) {
        setAutosaveStatus('saved');
        return;
    }

    setAutosaveStatus('pending');
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        performAutoSave();
    }, AUTO_SAVE_DELAY_MS);
};

function updatePlaceholder() {
    const { plainText, hasImage } = getPlainTextFromHtml(noteContentEditor.innerHTML);

    if (plainText === '' && !hasImage) {
        noteContentEditor.classList.remove('has-content');
    } else {
        noteContentEditor.classList.add('has-content');
    }
}

noteContentEditor.addEventListener('input', () => {
    updatePlaceholder();
    scheduleAutoSave();
});

noteTitleInput.addEventListener('input', scheduleAutoSave);

const handleOpenNewNote = () => openModal();

if (addNoteBtn) addNoteBtn.addEventListener('click', handleOpenNewNote);
if (fabAddNoteBtn) fabAddNoteBtn.addEventListener('click', handleOpenNewNote);
if (composeBar) composeBar.addEventListener('click', handleOpenNewNote);

if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeModal());
if (closeNoteBtn) closeNoteBtn.addEventListener('click', () => closeModal());

modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
        closeModal();
    }
});

noteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    closeModal();
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
        console.log('Catatan berhasil dihapus!');
        isModalOpen = false;
        document.body.classList.remove('modal-open');
        modalContainer.classList.add('hidden');
        resetAutoSaveState();
    } catch (error) {
        console.error('Error menghapus catatan:', error);
        alert('Gagal menghapus catatan: ' + error.message);
    }
});

if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            if (notesRef && notesListener) {
                notesRef.off('value', notesListener);
                notesListener = null;
                console.log('Firebase listener dimatikan.');
            }
            await auth.signOut();
            console.log('Pengguna berhasil logout.');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout Error:', error);
            alert('Gagal logout: ' + error.message);
        }
    });
}

boldBtn.addEventListener('click', (event) => {
    event.preventDefault();
    document.execCommand('bold', false, null);
    noteContentEditor.focus();
    updatePlaceholder();
    scheduleAutoSave();
});

italicBtn.addEventListener('click', (event) => {
    event.preventDefault();
    document.execCommand('italic', false, null);
    noteContentEditor.focus();
    updatePlaceholder();
    scheduleAutoSave();
});

uppercaseBtn.addEventListener('click', (event) => {
    event.preventDefault();
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();

        if (selectedText) {
            const span = document.createElement('span');
            span.style.textTransform = 'uppercase';
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
    scheduleAutoSave();
});

auth.onAuthStateChanged((user) => {
    const currentPath = window.location.pathname;
    const isNotesPage = currentPath.endsWith('/notes.html') || currentPath.endsWith('/haru-notes/notes.html');

    if (isNotesPage) {
        if (user) {
            console.log('script.js: Pengguna login di halaman notes:', user.email, 'UID:', user.uid);
            currentUserId = user.uid;

            if (userEmailDisplay) {
                userEmailDisplay.textContent = user.email;
            }

            requestAnimationFrame(() => {
                if (appWrapper) appWrapper.style.display = 'block';
                if (mainHeader) mainHeader.style.display = 'flex';
            });

            notesRef = database.ref('notes/' + currentUserId);

            if (!notesListener) {
                notesListener = notesRef.on('value', (snapshot) => {
                    const notesData = snapshot.val();
                    renderNotes(notesData);
                }, (error) => {
                    console.error('script.js: Error fetching notes:', error);
                });
            }
        } else {
            console.log('script.js: Pengguna belum login di halaman notes. Mengalihkan ke halaman login.');
            currentUserId = null;

            if (notesRef && notesListener) {
                notesRef.off('value', notesListener);
                notesListener = null;
            }

            requestAnimationFrame(() => {
                if (appWrapper) appWrapper.style.display = 'none';
                if (mainHeader) mainHeader.style.display = 'none';
            });

            window.location.href = 'index.html';
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
    if (mainHeader && window.innerWidth <= 768) {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop === 0) {
            mainHeader.classList.remove('header-hidden');
            lastScrollTop = scrollTop;
            return;
        }

        if (scrollTop > lastScrollTop && scrollTop > mainHeader.offsetHeight) {
            mainHeader.classList.add('header-hidden');
        } else if (scrollTop < lastScrollTop) {
            mainHeader.classList.remove('header-hidden');
        }
        lastScrollTop = scrollTop;
    } else if (mainHeader) {
        mainHeader.classList.remove('header-hidden');
    }
});
