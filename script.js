/**
 * Haru Notes — auto-save, pin, arsip, styling teks
 */

(function () {
    'use strict';

    const AUTO_SAVE_MS = 900;

    const isNotesPage = () => {
        const path = (window.location.pathname || '').toLowerCase();
        const href = (window.location.href || '').toLowerCase();
        return path.endsWith('notes.html') || href.includes('notes.html');
    };

    if (!isNotesPage()) return;

    const $ = (id) => document.getElementById(id);

    const appLoading = $('app-loading');
    const appWrapper = $('app-wrapper');
    const notesContainer = $('notes-container');
    const addNoteBtn = $('add-note-btn');
    const fabAddNoteBtn = $('fab-add-note');
    const composeBar = $('compose-bar');
    const modalContainer = $('modal-container');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const closeNoteBtn = $('close-note-btn');
    const noteForm = $('note-form');
    const noteIdInput = $('note-id');
    const noteTitleInput = $('note-title');
    const noteContentEditor = $('note-content-editor');
    const deleteNoteBtn = $('delete-note-btn');
    const pinNoteBtn = $('pin-note-btn');
    const archiveNoteBtn = $('archive-note-btn');
    const noNotesMessage = $('no-notes-message');
    const noNotesText = $('no-notes-text');
    const logoutButton = $('logout-button');
    const userEmailDisplay = $('user-email-display');
    const mainHeader = document.querySelector('.main-header');
    const autosaveStatus = $('autosave-status');
    const boldBtn = $('bold-btn');
    const italicBtn = $('italic-btn');
    const uppercaseBtn = $('uppercase-btn');
    const tabNotes = $('tab-notes');
    const tabArchive = $('tab-archive');

    let currentUserId = null;
    let notesRef = null;
    let notesListener = null;
    let allNotesData = null;
    let currentView = 'notes';
    let autoSaveTimeout = null;
    let isAutoSaving = false;
    let lastSavedSnapshot = { title: '', content: '' };
    let currentNoteMeta = { pinned: false, archived: false };
    let isModalOpen = false;
    let authReady = false;

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Tidak diketahui';
        return new Date(timestamp).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const getPlainTextFromHtml = (html) => {
        const doc = new DOMParser().parseFromString(html || '', 'text/html');
        return {
            plainText: (doc.body.textContent || '').trim(),
            hasImage: !!doc.body.querySelector('img')
        };
    };

    const getNoteSnapshot = () => ({
        title: (noteTitleInput?.value || '').trim(),
        content: (noteContentEditor?.innerHTML || '').trim()
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
            pending: 'Belum disimpan',
            saving: 'Menyimpan...',
            saved: 'Tersimpan',
            error: message || 'Gagal menyimpan'
        };
        autosaveStatus.textContent = labels[state] ?? '';
        if (state && state !== 'idle') {
            autosaveStatus.classList.add('autosave-' + state);
        }
    };

    const showApp = () => {
        if (appLoading) appLoading.classList.add('hidden');
        if (appWrapper) appWrapper.classList.remove('is-hidden');
    };

    const updateViewUI = () => {
        const isArchive = currentView === 'archive';
        tabNotes?.classList.toggle('active', !isArchive);
        tabArchive?.classList.toggle('active', isArchive);
        composeBar?.classList.toggle('hidden', isArchive);
        fabAddNoteBtn?.classList.toggle('hidden', isArchive);
        addNoteBtn?.classList.toggle('hidden', isArchive);
    };

    const sortNotes = (notesArray) => {
        return notesArray.sort((a, b) => {
            const pinA = a.pinned ? 1 : 0;
            const pinB = b.pinned ? 1 : 0;
            if (pinB !== pinA) return pinB - pinA;
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
    };

    const updateModalMetaButtons = () => {
        const hasId = !!noteIdInput?.value;
        pinNoteBtn?.classList.toggle('hidden', !hasId);
        archiveNoteBtn?.classList.toggle('hidden', !hasId);

        if (pinNoteBtn) {
            pinNoteBtn.textContent = currentNoteMeta.pinned ? '📌 Lepas sematan' : '📌 Sematkan';
            pinNoteBtn.classList.toggle('is-active', currentNoteMeta.pinned);
        }
        if (archiveNoteBtn) {
            archiveNoteBtn.textContent = currentNoteMeta.archived
                ? '↩ Kembalikan'
                : '📦 Arsipkan';
            archiveNoteBtn.classList.toggle('is-active', currentNoteMeta.archived);
        }
    };

    const renderNotes = (notesData) => {
        allNotesData = notesData;
        if (!notesContainer) return;

        notesContainer.innerHTML = '';
        const notesArray = [];

        if (notesData) {
            Object.keys(notesData).forEach((key) => {
                const n = notesData[key];
                notesArray.push({
                    id: key,
                    title: n.title,
                    content: n.content,
                    timestamp: n.timestamp,
                    pinned: !!n.pinned,
                    archived: !!n.archived
                });
            });
        }

        const filtered = notesArray.filter((n) =>
            currentView === 'archive' ? n.archived : !n.archived
        );
        sortNotes(filtered);

        if (filtered.length === 0) {
            noNotesMessage?.classList.remove('hidden');
            if (noNotesText) {
                noNotesText.innerHTML = currentView === 'archive'
                    ? 'Arsip kosong.<br>Catatan yang diarsipkan akan muncul di sini.'
                    : 'Belum ada catatan.<br>Ketuk kotak di atas atau tombol + untuk memulai!';
            }
        } else {
            noNotesMessage?.classList.add('hidden');
            filtered.forEach((note) => {
                const card = document.createElement('article');
                card.className = 'note-card' + (note.pinned ? ' is-pinned' : '');
                card.dataset.id = note.id;

                const header = document.createElement('div');
                header.className = 'note-card-header';

                const titleEl = document.createElement('h2');
                titleEl.className = 'note-card-title';
                titleEl.textContent = note.title;

                const actions = document.createElement('div');
                actions.className = 'note-card-actions';

                const pinBtn = document.createElement('button');
                pinBtn.type = 'button';
                pinBtn.className = 'card-action-btn' + (note.pinned ? ' is-active' : '');
                pinBtn.title = note.pinned ? 'Lepas sematan' : 'Sematkan';
                pinBtn.setAttribute('aria-label', pinBtn.title);
                pinBtn.textContent = '📌';
                pinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    togglePin(note.id, !note.pinned);
                });

                const archiveBtn = document.createElement('button');
                archiveBtn.type = 'button';
                archiveBtn.className = 'card-action-btn';
                archiveBtn.title = currentView === 'archive' ? 'Kembalikan' : 'Arsipkan';
                archiveBtn.setAttribute('aria-label', archiveBtn.title);
                archiveBtn.textContent = currentView === 'archive' ? '↩' : '📦';
                archiveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (currentView === 'archive') {
                        toggleArchive(note.id, false);
                    } else {
                        toggleArchive(note.id, true);
                    }
                });

                if (currentView !== 'archive') {
                    actions.appendChild(pinBtn);
                }
                actions.appendChild(archiveBtn);
                header.append(titleEl, actions);

                const body = document.createElement('div');
                body.className = 'note-card-body';
                const contentEl = document.createElement('div');
                contentEl.className = 'note-card-content';
                contentEl.innerHTML = note.content || '';
                body.appendChild(contentEl);

                const footer = document.createElement('footer');
                footer.className = 'note-card-footer';
                const editedEl = document.createElement('p');
                editedEl.className = 'note-last-edited';
                editedEl.textContent = note.timestamp
                    ? 'Terakhir diedit: ' + formatTimestamp(note.timestamp)
                    : 'Tidak diketahui';
                footer.appendChild(editedEl);

                card.append(header, body, footer);
                card.addEventListener('click', () => openModal(note));
                notesContainer.appendChild(card);
            });
        }
    };

    const togglePin = async (id, pinned) => {
        if (!currentUserId) return;
        try {
            await database.ref('notes/' + currentUserId).child(id).update({
                pinned,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            if (noteIdInput?.value === id) {
                currentNoteMeta.pinned = pinned;
                updateModalMetaButtons();
            }
        } catch (err) {
            alert('Gagal mengubah sematan: ' + err.message);
        }
    };

    const toggleArchive = async (id, archived) => {
        if (!currentUserId) return;
        try {
            const payload = {
                archived,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            if (archived) payload.pinned = false;

            await database.ref('notes/' + currentUserId).child(id).update(payload);

            if (noteIdInput?.value === id) {
                currentNoteMeta.archived = archived;
                if (archived) currentNoteMeta.pinned = false;
                updateModalMetaButtons();
            }

            if (archived && noteIdInput?.value === id && isModalOpen) {
                await closeModal();
            }
        } catch (err) {
            alert('Gagal mengubah arsip: ' + err.message);
        }
    };

    const resetAutoSaveState = () => {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = null;
        lastSavedSnapshot = { title: '', content: '' };
        currentNoteMeta = { pinned: false, archived: false };
        setAutosaveStatus('idle');
        updateModalMetaButtons();
    };

    const openModal = (note = null) => {
        if (!modalContainer) return;

        noteForm?.reset();
        if (noteContentEditor) noteContentEditor.innerHTML = '';
        resetAutoSaveState();

        if (note) {
            noteIdInput.value = note.id;
            noteTitleInput.value = note.title;
            noteContentEditor.innerHTML = note.content || '';
            deleteNoteBtn?.classList.remove('hidden');
            lastSavedSnapshot = { title: note.title, content: note.content || '' };
            currentNoteMeta = {
                pinned: !!note.pinned,
                archived: !!note.archived
            };
            setAutosaveStatus('saved');
            updateModalMetaButtons();
        } else {
            noteIdInput.value = '';
            deleteNoteBtn?.classList.add('hidden');
            pinNoteBtn?.classList.add('hidden');
            archiveNoteBtn?.classList.add('hidden');
        }

        isModalOpen = true;
        document.body.classList.add('modal-open');
        modalContainer.classList.remove('hidden');
        noteTitleInput?.focus();
    };

    const closeModal = async () => {
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = null;
            await performAutoSave(true);
        }

        isModalOpen = false;
        document.body.classList.remove('modal-open');
        modalContainer?.classList.add('hidden');
        resetAutoSaveState();
    };

    const performAutoSave = async (silent = false) => {
        if (!isModalOpen || !currentUserId || isAutoSaving || typeof database === 'undefined') {
            return false;
        }

        const snapshot = getNoteSnapshot();

        if (!isNoteValid(snapshot)) {
            if (!silent) setAutosaveStatus('pending');
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
                await newRef.set({
                    ...noteData,
                    pinned: false,
                    archived: false
                });
                noteIdInput.value = newRef.key;
                deleteNoteBtn?.classList.remove('hidden');
                updateModalMetaButtons();
            }

            lastSavedSnapshot = { ...snapshot };
            setAutosaveStatus('saved');
            return true;
        } catch (err) {
            console.error('Auto-save error:', err);
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
        autoSaveTimeout = setTimeout(performAutoSave, AUTO_SAVE_MS);
    };

    const switchView = (view) => {
        currentView = view;
        updateViewUI();
        renderNotes(allNotesData);
    };

    const bindEvents = () => {
        const openNew = () => openModal();

        addNoteBtn?.addEventListener('click', openNew);
        fabAddNoteBtn?.addEventListener('click', openNew);
        composeBar?.addEventListener('click', openNew);

        tabNotes?.addEventListener('click', () => switchView('notes'));
        tabArchive?.addEventListener('click', () => switchView('archive'));

        closeModalBtn?.addEventListener('click', closeModal);
        closeNoteBtn?.addEventListener('click', closeModal);

        modalContainer?.addEventListener('click', (e) => {
            if (e.target === modalContainer) closeModal();
        });

        noteForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            closeModal();
        });

        noteTitleInput?.addEventListener('input', scheduleAutoSave);
        noteContentEditor?.addEventListener('input', scheduleAutoSave);

        pinNoteBtn?.addEventListener('click', async () => {
            const id = noteIdInput?.value;
            if (!id) return;
            const next = !currentNoteMeta.pinned;
            await togglePin(id, next);
        });

        archiveNoteBtn?.addEventListener('click', async () => {
            const id = noteIdInput?.value;
            if (!id) return;
            const next = !currentNoteMeta.archived;
            if (next && !confirm('Arsipkan catatan ini? Catatan akan disembunyikan dari halaman utama.')) return;
            await toggleArchive(id, next);
        });

        deleteNoteBtn?.addEventListener('click', async () => {
            const id = noteIdInput?.value;
            if (!id || !confirm('Hapus catatan ini permanen?')) return;
            if (!currentUserId) return;

            try {
                await database.ref('notes/' + currentUserId).child(id).remove();
                isModalOpen = false;
                document.body.classList.remove('modal-open');
                modalContainer?.classList.add('hidden');
                resetAutoSaveState();
            } catch (err) {
                alert('Gagal menghapus: ' + err.message);
            }
        });

        logoutButton?.addEventListener('click', async () => {
            try {
                if (notesRef && notesListener) {
                    notesRef.off('value', notesListener);
                    notesListener = null;
                }
                await auth.signOut();
                window.location.href = 'index.html';
            } catch (err) {
                alert('Gagal keluar: ' + err.message);
            }
        });

        boldBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('bold', false, null);
            noteContentEditor?.focus();
            scheduleAutoSave();
        });

        italicBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('italic', false, null);
            noteContentEditor?.focus();
            scheduleAutoSave();
        });

        uppercaseBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const text = range.toString();
                if (text) {
                    const span = document.createElement('span');
                    span.style.textTransform = 'uppercase';
                    span.textContent = text;
                    range.deleteContents();
                    range.insertNode(span);
                    const nr = document.createRange();
                    nr.selectNode(span);
                    sel.removeAllRanges();
                    sel.addRange(nr);
                }
            }
            noteContentEditor?.focus();
            scheduleAutoSave();
        });

        let lastScrollTop = 0;
        window.addEventListener('scroll', () => {
            if (!mainHeader || window.innerWidth > 768) {
                mainHeader?.classList.remove('header-hidden');
                return;
            }
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop <= 0) {
                mainHeader.classList.remove('header-hidden');
            } else if (scrollTop > lastScrollTop && scrollTop > mainHeader.offsetHeight) {
                mainHeader.classList.add('header-hidden');
            } else if (scrollTop < lastScrollTop) {
                mainHeader.classList.remove('header-hidden');
            }
            lastScrollTop = scrollTop;
        });
    };

    const initNotesForUser = (user) => {
        currentUserId = user.uid;

        if (userEmailDisplay) {
            userEmailDisplay.textContent = user.email || '';
        }

        notesRef = database.ref('notes/' + currentUserId);

        if (notesListener && notesRef) {
            notesRef.off('value', notesListener);
        }

        notesListener = notesRef.on(
            'value',
            (snap) => renderNotes(snap.val()),
            (err) => console.error('Gagal memuat catatan:', err)
        );

        updateViewUI();
        showApp();
    };

    const waitForFirebase = () => {
        return new Promise((resolve, reject) => {
            let waited = 0;
            const maxWait = 12000;
            const check = () => {
                if (typeof firebase !== 'undefined' && typeof auth !== 'undefined' && typeof database !== 'undefined') {
                    resolve();
                    return;
                }
                waited += 50;
                if (waited >= maxWait) {
                    reject(new Error('Firebase tidak termuat. Periksa koneksi internet.'));
                    return;
                }
                setTimeout(check, 50);
            };
            check();
        });
    };

    const start = async () => {
        bindEvents();
        await waitForFirebase();

        auth.onAuthStateChanged((user) => {
            if (authReady && !user) {
                window.location.href = 'index.html';
                return;
            }
            authReady = true;

            if (user) {
                initNotesForUser(user);
            } else {
                window.location.href = 'index.html';
            }
        });
    };

    const startWithError = (msg) => {
        if (appLoading) {
            appLoading.classList.remove('hidden');
            const p = appLoading.querySelector('p');
            if (p) p.textContent = msg;
            const spinner = appLoading.querySelector('.loading-spinner');
            if (spinner) spinner.style.display = 'none';
        }
    };

    const run = () => start().catch((err) => startWithError(err.message));

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
