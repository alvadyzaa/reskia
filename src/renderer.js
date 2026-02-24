(() => {
  // ─── STATE ────────────────────────────────
  let detectedBrowsers = [];
  let allProfiles = [];          // all scanned profiles (all browsers)
  let displayedProfiles = [];    // currently shown (filtered by browser + search)
  let selectedProfiles = [];
  let currentSid = null;
  let restoreExtractDir = null;
  let restoreBackupProfiles = [];
  let restoreSidResult = null;
  let restoreIntegrity = null;
  let lastRestoreSource = null;
  let activeBrowserFilter = null; // null = all, or browserKey
  let pendingAction = null;
  let privacyMode = false;

  // ─── DOM REFS ─────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const navBtns = $$('.nav-btn');
  const panels = $$('.panel');

  const btnDetect = $('#btnDetect');
  const btnScanAll = $('#btnScanAll');
  const detectedBrowsersEl = $('#detectedBrowsers');
  const searchContainer = $('#searchContainer');
  const liveSearch = $('#liveSearch');
  const profileTableContainer = $('#profileTableContainer');
  const profileTableBody = $('#profileTableBody');
  const profileCount = $('#profileCount');
  const selectAll = $('#selectAll');
  const selectAllHead = $('#selectAllHead');
  const currentSidDisplay = $('#currentSidDisplay');

  const backupPath = $('#backupPath');
  const btnBrowseBackup = $('#btnBrowseBackup');
  const enableEncryption = $('#enableEncryption');
  const passwordRow = $('#passwordRow');
  const encryptionPassword = $('#encryptionPassword');
  const encryptionPasswordConfirm = $('#encryptionPasswordConfirm');
  const btnTogglePassword = $('#btnTogglePassword');
  const backupProfilesSummary = $('#backupProfilesSummary');
  const btnStartBackup = $('#btnStartBackup');
  const backupProgress = $('#backupProgress');
  const backupProgressBar = $('#backupProgressBar');
  const backupLog = $('#backupLog');

  const restoreSource = $('#restoreSource');
  const btnBrowseRestoreFile = $('#btnBrowseRestoreFile');
  const btnBrowseRestoreFolder = $('#btnBrowseRestoreFolder');
  const btnRefreshRestore = $('#btnRefreshRestore');
  const restorePasswordRow = $('#restorePasswordRow');
  const restorePasswordInput = $('#restorePassword');
  const btnLoadEncrypted = $('#btnLoadEncrypted');
  const migrationWarning = $('#migrationWarning');
  const restoreStatus = $('#restoreStatus');
  const sidBadge = $('#sidBadge');
  const integrityBadge = $('#integrityBadge');
  const restoreProfilesContainer = $('#restoreProfilesContainer');
  const restoreProfileTableBody = $('#restoreProfileTableBody');
  const restoreProfileCount = $('#restoreProfileCount');
  const restoreSelectAll = $('#restoreSelectAll');
  const restoreSelectAllHead = $('#restoreSelectAllHead');
  const btnStartRestore = $('#btnStartRestore');
  const restoreSafetyModal = $('#restoreSafetyModal');
  const sidMismatchWarning = $('#sidMismatchWarning');
  const restoreConfirmInput = $('#restoreConfirmInput');
  const btnCancelRestore = $('#btnCancelRestore');
  const btnConfirmRestore = $('#btnConfirmRestore');
  const restoreProgress = $('#restoreProgress');
  const restoreProgressBar = $('#restoreProgressBar');
  const restoreLog = $('#restoreLog');
  const browserCloseModal = $('#browserCloseModal');
  const btnCancelBrowserClose = $('#btnCancelBrowserClose');
  const btnConfirmBrowserClose = $('#btnConfirmBrowserClose');
  const btnPrivacy = $('#btnPrivacy');
  const privacyLabel = $('#privacyLabel');

  // ─── OFFICIAL BROWSER SVG ICONS (Simple Icons) ──
  const BROWSER_SVGS = {
    google_chrome: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#4285F4"><path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z"/></svg>`,
    brave_browser: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#FB542B"><path d="M15.68 0l2.096 2.38s1.84-.512 2.709.358c.868.87 1.584 1.638 1.584 1.638l-.562 1.381.715 2.047s-2.104 7.98-2.35 8.955c-.486 1.919-.818 2.66-2.198 3.633-1.38.972-3.884 2.66-4.293 2.916-.409.256-.92.692-1.38.692-.46 0-.97-.436-1.38-.692a185.796 185.796 0 01-4.293-2.916c-1.38-.973-1.712-1.714-2.197-3.633-.247-.975-2.351-8.955-2.351-8.955l.715-2.047-.562-1.381s.716-.768 1.585-1.638c.868-.87 2.708-.358 2.708-.358L8.321 0h7.36z"/></svg>`,
    microsoft_edge: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#0078D7"><path d="M21.86 17.205a8.006 8.006 0 01-3.654 3.174 7.837 7.837 0 01-3.279.653c-2 0-3.87-.722-5.33-2.013a7.446 7.446 0 01-2.48-4.37h3.57a4.31 4.31 0 001.395 2.182c.871.733 1.996 1.183 3.27 1.183 1.91 0 3.59-1.004 4.508-2.61zM12 3.5c-2.28 0-4.345.903-5.862 2.372a8.405 8.405 0 00-2.385 5.087h3.694A4.803 4.803 0 0112 7.507c1.404 0 2.66.602 3.537 1.56A4.874 4.874 0 0116.87 12.5H20.5C20.5 7.529 16.694 3.5 12 3.5z"/></svg>`,
    opera: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#FF1B2D"><path d="M8.051 5.238c-1.328 1.566-2.186 3.883-2.246 6.48v.564c.061 2.598.918 4.912 2.246 6.479 1.721 2.236 4.279 3.654 7.139 3.654 1.756 0 3.4-.537 4.807-1.471C17.879 22.846 15.074 24 12 24c-.192 0-.383-.004-.57-.014C5.064 23.689 0 18.436 0 12 0 5.371 5.373 0 12 0h.045c3.055.012 5.84 1.166 7.953 3.055-1.408-.93-3.051-1.471-4.81-1.471-2.858 0-5.417 1.42-7.14 3.654h.003zM24 12c0 3.556-1.545 6.748-4.002 8.945-3.078 1.5-5.946.451-6.896-.205 3.023-.664 5.307-4.32 5.307-8.74 0-4.422-2.283-8.075-5.307-8.74.949-.654 3.818-1.703 6.896-.205C22.455 5.25 24 8.445 24 12z"/></svg>`,
    opera_gx: `<svg width="20" height="20" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#1a1a2e"/><g transform="scale(0.75) translate(4,4)"><path d="M8.051 5.238c-1.328 1.566-2.186 3.883-2.246 6.48v.564c.061 2.598.918 4.912 2.246 6.479 1.721 2.236 4.279 3.654 7.139 3.654 1.756 0 3.4-.537 4.807-1.471C17.879 22.846 15.074 24 12 24c-.192 0-.383-.004-.57-.014C5.064 23.689 0 18.436 0 12 0 5.371 5.373 0 12 0h.045c3.055.012 5.84 1.166 7.953 3.055-1.408-.93-3.051-1.471-4.81-1.471-2.858 0-5.417 1.42-7.14 3.654h.003zM24 12c0 3.556-1.545 6.748-4.002 8.945-3.078 1.5-5.946.451-6.896-.205 3.023-.664 5.307-4.32 5.307-8.74 0-4.422-2.283-8.075-5.307-8.74.949-.654 3.818-1.703 6.896-.205C22.455 5.25 24 8.445 24 12z" fill="#FF1B2D"/></g></svg>`,
    vivaldi: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#EF3939"><path d="M12 0C6.75 0 3.817 0 1.912 1.904.007 3.81 0 6.75 0 12s0 8.175 1.912 10.08C3.825 23.985 6.75 24 12 24c5.25 0 8.183 0 10.088-1.904C23.993 20.19 24 17.25 24 12s0-8.175-1.912-10.08C20.175.015 17.25 0 12 0zm-.168 3a9 9 0 016.49 2.648 9 9 0 010 12.704A9 9 0 1111.832 3zM7.568 7.496a1.433 1.433 0 00-.142.004A1.5 1.5 0 006.21 9.75l1.701 3c.93 1.582 1.839 3.202 2.791 4.822a1.417 1.417 0 001.41.75 1.5 1.5 0 001.223-.81l4.447-7.762A1.56 1.56 0 0018 8.768a1.5 1.5 0 10-2.828.914 2.513 2.513 0 01.256 1.119v.246a2.393 2.393 0 01-2.52 2.13 2.348 2.348 0 01-1.965-1.214c-.307-.51-.6-1.035-.9-1.553-.42-.72-.826-1.41-1.246-2.16a1.433 1.433 0 00-1.229-.754Z"/></svg>`,
    chromium: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#4589F6" opacity="0.85"><path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z"/></svg>`,
    firefox: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#FF7139"><path d="M8.824 7.287c.008 0 .004 0 0 0zm-2.8-1.4c.006 0 .003 0 0 0zm16.754 2.161c-.505-1.215-1.53-2.528-2.333-2.943.654 1.283 1.033 2.57 1.177 3.53l.002.02c-1.314-3.278-3.544-4.6-5.366-7.477-.091-.147-.184-.292-.273-.446a3.545 3.545 0 01-.13-.24 2.118 2.118 0 01-.172-.46.03.03 0 00-.027-.03.038.038 0 00-.021 0l-.006.001a.037.037 0 00-.01.005L15.624 0c-2.585 1.515-3.657 4.168-3.932 5.856a6.197 6.197 0 00-2.305.587.297.297 0 00-.147.37c.057.162.24.24.396.17a5.622 5.622 0 012.008-.523l.067-.005a5.847 5.847 0 011.957.222l.095.03a5.816 5.816 0 01.616.228c.08.036.16.073.238.112l.107.055a5.835 5.835 0 01.368.211 5.953 5.953 0 012.034 2.104c-.62-.437-1.733-.868-2.803-.681 4.183 2.09 3.06 9.292-2.737 9.02a5.164 5.164 0 01-1.513-.292 4.42 4.42 0 01-.538-.232c-1.42-.735-2.593-2.121-2.74-3.806 0 0 .537-2 3.845-2 .357 0 1.38-.998 1.398-1.287-.005-.095-2.029-.9-2.817-1.677-.422-.416-.622-.616-.8-.767a3.47 3.47 0 00-.301-.227 5.388 5.388 0 01-.032-2.842c-1.195.544-2.124 1.403-2.8 2.163h-.006c-.46-.584-.428-2.51-.402-2.913-.006-.025-.343.176-.389.206-.406.29-.787.616-1.136.974-.397.403-.76.839-1.085 1.303a9.816 9.816 0 00-1.562 3.52c-.003.013-.11.487-.19 1.073-.013.09-.026.181-.037.272a7.8 7.8 0 00-.069.667l-.002.034-.023.387-.001.06C.386 18.795 5.593 24 12.016 24c5.752 0 10.527-4.176 11.463-9.661.02-.149.035-.298.052-.448.232-1.994-.025-4.09-.753-5.844z"/></svg>`,
  };

  function getBrowserSvg(key) {
    return BROWSER_SVGS[key] || `<svg width="20" height="20" viewBox="0 0 24 24" fill="#58a6ff"><circle cx="12" cy="12" r="10" opacity="0.5"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`;
  }

  // ─── INIT ─────────────────────────────────
  async function init() {
    currentSid = await window.api.getSid();
    currentSidDisplay.textContent = currentSid || 'Unknown';
    setupEventListeners();
    setupProgressListeners();
  }

  function switchPanel(panelId) {
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.panel === panelId));
    panels.forEach(p => p.classList.toggle('active', p.id === `panel-${panelId}`));
    if (panelId === 'backup') updateBackupSummary();
  }

  // ─── EVENT LISTENERS ──────────────────────
  function setupEventListeners() {
    navBtns.forEach(btn => btn.addEventListener('click', () => switchPanel(btn.dataset.panel)));
    btnDetect.addEventListener('click', handleDetect);
    btnScanAll.addEventListener('click', handleScanAll);
    selectAll.addEventListener('change', () => handleSelectAll(selectAll.checked));
    selectAllHead.addEventListener('change', () => handleSelectAll(selectAllHead.checked));
    liveSearch.addEventListener('input', handleSearch);

    btnBrowseBackup.addEventListener('click', async () => {
      const folder = await window.api.browseFolder();
      if (folder) { backupPath.value = folder; updateBackupButton(); }
    });

    enableEncryption.addEventListener('change', () => {
      passwordRow.style.display = enableEncryption.checked ? 'flex' : 'none';
      updateBackupButton();
    });

    btnTogglePassword.addEventListener('click', () => {
      const t = encryptionPassword.type === 'password' ? 'text' : 'password';
      encryptionPassword.type = t;
      encryptionPasswordConfirm.type = t;
    });

    btnStartBackup.addEventListener('click', () => showBrowserCloseConfirm('backup'));
    btnBrowseRestoreFile.addEventListener('click', handleBrowseRestoreFile);
    btnBrowseRestoreFolder.addEventListener('click', handleBrowseRestoreFolder);
    btnRefreshRestore.addEventListener('click', handleRefreshRestore);
    btnLoadEncrypted.addEventListener('click', handleLoadEncryptedBackup);

    document.querySelectorAll('input[name="restoreMode"]').forEach(r => {
      r.addEventListener('change', () => {
        migrationWarning.style.display = r.value === 'migration' && r.checked ? 'block' : '';
        if (r.value === 'same' && r.checked) migrationWarning.style.display = 'none';
      });
    });

    restoreSelectAll.addEventListener('change', () => handleRestoreSelectAll(restoreSelectAll.checked));
    restoreSelectAllHead.addEventListener('change', () => handleRestoreSelectAll(restoreSelectAllHead.checked));
    btnStartRestore.addEventListener('click', showRestoreSafetyModal);
    btnCancelRestore.addEventListener('click', () => restoreSafetyModal.style.display = 'none');
    restoreConfirmInput.addEventListener('input', () => {
      btnConfirmRestore.disabled = restoreConfirmInput.value !== 'RESTORE';
    });
    btnConfirmRestore.addEventListener('click', handleConfirmRestore);
    btnCancelBrowserClose.addEventListener('click', () => { browserCloseModal.style.display = 'none'; pendingAction = null; });
    btnConfirmBrowserClose.addEventListener('click', () => { browserCloseModal.style.display = 'none'; if (pendingAction === 'backup') handleStartBackup(); pendingAction = null; });

    // Privacy mode toggle
    btnPrivacy.addEventListener('click', togglePrivacy);

    document.addEventListener('input', (e) => {
      if (e.target.id === 'encryptionPassword' || e.target.id === 'encryptionPasswordConfirm') updateBackupButton();
    });
  }

  function setupProgressListeners() {
    window.api.onBackupProgress((data) => {
      backupProgress.style.display = 'block';
      if (data.progress != null) backupProgressBar.style.width = data.progress + '%';
      appendLog(backupLog, data.message, data.step);
    });
    window.api.onRestoreProgress((data) => {
      restoreProgress.style.display = 'block';
      if (data.progress != null) restoreProgressBar.style.width = data.progress + '%';
      appendLog(restoreLog, data.message, data.step);
    });
  }

  function appendLog(logEl, message, step) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    if (step === 'done') entry.classList.add('success');
    else if (step === 'error') entry.classList.add('error');
    else entry.classList.add('info');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function showBrowserCloseConfirm(action) {
    pendingAction = action;
    browserCloseModal.style.display = 'flex';
  }

  // ─── PRIVACY MODE ─────────────────────────
  function togglePrivacy() {
    privacyMode = !privacyMode;
    document.body.classList.toggle('privacy-active', privacyMode);
    privacyLabel.textContent = privacyMode ? 'Privacy: ON' : 'Privacy Mode';
    btnPrivacy.classList.toggle('privacy-on', privacyMode);
  }

  // ─── DETECT BROWSERS ─────────────────────
  async function handleDetect() {
    btnDetect.disabled = true;
    btnDetect.querySelector('svg').style.animation = 'spin 1s linear infinite';
    detectedBrowsers = await window.api.detectBrowsers();
    renderDetectedBrowsers();
    btnScanAll.disabled = detectedBrowsers.length === 0;
    btnDetect.querySelector('svg').style.animation = '';
    btnDetect.disabled = false;
  }

  function renderDetectedBrowsers() {
    detectedBrowsersEl.innerHTML = '';
    if (detectedBrowsers.length === 0) {
      detectedBrowsersEl.innerHTML = '<p class="no-data">No browsers detected.</p>';
      return;
    }
    for (const b of detectedBrowsers) {
      const chip = document.createElement('div');
      chip.className = 'browser-chip clickable';
      chip.dataset.browserKey = b.key;
      chip.innerHTML = `
        <span class="chip-icon">${getBrowserSvg(b.key)}</span>
        <span class="chip-label">
          <span class="chip-name">${b.name}</span>
          <span class="chip-path privacy-blur">${truncatePath(b.userDataPath)}</span>
        </span>
        <span class="chip-status">Click to scan</span>
      `;
      chip.addEventListener('click', () => handleBrowserChipClick(b, chip));
      detectedBrowsersEl.appendChild(chip);
    }
  }

  // ─── SCAN ONE BROWSER (chip click) ────────
  async function handleBrowserChipClick(browser, chipEl) {
    const statusEl = chipEl.querySelector('.chip-status');
    statusEl.textContent = '⏳ Scanning...';
    chipEl.classList.add('loading');

    const newProfiles = await window.api.scanProfiles([browser]);

    // Replace profiles for this browser
    allProfiles = allProfiles.filter(p => p.browserKey !== browser.key);
    allProfiles.push(...newProfiles);

    statusEl.textContent = `✅ ${newProfiles.length} profiles`;
    chipEl.classList.remove('loading');
    chipEl.classList.add('scanned');

    // Set filter to THIS browser and render
    activeBrowserFilter = browser.key;
    highlightActiveChip();
    applyFilters();
    profileTableContainer.style.display = 'block';
    searchContainer.style.display = 'flex';
  }

  // ─── SCAN ALL BROWSERS ────────────────────
  async function handleScanAll() {
    btnScanAll.disabled = true;
    allProfiles = [];

    for (const chip of detectedBrowsersEl.querySelectorAll('.browser-chip')) {
      const statusEl = chip.querySelector('.chip-status');
      statusEl.textContent = '⏳ Scanning...';
      chip.classList.add('loading');
    }

    const newProfiles = await window.api.scanProfiles(detectedBrowsers);
    allProfiles = newProfiles;

    // Update all chips
    for (const chip of detectedBrowsersEl.querySelectorAll('.browser-chip')) {
      const key = chip.dataset.browserKey;
      const count = allProfiles.filter(p => p.browserKey === key).length;
      chip.querySelector('.chip-status').textContent = `✅ ${count} profiles`;
      chip.classList.remove('loading');
      chip.classList.add('scanned');
    }

    activeBrowserFilter = null; // Show all
    highlightActiveChip();
    applyFilters();
    profileTableContainer.style.display = 'block';
    searchContainer.style.display = 'flex';
    btnScanAll.disabled = false;
  }

  function highlightActiveChip() {
    detectedBrowsersEl.querySelectorAll('.browser-chip').forEach(chip => {
      chip.classList.toggle('active-filter', activeBrowserFilter === chip.dataset.browserKey);
    });
  }

  function truncatePath(p) {
    if (p.length <= 50) return p;
    return '...' + p.slice(-47);
  }

  // ─── LIVE SEARCH ──────────────────────────
  function handleSearch() {
    applyFilters();
  }

  function applyFilters() {
    const query = liveSearch.value.toLowerCase().trim();
    displayedProfiles = allProfiles.filter(p => {
      // Browser filter
      if (activeBrowserFilter && p.browserKey !== activeBrowserFilter) return false;
      // Search filter
      if (query) {
        const searchStr = `${p.profileName} ${p.email} ${p.folderName} ${p.browserName} ${p.gaiaName}`.toLowerCase();
        if (!searchStr.includes(query)) return false;
      }
      return true;
    });
    renderProfileTable();
  }

  // ─── PROFILE TABLE ────────────────────────
  function renderProfileTable() {
    profileTableBody.innerHTML = '';
    profileCount.textContent = `${displayedProfiles.length} profiles`;

    for (let i = 0; i < displayedProfiles.length; i++) {
      const p = displayedProfiles[i];
      const tr = document.createElement('tr');
      const lastUsed = p.lastUsed ? new Date(p.lastUsed).toLocaleString() : '—';
      const account = p.email || (p.accountInfo?.length ? p.accountInfo.join(', ') : '') || p.gaiaName || '—';
      const isChecked = selectedProfiles.some(sp => sp.path === p.path);

      tr.innerHTML = `
        <td><input type="checkbox" data-path="${esc(p.path)}" class="profile-check" ${isChecked ? 'checked' : ''}></td>
        <td><span class="browser-icon-cell">${getBrowserSvg(p.browserKey)}</span> ${esc(p.browserName)}</td>
        <td class="privacy-blur"><strong>${esc(p.profileName)}</strong></td>
        <td class="privacy-blur"><code>${esc(p.folderName)}</code></td>
        <td class="privacy-blur">${esc(account)}</td>
        <td>${lastUsed}</td>
        <td><span class="sid-match">● Match</span></td>
      `;
      profileTableBody.appendChild(tr);
    }

    profileTableBody.querySelectorAll('.profile-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const profilePath = cb.dataset.path;
        const profile = allProfiles.find(p => p.path === profilePath);
        if (!profile) return;
        if (cb.checked) {
          if (!selectedProfiles.some(sp => sp.path === profilePath)) selectedProfiles.push(profile);
        } else {
          selectedProfiles = selectedProfiles.filter(sp => sp.path !== profilePath);
        }
        updateSelectAllState();
        updateBackupSummary();
        updateBackupButton();
      });
    });

    updateSelectAllState();
  }

  function esc(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ─── SELECT ALL ───────────────────────────
  function handleSelectAll(checked) {
    selectAll.checked = checked;
    selectAllHead.checked = checked;
    profileTableBody.querySelectorAll('.profile-check').forEach(cb => {
      cb.checked = checked;
      const profilePath = cb.dataset.path;
      const profile = allProfiles.find(p => p.path === profilePath);
      if (!profile) return;
      if (checked) {
        if (!selectedProfiles.some(sp => sp.path === profilePath)) selectedProfiles.push(profile);
      } else {
        selectedProfiles = selectedProfiles.filter(sp => sp.path !== profilePath);
      }
    });
    updateBackupSummary();
    updateBackupButton();
  }

  function updateSelectAllState() {
    const boxes = profileTableBody.querySelectorAll('.profile-check');
    const all = boxes.length > 0 && [...boxes].every(cb => cb.checked);
    selectAll.checked = all;
    selectAllHead.checked = all;
  }

  // ─── BACKUP ───────────────────────────────
  function updateBackupSummary() {
    if (selectedProfiles.length === 0) {
      backupProfilesSummary.innerHTML = '<p>No profiles selected. Go to <strong>Detect & Preview</strong> first.</p>';
      return;
    }
    const chips = selectedProfiles.map(p => {
      return `<span class="profile-chip-item">${getBrowserSvg(p.browserKey)} ${esc(p.browserName)} → ${esc(p.profileName)}</span>`;
    }).join('');
    backupProfilesSummary.innerHTML = `
      <p style="margin-bottom:8px"><strong>${selectedProfiles.length}</strong> profiles selected:</p>
      <div class="profile-chips">${chips}</div>
    `;
  }

  function updateBackupButton() {
    const hasProfiles = selectedProfiles.length > 0;
    const hasPath = backupPath.value.trim() !== '';
    const encOk = !enableEncryption.checked || (
      encryptionPassword.value.length >= 4 &&
      encryptionPassword.value === encryptionPasswordConfirm.value
    );
    btnStartBackup.disabled = !(hasProfiles && hasPath && encOk);
  }

  async function handleStartBackup() {
    btnStartBackup.disabled = true;
    backupLog.innerHTML = '';
    backupProgressBar.style.width = '0%';
    backupProgress.style.display = 'block';

    const result = await window.api.startBackup({
      selectedProfiles,
      backupDir: backupPath.value,
      enableEncryption: enableEncryption.checked,
      encryptionPassword: enableEncryption.checked ? encryptionPassword.value : null,
    });

    if (result.success) appendLog(backupLog, `✅ Backup saved: ${result.path}`, 'done');
    else appendLog(backupLog, `❌ ${result.error}`, 'error');
    btnStartBackup.disabled = false;
  }

  // ─── RESTORE ──────────────────────────────
  async function handleBrowseRestoreFile() {
    const file = await window.api.browseFile();
    if (!file) return;
    restoreSource.value = file;
    lastRestoreSource = file;
    btnRefreshRestore.style.display = 'inline-flex';

    const ext = file.toLowerCase();
    if (ext.endsWith('.enc')) {
      restorePasswordRow.style.display = 'flex';
    } else if (ext.endsWith('.zip')) {
      // Extract ZIP first, then load
      restorePasswordRow.style.display = 'none';
      await extractAndLoadBackup(file, null);
    } else {
      restorePasswordRow.style.display = 'none';
      await loadRestoreBackup(file);
    }
  }

  async function handleBrowseRestoreFolder() {
    const folder = await window.api.browseFolder();
    if (!folder) return;
    restoreSource.value = folder;
    lastRestoreSource = folder;
    restorePasswordRow.style.display = 'none';
    btnRefreshRestore.style.display = 'inline-flex';
    await loadRestoreBackup(folder);
  }

  async function handleRefreshRestore() {
    if (!lastRestoreSource) return;
    btnRefreshRestore.querySelector('svg').style.animation = 'spin 1s linear infinite';
    const ext = lastRestoreSource.toLowerCase();

    if (ext.endsWith('.enc')) {
      if (restorePasswordInput.value) await handleLoadEncryptedBackup();
    } else if (ext.endsWith('.zip')) {
      await extractAndLoadBackup(lastRestoreSource, null);
    } else {
      await loadRestoreBackup(lastRestoreSource);
    }

    btnRefreshRestore.querySelector('svg').style.animation = '';
  }

  async function handleLoadEncryptedBackup() {
    const file = restoreSource.value;
    const password = restorePasswordInput.value;
    if (!file || !password) return;
    btnLoadEncrypted.disabled = true;
    await extractAndLoadBackup(file, password);
    btnLoadEncrypted.disabled = false;
  }

  async function extractAndLoadBackup(filePath, password) {
    const result = await window.api.extractEncryptedBackup({ filePath, password });
    if (result.success) {
      restoreExtractDir = result.extractDir;
      await loadRestoreBackup(result.extractDir);
    } else {
      alert('Failed to load backup: ' + result.error);
    }
  }

  async function loadRestoreBackup(sourcePath) {
    restoreIntegrity = await window.api.checkIntegrity(sourcePath);
    restoreSidResult = await window.api.checkSidMatch(sourcePath);
    restoreBackupProfiles = await window.api.scanBackupProfiles(sourcePath);

    restoreStatus.style.display = 'block';

    if (restoreSidResult.match) {
      sidBadge.textContent = '🟢 SID: Match';
      sidBadge.className = 'badge badge-green';
    } else if (restoreSidResult.backupSid) {
      sidBadge.textContent = '🔴 SID: Mismatch';
      sidBadge.className = 'badge badge-red';
    } else {
      sidBadge.textContent = '⚠️ SID: Not Found';
      sidBadge.className = 'badge badge-yellow';
    }

    if (restoreIntegrity.valid) {
      integrityBadge.textContent = '🟢 Integrity: OK';
      integrityBadge.className = 'badge badge-green';
    } else {
      integrityBadge.textContent = '🔴 Integrity: Incomplete';
      integrityBadge.className = 'badge badge-red';
    }

    const existingWarning = document.querySelector('.integrity-warning');
    if (existingWarning) existingWarning.remove();

    if (restoreIntegrity.missing.length > 0) {
      const warningDiv = document.createElement('div');
      warningDiv.className = 'integrity-warning';
      warningDiv.innerHTML = `
        <h4>⚠️ Incomplete Backup</h4>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">Missing items:</p>
        <ul>${restoreIntegrity.missing.map(m => `<li>${m}</li>`).join('')}</ul>
      `;
      restoreStatus.after(warningDiv);
    }

    renderRestoreProfileTable();
  }

  function renderRestoreProfileTable() {
    restoreProfilesContainer.style.display = 'block';
    restoreProfileTableBody.innerHTML = '';
    restoreProfileCount.textContent = `${restoreBackupProfiles.length} profiles`;

    for (let i = 0; i < restoreBackupProfiles.length; i++) {
      const p = restoreBackupProfiles[i];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" data-idx="${i}" class="restore-profile-check"></td>
        <td>${getBrowserSvg(p.browserKey)} ${esc(p.browserName)}</td>
        <td><strong>${esc(p.folderName)}</strong></td>
        <td>Restore</td>
      `;
      restoreProfileTableBody.appendChild(tr);
    }
    restoreProfileTableBody.querySelectorAll('.restore-profile-check').forEach(cb => {
      cb.addEventListener('change', updateRestoreButton);
    });
    updateRestoreButton();
  }

  function handleRestoreSelectAll(checked) {
    restoreSelectAll.checked = checked;
    restoreSelectAllHead.checked = checked;
    restoreProfileTableBody.querySelectorAll('.restore-profile-check').forEach(cb => cb.checked = checked);
    updateRestoreButton();
  }

  function updateRestoreButton() {
    const anyChecked = restoreProfileTableBody.querySelector('.restore-profile-check:checked');
    btnStartRestore.disabled = !anyChecked;
    const boxes = restoreProfileTableBody.querySelectorAll('.restore-profile-check');
    const all = boxes.length > 0 && [...boxes].every(cb => cb.checked);
    restoreSelectAll.checked = all;
    restoreSelectAllHead.checked = all;
  }

  function showRestoreSafetyModal() {
    restoreConfirmInput.value = '';
    btnConfirmRestore.disabled = true;
    sidMismatchWarning.style.display = restoreSidResult && !restoreSidResult.match ? 'block' : 'none';
    restoreSafetyModal.style.display = 'flex';
    restoreConfirmInput.focus();
  }

  async function handleConfirmRestore() {
    restoreSafetyModal.style.display = 'none';
    btnStartRestore.disabled = true;
    restoreLog.innerHTML = '';
    restoreProgressBar.style.width = '0%';
    restoreProgress.style.display = 'block';

    const selectedRestoreProfiles = [];
    restoreProfileTableBody.querySelectorAll('.restore-profile-check:checked').forEach(cb => {
      selectedRestoreProfiles.push(restoreBackupProfiles[parseInt(cb.dataset.idx)]);
    });

    const result = await window.api.startRestore({
      backupSource: restoreExtractDir || restoreSource.value,
      password: restorePasswordInput.value || null,
      selectedProfiles: selectedRestoreProfiles,
      migrationMode: document.querySelector('input[name="restoreMode"]:checked').value === 'migration',
      overwriteMode: document.querySelector('input[name="overwriteMode"]:checked').value,
    });

    if (result.success) appendLog(restoreLog, '✅ Restore completed successfully!', 'done');
    else appendLog(restoreLog, `❌ ${result.error}`, 'error');

    if (restoreExtractDir) { await window.api.cleanupExtract(restoreExtractDir); restoreExtractDir = null; }
    btnStartRestore.disabled = false;
  }

  init();
})();
