/**
 * Haru Notes — catatan, auto-save, pin/arsip, kunci, rich text, settings
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
    const noteModalEdited = $('note-modal-edited');
    const pinnedSection = $('pinned-section');
    const othersSection = $('others-section');
    const pinnedContainer = $('pinned-container');
    const othersContainer = $('others-container');
    const notesBoard = $('notes-board');
    const archiveBoard = $('archive-board');
    const archiveContainer = $('archive-container');
    const addNoteBtn = $('add-note-btn');
    const fabAddNoteBtn = $('fab-add-note');
    const composeBar = $('compose-bar');
    const settingsBtn = $('settings-btn');
    const modalContainer = $('modal-container');
    const settingsModal = $('settings-modal');
    const pinModal = $('pin-modal');
    const closeModalBtn = document.querySelector('#modal-container .close-modal-btn');
    const closeNoteBtn = $('close-note-btn');
    const closeSettingsBtn = $('close-settings-btn');
    const closePinModalBtn = $('close-pin-modal-btn');
    const noteForm = $('note-form');
    const noteIdInput = $('note-id');
    const noteTitleInput = $('note-title');
    const noteContentEditor = $('note-content-editor');
    const deleteNoteBtn = $('delete-note-btn');
    const pinNoteBtn = $('pin-note-btn');
    const lockNoteBtn = $('lock-note-btn');
    const archiveNoteBtn = $('archive-note-btn');
    const noNotesMessage = $('no-notes-message');
    const noNotesText = $('no-notes-text');
    const logoutButton = $('logout-button');
    const mainHeader = document.querySelector('.main-header');
    const autosaveStatus = $('autosave-status');
    const boldBtn = $('bold-btn');
    const italicBtn = $('italic-btn');
    const underlineBtn = $('underline-btn');
    const strikeBtn = $('strike-btn');
    const uppercaseBtn = $('uppercase-btn');
    const quoteBtn = $('quote-btn');
    const spoilerBtn = $('spoiler-btn');
    const menuBtn = $('menu-btn');
    const appSidebar = $('app-sidebar');
    const sidebarBackdrop = $('sidebar-backdrop');
    const navNotes = $('nav-notes');
    const navArchive = $('nav-archive');
    const mainViewLabel = $('main-view-label');
    const profileBtn = $('profile-btn');
    const profileDropdown = $('profile-dropdown');
    const editProfileBtn = $('edit-profile-btn');
    const profileModal = $('profile-modal');
    const closeProfileBtn = $('close-profile-btn');
    const saveProfileBtn = $('save-profile-btn');
    const profilePhotoInput = $('profile-photo-input');
    const removePhotoBtn = $('remove-photo-btn');
    const profileDisplayNameInput = $('profile-display-name');
    const profileUsernameInput = $('profile-username');
    const profilePreviewImg = $('profile-preview-img');
    const profilePreviewFallback = $('profile-preview-fallback');
    const headerAvatarImg = $('header-avatar-img');
    const headerAvatarFallback = $('header-avatar-fallback');
    const dropdownAvatarImg = $('dropdown-avatar-img');
    const dropdownAvatarFallback = $('dropdown-avatar-fallback');
    const dropdownDisplayName = $('dropdown-display-name');
    const dropdownUsername = $('dropdown-username');
    const dropdownEmail = $('dropdown-email');
    const darkModeToggle = $('dark-mode-toggle');
    const pinStatusText = $('pin-status-text');
    const pinSetupForm = $('pin-setup-form');
    const pinChangeForm = $('pin-change-form');
    const savePinBtn = $('save-pin-btn');
    const changePinBtn = $('change-pin-btn');
    const removePinBtn = $('remove-pin-btn');
    const verifyPinBtn = $('verify-pin-btn');
    const verifyPinInput = $('verify-pin-input');
    const pinErrorMsg = $('pin-error-msg');

    let currentUserId = null;
    let notesRef = null;
    let settingsRef = null;
    let notesListener = null;
    let settingsListener = null;
    let allNotesData = null;
    let globalPinHash = null;
    let currentView = 'notes';
    let autoSaveTimeout = null;
    let isAutoSaving = false;
    let lastSavedSnapshot = { title: '', content: '' };
    let currentNoteMeta = { pinned: false, archived: false, locked: false };
    let isModalOpen = false;
    let authReady = false;
    let pinVerifyCallback = null;
    let userProfile = { displayName: '', username: '', photoUrl: '' };
    let currentUserEmail = '';
    let pendingPhotoUrl = null;
    let useNotesSettings = false;

    const formatTimestamp = (ts) => {
        if (!ts) return 'Tidak diketahui';
        return new Date(ts).toLocaleString('id-ID', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
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

    const isNoteValid = (snap) => {
        const { plainText, hasImage } = getPlainTextFromHtml(snap.content);
        return snap.title.length > 0 && (plainText.length > 0 || hasImage);
    };

    const setAutosaveStatus = (state, message = '') => {
        if (!autosaveStatus) return;
        autosaveStatus.className = 'autosave-status';
        const labels = { idle: '', pending: 'Belum disimpan', saving: 'Menyimpan...', saved: 'Tersimpan', error: message || 'Gagal menyimpan' };
        autosaveStatus.textContent = labels[state] ?? '';
        if (state && state !== 'idle') autosaveStatus.classList.add('autosave-' + state);
    };

    const showApp = () => {
        appLoading?.classList.add('hidden');
        appWrapper?.classList.remove('is-hidden');
    };

    const hasGlobalPin = () => !!globalPinHash;

    const getSettingsRef = () => {
        if (useNotesSettings && notesRef) return notesRef.child('_settings');
        return settingsRef;
    };

    const switchToNotesSettings = () => {
        if (useNotesSettings || !notesRef) return;
        useNotesSettings = true;
        if (settingsListener && settingsRef) {
            settingsRef.off('value', settingsListener);
        }
        settingsRef = notesRef.child('_settings');
        settingsListener = settingsRef.on('value', (snap) => {
            applySettingsData(snap.val());
        });
    };

    const updateSettings = async (data) => {
        if (!data) return;
        let ref = getSettingsRef();
        if (!ref) {
            throw new Error('Referensi pengaturan belum tersedia');
        }
        try {
            await ref.update(data);
            return;
        } catch (err) {
            const message = (err && err.message) ? err.message.toLowerCase() : '';
            const denied = err && (err.code === 'PERMISSION_DENIED' || message.includes('permission denied'));
            if (denied && !useNotesSettings) {
                switchToNotesSettings();
                ref = getSettingsRef();
                if (!ref) throw err;
                await ref.update(data);
                return;
            }
            throw err;
        }
    };

    const applyTheme = (dark) => {
        const theme = dark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('haru_theme', theme);
        if (darkModeToggle) darkModeToggle.checked = !!dark;
    };

    const isDesktopLayout = () => window.innerWidth >= 769;

    const applySidebarCollapsed = (collapsed) => {
        appWrapper?.classList.toggle('sidebar-collapsed', collapsed);
        localStorage.setItem('haru_sidebar_collapsed', collapsed ? '1' : '0');
    };

    const initSidebarLayout = () => {
        if (isDesktopLayout()) {
            appSidebar?.classList.add('is-open');
            sidebarBackdrop?.classList.add('hidden');
            applySidebarCollapsed(localStorage.getItem('haru_sidebar_collapsed') === '1');
        }
    };

    const openSidebar = () => {
        appSidebar?.classList.add('is-open');
        if (!isDesktopLayout()) sidebarBackdrop?.classList.remove('hidden');
    };

    const closeSidebar = () => {
        if (isDesktopLayout()) return;
        appSidebar?.classList.remove('is-open');
        sidebarBackdrop?.classList.add('hidden');
    };

    const toggleMenu = () => {
        if (isDesktopLayout()) {
            applySidebarCollapsed(!appWrapper?.classList.contains('sidebar-collapsed'));
            return;
        }
        if (appSidebar?.classList.contains('is-open')) closeSidebar();
        else openSidebar();
    };

    const closeProfileDropdown = () => {
        profileDropdown?.classList.add('hidden');
        profileBtn?.setAttribute('aria-expanded', 'false');
    };

    const getInitials = (name) => {
        const n = (name || '').trim();
        if (!n) return '?';
        const parts = n.split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return n.slice(0, 2).toUpperCase();
    };

    const setAvatarEl = (imgEl, fallbackEl, photoUrl, name) => {
        if (!imgEl || !fallbackEl) return;
        if (photoUrl) {
            imgEl.src = photoUrl;
            imgEl.classList.remove('hidden');
            fallbackEl.classList.add('hidden');
        } else {
            imgEl.removeAttribute('src');
            imgEl.classList.add('hidden');
            fallbackEl.classList.remove('hidden');
            fallbackEl.textContent = getInitials(name);
        }
    };

    const updateProfileUI = () => {
        const name = userProfile.displayName || currentUserEmail.split('@')[0] || 'Pengguna';
        const user = userProfile.username ? '@' + userProfile.username : '@' + (currentUserEmail.split('@')[0] || 'user');

        setAvatarEl(headerAvatarImg, headerAvatarFallback, userProfile.photoUrl, name);
        setAvatarEl(dropdownAvatarImg, dropdownAvatarFallback, userProfile.photoUrl, name);
        setAvatarEl(profilePreviewImg, profilePreviewFallback, pendingPhotoUrl !== null ? pendingPhotoUrl : userProfile.photoUrl, name);

        if (dropdownDisplayName) dropdownDisplayName.textContent = name;
        if (dropdownUsername) dropdownUsername.textContent = user;
        if (dropdownEmail) dropdownEmail.textContent = currentUserEmail;
    };

    const validateUsername = (u) => {
        const s = (u || '').trim().toLowerCase();
        if (!/^[a-z0-9_]{3,20}$/.test(s)) {
            return { ok: false, msg: 'Username: 3–20 karakter (a-z, 0-9, _).' };
        }
        return { ok: true, value: s };
    };

    const resizeImageFile = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const max = 128;
                let w = img.width;
                let h = img.height;
                if (w > max || h > max) {
                    if (w > h) { h = (h / w) * max; w = max; }
                    else { w = (w / h) * max; h = max; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                let quality = 0.85;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                while (dataUrl.length > 90000 && quality > 0.4) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const openProfileEdit = () => {
        closeProfileDropdown();
        pendingPhotoUrl = userProfile.photoUrl || null;
        if (profileDisplayNameInput) profileDisplayNameInput.value = userProfile.displayName || '';
        if (profileUsernameInput) profileUsernameInput.value = userProfile.username || '';
        updateProfileUI();
        profileModal?.classList.remove('hidden');
        document.body.classList.add('modal-open');
    };

    const closeProfileEdit = () => {
        profileModal?.classList.add('hidden');
        pendingPhotoUrl = null;
        if (!isModalOpen && settingsModal?.classList.contains('hidden') && pinModal?.classList.contains('hidden')) {
            document.body.classList.remove('modal-open');
        }
    };

    const saveProfile = async () => {
        const displayName = (profileDisplayNameInput?.value || '').trim();
        const userCheck = validateUsername(profileUsernameInput?.value);
        if (!userCheck.ok) {
            alert(userCheck.msg);
            return;
        }
        const profile = {
            displayName: displayName || currentUserEmail.split('@')[0],
            username: userCheck.value,
            photoUrl: pendingPhotoUrl !== null ? pendingPhotoUrl : (userProfile.photoUrl || '')
        };
        if (!settingsRef && !notesRef) {
            alert('Pengaturan belum siap. Tunggu beberapa saat dan coba lagi.');
            return;
        }
        try {
            await updateSettings({
                profile,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            userProfile = profile;
            pendingPhotoUrl = null;
            updateProfileUI();
            closeProfileEdit();
            alert('Profil berhasil disimpan!');
        } catch (err) {
            alert('Gagal menyimpan profil: ' + (err.message || 'Terjadi kesalahan.'));
        } finally {
            HaruSecurity.clearUnlockSession();
        }
    };

    const applySettingsData = (data) => {
        data = data || {};
        globalPinHash = data.pinHash || null;
        const profile = data.profile || {};
        userProfile = {
            displayName: profile.displayName || '',
            username: profile.username || '',
            photoUrl: profile.photoUrl || ''
        };
        if (!userProfile.displayName && currentUserEmail) {
            userProfile.displayName = currentUserEmail.split('@')[0];
        }
        applyTheme(!!data.darkMode);
        updatePinSettingsUI();
        updateProfileUI();
        renderNotes(allNotesData);
    };

    const updateViewUI = () => {
        const isArchive = currentView === 'archive';
        navNotes?.classList.toggle('active', !isArchive);
        navArchive?.classList.toggle('active', isArchive);
        composeBar?.classList.toggle('hidden', isArchive);
        fabAddNoteBtn?.classList.toggle('hidden', isArchive);
        notesBoard?.classList.toggle('hidden', isArchive);
        archiveBoard?.classList.toggle('hidden', !isArchive);
        if (mainViewLabel) mainViewLabel.textContent = isArchive ? 'Arsip' : 'Catatan';
    };

    const updatePinSettingsUI = () => {
        if (!pinStatusText) return;
        if (hasGlobalPin()) {
            pinStatusText.textContent = '✓ PIN aktif — catatan terkunci memakai PIN ini';
            pinStatusText.className = 'pin-status pin-active';
            pinSetupForm?.classList.add('hidden');
            pinChangeForm?.classList.remove('hidden');
        } else {
            pinStatusText.textContent = 'PIN belum diatur';
            pinStatusText.className = 'pin-status';
            pinSetupForm?.classList.remove('hidden');
            pinChangeForm?.classList.add('hidden');
        }
    };

    const sortByTime = (arr) => arr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const parseNotesList = (notesData) => {
        const list = [];
        if (!notesData) return list;
        Object.keys(notesData).forEach((key) => {
            if (key === '_settings' || key.startsWith('__')) return;
            const n = notesData[key];
            list.push({
                id: key,
                title: n.title,
                content: n.content,
                timestamp: n.timestamp,
                pinned: !!n.pinned,
                archived: !!n.archived,
                locked: !!n.locked
            });
        });
        return list;
    };

    const canViewLocked = () => !hasGlobalPin() || HaruSecurity.isUnlockSessionValid();

    const showPinError = (msg) => {
        if (!pinErrorMsg) return;
        pinErrorMsg.textContent = msg;
        pinErrorMsg.classList.remove('hidden');
    };

    const hidePinError = () => pinErrorMsg?.classList.add('hidden');

    const openPinModal = (onSuccess) => {
        pinVerifyCallback = onSuccess;
        hidePinError();
        if (verifyPinInput) {
            verifyPinInput.value = '';
        }
        pinModal?.classList.remove('hidden');
        document.body.classList.add('modal-open');
        verifyPinInput?.focus();
    };

    const closePinModal = () => {
        pinModal?.classList.add('hidden');
        pinVerifyCallback = null;
        hidePinError();
        if (!isModalOpen && settingsModal?.classList.contains('hidden')) {
            document.body.classList.remove('modal-open');
        }
    };

    const requirePinAccess = (onSuccess) => {
        if (canViewLocked()) {
            onSuccess();
            return;
        }
        openPinModal(onSuccess);
    };

    const verifyPinSubmit = async () => {
        const pin = verifyPinInput?.value || '';
        const check = HaruSecurity.validatePinFormat(pin);
        if (!check.ok) {
            showPinError(check.msg);
            return;
        }
        const ok = await HaruSecurity.verifyPin(check.value, globalPinHash, currentUserId);
        if (!ok) {
            showPinError('PIN salah. Coba lagi.');
            return;
        }
        HaruSecurity.setUnlockSession();
        hidePinError();
        pinModal?.classList.add('hidden');
        const cb = pinVerifyCallback;
        pinVerifyCallback = null;
        if (!isModalOpen && settingsModal?.classList.contains('hidden')) {
            document.body.classList.remove('modal-open');
        }
        if (cb) cb();
    };

    const openSettings = () => {
        closeSidebar();
        updatePinSettingsUI();
        if (darkModeToggle) darkModeToggle.checked = document.documentElement.getAttribute('data-theme') === 'dark';
        settingsModal?.classList.remove('hidden');
        document.body.classList.add('modal-open');
    };

    const closeSettings = () => {
        settingsModal?.classList.add('hidden');
        if (!isModalOpen && pinModal?.classList.contains('hidden')) {
            document.body.classList.remove('modal-open');
        }
    };

    const saveGlobalPin = async (pin, confirm) => {
        if (pin !== confirm) {
            alert('Konfirmasi PIN tidak cocok.');
            return;
        }
        const check = HaruSecurity.validatePinFormat(pin);
        if (!check.ok) {
            alert(check.msg);
            return;
        }
        try {
            const hash = await HaruSecurity.hashPin(check.value, currentUserId);
            await updateSettings({
                pinHash: hash,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            globalPinHash = hash;
            updatePinSettingsUI();
            alert('PIN berhasil disimpan!');
        } catch (err) {
            alert('Gagal menyimpan PIN: ' + (err.message || 'Terjadi kesalahan.'));
        }
    };

    const changeGlobalPin = async (oldP, newP, confirm) => {
        const oldCheck = HaruSecurity.validatePinFormat(oldP);
        if (!oldCheck.ok) { alert(oldCheck.msg); return; }
        const ok = await HaruSecurity.verifyPin(oldCheck.value, globalPinHash, currentUserId);
        if (!ok) { alert('PIN lama salah.'); return; }
        if (newP !== confirm) { alert('Konfirmasi PIN baru tidak cocok.'); return; }
        const newCheck = HaruSecurity.validatePinFormat(newP);
        if (!newCheck.ok) { alert(newCheck.msg); return; }
        try {
            const hash = await HaruSecurity.hashPin(newCheck.value, currentUserId);
            await updateSettings({ pinHash: hash, updatedAt: firebase.database.ServerValue.TIMESTAMP });
            globalPinHash = hash;
            HaruSecurity.clearUnlockSession();
            updatePinSettingsUI();
            alert('PIN berhasil diubah.');
        } catch (err) {
            alert('Gagal mengubah PIN: ' + (err.message || 'Terjadi kesalahan.'));
        }
    };

    const removeGlobalPin = async () => {
        if (!confirm('Hapus PIN? Semua catatan akan dibuka kuncinya.')) return;
        try {
            const ref = getSettingsRef();
            if (!ref) {
                alert('Pengaturan belum siap. Coba kembali sebentar lagi.');
                return;
            }
            await ref.child('pinHash').remove();
            globalPinHash = null;
            HaruSecurity.clearUnlockSession();
            if (allNotesData && currentUserId) {
                const updates = {};
                Object.keys(allNotesData).forEach((id) => {
                    if (allNotesData[id].locked) updates[id + '/locked'] = false;
                });
                if (Object.keys(updates).length) {
                    await database.ref('notes/' + currentUserId).update(updates);
                }
            }
            updatePinSettingsUI();
            alert('PIN dihapus. Catatan terkunci telah dibuka.');
        } catch (err) {
            alert('Gagal menghapus PIN: ' + (err.message || 'Terjadi kesalahan.'));
        }
    };

    const updateModalEdited = () => {
        if (!noteModalEdited) return;
        const id = noteIdInput?.value;
        const ts = id && allNotesData?.[id] ? allNotesData[id].timestamp : null;
        if (!ts) {
            noteModalEdited.classList.add('hidden');
            noteModalEdited.textContent = '';
            return;
        }
        noteModalEdited.textContent = 'Terakhir diedit: ' + formatTimestamp(ts);
        noteModalEdited.classList.remove('hidden');
    };

    const updateModalMetaButtons = () => {
        const hasId = !!noteIdInput?.value;
        [pinNoteBtn, lockNoteBtn, archiveNoteBtn].forEach((btn) => btn?.classList.toggle('hidden', !hasId));

        if (pinNoteBtn) {
            const t = currentNoteMeta.pinned ? 'Lepas sematan' : 'Sematkan';
            pinNoteBtn.title = t;
            pinNoteBtn.setAttribute('aria-label', t);
            pinNoteBtn.classList.toggle('is-active', currentNoteMeta.pinned);
        }
        if (lockNoteBtn) {
            const t = currentNoteMeta.locked ? 'Buka kunci' : 'Kunci';
            lockNoteBtn.title = hasGlobalPin() || currentNoteMeta.locked ? t : 'Atur PIN di Pengaturan dulu';
            lockNoteBtn.setAttribute('aria-label', lockNoteBtn.title);
            lockNoteBtn.classList.toggle('is-active', currentNoteMeta.locked);
            lockNoteBtn.disabled = !hasGlobalPin() && !currentNoteMeta.locked;
        }
        if (archiveNoteBtn) {
            const t = currentNoteMeta.archived ? 'Kembalikan' : 'Arsipkan';
            archiveNoteBtn.title = t;
            archiveNoteBtn.setAttribute('aria-label', t);
            archiveNoteBtn.classList.toggle('is-active', currentNoteMeta.archived);
        }
    };

    const handleNoteClick = (note) => {
        if (note.locked && !canViewLocked()) {
            requirePinAccess(() => openModal(note));
        } else {
            openModal(note);
        }
    };

    const createNoteCard = (note) => {
        const card = document.createElement('article');
        card.className = 'note-card';
        if (note.pinned) card.classList.add('is-pinned');
        if (note.locked) card.classList.add('is-locked');
        card.dataset.id = note.id;

        const header = document.createElement('div');
        header.className = 'note-card-header';

        const titleEl = document.createElement('h2');
        titleEl.className = 'note-card-title';
        titleEl.textContent = note.title;

        const actions = document.createElement('div');
        actions.className = 'note-card-actions';

        if (currentView !== 'archive') {
            const pinBtn = document.createElement('button');
            pinBtn.type = 'button';
            pinBtn.className = 'card-action-btn' + (note.pinned ? ' is-active' : '');
            pinBtn.title = note.pinned ? 'Lepas sematan' : 'Sematkan';
            pinBtn.textContent = '📌';
            pinBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePin(note.id, !note.pinned); });
            actions.appendChild(pinBtn);
        }

        const lockBtn = document.createElement('button');
        lockBtn.type = 'button';
        lockBtn.className = 'card-action-btn' + (note.locked ? ' is-active' : '');
        lockBtn.title = note.locked ? 'Buka kunci' : 'Kunci catatan';
        lockBtn.textContent = '🔒';
        lockBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLock(note.id, !note.locked);
        });
        actions.appendChild(lockBtn);

        const archiveBtn = document.createElement('button');
        archiveBtn.type = 'button';
        archiveBtn.className = 'card-action-btn';
        archiveBtn.textContent = currentView === 'archive' ? '↩' : '📦';
        archiveBtn.title = currentView === 'archive' ? 'Kembalikan' : 'Arsipkan';
        archiveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleArchive(note.id, currentView !== 'archive');
        });
        actions.appendChild(archiveBtn);

        header.append(titleEl, actions);

        const body = document.createElement('div');
        body.className = 'note-card-body';
        const contentEl = document.createElement('div');
        contentEl.className = 'note-card-content';

        if (note.locked && !canViewLocked()) {
            contentEl.innerHTML = '<span class="locked-preview">🔒 Catatan terkunci — ketuk & masukkan PIN</span>';
        } else {
            contentEl.innerHTML = note.content || '';
            bindSpoilersIn(contentEl);
        }
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
        card.addEventListener('click', () => handleNoteClick(note));
        return card;
    };

    const renderNotes = (notesData) => {
        allNotesData = notesData;
        pinnedContainer && (pinnedContainer.innerHTML = '');
        othersContainer && (othersContainer.innerHTML = '');
        archiveContainer && (archiveContainer.innerHTML = '');

        const all = parseNotesList(notesData);
        const filtered = all.filter((n) => (currentView === 'archive' ? n.archived : !n.archived));

        if (filtered.length === 0) {
            noNotesMessage?.classList.remove('hidden');
            if (noNotesText) {
                noNotesText.innerHTML = currentView === 'archive'
                    ? 'Arsip kosong.<br>Catatan yang diarsipkan akan muncul di sini.'
                    : 'Belum ada catatan.<br>Ketuk kotak di atas atau tombol + untuk memulai!';
            }
            pinnedSection?.classList.add('hidden');
            othersSection?.classList.add('hidden');
            return;
        }

        noNotesMessage?.classList.add('hidden');

        if (currentView === 'archive') {
            sortByTime(filtered);
            filtered.forEach((n) => archiveContainer?.appendChild(createNoteCard(n)));
            return;
        }

        const pinned = sortByTime(filtered.filter((n) => n.pinned));
        const others = sortByTime(filtered.filter((n) => !n.pinned));

        if (pinned.length) {
            pinnedSection?.classList.remove('hidden');
            pinned.forEach((n) => pinnedContainer?.appendChild(createNoteCard(n)));
        } else {
            pinnedSection?.classList.add('hidden');
        }

        if (others.length) {
            othersSection?.classList.remove('hidden');
            others.forEach((n) => othersContainer?.appendChild(createNoteCard(n)));
        } else {
            othersSection?.classList.add('hidden');
        }

        if (isModalOpen) updateModalEdited();
    };

    const togglePin = async (id, pinned) => {
        await database.ref('notes/' + currentUserId).child(id).update({
            pinned,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        if (noteIdInput?.value === id) {
            currentNoteMeta.pinned = pinned;
            updateModalMetaButtons();
        }
    };

    const toggleLock = async (id, locked) => {
        if (locked && !hasGlobalPin()) {
            alert('Atur PIN global di Pengaturan (⚙) terlebih dahulu.');
            return;
        }
        await database.ref('notes/' + currentUserId).child(id).update({
            locked,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        if (noteIdInput?.value === id) {
            currentNoteMeta.locked = locked;
            updateModalMetaButtons();
        }
    };

    const toggleArchive = async (id, archived) => {
        const payload = { archived, timestamp: firebase.database.ServerValue.TIMESTAMP };
        if (archived) payload.pinned = false;
        await database.ref('notes/' + currentUserId).child(id).update(payload);
        if (noteIdInput?.value === id) {
            currentNoteMeta.archived = archived;
            if (archived) currentNoteMeta.pinned = false;
            updateModalMetaButtons();
            if (archived && isModalOpen) await closeModal();
        }
    };

    const resetAutoSaveState = () => {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = null;
        lastSavedSnapshot = { title: '', content: '' };
        currentNoteMeta = { pinned: false, archived: false, locked: false };
        setAutosaveStatus('idle');
        updateModalMetaButtons();
    };

    const openModal = (note = null) => {
        noteForm?.reset();
        if (noteContentEditor) noteContentEditor.innerHTML = '';
        resetAutoSaveState();

        if (note) {
            noteIdInput.value = note.id;
            noteTitleInput.value = note.title;
            noteContentEditor.innerHTML = note.content || '';
            bindSpoilersIn(noteContentEditor);
            deleteNoteBtn?.classList.remove('hidden');
            lastSavedSnapshot = { title: note.title, content: note.content || '' };
            currentNoteMeta = { pinned: !!note.pinned, archived: !!note.archived, locked: !!note.locked };
            setAutosaveStatus('saved');
            updateModalMetaButtons();
            updateModalEdited();
        } else {
            noteIdInput.value = '';
            deleteNoteBtn?.classList.add('hidden');
            noteModalEdited?.classList.add('hidden');
        }

        isModalOpen = true;
        document.body.classList.add('modal-open');
        modalContainer?.classList.remove('hidden');
        noteTitleInput?.focus();
    };

    const closeModal = async () => {
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = null;
            await performAutoSave(true);
        }
        isModalOpen = false;
        if (settingsModal?.classList.contains('hidden') && pinModal?.classList.contains('hidden')) {
            document.body.classList.remove('modal-open');
        }
        modalContainer?.classList.add('hidden');
        resetAutoSaveState();
    };

    const performAutoSave = async (silent = false) => {
        if (!isModalOpen || !currentUserId || isAutoSaving) return false;

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
                await newRef.set({ ...noteData, pinned: false, archived: false, locked: false });
                noteIdInput.value = newRef.key;
                deleteNoteBtn?.classList.remove('hidden');
                updateModalMetaButtons();
            }
            lastSavedSnapshot = { ...snapshot };
            setAutosaveStatus('saved');
            return true;
        } catch (err) {
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

    /* ——— Rich text ——— */
    const wrapSelection = (tag, className) => {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || sel.isCollapsed) {
            alert('Pilih teks terlebih dahulu.');
            return;
        }
        const range = sel.getRangeAt(0);
        if (!noteContentEditor?.contains(range.commonAncestorContainer)) return;

        const el = document.createElement(tag);
        if (className) el.className = className;
        try {
            el.appendChild(range.extractContents());
            range.insertNode(el);
            sel.removeAllRanges();
            const nr = document.createRange();
            nr.selectNodeContents(el);
            nr.collapse(false);
            sel.addRange(nr);
        } catch (e) {
            console.warn(e);
        }
        noteContentEditor?.focus();
        bindSpoilersIn(noteContentEditor);
        scheduleAutoSave();
    };

    const bindSpoilersIn = (root) => {
        if (!root) return;
        root.querySelectorAll('.spoiler:not([data-bound])').forEach((sp) => {
            sp.dataset.bound = '1';
            sp.setAttribute('tabindex', '0');
            sp.addEventListener('click', (e) => {
                e.stopPropagation();
                sp.classList.toggle('revealed');
            });
        });
    };

    const switchView = (view) => {
        currentView = view;
        closeSidebar();
        closeProfileDropdown();
        updateViewUI();
        renderNotes(allNotesData);
    };

    const bindEvents = () => {
        addNoteBtn?.addEventListener('click', () => openModal());
        fabAddNoteBtn?.addEventListener('click', () => openModal());
        composeBar?.addEventListener('click', () => openModal());

        menuBtn?.addEventListener('click', () => {
            toggleMenu();
        });
        sidebarBackdrop?.addEventListener('click', closeSidebar);
        navNotes?.addEventListener('click', () => switchView('notes'));
        navArchive?.addEventListener('click', () => switchView('archive'));

        profileBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = profileDropdown?.classList.contains('hidden');
            if (open) {
                profileDropdown?.classList.remove('hidden');
                profileBtn?.setAttribute('aria-expanded', 'true');
            } else closeProfileDropdown();
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.profile-wrap')) closeProfileDropdown();
        });

        editProfileBtn?.addEventListener('click', openProfileEdit);
        closeProfileBtn?.addEventListener('click', closeProfileEdit);
        saveProfileBtn?.addEventListener('click', saveProfile);
        profileModal?.addEventListener('click', (e) => {
            if (e.target === profileModal) closeProfileEdit();
        });

        profilePhotoInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 3 * 1024 * 1024) {
                alert('Ukuran foto maks. 3 MB.');
                return;
            }
            try {
                pendingPhotoUrl = await resizeImageFile(file);
                updateProfileUI();
            } catch (err) {
                alert('Gagal memuat gambar.');
            }
        });

        removePhotoBtn?.addEventListener('click', () => {
            pendingPhotoUrl = '';
            updateProfileUI();
        });

        darkModeToggle?.addEventListener('change', async () => {
            const dark = darkModeToggle.checked;
            applyTheme(dark);
            try {
                await updateSettings({
                    darkMode: dark,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });
            } catch (err) {
                console.warn('Gagal menyimpan tema:', err);
            }
        });

        settingsBtn?.addEventListener('click', () => {
            closeProfileDropdown();
            openSettings();
        });
        closeSettingsBtn?.addEventListener('click', closeSettings);
        closeModalBtn?.addEventListener('click', closeModal);
        closeNoteBtn?.addEventListener('click', closeModal);
        closePinModalBtn?.addEventListener('click', closePinModal);
        verifyPinBtn?.addEventListener('click', verifyPinSubmit);
        verifyPinInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') verifyPinSubmit();
        });

        settingsModal?.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettings();
        });
        modalContainer?.addEventListener('click', (e) => {
            if (e.target === modalContainer) closeModal();
        });
        pinModal?.addEventListener('click', (e) => {
            if (e.target === pinModal) closePinModal();
        });

        noteForm?.addEventListener('submit', (e) => { e.preventDefault(); closeModal(); });
        noteTitleInput?.addEventListener('input', scheduleAutoSave);
        noteContentEditor?.addEventListener('input', scheduleAutoSave);

        pinNoteBtn?.addEventListener('click', () => {
            const id = noteIdInput?.value;
            if (id) togglePin(id, !currentNoteMeta.pinned);
        });
        lockNoteBtn?.addEventListener('click', () => {
            const id = noteIdInput?.value;
            if (id) toggleLock(id, !currentNoteMeta.locked);
        });
        archiveNoteBtn?.addEventListener('click', async () => {
            const id = noteIdInput?.value;
            if (!id) return;
            const next = !currentNoteMeta.archived;
            if (next && !confirm('Arsipkan catatan ini?')) return;
            await toggleArchive(id, next);
        });

        deleteNoteBtn?.addEventListener('click', async () => {
            const id = noteIdInput?.value;
            if (!id || !confirm('Hapus permanen?')) return;
            await database.ref('notes/' + currentUserId).child(id).remove();
            isModalOpen = false;
            modalContainer?.classList.add('hidden');
            document.body.classList.remove('modal-open');
            resetAutoSaveState();
        });

        logoutButton?.addEventListener('click', async () => {
            closeProfileDropdown();
            if (notesListener) notesRef?.off('value', notesListener);
            if (settingsListener) settingsRef?.off('value', settingsListener);
            HaruSecurity.clearUnlockSession();
            await auth.signOut();
            window.location.href = 'index.html';
        });

        savePinBtn?.addEventListener('click', () => {
            saveGlobalPin($('new-pin-input')?.value, $('confirm-pin-input')?.value);
        });
        changePinBtn?.addEventListener('click', () => {
            changeGlobalPin(
                $('old-pin-input')?.value,
                $('change-new-pin-input')?.value,
                $('change-confirm-pin-input')?.value
            );
        });
        removePinBtn?.addEventListener('click', removeGlobalPin);

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
        underlineBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('underline', false, null);
            noteContentEditor?.focus();
            scheduleAutoSave();
        });
        strikeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand('strikeThrough', false, null);
            noteContentEditor?.focus();
            scheduleAutoSave();
        });
        uppercaseBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            const sel = window.getSelection();
            if (sel?.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const text = range.toString();
                if (text) {
                    const span = document.createElement('span');
                    span.style.textTransform = 'uppercase';
                    span.textContent = text;
                    range.deleteContents();
                    range.insertNode(span);
                }
            }
            noteContentEditor?.focus();
            scheduleAutoSave();
        });
        quoteBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            wrapSelection('blockquote', 'note-quote');
        });
        spoilerBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            wrapSelection('span', 'spoiler');
        });

        let lastScrollTop = 0;
        window.addEventListener('scroll', () => {
            if (!mainHeader || window.innerWidth > 768) {
                mainHeader?.classList.remove('header-hidden');
                return;
            }
            const st = window.pageYOffset || document.documentElement.scrollTop;
            if (st <= 0) mainHeader.classList.remove('header-hidden');
            else if (st > lastScrollTop && st > mainHeader.offsetHeight) mainHeader.classList.add('header-hidden');
            else if (st < lastScrollTop) mainHeader.classList.remove('header-hidden');
            lastScrollTop = st;
        });
    };

    const initNotesForUser = (user) => {
        currentUserId = user.uid;
        currentUserEmail = user.email || '';

        notesRef = database.ref('notes/' + currentUserId);
        if (notesListener) notesRef.off('value', notesListener);
        notesListener = notesRef.on('value', (snap) => renderNotes(snap.val()));

        settingsRef = database.ref('userSettings/' + currentUserId);
        useNotesSettings = false;
        if (settingsListener && settingsRef) {
            settingsRef.off('value', settingsListener);
        }
        settingsListener = settingsRef.on('value', (snap) => {
            applySettingsData(snap.val());
        }, (error) => {
            if (error && error.code === 'PERMISSION_DENIED') {
                switchToNotesSettings();
            }
        });

        updateViewUI();
        initSidebarLayout();
        showApp();
    };

    const waitForFirebase = () => new Promise((resolve, reject) => {
        let w = 0;
        const tick = () => {
            if (typeof firebase !== 'undefined' && typeof auth !== 'undefined' && typeof database !== 'undefined' && typeof HaruSecurity !== 'undefined') {
                resolve();
                return;
            }
            w += 50;
            if (w >= 12000) reject(new Error('Firebase tidak termuat. Periksa koneksi internet.'));
            else setTimeout(tick, 50);
        };
        tick();
    });

    const start = async () => {
        bindEvents();
        await waitForFirebase();
        auth.onAuthStateChanged((user) => {
            if (authReady && !user) {
                window.location.href = 'index.html';
                return;
            }
            authReady = true;
            if (user) initNotesForUser(user);
            else window.location.href = 'index.html';
        });
    };

    const startWithError = (msg) => {
        appLoading?.classList.remove('hidden');
        const p = appLoading?.querySelector('p');
        if (p) p.textContent = msg;
        appLoading?.querySelector('.loading-spinner')?.style && (appLoading.querySelector('.loading-spinner').style.display = 'none');
    };

    const run = () => start().catch((e) => startWithError(e.message));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
})();
