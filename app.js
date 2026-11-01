/**
 * PWA Video Player (Local File)
 * Complies with Spec & PWA Standards
 * Version 2: Added Watch History & Replay Feature
 */

(() => {
  "use strict";

  // --- DOM Elements ---
  const emptyScreen = document.getElementById("emptyScreen");
  const playerScreen = document.getElementById("playerScreen");
  const historyScreen = document.getElementById("historyScreen");
  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");
  const btnPickVideo = document.getElementById("btnPickVideo");
  const dragDropOverlay = document.getElementById("dragDropOverlay");

  const videoContainer = document.getElementById("videoContainer");
  const video = document.getElementById("videoPlayer");
  const videoTitle = document.getElementById("videoTitle");
  const btnOpenAnother = document.getElementById("btnOpenAnother");

  // History UI elements
  const btnViewHistory = document.getElementById("btnViewHistory");
  const btnHistoryFromPlayer = document.getElementById("btnHistoryFromPlayer");
  const btnBackFromHistory = document.getElementById("btnBackFromHistory");
  const btnClearHistory = document.getElementById("btnClearHistory");
  const historyCountBadge = document.getElementById("historyCountBadge");
  const historySubtitle = document.getElementById("historySubtitle");
  const historyEmptyState = document.getElementById("historyEmptyState");
  const historyListContainer = document.getElementById("historyListContainer");
  const btnHistoryPickVideo = document.getElementById("btnHistoryPickVideo");
  const clearHistoryModal = document.getElementById("clearHistoryModal");
  const btnCloseClearModal = document.getElementById("btnCloseClearModal");
  const btnCancelClear = document.getElementById("btnCancelClear");
  const btnConfirmClear = document.getElementById("btnConfirmClear");

  // Center overlay elements
  const btnCenterPlay = document.getElementById("btnCenterPlay");
  const btnCenterReplay = document.getElementById("btnCenterReplay");
  const bufferSpinner = document.getElementById("bufferSpinner");
  const gestureLeft = document.getElementById("gestureLeft");
  const gestureRight = document.getElementById("gestureRight");
  const seekRippleLeft = document.getElementById("seekRippleLeft");
  const seekRippleRight = document.getElementById("seekRippleRight");

  // Bottom controls
  const btnPlayPause = document.getElementById("btnPlayPause");
  const btnStop = document.getElementById("btnStop");
  const btnReplayFromStart = document.getElementById("btnReplayFromStart");
  const iconPlay = document.getElementById("iconPlay");
  const iconPause = document.getElementById("iconPause");
  const btnRewind10 = document.getElementById("btnRewind10");
  const btnForward10 = document.getElementById("btnForward10");
  const currentTimeEl = document.getElementById("currentTime");
  const durationTimeEl = document.getElementById("durationTime");

  // Seek bar
  const seekContainer = document.getElementById("seekContainer");
  const seekBar = document.getElementById("seekBar");
  const progressBar = document.getElementById("progressBar");
  const bufferedBar = document.getElementById("bufferedBar");
  const seekTooltip = document.getElementById("seekTooltip");

  // Volume
  const volumeGroup = document.getElementById("volumeGroup");
  const btnMute = document.getElementById("btnMute");
  const volumeBar = document.getElementById("volumeBar");
  const iconVolHigh = document.getElementById("iconVolHigh");
  const iconVolLow = document.getElementById("iconVolLow");
  const iconVolMute = document.getElementById("iconVolMute");

  // Speed, Loop, PiP, Fullscreen
  const btnSpeed = document.getElementById("btnSpeed");
  const speedLabel = document.getElementById("speedLabel");
  const speedDropdown = document.getElementById("speedDropdown");
  const speedOptions = document.querySelectorAll(".speed-opt");
  const btnLoop = document.getElementById("btnLoop");
  const btnPip = document.getElementById("btnPip");
  const btnRotate = document.getElementById("btnRotate");
  const btnFullscreen = document.getElementById("btnFullscreen");
  const iconEnterFs = document.getElementById("iconEnterFs");
  const iconExitFs = document.getElementById("iconExitFs");

  // Dialogs & Snackbars
  const iosInstallModal = document.getElementById("iosInstallModal");
  const btnCloseIosModal = document.getElementById("btnCloseIosModal");
  const btnGotItIos = document.getElementById("btnGotItIos");
  const errorModal = document.getElementById("errorModal");
  const errorMessage = document.getElementById("errorMessage");
  const btnCloseErrorModal = document.getElementById("btnCloseErrorModal");
  const btnErrorClose = document.getElementById("btnErrorClose");
  const btnErrorPickFile = document.getElementById("btnErrorPickFile");
  const resumePrompt = document.getElementById("resumePrompt");
  const resumeText = document.getElementById("resumeText");
  const btnResumeYes = document.getElementById("btnResumeYes");
  const btnResumeNo = document.getElementById("btnResumeNo");
  const snackbar = document.getElementById("snackbar");

  // PWA Install & Update Buttons
  const btnInstall = document.getElementById("btnInstall");
  const btnInstallPlayer = document.getElementById("btnInstallPlayer");
  const btnUpdateApp = document.getElementById("btnUpdateApp");
  const updateIcon = document.getElementById("updateIcon");
  const updateLabel = document.getElementById("updateLabel");

  // --- State Variables ---
  let currentFile = null;
  let currentFileHandle = null;
  let currentObjectUrl = null;
  let controlsTimeout = null;
  let isDraggingSeek = false;
  let wakeLock = null;
  let deferredInstallPrompt = null;
  let swRegistration = null;
  let lastTapTime = 0;
  let tapTimeout = null;
  let snackbarTimeout = null;
  let pendingResumeTime = 0;
  let previousScreen = "empty"; // 'empty' | 'player'
  let pendingHistoryReplay = null; // target when picking re-selected file

  // --------------------------------------------------------------------------
  // IndexedDB Storage for Watch History
  // --------------------------------------------------------------------------

  const DB_NAME = "pwa_video_player_db";
  const DB_VERSION = 1;
  const STORE_HISTORY = "watch_history";

  function openHistoryDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          const store = db.createObjectStore(STORE_HISTORY, { keyPath: "id" });
          store.createIndex("lastPlayedAt", "lastPlayedAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function getHistoryKey(file) {
    return `${encodeURIComponent(file.name)}_${file.size}_${file.lastModified || 0}`;
  }

  async function saveOrUpdateHistory(file, handle = null) {
    try {
      const db = await openHistoryDB();
      const id = getHistoryKey(file);

      // Check existing item
      const tx = db.transaction(STORE_HISTORY, "readonly");
      const store = tx.objectStore(STORE_HISTORY);
      const existing = await new Promise((resolve) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      // Prepare data
      const item = existing || {
        id: id,
        name: file.name,
        size: file.size,
        lastModified: file.lastModified || Date.now(),
        duration: 0,
        lastPosition: 0,
        thumbnail: null,
        hasBlob: false,
        hasHandle: false,
      };

      item.lastPlayedAt = Date.now();

      // Store handle if available
      if (handle) {
        item.handle = handle;
        item.hasHandle = true;
      }

      // Try caching blob if under 300MB
      const MAX_BLOB_SIZE = 300 * 1024 * 1024; // 300MB
      if (
        !item.hasHandle &&
        file instanceof Blob &&
        file.size <= MAX_BLOB_SIZE
      ) {
        item.blob = file;
        item.hasBlob = true;
      }

      const writeTx = db.transaction(STORE_HISTORY, "readwrite");
      const writeStore = writeTx.objectStore(STORE_HISTORY);
      writeStore.put(item);

      await new Promise((resolve, reject) => {
        writeTx.oncomplete = resolve;
        writeTx.onerror = () => {
          // If QuotaExceededError, try writing without blob
          if (item.blob) {
            delete item.blob;
            item.hasBlob = false;
            const retryTx = db.transaction(STORE_HISTORY, "readwrite");
            retryTx.objectStore(STORE_HISTORY).put(item);
            retryTx.oncomplete = resolve;
            retryTx.onerror = reject;
          } else {
            reject(writeTx.error);
          }
        };
      });

      updateHistoryBadge();
    } catch (err) {
      console.warn("Could not save watch history:", err);
    }
  }

  async function updateHistoryDurationAndThumbnail(file, duration, thumbnail) {
    try {
      const db = await openHistoryDB();
      const id = getHistoryKey(file);
      const tx = db.transaction(STORE_HISTORY, "readwrite");
      const store = tx.objectStore(STORE_HISTORY);
      const req = store.get(id);
      req.onsuccess = () => {
        const item = req.result;
        if (item) {
          if (duration > 0) item.duration = duration;
          if (thumbnail) item.thumbnail = thumbnail;
          store.put(item);
        }
      };
    } catch (e) {}
  }

  async function updateHistoryPosition(file, position) {
    try {
      const db = await openHistoryDB();
      const id = getHistoryKey(file);
      const tx = db.transaction(STORE_HISTORY, "readwrite");
      const store = tx.objectStore(STORE_HISTORY);
      const req = store.get(id);
      req.onsuccess = () => {
        const item = req.result;
        if (item) {
          item.lastPosition = position;
          item.lastPlayedAt = Date.now();
          store.put(item);
        }
      };
    } catch (e) {}
  }

  async function getAllHistory() {
    try {
      const db = await openHistoryDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_HISTORY, "readonly");
        const store = tx.objectStore(STORE_HISTORY);
        const index = store.index("lastPlayedAt");
        const req = index.openCursor(null, "prev");
        const results = [];
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => resolve([]);
      });
    } catch (err) {
      return [];
    }
  }

  async function deleteHistoryItem(id) {
    try {
      const db = await openHistoryDB();
      const tx = db.transaction(STORE_HISTORY, "readwrite");
      tx.objectStore(STORE_HISTORY).delete(id);
      await new Promise((r) => (tx.oncomplete = r));
      updateHistoryBadge();
      renderHistoryList();
      showSnackbar("Đã xoá video khỏi lịch sử.");
    } catch (e) {}
  }

  async function clearAllHistory() {
    try {
      const db = await openHistoryDB();
      const tx = db.transaction(STORE_HISTORY, "readwrite");
      tx.objectStore(STORE_HISTORY).clear();
      await new Promise((r) => (tx.oncomplete = r));
      updateHistoryBadge();
      renderHistoryList();
      showSnackbar("Đã xoá toàn bộ lịch sử.");
    } catch (e) {}
  }

  async function updateHistoryBadge() {
    const list = await getAllHistory();
    const count = list.length;
    if (historyCountBadge) {
      if (count > 0) {
        historyCountBadge.textContent = count > 99 ? "99+" : count;
        historyCountBadge.classList.remove("hidden");
      } else {
        historyCountBadge.classList.add("hidden");
      }
    }
    if (historySubtitle) {
      historySubtitle.textContent = `${count} video`;
    }
  }

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);

    const pad = (num) => num.toString().padStart(2, "0");
    if (h > 0) {
      return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function formatDate(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);

    const pad = (n) => n.toString().padStart(2, "0");
    const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

    if (diffHours < 24 && now.getDate() === date.getDate()) {
      return `Hôm nay ${timeStr}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.getDate() === date.getDate()) {
      return `Hôm qua ${timeStr}`;
    }
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${timeStr}`;
  }

  function showSnackbar(message, duration = 3000) {
    if (!snackbar) return;
    snackbar.textContent = message;
    snackbar.classList.add("show");
    clearTimeout(snackbarTimeout);
    snackbarTimeout = setTimeout(() => {
      snackbar.classList.remove("show");
    }, duration);
  }

  function captureVideoThumbnail() {
    try {
      if (!video || video.videoWidth === 0 || video.videoHeight === 0)
        return null;
      const canvas = document.createElement("canvas");
      const targetWidth = 320;
      const targetHeight = Math.round(
        targetWidth * (video.videoHeight / video.videoWidth || 9 / 16),
      );
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch (e) {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Video Source & Memory Lifecycle Management (Spec Section 8)
  // --------------------------------------------------------------------------

  function cleanupCurrentVideo() {
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
    releaseWakeLock();
    clearMediaSession();
    unlockOrientation();
  }

  /**
   * Load a selected video File or Blob into player
   */
  function loadVideoFile(
    file,
    resumePosition = 0,
    customName = null,
    handle = null,
  ) {
    if (!file) return;

    const fileName = customName || file.name || "Video";
    const validExtensions = [".mp4", ".m4v", ".mov", ".webm", ".ogv", ".mkv"];
    const lowerName = fileName.toLowerCase();
    const isVideoMime = file.type && file.type.startsWith("video/");
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isVideoMime && !hasValidExt) {
      showErrorModal("Tệp đã chọn không phải là định dạng video hợp lệ.");
      return;
    }

    // Step 1: Clean up old object URL and video source
    cleanupCurrentVideo();

    currentFile = file;
    currentFileHandle = handle;

    // Step 2: Create new streamable Object URL
    currentObjectUrl = URL.createObjectURL(file);
    video.src = currentObjectUrl;

    // Step 3: Update UI Titles & Reset states
    videoTitle.textContent = fileName;
    videoTitle.setAttribute("title", fileName);
    btnCenterPlay.classList.add("hidden");
    btnCenterReplay.classList.add("hidden");
    bufferSpinner.classList.remove("hidden");

    // Reset seekbar
    seekBar.value = 0;
    progressBar.style.width = "0%";
    bufferedBar.style.width = "0%";
    currentTimeEl.textContent = "00:00";
    durationTimeEl.textContent = "00:00";

    // Switch screen to player
    showPlayerScreen();

    // Save to Watch History
    saveOrUpdateHistory(file, handle);

    // Setup Media Session API
    setupMediaSession(fileName);

    // If resume position was passed directly (from history replay)
    if (resumePosition > 0) {
      video.addEventListener("loadedmetadata", function onLoadedMeta() {
        video.removeEventListener("loadedmetadata", onLoadedMeta);
        seekTo(resumePosition);
        showSnackbar(`Đang tiếp tục phát từ ${formatTime(resumePosition)}`);
      });
    } else {
      // Check saved position in localStorage
      checkSavedPlaybackPosition(file);
    }

    // Play video
    video
      .play()
      .then(() => {
        bufferSpinner.classList.add("hidden");
        updatePlayPauseIcons(true);
        requestWakeLock();
        resetControlsTimer();
      })
      .catch(() => {
        // Autoplay blocked by browser policy -> show large center play button
        bufferSpinner.classList.add("hidden");
        btnCenterPlay.classList.remove("hidden");
        updatePlayPauseIcons(false);
        showControls();
      });
  }

  // --------------------------------------------------------------------------
  // Screen Switching & Navigation
  // --------------------------------------------------------------------------

  function showPlayerScreen() {
    emptyScreen.classList.add("hidden");
    historyScreen.classList.add("hidden");
    playerScreen.classList.remove("hidden");
    previousScreen = "player";
    lockLandscapeOrientation();
    showControls();
  }

  function showEmptyScreen() {
    cleanupCurrentVideo();
    currentFile = null;
    currentFileHandle = null;
    hideResumePrompt();
    playerScreen.classList.add("hidden");
    historyScreen.classList.add("hidden");
    emptyScreen.classList.remove("hidden");
    previousScreen = "empty";
    updateHistoryBadge();
  }

  function showHistoryScreen() {
    if (!playerScreen.classList.contains("hidden")) {
      previousScreen = "player";
    } else {
      previousScreen = "empty";
    }
    emptyScreen.classList.add("hidden");
    playerScreen.classList.add("hidden");
    historyScreen.classList.remove("hidden");
    renderHistoryList();
  }

  btnViewHistory.addEventListener("click", showHistoryScreen);
  btnHistoryFromPlayer.addEventListener("click", showHistoryScreen);

  btnBackFromHistory.addEventListener("click", () => {
    if (previousScreen === "player" && currentObjectUrl) {
      showPlayerScreen();
    } else {
      showEmptyScreen();
    }
  });

  btnHistoryPickVideo.addEventListener("click", () => {
    showEmptyScreen();
    fileInput.click();
  });

  // --------------------------------------------------------------------------
  // History List Rendering & Replay Action
  // --------------------------------------------------------------------------

  async function renderHistoryList() {
    const list = await getAllHistory();
    updateHistoryBadge();

    if (list.length === 0) {
      historyEmptyState.classList.remove("hidden");
      historyListContainer.innerHTML = "";
      btnClearHistory.classList.add("hidden");
      return;
    }

    historyEmptyState.classList.add("hidden");
    btnClearHistory.classList.remove("hidden");
    historyListContainer.innerHTML = "";

    list.forEach((item) => {
      const card = document.createElement("article");
      card.className = "history-card";
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Xem lại video ${item.name}`);

      const progressPercent =
        item.duration > 0
          ? Math.min(100, (item.lastPosition / item.duration) * 100)
          : 0;
      const isCompleted =
        item.duration > 0 && item.lastPosition >= item.duration - 5;

      let progressText = "Chưa phát";
      if (isCompleted) {
        progressText = "Đã xem hết";
      } else if (item.lastPosition > 0 && item.duration > 0) {
        progressText = `Đã xem ${formatTime(item.lastPosition)} / ${formatTime(item.duration)} (${Math.round(progressPercent)}%)`;
      } else if (item.duration > 0) {
        progressText = `Thời lượng ${formatTime(item.duration)}`;
      }

      card.innerHTML = `
        <div class="card-thumbnail-wrap">
          ${
            item.thumbnail
              ? `<img class="card-thumbnail" src="${item.thumbnail}" alt="Ảnh thu nhỏ video" loading="lazy">`
              : `<div class="card-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="2" y="2" width="20" height="20" rx="4"/>
                  <polygon points="10 8 16 12 10 16" fill="currentColor"/>
                </svg>
                <span style="font-size: 0.75rem;">Video</span>
              </div>`
          }
          ${item.duration > 0 ? `<span class="card-duration-badge">${formatTime(item.duration)}</span>` : ""}
          ${progressPercent > 0 ? `<div class="card-progress-bar" style="width: ${progressPercent}%;"></div>` : ""}
          <div class="card-play-overlay">
            <div class="play-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="7,5 19,12 7,19"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="card-body">
          <h2 class="card-title" title="${item.name}">${item.name}</h2>
          <div class="card-meta">
            <span>${formatBytes(item.size)}</span>
            <span>•</span>
            <span>${formatDate(item.lastPlayedAt)}</span>
          </div>
          <div class="card-progress-text">${progressText}</div>
        </div>

        <div class="card-footer">
          <button class="card-btn-replay" type="button" aria-label="Xem lại">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,4 20,12 6,20"/>
            </svg>
            <span>Xem lại</span>
          </button>
          <button class="card-btn-delete" type="button" aria-label="Xoá khỏi lịch sử">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;

      // Handle card replay click
      const handleReplay = async (e) => {
        e.stopPropagation();
        await replayHistoryItem(item);
      };

      card.addEventListener("click", handleReplay);
      card
        .querySelector(".card-btn-replay")
        .addEventListener("click", handleReplay);

      // Handle card delete click
      const btnDelete = card.querySelector(".card-btn-delete");
      btnDelete.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteHistoryItem(item.id);
      });

      historyListContainer.appendChild(card);
    });
  }

  /**
   * Replay a video previously recorded in history
   */
  async function replayHistoryItem(item) {
    // Case 1: Stored FileSystemFileHandle available (Desktop Chromium / Origin File System)
    if (item.hasHandle && item.handle) {
      try {
        let perm = await item.handle.queryPermission({ mode: "read" });
        if (perm !== "granted") {
          perm = await item.handle.requestPermission({ mode: "read" });
        }
        if (perm === "granted") {
          const file = await item.handle.getFile();
          loadVideoFile(file, item.lastPosition, item.name, item.handle);
          return;
        }
      } catch (err) {
        console.warn("Could not read via stored handle:", err);
      }
    }

    // Case 2: Stored Blob / File in IndexedDB
    if (item.hasBlob && item.blob) {
      loadVideoFile(item.blob, item.lastPosition, item.name);
      return;
    }

    // Case 3: Need user to pick the file from machine
    pendingHistoryReplay = item;
    showSnackbar(
      `Chọn lại tệp "${item.name}" để tiếp tục xem từ ${formatTime(item.lastPosition)}`,
      4000,
    );
    fileInput.click();
  }

  // Clear History Modal Handlers
  btnClearHistory.addEventListener("click", () => {
    clearHistoryModal.classList.add("open");
  });

  [btnCloseClearModal, btnCancelClear].forEach((btn) => {
    if (btn)
      btn.addEventListener("click", () =>
        clearHistoryModal.classList.remove("open"),
      );
  });

  btnConfirmClear.addEventListener("click", async () => {
    clearHistoryModal.classList.remove("open");
    await clearAllHistory();
  });

  // --------------------------------------------------------------------------
  // Controls Auto-Hide Behavior (Spec Section 6.2)
  // --------------------------------------------------------------------------

  function showControls() {
    videoContainer.classList.remove("controls-hidden");
    resetControlsTimer();
  }

  function hideControls() {
    if (
      !video.paused &&
      !video.ended &&
      !isDraggingSeek &&
      speedDropdown.classList.contains("hidden")
    ) {
      videoContainer.classList.add("controls-hidden");
    }
  }

  function resetControlsTimer() {
    clearTimeout(controlsTimeout);
    if (!video.paused && !video.ended) {
      controlsTimeout = setTimeout(() => {
        hideControls();
      }, 3000); // 3 seconds timeout per Spec
    }
  }

  // --------------------------------------------------------------------------
  // Video Event Handlers
  // --------------------------------------------------------------------------

  function updatePlayPauseIcons(isPlaying) {
    if (isPlaying) {
      iconPlay.classList.add("hidden");
      iconPause.classList.remove("hidden");
      btnCenterPlay.classList.add("hidden");
      btnCenterReplay.classList.add("hidden");
    } else {
      iconPlay.classList.remove("hidden");
      iconPause.classList.add("hidden");
      if (video.ended) {
        btnCenterReplay.classList.remove("hidden");
      } else {
        btnCenterPlay.classList.remove("hidden");
      }
    }
  }

  function togglePlay() {
    if (video.paused || video.ended) {
      // Khi phát lại / resume sau khi pause hoặc ended: nhảy lùi 1s trước khi play
      if (video.ended) {
        const targetTime = Math.max(0, (video.duration || 0) - 1.0);
        seekTo(targetTime);
        showSnackbar("Đã lùi 1s & phát lại");
      } else if (video.currentTime > 1.0) {
        // Tạm dừng ở vị trí > 1s: lùi lại 1s để kịp bắt ngữ cảnh
        const targetTime = Math.max(0, video.currentTime - 1.0);
        seekTo(targetTime);
        showSnackbar("Đã lùi 1s & tiếp tục phát");
      }
      video.play().catch(() => {
        btnCenterPlay.classList.remove("hidden");
      });
    } else {
      video.pause();
    }
  }

  video.addEventListener("play", () => {
    updatePlayPauseIcons(true);
    requestWakeLock();
    resetControlsTimer();
    updateMediaSessionPlaybackState("playing");
  });

  video.addEventListener("pause", () => {
    updatePlayPauseIcons(false);
    releaseWakeLock();
    showControls();
    updateMediaSessionPlaybackState("paused");
    if (currentFile) {
      updateHistoryPosition(currentFile, video.currentTime);
    }
  });

  video.addEventListener("ended", () => {
    updatePlayPauseIcons(false);
    releaseWakeLock();
    showControls();
    btnCenterReplay.classList.remove("hidden");
    updateMediaSessionPlaybackState("none");
    if (currentFile && !isNaN(video.duration)) {
      updateHistoryPosition(currentFile, video.duration);
    }
  });

  video.addEventListener("waiting", () => {
    bufferSpinner.classList.remove("hidden");
  });

  video.addEventListener("playing", () => {
    bufferSpinner.classList.add("hidden");
  });

  video.addEventListener("canplay", () => {
    bufferSpinner.classList.add("hidden");
  });

  function handleVideoDimensions() {
    if (video.videoWidth && video.videoHeight) {
      const isLandscape = video.videoWidth > video.videoHeight;
      forceOrientationForVideo(isLandscape);
    }
  }

  video.addEventListener("loadedmetadata", handleVideoDimensions);

  video.addEventListener("loadeddata", () => {
    handleVideoDimensions();
    // Capture snapshot for history thumbnail
    if (currentFile) {
      setTimeout(() => {
        const thumb = captureVideoThumbnail();
        if (thumb) {
          updateHistoryDurationAndThumbnail(currentFile, video.duration, thumb);
        }
      }, 300);
    }
  });

  video.addEventListener("durationchange", () => {
    if (!isNaN(video.duration)) {
      durationTimeEl.textContent = formatTime(video.duration);
      seekBar.max = video.duration;
      if (currentFile) {
        updateHistoryDurationAndThumbnail(currentFile, video.duration, null);
      }
    }
  });

  video.addEventListener("timeupdate", () => {
    if (!isDraggingSeek && !isNaN(video.duration) && video.duration > 0) {
      const cur = video.currentTime;
      seekBar.value = cur;
      const progressPercent = (cur / video.duration) * 100;
      progressBar.style.width = `${progressPercent}%`;
      currentTimeEl.textContent = formatTime(cur);

      // Save position to localStorage and IndexedDB periodically (every ~3s)
      if (currentFile && cur > 3 && cur < video.duration - 3) {
        savePlaybackPosition(currentFile, cur);
        if (Math.floor(cur) % 3 === 0) {
          updateHistoryPosition(currentFile, cur);
        }
      }
    }
  });

  video.addEventListener("progress", () => {
    if (video.duration > 0 && video.buffered.length > 0) {
      try {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / video.duration) * 100;
        bufferedBar.style.width = `${Math.min(100, bufferedPercent)}%`;
      } catch (err) {}
    }
  });

  // Codec & Media Error Handling (Spec Section 4 & 12)
  video.addEventListener("error", () => {
    bufferSpinner.classList.add("hidden");
    const err = video.error;
    let msg = "Thiết bị này không hỗ trợ định dạng/codec của file.";

    if (err) {
      if (
        err.code === MediaError.MEDIA_ERR_DECODE ||
        err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
      ) {
        msg =
          "Thiết bị này không hỗ trợ định dạng/codec của file video đã chọn.";
      } else if (err.code === MediaError.MEDIA_ERR_NETWORK) {
        msg = "Không đọc được file do lỗi đọc tệp.";
      } else if (err.code === MediaError.MEDIA_ERR_ABORTED) {
        return;
      }
    }

    showErrorModal(msg);
  });

  // --------------------------------------------------------------------------
  // Seek Bar Controls
  // --------------------------------------------------------------------------

  function seekTo(time) {
    if (!isNaN(video.duration)) {
      const clamped = Math.max(0, Math.min(time, video.duration));
      video.currentTime = clamped;
      seekBar.value = clamped;
      progressBar.style.width = `${(clamped / video.duration) * 100}%`;
      currentTimeEl.textContent = formatTime(clamped);
      if (currentFile) updateHistoryPosition(currentFile, clamped);
    }
  }

  seekBar.addEventListener("input", () => {
    isDraggingSeek = true;
    showControls();
    const val = parseFloat(seekBar.value);
    if (!isNaN(video.duration) && video.duration > 0) {
      progressBar.style.width = `${(val / video.duration) * 100}%`;
      currentTimeEl.textContent = formatTime(val);
      seekTooltip.textContent = formatTime(val);
      seekTooltip.style.left = `${(val / video.duration) * 100}%`;
    }
  });

  seekBar.addEventListener("change", () => {
    isDraggingSeek = false;
    const val = parseFloat(seekBar.value);
    video.currentTime = val;
    resetControlsTimer();
    if (currentFile) updateHistoryPosition(currentFile, val);
  });

  seekContainer.addEventListener("mousemove", (e) => {
    if (isNaN(video.duration) || video.duration <= 0) return;
    const rect = seekContainer.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const hoverTime = pos * video.duration;
    seekTooltip.textContent = formatTime(hoverTime);
    seekTooltip.style.left = `${pos * 100}%`;
  });

  // --------------------------------------------------------------------------
  // Rewind / Forward ±10s and Mobile Double-Tap
  // --------------------------------------------------------------------------

  function seekRelative(deltaSeconds) {
    if (isNaN(video.duration)) return;
    seekTo(video.currentTime + deltaSeconds);
    showControls();

    if (deltaSeconds < 0) {
      triggerRipple(seekRippleLeft);
    } else {
      triggerRipple(seekRippleRight);
    }
  }

  function triggerRipple(rippleEl) {
    rippleEl.classList.remove("hidden");
    rippleEl.style.animation = "none";
    void rippleEl.offsetWidth;
    rippleEl.style.animation = "";
    setTimeout(() => {
      rippleEl.classList.add("hidden");
    }, 600);
  }

  if (btnStop) {
    btnStop.addEventListener("click", () => {
      video.pause();
      seekTo(0);
      showSnackbar("Đã dừng phát video");
      showControls();
    });
  }

  if (btnReplayFromStart) {
    btnReplayFromStart.addEventListener("click", () => {
      seekTo(0);
      video.play();
      showSnackbar("Đang phát lại từ đầu");
      resetControlsTimer();
    });
  }

  btnRewind10.addEventListener("click", () => seekRelative(-10));
  btnForward10.addEventListener("click", () => seekRelative(10));

  function handleGestureTap(isRightHalf) {
    const now = Date.now();
    if (now - lastTapTime < 290) {
      // Double tap detected: cancel single tap action
      clearTimeout(tapTimeout);
      tapTimeout = null;
      lastTapTime = 0; // reset
      // Nửa bên trái: lùi lại 5s (-5s); Nửa bên phải: tới 5s (+5s)
      seekRelative(isRightHalf ? 5 : -5);
    } else {
      lastTapTime = now;
      clearTimeout(tapTimeout);
      tapTimeout = setTimeout(() => {
        tapTimeout = null;
        // 1 touch = play/pause (khi resume tự động lùi 1s)
        if (videoContainer.classList.contains("controls-hidden")) {
          showControls();
        } else {
          togglePlay();
        }
      }, 300);
    }
  }

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  function isInteractiveControl(target) {
    if (!target) return false;
    // Bỏ qua nếu chạm vào bất kỳ button, thanh trượt, menu hoặc điều khiển media nào
    return !!target.closest(
      'button, input, select, textarea, a, [role="button"], [role="menuitem"], .dialog-panel, .speed-dropdown, .btn-control, .seek-container, .volume-group'
    );
  }

  // Lắng nghe chạm trên toàn màn hình player (cả video, viền đen letterbox, khoảng trống)
  videoContainer.addEventListener("pointerdown", (e) => {
    if (isInteractiveControl(e.target)) return;
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    touchStartTime = Date.now();
  });

  videoContainer.addEventListener("pointerup", (e) => {
    if (isInteractiveControl(e.target)) return;

    const distX = Math.abs(e.clientX - touchStartX);
    const distY = Math.abs(e.clientY - touchStartY);
    const elapsed = Date.now() - touchStartTime;

    // Nhận tap nếu không vuốt trượt dài (< 25px) và không giữ lâu (< 450ms)
    if (distX < 25 && distY < 25 && elapsed < 450) {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      // Khi màn hình xoay ngang trong khung hình dọc, nửa trên là trái (-5s), nửa dưới là phải (+5s)
      const isRightHalf = isPortrait
        ? e.clientY >= window.innerHeight / 2
        : e.clientX >= window.innerWidth / 2;
      handleGestureTap(isRightHalf);
    }
  });

  btnCenterPlay.addEventListener("click", togglePlay);
  btnCenterReplay.addEventListener("click", () => {
    const target = Math.max(0, (video.duration || 0) - 1.0);
    seekTo(target);
    video.play();
    showSnackbar("Đã lùi 1s & phát lại");
  });
  btnPlayPause.addEventListener("click", togglePlay);

  // --------------------------------------------------------------------------
  // Volume & Mute Controls
  // --------------------------------------------------------------------------

  function updateVolumeUI() {
    if (video.muted || video.volume === 0) {
      iconVolHigh.classList.add("hidden");
      iconVolLow.classList.add("hidden");
      iconVolMute.classList.remove("hidden");
      volumeBar.value = 0;
    } else if (video.volume < 0.5) {
      iconVolHigh.classList.add("hidden");
      iconVolLow.classList.remove("hidden");
      iconVolMute.classList.add("hidden");
      volumeBar.value = video.volume;
    } else {
      iconVolHigh.classList.remove("hidden");
      iconVolLow.classList.add("hidden");
      iconVolMute.classList.add("hidden");
      volumeBar.value = video.volume;
    }
  }

  btnMute.addEventListener("click", () => {
    video.muted = !video.muted;
    updateVolumeUI();
    localStorage.setItem("pwa_video_muted", video.muted ? "1" : "0");
  });

  volumeBar.addEventListener("input", () => {
    const val = parseFloat(volumeBar.value);
    video.volume = val;
    video.muted = val === 0;
    updateVolumeUI();
    localStorage.setItem("pwa_video_volume", val.toString());
  });

  const savedVol = localStorage.getItem("pwa_video_volume");
  if (savedVol !== null) {
    const v = parseFloat(savedVol);
    if (!isNaN(v)) {
      video.volume = v;
      volumeBar.value = v;
    }
  }

  // --------------------------------------------------------------------------
  // Playback Rate (Speed) Controls
  // --------------------------------------------------------------------------

  btnSpeed.addEventListener("click", (e) => {
    e.stopPropagation();
    speedDropdown.classList.toggle("hidden");
    showControls();
  });

  speedOptions.forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      const speed = parseFloat(opt.getAttribute("data-speed"));
      video.playbackRate = speed;
      speedLabel.textContent = `${speed}x`;

      speedOptions.forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");

      speedDropdown.classList.add("hidden");
      showSnackbar(`Tốc độ phát: ${speed}x`);
      resetControlsTimer();
    });
  });

  document.addEventListener("click", (e) => {
    if (!speedDropdown.contains(e.target) && e.target !== btnSpeed) {
      speedDropdown.classList.add("hidden");
    }
  });

  // --------------------------------------------------------------------------
  // Loop / Repeat Control
  // --------------------------------------------------------------------------

  btnLoop.addEventListener("click", () => {
    video.loop = !video.loop;
    btnLoop.classList.toggle("active", video.loop);
    showSnackbar(video.loop ? "Đã bật lặp lại video" : "Đã tắt lặp lại");
  });

  // --------------------------------------------------------------------------
  // Picture-in-Picture (PiP)
  // --------------------------------------------------------------------------

  if (document.pictureInPictureEnabled) {
    btnPip.addEventListener("click", async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (video !== document.pictureInPictureElement) {
          await video.requestPictureInPicture();
        }
      } catch (err) {
        showSnackbar("Không thể bật Picture-in-Picture");
      }
    });
  } else {
    btnPip.classList.add("hidden");
  }

  // --------------------------------------------------------------------------
  // Fullscreen Management (Standard & iOS Safari)
  // --------------------------------------------------------------------------

  function isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      video.webkitDisplayingFullscreen
    );
  }

  // --------------------------------------------------------------------------
  // Screen Orientation & Auto-Rotation (Ngang/Dọc)
  // --------------------------------------------------------------------------

  let currentVideoIsLandscape = true;
  let isForcedRotated = false;

  async function lockLandscapeOrientation() {
    currentVideoIsLandscape = true;
    videoContainer.classList.add("video-landscape");
    videoContainer.classList.remove("video-portrait");

    // Luôn khóa màn hình ở chế độ xoay ngang (Landscape)
    if (screen.orientation && typeof screen.orientation.lock === "function") {
      try {
        await screen.orientation.lock("landscape");
        return true;
      } catch (err) {
        console.warn("Screen orientation lock:", err);
      }
    }
    return false;
  }

  async function forceOrientationForVideo(isLandscape) {
    return lockLandscapeOrientation();
  }

  function unlockOrientation() {
    if (screen.orientation && typeof screen.orientation.unlock === "function") {
      try {
        screen.orientation.unlock();
      } catch (e) {}
    }
    videoContainer.classList.remove("force-rotated-landscape", "force-rotated-portrait");
    if (btnRotate) btnRotate.classList.remove("rotate-active");
    isForcedRotated = false;
  }

  if (btnRotate) {
    btnRotate.addEventListener("click", async () => {
      // Đổi chiều xoay
      const newLandscape = !currentVideoIsLandscape;
      const locked = await forceOrientationForVideo(newLandscape);

      // Nếu API native không hoạt động (như iOS Safari), dùng CSS fallback rotation
      if (!locked) {
        isForcedRotated = !isForcedRotated;
        btnRotate.classList.toggle("rotate-active", isForcedRotated);
        if (isForcedRotated) {
          videoContainer.classList.toggle("force-rotated-landscape", newLandscape);
          showSnackbar(newLandscape ? "Đã xoay ngang màn hình" : "Đã xoay dọc màn hình");
        } else {
          videoContainer.classList.remove("force-rotated-landscape", "force-rotated-portrait");
          showSnackbar("Đã trở về góc xoay mặc định");
        }
      }
    });
  }

  async function toggleFullscreen() {
    try {
      if (!isFullscreen()) {
        if (videoContainer.requestFullscreen) {
          await videoContainer.requestFullscreen();
        } else if (videoContainer.webkitRequestFullscreen) {
          await videoContainer.webkitRequestFullscreen();
        } else if (video.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        }
        // Force orientation lock when entering fullscreen
        if (video.videoWidth && video.videoHeight) {
          forceOrientationForVideo(video.videoWidth > video.videoHeight);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        unlockOrientation();
      }
    } catch (err) {
      showSnackbar("Không thể chuyển chế độ toàn màn hình");
    }
  }

  btnFullscreen.addEventListener("click", toggleFullscreen);

  function onFullscreenChange() {
    const fs = isFullscreen();
    if (fs) {
      iconEnterFs.classList.add("hidden");
      iconExitFs.classList.remove("hidden");
    } else {
      iconEnterFs.classList.remove("hidden");
      iconExitFs.classList.add("hidden");
    }
  }

  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);
  video.addEventListener("webkitbeginfullscreen", () => onFullscreenChange());
  video.addEventListener("webkitendfullscreen", () => onFullscreenChange());

  // --------------------------------------------------------------------------
  // Screen Wake Lock API (Spec Section 7 & PWA Standards)
  // --------------------------------------------------------------------------

  async function requestWakeLock() {
    if ("wakeLock" in navigator && !wakeLock) {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
        });
      } catch (err) {
        wakeLock = null;
      }
    }
  }

  function releaseWakeLock() {
    if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "visible" &&
      !video.paused &&
      !video.ended
    ) {
      requestWakeLock();
    }
  });

  // --------------------------------------------------------------------------
  // Media Session API (Spec Section 7)
  // --------------------------------------------------------------------------

  function setupMediaSession(fileName) {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: fileName,
        artist: "Local Media",
        album: "PWA Video Player",
        artwork: [
          { src: "./icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "./icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => video.play());
      navigator.mediaSession.setActionHandler("pause", () => video.pause());
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        seekRelative(-(details.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        seekRelative(details.seekOffset || 10);
      });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) seekTo(details.seekTime);
      });
      navigator.mediaSession.setActionHandler("stop", () => showEmptyScreen());
    }
  }

  function updateMediaSessionPlaybackState(state) {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  }

  function clearMediaSession() {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    }
  }

  // --------------------------------------------------------------------------
  // Remember Playback Position (Spec Section 8)
  // --------------------------------------------------------------------------

  function getStorageKey(file) {
    return `pwa_video_pos_${encodeURIComponent(file.name)}_${file.size}_${file.lastModified || 0}`;
  }

  function savePlaybackPosition(file, time) {
    try {
      localStorage.setItem(getStorageKey(file), time.toFixed(1));
    } catch (e) {}
  }

  function checkSavedPlaybackPosition(file) {
    try {
      const saved = localStorage.getItem(getStorageKey(file));
      if (saved) {
        const time = parseFloat(saved);
        if (!isNaN(time) && time > 5) {
          pendingResumeTime = time;
          resumeText.textContent = `Tiếp tục từ ${formatTime(time)}?`;
          resumePrompt.classList.remove("hidden");
        }
      }
    } catch (e) {}
  }

  function hideResumePrompt() {
    resumePrompt.classList.add("hidden");
    pendingResumeTime = 0;
  }

  btnResumeYes.addEventListener("click", () => {
    if (pendingResumeTime > 0) {
      seekTo(pendingResumeTime);
      showSnackbar(`Đã tiếp tục phát từ ${formatTime(pendingResumeTime)}`);
    }
    hideResumePrompt();
  });

  btnResumeNo.addEventListener("click", () => {
    if (currentFile) {
      try {
        localStorage.removeItem(getStorageKey(currentFile));
      } catch (e) {}
    }
    hideResumePrompt();
  });

  // --------------------------------------------------------------------------
  // Desktop Keyboard Shortcuts (Spec Section 7)
  // --------------------------------------------------------------------------

  document.addEventListener("keydown", (e) => {
    if (playerScreen.classList.contains("hidden")) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (
      errorModal.classList.contains("open") ||
      iosInstallModal.classList.contains("open") ||
      clearHistoryModal.classList.contains("open")
    )
      return;

    switch (e.code) {
      case "Space":
      case "KeyK":
        e.preventDefault();
        togglePlay();
        showControls();
        break;
      case "ArrowLeft":
        e.preventDefault();
        seekRelative(-5);
        break;
      case "ArrowRight":
        e.preventDefault();
        seekRelative(5);
        break;
      case "KeyJ":
        e.preventDefault();
        seekRelative(-10);
        break;
      case "KeyL":
        e.preventDefault();
        seekRelative(10);
        break;
      case "ArrowUp":
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        video.muted = false;
        updateVolumeUI();
        showSnackbar(`Âm lượng: ${Math.round(video.volume * 100)}%`);
        showControls();
        break;
      case "ArrowDown":
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        updateVolumeUI();
        showSnackbar(`Âm lượng: ${Math.round(video.volume * 100)}%`);
        showControls();
        break;
      case "KeyM":
        e.preventDefault();
        video.muted = !video.muted;
        updateVolumeUI();
        showSnackbar(video.muted ? "Đã tắt âm" : "Đã bật âm");
        showControls();
        break;
      case "KeyF":
        e.preventDefault();
        toggleFullscreen();
        break;
      case "KeyP":
        e.preventDefault();
        if (document.pictureInPictureEnabled && btnPip) {
          btnPip.click();
        }
        break;
      case "Escape":
        if (speedDropdown && !speedDropdown.classList.contains("hidden")) {
          speedDropdown.classList.add("hidden");
        }
        break;
    }
  });

  videoContainer.addEventListener("mousemove", () => showControls());

  // --------------------------------------------------------------------------
  // File Picker & Drag-and-Drop
  // --------------------------------------------------------------------------

  async function pickFileWithModernAPI() {
    // If showOpenFilePicker is supported (Chromium Desktop/Android), we get a handle that can be re-opened later!
    if ("showOpenFilePicker" in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: "Tệp Video",
              accept: {
                "video/*": [".mp4", ".m4v", ".mov", ".webm", ".ogv", ".mkv"],
              },
            },
          ],
          multiple: false,
        });
        if (handle) {
          const file = await handle.getFile();
          const resumePos = pendingHistoryReplay
            ? pendingHistoryReplay.lastPosition
            : 0;
          pendingHistoryReplay = null;
          loadVideoFile(file, resumePos, file.name, handle);
          return true;
        }
      } catch (err) {
        if (err.name === "AbortError") return true; // User cancelled
      }
    }
    return false;
  }

  btnPickVideo.addEventListener("click", async () => {
    const handled = await pickFileWithModernAPI();
    if (!handled) fileInput.click();
  });

  dropZone.addEventListener("click", async () => {
    const handled = await pickFileWithModernAPI();
    if (!handled) fileInput.click();
  });

  dropZone.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const handled = await pickFileWithModernAPI();
      if (!handled) fileInput.click();
    }
  });

  btnOpenAnother.addEventListener("click", async () => {
    const handled = await pickFileWithModernAPI();
    if (!handled) fileInput.click();
  });

  btnErrorPickFile.addEventListener("click", async () => {
    errorModal.classList.remove("open");
    const handled = await pickFileWithModernAPI();
    if (!handled) fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const resumePos = pendingHistoryReplay
        ? pendingHistoryReplay.lastPosition
        : 0;
      pendingHistoryReplay = null;
      loadVideoFile(file, resumePos);
    }
    fileInput.value = "";
  });

  // Window-level Drag and Drop
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDropOverlay.classList.remove("hidden");
    dropZone.classList.add("dragover");
  });

  window.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      e.clientX <= 0 ||
      e.clientY <= 0 ||
      e.clientX >= window.innerWidth ||
      e.clientY >= window.innerHeight
    ) {
      dragDropOverlay.classList.add("hidden");
      dropZone.classList.remove("dragover");
    }
  });

  window.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDropOverlay.classList.add("hidden");
    dropZone.classList.remove("dragover");

    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      loadVideoFile(dt.files[0]);
    }
  });

  // --------------------------------------------------------------------------
  // Error Modal
  // --------------------------------------------------------------------------

  function showErrorModal(message) {
    if (errorMessage) errorMessage.textContent = message;
    if (errorModal) errorModal.classList.add("open");
  }

  [btnCloseErrorModal, btnErrorClose].forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", () => {
        errorModal.classList.remove("open");
        showEmptyScreen();
      });
    }
  });

  // --------------------------------------------------------------------------
  // PWA Standards: Install Flow (Android, iOS Safari, Desktop)
  // --------------------------------------------------------------------------

  function initPWAInstallation() {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isStandalone) {
      if (btnInstall) btnInstall.classList.add("hidden");
      if (btnInstallPlayer) btnInstallPlayer.classList.add("hidden");
    } else if (isIOS) {
      if (btnInstall) btnInstall.classList.remove("hidden");
      if (btnInstallPlayer) btnInstallPlayer.classList.remove("hidden");
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (!isStandalone) {
        if (btnInstall) btnInstall.classList.remove("hidden");
        if (btnInstallPlayer) btnInstallPlayer.classList.remove("hidden");
      }
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      if (btnInstall) btnInstall.classList.add("hidden");
      if (btnInstallPlayer) btnInstallPlayer.classList.add("hidden");
      showSnackbar("Cài đặt ứng dụng thành công!");
    });

    const handleInstallClick = async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === "accepted") {
          if (btnInstall) btnInstall.classList.add("hidden");
          if (btnInstallPlayer) btnInstallPlayer.classList.add("hidden");
        }
        deferredInstallPrompt = null;
      } else if (iosInstallModal) {
        iosInstallModal.classList.add("open");
      }
    };

    if (btnInstall) btnInstall.addEventListener("click", handleInstallClick);
    if (btnInstallPlayer)
      btnInstallPlayer.addEventListener("click", handleInstallClick);

    [btnCloseIosModal, btnGotItIos].forEach((btn) => {
      if (btn) {
        btn.addEventListener("click", () =>
          iosInstallModal.classList.remove("open"),
        );
      }
    });
  }

  // --------------------------------------------------------------------------
  // PWA Standards: Service Worker Registration & Force Update Flow
  // --------------------------------------------------------------------------

  function initPWAServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .then((reg) => {
        swRegistration = reg;

        if (reg.waiting) {
          notifyUpdateReady(reg.waiting);
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              notifyUpdateReady(newWorker);
            }
          });
        });
      })
      .catch((err) => {
        console.warn("Service Worker registration failed:", err);
      });

    if (btnUpdateApp) {
      btnUpdateApp.addEventListener("click", async () => {
        if (!navigator.onLine) {
          showSnackbar("Không thể cập nhật khi đang offline.");
          return;
        }

        btnUpdateApp.disabled = true;
        updateLabel.textContent = "Đang kiểm tra...";
        updateIcon.style.animation = "spin 0.8s linear infinite";

        try {
          if (swRegistration) {
            await swRegistration.update();

            if (swRegistration.waiting) {
              swRegistration.waiting.postMessage({ action: "skipWaiting" });
            }

            if ("caches" in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            }

            await swRegistration.unregister();
            showSnackbar("Đang tải bản cập nhật mới nhất...");
            setTimeout(() => {
              window.location.href =
                window.location.pathname + "?forceUpdate=" + Date.now();
            }, 600);
          } else {
            window.location.reload();
          }
        } catch (err) {
          btnUpdateApp.disabled = false;
          updateLabel.textContent = "Cập nhật";
          updateIcon.style.animation = "";
          showSnackbar("Không có bản cập nhật mới.");
        }
      });
    }
  }

  function notifyUpdateReady() {
    if (btnUpdateApp) {
      btnUpdateApp.classList.add("btn-update-ready");
      updateLabel.textContent = "Cập nhật mới!";
    }
    showSnackbar('Đã có bản cập nhật mới! Nhấn "Cập nhật mới!" để áp dụng.');
  }

  // --------------------------------------------------------------------------
  // Desktop PWA: File Handlers (launchQueue) Support
  // --------------------------------------------------------------------------

  function initFileHandlers() {
    if ("launchQueue" in window && "setConsumer" in window.launchQueue) {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (launchParams.files && launchParams.files.length > 0) {
          try {
            const handle = launchParams.files[0];
            const file = await handle.getFile();
            loadVideoFile(file, 0, file.name, handle);
          } catch (err) {
            console.error("Launch queue file read error:", err);
          }
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  // Application Bootstrap
  // --------------------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", () => {
    initPWAInstallation();
    initPWAServiceWorker();
    initFileHandlers();
    updateVolumeUI();
    updateHistoryBadge();
  });
})();
