/**
 * PWA Video Player (Local File)
 * Complies with Spec & PWA Standards
 */

(() => {
  'use strict';

  // --- DOM Elements ---
  const emptyScreen = document.getElementById('emptyScreen');
  const playerScreen = document.getElementById('playerScreen');
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');
  const btnPickVideo = document.getElementById('btnPickVideo');
  const dragDropOverlay = document.getElementById('dragDropOverlay');

  const videoContainer = document.getElementById('videoContainer');
  const video = document.getElementById('videoPlayer');
  const videoTitle = document.getElementById('videoTitle');
  const btnOpenAnother = document.getElementById('btnOpenAnother');

  // Center overlay elements
  const btnCenterPlay = document.getElementById('btnCenterPlay');
  const btnCenterReplay = document.getElementById('btnCenterReplay');
  const bufferSpinner = document.getElementById('bufferSpinner');
  const gestureLeft = document.getElementById('gestureLeft');
  const gestureRight = document.getElementById('gestureRight');
  const seekRippleLeft = document.getElementById('seekRippleLeft');
  const seekRippleRight = document.getElementById('seekRippleRight');

  // Bottom controls
  const btnPlayPause = document.getElementById('btnPlayPause');
  const iconPlay = document.getElementById('iconPlay');
  const iconPause = document.getElementById('iconPause');
  const btnRewind10 = document.getElementById('btnRewind10');
  const btnForward10 = document.getElementById('btnForward10');
  const currentTimeEl = document.getElementById('currentTime');
  const durationTimeEl = document.getElementById('durationTime');

  // Seek bar
  const seekContainer = document.getElementById('seekContainer');
  const seekBar = document.getElementById('seekBar');
  const progressBar = document.getElementById('progressBar');
  const bufferedBar = document.getElementById('bufferedBar');
  const seekTooltip = document.getElementById('seekTooltip');

  // Volume
  const volumeGroup = document.getElementById('volumeGroup');
  const btnMute = document.getElementById('btnMute');
  const volumeBar = document.getElementById('volumeBar');
  const iconVolHigh = document.getElementById('iconVolHigh');
  const iconVolLow = document.getElementById('iconVolLow');
  const iconVolMute = document.getElementById('iconVolMute');

  // Speed, Loop, PiP, Fullscreen
  const btnSpeed = document.getElementById('btnSpeed');
  const speedLabel = document.getElementById('speedLabel');
  const speedDropdown = document.getElementById('speedDropdown');
  const speedOptions = document.querySelectorAll('.speed-opt');
  const btnLoop = document.getElementById('btnLoop');
  const btnPip = document.getElementById('btnPip');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const iconEnterFs = document.getElementById('iconEnterFs');
  const iconExitFs = document.getElementById('iconExitFs');

  // Dialogs & Snackbars
  const iosInstallModal = document.getElementById('iosInstallModal');
  const btnCloseIosModal = document.getElementById('btnCloseIosModal');
  const btnGotItIos = document.getElementById('btnGotItIos');
  const errorModal = document.getElementById('errorModal');
  const errorMessage = document.getElementById('errorMessage');
  const btnCloseErrorModal = document.getElementById('btnCloseErrorModal');
  const btnErrorClose = document.getElementById('btnErrorClose');
  const btnErrorPickFile = document.getElementById('btnErrorPickFile');
  const resumePrompt = document.getElementById('resumePrompt');
  const resumeText = document.getElementById('resumeText');
  const btnResumeYes = document.getElementById('btnResumeYes');
  const btnResumeNo = document.getElementById('btnResumeNo');
  const snackbar = document.getElementById('snackbar');

  // PWA Install & Update Buttons
  const btnInstall = document.getElementById('btnInstall');
  const btnInstallPlayer = document.getElementById('btnInstallPlayer');
  const btnUpdateApp = document.getElementById('btnUpdateApp');
  const updateIcon = document.getElementById('updateIcon');
  const updateLabel = document.getElementById('updateLabel');

  // --- State Variables ---
  let currentFile = null;
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

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------

  /**
   * Format seconds into mm:ss or h:mm:ss
   */
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);

    const pad = (num) => num.toString().padStart(2, '0');
    if (h > 0) {
      return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  }

  /**
   * Show floating snackbar message
   */
  function showSnackbar(message, duration = 3000) {
    if (!snackbar) return;
    snackbar.textContent = message;
    snackbar.classList.add('show');
    clearTimeout(snackbarTimeout);
    snackbarTimeout = setTimeout(() => {
      snackbar.classList.remove('show');
    }, duration);
  }

  // --------------------------------------------------------------------------
  // Video Source & Memory Lifecycle Management (Spec Section 8)
  // --------------------------------------------------------------------------

  /**
   * Revoke existing object URL and reset media element to avoid memory leaks
   */
  function cleanupCurrentVideo() {
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
    releaseWakeLock();
    clearMediaSession();
  }

  /**
   * Load a selected video File into player
   */
  function loadVideoFile(file) {
    if (!file) return;

    // Validate mime or extension
    const validExtensions = ['.mp4', '.m4v', '.mov', '.webm', '.ogv', '.mkv'];
    const lowerName = file.name.toLowerCase();
    const isVideoMime = file.type.startsWith('video/');
    const hasValidExt = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isVideoMime && !hasValidExt) {
      showErrorModal('Tệp đã chọn không phải là định dạng video hợp lệ.');
      return;
    }

    // Step 1: Clean up old object URL and video source
    cleanupCurrentVideo();

    currentFile = file;

    // Step 2: Create new streamable Object URL
    currentObjectUrl = URL.createObjectURL(file);
    video.src = currentObjectUrl;

    // Step 3: Update UI Titles & Reset states
    videoTitle.textContent = file.name;
    videoTitle.setAttribute('title', file.name);
    btnCenterPlay.classList.add('hidden');
    btnCenterReplay.classList.add('hidden');
    bufferSpinner.classList.remove('hidden');

    // Reset seekbar
    seekBar.value = 0;
    progressBar.style.width = '0%';
    bufferedBar.style.width = '0%';
    currentTimeEl.textContent = '00:00';
    durationTimeEl.textContent = '00:00';

    // Switch screen to player
    showPlayerScreen();

    // Check saved position in localStorage
    checkSavedPlaybackPosition(file);

    // Setup Media Session API
    setupMediaSession(file.name);

    // Play video
    video.play().then(() => {
      bufferSpinner.classList.add('hidden');
      updatePlayPauseIcons(true);
      requestWakeLock();
      resetControlsTimer();
    }).catch(() => {
      // Autoplay blocked by browser policy -> show large center play button
      bufferSpinner.classList.add('hidden');
      btnCenterPlay.classList.remove('hidden');
      updatePlayPauseIcons(false);
      showControls();
    });
  }

  /**
   * Switch to Player screen
   */
  function showPlayerScreen() {
    emptyScreen.classList.add('hidden');
    playerScreen.classList.remove('hidden');
    showControls();
  }

  /**
   * Switch to Empty screen
   */
  function showEmptyScreen() {
    cleanupCurrentVideo();
    currentFile = null;
    hideResumePrompt();
    playerScreen.classList.add('hidden');
    emptyScreen.classList.remove('hidden');
  }

  // --------------------------------------------------------------------------
  // Controls Auto-Hide Behavior (Spec Section 6.2)
  // --------------------------------------------------------------------------

  function showControls() {
    videoContainer.classList.remove('controls-hidden');
    resetControlsTimer();
  }

  function hideControls() {
    // Only auto-hide when video is playing and user is not seeking or browsing speed
    if (!video.paused && !video.ended && !isDraggingSeek && speedDropdown.classList.contains('hidden')) {
      videoContainer.classList.add('controls-hidden');
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
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
      btnCenterPlay.classList.add('hidden');
      btnCenterReplay.classList.add('hidden');
    } else {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
      if (video.ended) {
        btnCenterReplay.classList.remove('hidden');
      } else {
        btnCenterPlay.classList.remove('hidden');
      }
    }
  }

  function togglePlay() {
    if (video.paused || video.ended) {
      if (video.ended) {
        video.currentTime = 0;
      }
      video.play().catch(() => {
        btnCenterPlay.classList.remove('hidden');
      });
    } else {
      video.pause();
    }
  }

  video.addEventListener('play', () => {
    updatePlayPauseIcons(true);
    requestWakeLock();
    resetControlsTimer();
    updateMediaSessionPlaybackState('playing');
  });

  video.addEventListener('pause', () => {
    updatePlayPauseIcons(false);
    releaseWakeLock();
    showControls();
    updateMediaSessionPlaybackState('paused');
  });

  video.addEventListener('ended', () => {
    updatePlayPauseIcons(false);
    releaseWakeLock();
    showControls();
    btnCenterReplay.classList.remove('hidden');
    updateMediaSessionPlaybackState('none');
  });

  video.addEventListener('waiting', () => {
    bufferSpinner.classList.remove('hidden');
  });

  video.addEventListener('playing', () => {
    bufferSpinner.classList.add('hidden');
  });

  video.addEventListener('canplay', () => {
    bufferSpinner.classList.add('hidden');
  });

  video.addEventListener('durationchange', () => {
    if (!isNaN(video.duration)) {
      durationTimeEl.textContent = formatTime(video.duration);
      seekBar.max = video.duration;
    }
  });

  video.addEventListener('timeupdate', () => {
    if (!isDraggingSeek && !isNaN(video.duration) && video.duration > 0) {
      const cur = video.currentTime;
      seekBar.value = cur;
      const progressPercent = (cur / video.duration) * 100;
      progressBar.style.width = `${progressPercent}%`;
      currentTimeEl.textContent = formatTime(cur);

      // Save position to localStorage periodically (every ~3s)
      if (currentFile && cur > 5 && cur < video.duration - 5) {
        savePlaybackPosition(currentFile, cur);
      }
    }
  });

  video.addEventListener('progress', () => {
    if (video.duration > 0 && video.buffered.length > 0) {
      try {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / video.duration) * 100;
        bufferedBar.style.width = `${Math.min(100, bufferedPercent)}%`;
      } catch (err) {
        // Range exception ignore
      }
    }
  });

  // Codec & Media Error Handling (Spec Section 4 & 12)
  video.addEventListener('error', () => {
    bufferSpinner.classList.add('hidden');
    const err = video.error;
    let msg = 'Thiết bị này không hỗ trợ định dạng/codec của file.';

    if (err) {
      if (err.code === MediaError.MEDIA_ERR_DECODE || err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        msg = 'Thiết bị này không hỗ trợ định dạng/codec của file video đã chọn.';
      } else if (err.code === MediaError.MEDIA_ERR_NETWORK) {
        msg = 'Không đọc được file do lỗi đọc tệp.';
      } else if (err.code === MediaError.MEDIA_ERR_ABORTED) {
        return; // Aborted intentionally on file switch
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
    }
  }

  seekBar.addEventListener('input', () => {
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

  seekBar.addEventListener('change', () => {
    isDraggingSeek = false;
    const val = parseFloat(seekBar.value);
    video.currentTime = val;
    resetControlsTimer();
  });

  // Mouse hover preview tooltip over seek bar
  seekContainer.addEventListener('mousemove', (e) => {
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
    rippleEl.classList.remove('hidden');
    rippleEl.style.animation = 'none';
    // Force DOM reflow to restart CSS animation
    void rippleEl.offsetWidth;
    rippleEl.style.animation = '';
    setTimeout(() => {
      rippleEl.classList.add('hidden');
    }, 600);
  }

  btnRewind10.addEventListener('click', () => seekRelative(-10));
  btnForward10.addEventListener('click', () => seekRelative(10));

  // Double tap gesture detection on left/right halves
  function handleGestureTap(isRightHalf) {
    const now = Date.now();
    if (now - lastTapTime < 280) {
      // Double tap detected
      clearTimeout(tapTimeout);
      tapTimeout = null;
      seekRelative(isRightHalf ? 10 : -10);
    } else {
      // Potential single tap
      tapTimeout = setTimeout(() => {
        // Single tap: toggle controls or play/pause
        if (videoContainer.classList.contains('controls-hidden')) {
          showControls();
        } else {
          togglePlay();
        }
      }, 290);
    }
    lastTapTime = now;
  }

  gestureLeft.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleGestureTap(false);
  });

  gestureRight.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleGestureTap(true);
  });

  // Center play/replay button clicks
  btnCenterPlay.addEventListener('click', togglePlay);
  btnCenterReplay.addEventListener('click', () => {
    video.currentTime = 0;
    video.play();
  });
  btnPlayPause.addEventListener('click', togglePlay);

  // --------------------------------------------------------------------------
  // Volume & Mute Controls
  // --------------------------------------------------------------------------

  function updateVolumeUI() {
    if (video.muted || video.volume === 0) {
      iconVolHigh.classList.add('hidden');
      iconVolLow.classList.add('hidden');
      iconVolMute.classList.remove('hidden');
      volumeBar.value = 0;
    } else if (video.volume < 0.5) {
      iconVolHigh.classList.add('hidden');
      iconVolLow.classList.remove('hidden');
      iconVolMute.classList.add('hidden');
      volumeBar.value = video.volume;
    } else {
      iconVolHigh.classList.remove('hidden');
      iconVolLow.classList.add('hidden');
      iconVolMute.classList.add('hidden');
      volumeBar.value = video.volume;
    }
  }

  btnMute.addEventListener('click', () => {
    video.muted = !video.muted;
    updateVolumeUI();
    localStorage.setItem('pwa_video_muted', video.muted ? '1' : '0');
  });

  volumeBar.addEventListener('input', () => {
    const val = parseFloat(volumeBar.value);
    video.volume = val;
    video.muted = (val === 0);
    updateVolumeUI();
    localStorage.setItem('pwa_video_volume', val.toString());
  });

  // Initialize saved volume preferences
  const savedVol = localStorage.getItem('pwa_video_volume');
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

  btnSpeed.addEventListener('click', (e) => {
    e.stopPropagation();
    speedDropdown.classList.toggle('hidden');
    showControls();
  });

  speedOptions.forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const speed = parseFloat(opt.getAttribute('data-speed'));
      video.playbackRate = speed;
      speedLabel.textContent = `${speed}x`;

      speedOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');

      speedDropdown.classList.add('hidden');
      showSnackbar(`Tốc độ phát: ${speed}x`);
      resetControlsTimer();
    });
  });

  // Close speed dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!speedDropdown.contains(e.target) && e.target !== btnSpeed) {
      speedDropdown.classList.add('hidden');
    }
  });

  // --------------------------------------------------------------------------
  // Loop / Repeat Control
  // --------------------------------------------------------------------------

  btnLoop.addEventListener('click', () => {
    video.loop = !video.loop;
    btnLoop.classList.toggle('active', video.loop);
    showSnackbar(video.loop ? 'Đã bật lặp lại video' : 'Đã tắt lặp lại');
  });

  // --------------------------------------------------------------------------
  // Picture-in-Picture (PiP)
  // --------------------------------------------------------------------------

  if (document.pictureInPictureEnabled) {
    btnPip.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (video !== document.pictureInPictureElement) {
          await video.requestPictureInPicture();
        }
      } catch (err) {
        showSnackbar('Không thể bật Picture-in-Picture');
      }
    });
  } else {
    // Hide PiP button if browser does not support it
    btnPip.classList.add('hidden');
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

  async function toggleFullscreen() {
    try {
      if (!isFullscreen()) {
        if (videoContainer.requestFullscreen) {
          await videoContainer.requestFullscreen();
        } else if (videoContainer.webkitRequestFullscreen) {
          await videoContainer.webkitRequestFullscreen();
        } else if (video.webkitEnterFullscreen) {
          // iOS Safari fallback
          video.webkitEnterFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch (err) {
      showSnackbar('Không thể chuyển chế độ toàn màn hình');
    }
  }

  btnFullscreen.addEventListener('click', toggleFullscreen);

  function onFullscreenChange() {
    const fs = isFullscreen();
    if (fs) {
      iconEnterFs.classList.add('hidden');
      iconExitFs.classList.remove('hidden');
    } else {
      iconEnterFs.classList.remove('hidden');
      iconExitFs.classList.add('hidden');
    }
  }

  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
  video.addEventListener('webkitbeginfullscreen', () => onFullscreenChange());
  video.addEventListener('webkitendfullscreen', () => onFullscreenChange());

  // --------------------------------------------------------------------------
  // Screen Wake Lock API (Spec Section 7 & PWA Standards)
  // --------------------------------------------------------------------------

  async function requestWakeLock() {
    if ('wakeLock' in navigator && !wakeLock) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
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

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !video.paused && !video.ended) {
      requestWakeLock();
    }
  });

  // --------------------------------------------------------------------------
  // Media Session API (Spec Section 7)
  // --------------------------------------------------------------------------

  function setupMediaSession(fileName) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: fileName,
        artist: 'Local Media',
        album: 'PWA Video Player',
        artwork: [
          { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        video.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        video.pause();
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        seekRelative(-(details.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        seekRelative(details.seekOffset || 10);
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekTo(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        showEmptyScreen();
      });
    }
  }

  function updateMediaSessionPlaybackState(state) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  }

  function clearMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  }

  // --------------------------------------------------------------------------
  // Remember Playback Position (Spec Section 8)
  // --------------------------------------------------------------------------

  function getStorageKey(file) {
    return `pwa_video_pos_${encodeURIComponent(file.name)}_${file.size}_${file.lastModified}`;
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
          resumePrompt.classList.remove('hidden');
        }
      }
    } catch (e) {}
  }

  function hideResumePrompt() {
    resumePrompt.classList.add('hidden');
    pendingResumeTime = 0;
  }

  btnResumeYes.addEventListener('click', () => {
    if (pendingResumeTime > 0) {
      seekTo(pendingResumeTime);
      showSnackbar(`Đã tiếp tục phát từ ${formatTime(pendingResumeTime)}`);
    }
    hideResumePrompt();
  });

  btnResumeNo.addEventListener('click', () => {
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

  document.addEventListener('keydown', (e) => {
    // Only handle shortcuts when on player screen and not inside an input/dialog
    if (playerScreen.classList.contains('hidden')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (errorModal.classList.contains('open') || iosInstallModal.classList.contains('open')) return;

    switch (e.code) {
      case 'Space':
      case 'KeyK':
        e.preventDefault();
        togglePlay();
        showControls();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        seekRelative(-5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        seekRelative(5);
        break;
      case 'KeyJ':
        e.preventDefault();
        seekRelative(-10);
        break;
      case 'KeyL':
        e.preventDefault();
        seekRelative(10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        video.muted = false;
        updateVolumeUI();
        showSnackbar(`Âm lượng: ${Math.round(video.volume * 100)}%`);
        showControls();
        break;
      case 'ArrowDown':
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        updateVolumeUI();
        showSnackbar(`Âm lượng: ${Math.round(video.volume * 100)}%`);
        showControls();
        break;
      case 'KeyM':
        e.preventDefault();
        video.muted = !video.muted;
        updateVolumeUI();
        showSnackbar(video.muted ? 'Đã tắt âm' : 'Đã bật âm');
        showControls();
        break;
      case 'KeyF':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'KeyP':
        e.preventDefault();
        if (document.pictureInPictureEnabled && btnPip) {
          btnPip.click();
        }
        break;
      case 'Escape':
        if (speedDropdown && !speedDropdown.classList.contains('hidden')) {
          speedDropdown.classList.add('hidden');
        }
        break;
    }
  });

  // Track mouse movement over video container to reveal controls
  videoContainer.addEventListener('mousemove', () => {
    showControls();
  });

  // --------------------------------------------------------------------------
  // File Picker & Drag-and-Drop
  // --------------------------------------------------------------------------

  btnPickVideo.addEventListener('click', () => {
    fileInput.click();
  });

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  btnOpenAnother.addEventListener('click', () => {
    fileInput.click();
  });

  btnErrorPickFile.addEventListener('click', () => {
    errorModal.classList.remove('open');
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      loadVideoFile(e.target.files[0]);
    }
    // Clear value to allow picking same file again if desired
    fileInput.value = '';
  });

  // Window-level Drag and Drop
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDropOverlay.classList.remove('hidden');
    dropZone.classList.add('dragover');
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide if dragging out of the window
    if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      dragDropOverlay.classList.add('hidden');
      dropZone.classList.remove('dragover');
    }
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDropOverlay.classList.add('hidden');
    dropZone.classList.remove('dragover');

    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      // Pick first file only, ignore rest per Spec Section 8
      loadVideoFile(dt.files[0]);
    }
  });

  // --------------------------------------------------------------------------
  // Error Modal
  // --------------------------------------------------------------------------

  function showErrorModal(message) {
    if (errorMessage) errorMessage.textContent = message;
    if (errorModal) errorModal.classList.add('open');
  }

  [btnCloseErrorModal, btnErrorClose].forEach((btn) => {
    if (btn) {
      btn.addEventListener('click', () => {
        errorModal.classList.remove('open');
        showEmptyScreen();
      });
    }
  });

  // --------------------------------------------------------------------------
  // PWA Standards: Install Flow (Android, iOS Safari, Desktop)
  // --------------------------------------------------------------------------

  function initPWAInstallation() {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isStandalone) {
      if (btnInstall) btnInstall.classList.add('hidden');
      if (btnInstallPlayer) btnInstallPlayer.classList.add('hidden');
    } else if (isIOS) {
      // iOS Safari does not fire beforeinstallprompt; show button to open iOS guide modal
      if (btnInstall) btnInstall.classList.remove('hidden');
      if (btnInstallPlayer) btnInstallPlayer.classList.remove('hidden');
    }

    // 1. Listen for beforeinstallprompt on Chromium (Android / Desktop)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (!isStandalone) {
        if (btnInstall) btnInstall.classList.remove('hidden');
        if (btnInstallPlayer) btnInstallPlayer.classList.remove('hidden');
      }
    });

    // 2. Listen for app installed
    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      if (btnInstall) btnInstall.classList.add('hidden');
      if (btnInstallPlayer) btnInstallPlayer.classList.add('hidden');
      showSnackbar('Cài đặt ứng dụng thành công!');
    });

    // 3. Handle Install Click
    const handleInstallClick = async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          if (btnInstall) btnInstall.classList.add('hidden');
          if (btnInstallPlayer) btnInstallPlayer.classList.add('hidden');
        }
        deferredInstallPrompt = null;
      } else if (iosInstallModal) {
        iosInstallModal.classList.add('open');
      }
    };

    if (btnInstall) btnInstall.addEventListener('click', handleInstallClick);
    if (btnInstallPlayer) btnInstallPlayer.addEventListener('click', handleInstallClick);

    // Close iOS Modal
    [btnCloseIosModal, btnGotItIos].forEach((btn) => {
      if (btn) {
        btn.addEventListener('click', () => iosInstallModal.classList.remove('open'));
      }
    });
  }

  // --------------------------------------------------------------------------
  // PWA Standards: Service Worker Registration & Force Update Flow
  // --------------------------------------------------------------------------

  function initPWAServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    // Relative registration scope per PWA standards
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then((reg) => {
        swRegistration = reg;

        // Check if an updated worker is waiting
        if (reg.waiting) {
          notifyUpdateReady(reg.waiting);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdateReady(newWorker);
            }
          });
        });
      })
      .catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });

    // Force Update App Button Handler
    if (btnUpdateApp) {
      btnUpdateApp.addEventListener('click', async () => {
        if (!navigator.onLine) {
          showSnackbar('Không thể cập nhật khi đang offline.');
          return;
        }

        btnUpdateApp.disabled = true;
        updateLabel.textContent = 'Đang kiểm tra...';
        updateIcon.style.animation = 'spin 0.8s linear infinite';

        try {
          if (swRegistration) {
            await swRegistration.update();

            if (swRegistration.waiting) {
              swRegistration.waiting.postMessage({ action: 'skipWaiting' });
            }

            // Clear old caches
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }

            // Unregister and reload with cache busting query
            await swRegistration.unregister();
            showSnackbar('Đang tải bản cập nhật mới nhất...');
            setTimeout(() => {
              window.location.href = window.location.pathname + '?forceUpdate=' + Date.now();
            }, 600);
          } else {
            window.location.reload();
          }
        } catch (err) {
          btnUpdateApp.disabled = false;
          updateLabel.textContent = 'Cập nhật';
          updateIcon.style.animation = '';
          showSnackbar('Không có bản cập nhật mới.');
        }
      });
    }
  }

  function notifyUpdateReady(waitingWorker) {
    if (btnUpdateApp) {
      btnUpdateApp.classList.add('btn-update-ready');
      updateLabel.textContent = 'Cập nhật mới!';
    }
    showSnackbar('Đã có bản cập nhật mới! Nhấn "Cập nhật mới!" để áp dụng.');
  }

  // --------------------------------------------------------------------------
  // Desktop PWA: File Handlers (launchQueue) Support
  // --------------------------------------------------------------------------

  function initFileHandlers() {
    if ('launchQueue' in window && 'setConsumer' in window.launchQueue) {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (launchParams.files && launchParams.files.length > 0) {
          try {
            const file = await launchParams.files[0].getFile();
            loadVideoFile(file);
          } catch (err) {
            console.error('Launch queue file read error:', err);
          }
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  // Application Bootstrap
  // --------------------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', () => {
    initPWAInstallation();
    initPWAServiceWorker();
    initFileHandlers();
    updateVolumeUI();
  });

})();
