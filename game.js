/* ==========================================================================
   Runic Dungeon - game.js (Main Game Logic & Graphics Engine)
   ========================================================================== */

// Audio Synthesizer via Web Audio API
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.bgmOsc = null;
    this.bgmGain = null;
    this.bgmInterval = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C4 to C5
    this.melody = [0, 2, 4, 5, 4, 2, 0, 4, 7, 6, 4, 5, 7, 4, 2, 0];
    this.melodyIdx = 0;
    
    // Set dynamic volume: quieter on desktop (0.35), louder on mobile (1.0)
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900;
    const savedVol = localStorage.getItem('runic_dungeon_volume');
    this.volume = savedVol !== null ? parseFloat(savedVol) : (isMobile ? 1.0 : 0.35);
    if (this.volume === 0) {
      this.muted = true;
    }
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function') {
      this.ctx.resume().then(() => {
        if (!this.muted && !this.bgmPlaying) {
          this.startBGM();
        }
      }).catch(e => console.warn("Audio resume warning:", e));
    } else {
      if (!this.muted && !this.bgmPlaying) {
        this.startBGM();
      }
    }
  }

  toggle() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.muted;
  }

  playTone(freq, type, duration, volume, slideTo = null) {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
      }
      
      gain.gain.setValueAtTime(volume * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  playStep() {
    this.playTone(150, 'triangle', 0.08, 0.1, 80);
  }

  playSlide() {
    this.playTone(200, 'sine', 0.25, 0.15, 600);
  }

  playSplash() {
    // Water splash noise approximation
    if (this.muted || !this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3 * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch (e) {}
  }

  playClick() {
    this.playTone(800, 'sine', 0.05, 0.1, 1000);
  }

  playTeleport() {
    this.playTone(300, 'sine', 0.2, 0.2, 1200);
    setTimeout(() => this.playTone(600, 'sine', 0.15, 0.15, 1500), 50);
  }

  playDoor() {
    this.playTone(100, 'sawtooth', 0.4, 0.1, 50);
  }

  playSpike() {
    this.playTone(400, 'sawtooth', 0.15, 0.2, 100);
    setTimeout(() => this.playTone(300, 'sawtooth', 0.1, 0.1), 50);
  }

  playCrumble() {
    this.playTone(90, 'triangle', 0.3, 0.25, 30);
  }

  playWin() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.playTone(523.25, 'sine', 0.15, 0.15); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.15), 120); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.15, 0.15), 240); // G5
    setTimeout(() => this.playTone(1046.50, 'sine', 0.4, 0.2), 360); // C6
  }

  playFail() {
    this.playTone(220, 'sawtooth', 0.6, 0.2, 80); // Sad slide down
  }

  startBGM() {
    if (this.bgmPlaying || this.muted) return;
    this.bgmPlaying = true;
    
    // Simple 8-bit loop
    this.bgmInterval = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const noteIdx = this.melody[this.melodyIdx];
      const freq = this.notes[noteIdx % this.notes.length] * (noteIdx >= 8 ? 2 : 1);
      
      // Play soft bass note
      this.playTone(freq / 2, 'triangle', 0.22, 0.35);
      
      // Play arpeggiated lead on every fourth note
      if (this.melodyIdx % 4 === 0) {
        this.playTone(freq, 'triangle', 0.45, 0.20);
      }
      
      this.melodyIdx = (this.melodyIdx + 1) % this.melody.length;
    }, 250);
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.bgmPlaying = false;
  }
}

// Particle System for Visual Polish
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  add(x, y, color, count = 5, speed = 2, size = 4, life = 30) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = (Math.random() * 0.6 + 0.4) * speed;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        color: color,
        size: (Math.random() * 0.5 + 0.5) * size,
        alpha: 1,
        life: life,
        maxLife: life
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.alpha = p.life / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Global Game Variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const sound = new SoundSynth();
const particles = new ParticleSystem();

let currentLevelIdx = 0;
let levelName = "";
let levelDesc = "";
let levelWidth = 0;
let levelHeight = 0;
let maxAP = 50;
let remainingAP = 50;
let moveCount = 0;
let gameStatus = 'playing'; // 'playing', 'victory', 'gameover'

// 2D Array grids
let boardGrid = []; // Tile structure ('W', '.', 'I', 'H', 'F', 'S', 'K', 'D', 'T', '^', '>', 'v', '<', 'C', 'X', 'G')
let connections = []; // [{switch: {x,y}, door: {x,y}}]
let levelPortalConnections = []; // [{p1: {x,y}, p2: {x,y}}]
let activeStickySwitches = new Set(); // Coordinates "x,y" of sticky switches pressed

// Entities
let player = { x: 0, y: 0, animX: 0, animY: 0, dir: 'down' };
let boxes = []; // [{id, x, y, animX, animY, active}]

// Undo/Redo Stacks
let historyStack = [];
let redoStack = [];
let clearPath = []; // Records directions taken by player to clear level (e.g. ['L', 'U', 'R', ...])

// Animation States
let isAnimating = false;
let animationQueue = []; // [{type: 'player'/'box'/'spike'/'crumble', fromX, fromY, toX, toY, progress, duration, eventData}]
let shakeDuration = 0;
let shakeIntensity = 0;

// Replay Engine States
window.isReplaying = false;
window.replayPath = [];
window.replayIndex = 0;
window.replayTimeoutId = null;
window.replayOriginalLevelIdx = 0;
let currentChapterIdx = 0;

// Tile Palette mapping for drawing
const TILE_SIZE_MAX = 128;
let tileSize = 48;
let offsetX = 0;
let offsetY = 0;

// Editor Mode status
let isEditorMode = false;
let spikesUp = false; // Spikes stateful state (toggles on player moves)
let visualSpikesUp = false; // Visual-only spike state for rendering during animation
let spikeToggleSchedule = []; // [{frame, spikesUp}] scheduled visual spike state changes per animation

// Map Editor States
let editorGridWidth = 15;
let editorGridHeight = 15;
let editorSelectedTool = 'W'; // Default tool: Wall
let editorMapName = '';
let editorMaxAP = 50;
let editorGrid = [];
let editorEntities = [];
let editorConnections = [];
let editorPortalConnections = [];
let editorLinkStart = null;
let editorVerified = false;
let editorOptimalAP = null;
let editorOptimalMoves = null;
let editorOptimalPath = null;
let isEditorTesting = false;
let currentEditingMapId = null;

// Custom Play states
window.customMapMode = null; // 'editor' during test play, 'play' during friend map play
let currentCustomLevelData = null;
let currentPlayingCustomMap = null;

// --------------------------------------------------------------------------
// Initialization & Level Loading
// --------------------------------------------------------------------------

function initGame() {
  // Set up levels selector listener
  const select = document.getElementById('levelSelect');
  select.addEventListener('change', (e) => {
    sound.init();
    loadLevel(parseInt(e.target.value));
    canvas.focus();
  });
  populateLevelSelect();

  // Controls UI binding with Volume Slider Dropdown
  const volumeSliders = document.querySelectorAll('.volume-slider');
  const volumeTexts = document.querySelectorAll('.volume-text');
  
  function updateSoundUI() {
    const isMuted = sound.muted || sound.volume === 0;
    const iconHtml = `<span class="icon">${isMuted ? '🔇' : '🔊'}</span>`;
    const headerBtn = document.getElementById('btnSoundToggle');
    const footerBtn = document.getElementById('btnChapterSelectSound');
    const stageBtn = document.getElementById('btnStageSelectSound');
    if (headerBtn) headerBtn.innerHTML = iconHtml;
    if (footerBtn) footerBtn.innerHTML = iconHtml;
    if (stageBtn) stageBtn.innerHTML = iconHtml;
    
    const volPercent = Math.round(sound.volume * 100);
    volumeSliders.forEach(slider => {
      slider.value = volPercent;
    });
    volumeTexts.forEach(txt => {
      txt.textContent = `${volPercent}%`;
    });
  }

  // Initialize UI state
  updateSoundUI();

  // Toggle dropdown logic
  const DROPDOWNS = ['volumeDropdownHeader', 'volumeDropdownFooter', 'volumeDropdownStageSelect'];
  function toggleDropdown(targetId) {
    sound.init();
    DROPDOWNS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === targetId) {
        el.classList.toggle('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  }

  document.getElementById('btnSoundToggle').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown('volumeDropdownHeader');
  });

  const footerSoundBtn = document.getElementById('btnChapterSelectSound');
  if (footerSoundBtn) {
    footerSoundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown('volumeDropdownFooter');
    });
  }

  const stageSelectSoundBtn = document.getElementById('btnStageSelectSound');
  if (stageSelectSoundBtn) {
    stageSelectSoundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown('volumeDropdownStageSelect');
    });
  }

  // Sliders input handling
  volumeSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      sound.volume = val / 100;
      localStorage.setItem('runic_dungeon_volume', sound.volume);
      
      if (val === 0) {
        sound.muted = true;
        sound.stopBGM();
      } else {
        sound.muted = false;
        if (!sound.bgmPlaying) {
          sound.startBGM();
        }
      }
      updateSoundUI();
    });
    // Stop event propagation to prevent closing dropdown when clicking/dragging the slider
    slider.addEventListener('click', (e) => e.stopPropagation());
    slider.addEventListener('touchstart', (e) => e.stopPropagation());
  });

  // Close sound dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sound-wrapper')) {
      DROPDOWNS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
    }
  });

  document.getElementById('btnHelpToggle').addEventListener('click', () => {
    if (window.isReplaying) return;
    document.getElementById('helpModal').classList.remove('hidden');
  });

  const footerHelpBtn = document.getElementById('btnChapterSelectHelp');
  if (footerHelpBtn) {
    footerHelpBtn.addEventListener('click', () => {
      if (window.isReplaying) return;
      document.getElementById('helpModal').classList.remove('hidden');
    });
  }

  const stageSelectHelpBtn = document.getElementById('btnStageSelectHelp');
  if (stageSelectHelpBtn) {
    stageSelectHelpBtn.addEventListener('click', () => {
      if (window.isReplaying) return;
      document.getElementById('helpModal').classList.remove('hidden');
    });
  }

  document.getElementById('btnHelpClose').addEventListener('click', () => {
    document.getElementById('helpModal').classList.add('hidden');
  });

  document.getElementById('btnHelpConfirm').addEventListener('click', () => {
    document.getElementById('helpModal').classList.add('hidden');
    sound.init();
  });

  document.getElementById('btnUndo').addEventListener('click', () => { if (window.isReplaying) return; undo(); canvas.focus(); });
  document.getElementById('btnRedo').addEventListener('click', () => { if (window.isReplaying) return; redo(); canvas.focus(); });
  document.getElementById('btnRestart').addEventListener('click', () => { if (window.isReplaying) return; restartLevel(); canvas.focus(); });
  document.getElementById('btnStopReplay').addEventListener('click', () => { window.stopReplay(); });

  document.getElementById('btnOverlayNext').addEventListener('click', () => {
    if (window.isReplaying) return;
    if (gameStatus === 'victory') {
      if (window.customMapMode === 'editor') {
        exitTestPlayAndReturnToEditor();
      } else if (window.customMapMode === 'play') {
        exitCustomPlayAndReturnToList();
      } else {
        const nextIdx = currentLevelIdx + 1;
        const nextLvl = nextIdx < DEFAULT_LEVELS.length ? DEFAULT_LEVELS[nextIdx] : null;
        const nextChapter = nextLvl && (nextLvl.chapter !== undefined ? nextLvl.chapter : 0);
        
        if (nextLvl && nextChapter === currentChapterIdx) {
          if (nextLvl.locked) {
            document.getElementById('screenOverlay').classList.add('hidden');
            showStageSelectMenu();
          } else {
            document.getElementById('levelSelect').value = nextIdx;
            loadLevel(nextIdx);
          }
        } else {
          if (currentChapterIdx === 0) {
            alert("기초 훈련을 완주하셨습니다! 제 1장 모험에 도전해보세요!");
          } else {
            alert("모든 기본 레벨을 완주하셨습니다! 축하합니다!");
          }
          document.getElementById('screenOverlay').classList.add('hidden');
          showChapterSelectMenu();
        }
      }
    } else {
      restartLevel();
    }
  });

  document.getElementById('btnOverlayRestart').addEventListener('click', () => {
    if (window.isReplaying) return;
    restartLevel();
  });

  // Setup Canvas focus
  canvas.tabIndex = 1;
  canvas.addEventListener('click', () => {
    sound.init();
    canvas.focus();
  });

  // Setup Keyboard
  window.addEventListener('keydown', handleKeyDown);

  // Setup Touch swipe controls for mobile
  setupTouchControls();

  // Bind Login Overlay UI Listeners
  const userBtns = document.querySelectorAll('.user-select-btn');
  let selectedUserForLogin = '';
  userBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const username = btn.getAttribute('data-username');
      selectedUserForLogin = username;
      document.getElementById('loginUserList').classList.add('hidden');
      document.getElementById('selectedUserTitle').textContent = `모험가: ${username}`;
      document.getElementById('loginPasswordForm').classList.remove('hidden');
      document.getElementById('loginPasswordInput').value = '';
      document.getElementById('loginPasswordInput').focus();
      document.getElementById('loginErrorMsg').classList.add('hidden');
    });
  });

  document.getElementById('btnLoginCancel').addEventListener('click', () => {
    document.getElementById('loginUserList').classList.remove('hidden');
    document.getElementById('loginPasswordForm').classList.add('hidden');
    document.getElementById('loginErrorMsg').classList.add('hidden');
  });

  document.getElementById('btnLoginSubmit').addEventListener('click', () => {
    const password = document.getElementById('loginPasswordInput').value;
    attemptLogin(selectedUserForLogin, password);
  });

  document.getElementById('loginPasswordInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const password = document.getElementById('loginPasswordInput').value;
      attemptLogin(selectedUserForLogin, password);
    }
  });

  // Bind Leaderboard UI Listeners
  document.getElementById('btnLeaderboard').addEventListener('click', () => {
    showLeaderboardModal();
  });
  document.getElementById('btnLeaderboardClose').addEventListener('click', () => {
    document.getElementById('leaderboardModal').classList.add('hidden');
  });
  document.getElementById('btnCustomLeaderboardClose').addEventListener('click', () => {
    document.getElementById('customLeaderboardModal').classList.add('hidden');
  });
  document.getElementById('btnLeaderboardConfirm').addEventListener('click', () => {
    document.getElementById('leaderboardModal').classList.add('hidden');
  });
  document.getElementById('btnLeaderboardRefresh').addEventListener('click', () => {
    showLeaderboardModal(window.currentLeaderboardChapterIdx !== undefined ? window.currentLeaderboardChapterIdx : null);
  });

  // Bind Mode Select Logout Listener
  const btnModeSelectLogout = document.getElementById('btnModeSelectLogout');
  if (btnModeSelectLogout) {
    btnModeSelectLogout.addEventListener('click', () => {
      logout();
    });
  }

  // Bind Update History UI Listeners
  const btnUpdateHistory = document.getElementById('btnUpdateHistory');
  if (btnUpdateHistory) {
    btnUpdateHistory.addEventListener('click', () => {
      sound.init();
      showUpdateHistoryModal();
    });
  }
  const btnUpdateHistoryClose = document.getElementById('btnUpdateHistoryClose');
  if (btnUpdateHistoryClose) {
    btnUpdateHistoryClose.addEventListener('click', () => {
      document.getElementById('updateHistoryModal').classList.add('hidden');
    });
  }
  const btnUpdateHistoryConfirm = document.getElementById('btnUpdateHistoryConfirm');
  if (btnUpdateHistoryConfirm) {
    btnUpdateHistoryConfirm.addEventListener('click', () => {
      document.getElementById('updateHistoryModal').classList.add('hidden');
    });
  }

  // Bind Admin Paths UI Listeners
  const openAdminPathsModal = () => {
    showAdminPathsModal();
  };
  const closeAdminPathsModal = () => {
    const modal = document.getElementById('adminPathsModal');
    if (modal) modal.classList.add('hidden');
    window.adminPathsSelectedUser = null;
    window.adminPathsSelectedChapter = null;
  };

  const btnAdminPaths = document.getElementById('btnAdminPaths');
  if (btnAdminPaths) btnAdminPaths.addEventListener('click', openAdminPathsModal);
  
  const btnChapterSelectAdminPaths = document.getElementById('btnChapterSelectAdminPaths');
  if (btnChapterSelectAdminPaths) btnChapterSelectAdminPaths.addEventListener('click', openAdminPathsModal);
  
  const btnStageSelectAdminPaths = document.getElementById('btnStageSelectAdminPaths');
  if (btnStageSelectAdminPaths) btnStageSelectAdminPaths.addEventListener('click', openAdminPathsModal);

  const btnAdminPathsClose = document.getElementById('btnAdminPathsClose');
  if (btnAdminPathsClose) btnAdminPathsClose.addEventListener('click', closeAdminPathsModal);

  const btnAdminPathsConfirm = document.getElementById('btnAdminPathsConfirm');
  if (btnAdminPathsConfirm) btnAdminPathsConfirm.addEventListener('click', closeAdminPathsModal);

  const btnAdminPathsRefresh = document.getElementById('btnAdminPathsRefresh');
  if (btnAdminPathsRefresh) btnAdminPathsRefresh.addEventListener('click', openAdminPathsModal);


  // Bind Stage Select Navigation & Utility buttons
  document.getElementById('btnBackToMenu').addEventListener('click', () => {
    if (window.isReplaying) return;
    if (window.customMapMode === 'editor') {
      exitTestPlayAndReturnToEditor();
    } else if (window.customMapMode === 'play') {
      exitCustomPlayAndReturnToList();
    } else {
      showStageSelectMenu();
    }
  });

  const playBackBtn = document.getElementById('btnPlayBackToMenu');
  if (playBackBtn) {
    playBackBtn.addEventListener('click', () => {
      if (window.isReplaying) return;
      if (window.customMapMode === 'editor') {
        exitTestPlayAndReturnToEditor();
      } else if (window.customMapMode === 'play') {
        exitCustomPlayAndReturnToList();
      } else {
        showStageSelectMenu();
      }
    });
  }

  document.getElementById('btnOverlayMenu').addEventListener('click', () => {
    if (window.isReplaying) return;
    document.getElementById('screenOverlay').classList.add('hidden');
    if (window.customMapMode === 'editor') {
      exitTestPlayAndReturnToEditor();
    } else if (window.customMapMode === 'play') {
      exitCustomPlayAndReturnToList();
    } else {
      showStageSelectMenu();
    }
  });

  document.getElementById('btnStageSelectLeaderboard').addEventListener('click', () => {
    showLeaderboardModal(currentChapterIdx);
  });

  document.getElementById('btnStageSelectLogout').addEventListener('click', () => {
    logout();
  });

  document.getElementById('btnStageSelectBackToChapters').addEventListener('click', () => {
    document.getElementById('stageSelectOverlay').classList.add('hidden');
    showChapterSelectMenu();
  });

  // Bind Chapter Selection Event Listeners
  document.getElementById('chapterCard1').addEventListener('click', () => {
    sound.init();
    currentChapterIdx = 0;
    populateLevelSelect();
    document.getElementById('chapterSelectOverlay').classList.add('hidden');
    showStageSelectMenu();
  });

  document.getElementById('chapterCard2').addEventListener('click', () => {
    sound.init();
    currentChapterIdx = 1;
    populateLevelSelect();
    document.getElementById('chapterSelectOverlay').classList.add('hidden');
    showStageSelectMenu();
  });

  document.getElementById('chapterCard3').addEventListener('click', () => {
    sound.init();
    currentChapterIdx = 2;
    populateLevelSelect();
    document.getElementById('chapterSelectOverlay').classList.add('hidden');
    showStageSelectMenu();
  });

  document.getElementById('btnChapterSelectLeaderboard').addEventListener('click', () => {
    showLeaderboardModal();
  });

  document.getElementById('btnChapterSelectLogout').addEventListener('click', () => {
    logout();
  });

  // Load first level
  loadLevel(0);

  // Start Animation Loop
  requestAnimationFrame(gameLoop);

  // Bind Mode Selection Screen listeners
  document.getElementById('btnModeStage').addEventListener('click', () => {
    showChapterSelectMenu();
  });

  document.getElementById('btnModeCustom').addEventListener('click', () => {
    showCustomMapMenu();
  });

  document.getElementById('btnModeAdminPaths').addEventListener('click', () => {
    showAdminUserSelectMenu();
  });

  document.getElementById('btnAdminUserSelectBack').addEventListener('click', () => {
    document.getElementById('adminUserSelectOverlay').classList.add('hidden');
    showModeSelectMenu();
  });

  document.getElementById('btnAdminUserStageBack').addEventListener('click', () => {
    document.getElementById('adminUserStageOverlay').classList.add('hidden');
    document.getElementById('adminUserSelectOverlay').classList.remove('hidden');
  });

  // Bind Custom Map Menu screen listeners
  document.getElementById('btnCustomMapEdit').addEventListener('click', () => {
    showCustomMapList();
  });

  document.getElementById('btnCustomMapPlay').addEventListener('click', () => {
    openFriendMapsList();
  });

  document.getElementById('btnCustomMapBackToMode').addEventListener('click', () => {
    showModeSelectMenu();
  });

  // Bind Custom Map List screen listeners
  document.getElementById('btnCustomMapListBack').addEventListener('click', () => {
    showCustomMapMenu();
  });

  document.getElementById('btnCreateNewCustomMap').addEventListener('click', () => {
    createNewCustomMap();
  });

  // Bind Map Editor screen listeners
  document.getElementById('btnEditorClose').addEventListener('click', () => {
    if (confirm("저장하지 않은 변경사항은 사라질 수 있습니다. 나가시겠습니까?")) {
      isEditorMode = false;
      showCustomMapList();
    }
  });

  document.getElementById('btnEditorSaveDraft').addEventListener('click', () => {
    saveEditorDraft();
  });

  document.getElementById('btnEditorPublish').addEventListener('click', () => {
    publishEditorMap();
  });

  document.getElementById('btnEditorTestPlay').addEventListener('click', () => {
    startEditorTestPlay();
  });

  // Palette tool selection
  const paletteItems = document.querySelectorAll('#editorPalette .palette-item');
  paletteItems.forEach(item => {
    item.addEventListener('click', () => {
      paletteItems.forEach(btn => btn.classList.remove('active'));
      item.classList.add('active');
      editorSelectedTool = item.getAttribute('data-type');
      
      const statusEl = document.getElementById('editorLinkStatus');
      if (editorSelectedTool === 'link') {
        editorLinkStart = null;
        statusEl.textContent = "연결할 스위치(🔴/🟡), 잠긴 문(🔒) 또는 포탈(P)을 클릭하세요.";
      } else {
        editorLinkStart = null;
        statusEl.textContent = "도구 선택됨";
      }
    });
  });

  // Bind Friend Maps Overlay screen listeners
  document.getElementById('btnFriendMapsBack').addEventListener('click', () => {
    document.getElementById('friendMapsOverlay').classList.add('hidden');
    showCustomMapMenu();
  });

  document.getElementById('btnFriendMapsRefresh').addEventListener('click', () => {
    renderFriendMapsList();
  });

  // Bind Back to Mode in Chapter Selection overlay
  document.getElementById('btnChapterSelectBackToMode').addEventListener('click', () => {
    showModeSelectMenu();
  });

  // Check initial login state
  checkLoginState();

  // Global listener to auto-start sound on first user interaction (resolves browser autoplay block on refresh)
  const startAudioOnFirstInteraction = () => {
    sound.init();
    if (sound.ctx && sound.ctx.state === 'running') {
      document.removeEventListener('click', startAudioOnFirstInteraction);
      document.removeEventListener('keydown', startAudioOnFirstInteraction);
      document.removeEventListener('touchstart', startAudioOnFirstInteraction);
    }
  };
  document.addEventListener('click', startAudioOnFirstInteraction, { passive: true });
  document.addEventListener('keydown', startAudioOnFirstInteraction, { passive: true });
  document.addEventListener('touchstart', startAudioOnFirstInteraction, { passive: true });

  // Handle window resizing and mobile orientation changes
  window.addEventListener('resize', () => {
    resizeCanvas();
    updateHUD();
    draw();
  });
}

function getLevelDisplayNumber(idx) {
  const lvl = DEFAULT_LEVELS[idx];
  if (!lvl) return "";
  const ch = lvl.chapter !== undefined ? lvl.chapter : 0;
  if (ch === 0) {
    return `${idx + 1}층`;
  } else {
    let chLvlIdx = 1;
    for (let i = 0; i < idx; i++) {
      const otherLvl = DEFAULT_LEVELS[i];
      const otherCh = otherLvl.chapter !== undefined ? otherLvl.chapter : 0;
      if (otherCh === ch) {
        chLvlIdx++;
      }
    }
    return `${ch}-${chLvlIdx}`;
  }
}

function populateLevelSelect() {
  const select = document.getElementById('levelSelect');
  if (!select) return;
  select.innerHTML = '';
  DEFAULT_LEVELS.forEach((lvl, idx) => {
    const levelChapter = lvl.chapter !== undefined ? lvl.chapter : 0;
    if (levelChapter !== currentChapterIdx) return;
    if (lvl.locked) return; // Don't show locked levels in dropdown
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = lvl.name;
    select.appendChild(opt);
  });
}

function saveCurrentPlayTimeOnExit() {
  const user = localStorage.getItem('runic_dungeon_user') || '';
  if (user && gameStatus === 'playing' && !window.isReplaying) {
    const best = getBestRecord(currentLevelIdx);
    const alreadyThreeStars = best && best.stars === 3;
    if (!alreadyThreeStars && window.stagePlayTime > 0) {
      localStorage.setItem(`runic_dungeon_play_time_${user}_${currentLevelIdx}`, Math.round(window.stagePlayTime));
      uploadUserRecordsCloud(user);
    }
  }
}

window.addEventListener('beforeunload', saveCurrentPlayTimeOnExit);
window.addEventListener('pagehide', saveCurrentPlayTimeOnExit);

function loadLevel(index, customLevelData = null, isRestart = false) {
  saveCurrentPlayTimeOnExit();
  if (!customLevelData) {
    const user = localStorage.getItem('runic_dungeon_user');
    if (user) {
      const best = getBestRecord(index);
      const alreadyThreeStars = best && best.stars === 3;
      if (alreadyThreeStars) {
        // Show the retry count from the 3-star record
        localStorage.setItem(`runic_dungeon_retry_count_${user}_${index}`, best.retries || 1);
      } else {
        // Not 3-starred yet: accumulate retry count
        let retries = parseInt(localStorage.getItem(`runic_dungeon_retry_count_${user}_${index}`), 10) || 0;
        if (retries === 0) {
          retries = 1;
          localStorage.setItem(`runic_dungeon_retry_count_${user}_${index}`, retries);
        } else if (isRestart) {
          retries += 1;
          localStorage.setItem(`runic_dungeon_retry_count_${user}_${index}`, retries);
        }
      }
      // 시도 횟수가 변경되었으므로 클라우드에 비동기로 업로드 (안 깨졌어도 보관용)
      uploadUserRecordsCloud(user);
    }
  }

  historyStack = [];
  redoStack = [];
  clearPath = [];
  animationQueue = [];
  activeSpikesAnim = {};
  isAnimating = false;
  activeStickySwitches.clear();
  gameStatus = 'playing';
  document.getElementById('screenOverlay').classList.add('hidden');
  document.getElementById('btnOverlayRestart').classList.add('hidden');

  // Initialize stage play timer variables
  const user = localStorage.getItem('runic_dungeon_user') || '';
  if (!customLevelData) {
    currentCustomLevelData = null;
    if (user) {
      const best = getBestRecord(index);
      const alreadyThreeStars = best && best.stars === 3;
      if (alreadyThreeStars) {
        // Show the clear time from the 3-star record
        window.stagePlayTime = (best.clearTime || 0) * 1000;
        localStorage.setItem(`runic_dungeon_play_time_${user}_${index}`, (best.clearTime || 0) * 1000);
      } else {
        // Not 3-starred yet: load accumulated play time from local storage
        window.stagePlayTime = parseInt(localStorage.getItem(`runic_dungeon_play_time_${user}_${index}`), 10) || 0;
      }
    } else {
      window.stagePlayTime = 0;
    }
  } else {
    currentCustomLevelData = customLevelData;
    window.stagePlayTime = 0;
  }
  window.lastTimerTick = Date.now();

  let lvl = customLevelData;
  if (!lvl) {
    currentLevelIdx = index;
    lvl = DEFAULT_LEVELS[index];
    document.getElementById('levelSelect').value = index;
  }

  levelName = lvl.name;
  levelDesc = lvl.description || "";

  const playBackBtn = document.getElementById('btnPlayBackToMenu');
  if (playBackBtn && window.customMapMode !== 'play' && window.customMapMode !== 'editor') {
    playBackBtn.innerHTML = '<span class="icon">↩️</span> <span class="text">메뉴로 돌아가기</span>';
    playBackBtn.setAttribute('data-tooltip', '이전 메뉴로 돌아가기');
  }
  // Dynamic Bounding Box cropping to maximize screen space for active area
  let minX = lvl.width;
  let maxX = 0;
  let minY = lvl.height;
  let maxY = 0;
  let hasActiveElements = false;

  for (let y = 0; y < lvl.height; y++) {
    for (let x = 0; x < lvl.width; x++) {
      if (lvl.grid[y][x] !== ' ') {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        hasActiveElements = true;
      }
    }
  }

  if (lvl.entities) {
    lvl.entities.forEach(ent => {
      minX = Math.min(minX, ent.x);
      maxX = Math.max(maxX, ent.x);
      minY = Math.min(minY, ent.y);
      maxY = Math.max(maxY, ent.y);
      hasActiveElements = true;
    });
  }

  let offsetX_crop = 0;
  let offsetY_crop = 0;

  if (hasActiveElements) {
    offsetX_crop = minX;
    offsetY_crop = minY;
    levelWidth = maxX - minX + 1;
    levelHeight = maxY - minY + 1;
  } else {
    levelWidth = lvl.width;
    levelHeight = lvl.height;
  }

  maxAP = lvl.maxAP;
  remainingAP = lvl.maxAP;
  moveCount = 0;
  spikesUp = false; // Reset spikes to retracted at start of level

  // Clone 2D grid using the cropped bounds
  boardGrid = Array(levelHeight).fill(null).map(() => Array(levelWidth).fill(' '));
  for (let y = 0; y < levelHeight; y++) {
    for (let x = 0; x < levelWidth; x++) {
      boardGrid[y][x] = lvl.grid[y + offsetY_crop][x + offsetX_crop];
    }
  }

  // Clone and offset switch-door connections
  connections = lvl.connections ? lvl.connections.map(c => ({
    switch: { x: c.switch.x - offsetX_crop, y: c.switch.y - offsetY_crop },
    door: { x: c.door.x - offsetX_crop, y: c.door.y - offsetY_crop }
  })) : [];

  // Clone and offset portal connections
  levelPortalConnections = lvl.portalConnections ? lvl.portalConnections.map(c => ({
    p1: { x: c.p1.x - offsetX_crop, y: c.p1.y - offsetY_crop },
    p2: { x: c.p2.x - offsetX_crop, y: c.p2.y - offsetY_crop }
  })) : [];

  // Parse and offset entities
  boxes = [];
  let boxId = 0;
  lvl.entities.forEach(ent => {
    const rx = ent.x - offsetX_crop;
    const ry = ent.y - offsetY_crop;
    if (ent.type === 'player') {
      player.x = rx;
      player.y = ry;
      player.animX = rx;
      player.animY = ry;
      player.dir = 'down';
    } else if (ent.type === 'box') {
      boxes.push({
        id: boxId++,
        x: rx,
        y: ry,
        animX: rx,
        animY: ry,
        active: true
      });
    }
  });

  // Recalculate switches & doors state immediately
  updateSwitchesAndDoors();

  // Update UI Elements
  updateHUD();
  updateRecordHUD();

  // Resize canvas display
  resizeCanvas();

  // Play load cue
  sound.playClick();
}

function resizeCanvas() {
  const container = canvas.parentElement;
  const containerW = container.clientWidth || 640;
  let containerH = container.clientHeight || 480;
  
  if (window.innerWidth <= 900) {
    // On mobile, use 58vh as the height limit to prevent shrinking loops
    containerH = window.innerHeight * 0.58;
  }
  
  // Calculate tile size to fit grid comfortably
  const scaleX = containerW / levelWidth;
  const scaleY = containerH / levelHeight;
  tileSize = Math.min(scaleX, scaleY, TILE_SIZE_MAX);
  
  // Ensure size is integer
  tileSize = Math.floor(tileSize);

  canvas.width = levelWidth * tileSize;
  canvas.height = levelHeight * tileSize;
  canvas.style.width = `${levelWidth * tileSize}px`;
  canvas.style.height = `${levelHeight * tileSize}px`;
  canvas.style.aspectRatio = `${levelWidth} / ${levelHeight}`;
  
  offsetX = (canvas.width - levelWidth * tileSize) / 2;
  offsetY = (canvas.height - levelHeight * tileSize) / 2;
}

function updateHUD() {
  document.getElementById('levelName').textContent = levelName;
  document.getElementById('levelDesc').textContent = levelDesc;
  document.getElementById('apText').textContent = `${remainingAP} / ${maxAP}`;
  document.getElementById('moveCount').textContent = moveCount;

  // Update Retry Count Display in HUD
  const user = localStorage.getItem('runic_dungeon_user') || '';
  const retryEl = document.getElementById('retryCountDisplay');
  if (retryEl) {
    if (user && !currentCustomLevelData) {
      const retryCount = parseInt(localStorage.getItem(`runic_dungeon_retry_count_${user}_${currentLevelIdx}`), 10) || 0;
      retryEl.textContent = retryCount > 0 ? `${retryCount}회` : '1회';
    } else {
      retryEl.textContent = '-';
    }
  }

  // Update Timer Display in HUD
  const timerEl = document.getElementById('timerDisplay');
  if (timerEl) {
    const totalSec = Math.floor((window.stagePlayTime || 0) / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
  }

  const fill = document.getElementById('apProgressFill');
  const pct = Math.max(0, Math.min(100, (remainingAP / maxAP) * 100));
  fill.style.width = `${pct}%`;

  if (pct < 30) {
    fill.classList.add('danger');
  } else {
    fill.classList.remove('danger');
  }

  // Update Star Rating HUD
  const lvl = currentCustomLevelData || DEFAULT_LEVELS[currentLevelIdx];
  if (lvl) {
    const spentAP = maxAP - remainingAP;
    const optimalAP = lvl.optimalAP || 0;
    const threeStarLimit = optimalAP;
    const twoStarLimit = Math.floor(optimalAP * 1.3);

    const labelEl = document.getElementById('starCardLabel');
    if (labelEl) {
      const isMobile = window.innerWidth <= 900;
      if (isMobile) {
        labelEl.textContent = `별 3개까지: ${Math.max(0, threeStarLimit - spentAP)}`;
      } else {
        labelEl.textContent = '별 등급';
      }
    }

    let stars = 1;
    let statusText = "별 1개 확정";

    if (optimalAP > 0) {
      if (spentAP <= threeStarLimit) {
        stars = 3;
        statusText = `별 3개까지 남은 행동력: ${threeStarLimit - spentAP} AP`;
      } else if (spentAP <= twoStarLimit) {
        stars = 2;
        statusText = `별 2개까지 남은 행동력: ${twoStarLimit - spentAP} AP`;
      }
    } else {
      stars = 3;
      statusText = "검증 플레이 중";
    }

    const s1 = document.getElementById('star1');
    const s2 = document.getElementById('star2');
    const s3 = document.getElementById('star3');
    
    if (s1 && s2 && s3) {
      if (stars >= 1) s1.classList.add('active'); else s1.classList.remove('active');
      if (stars >= 2) s2.classList.add('active'); else s2.classList.remove('active');
      if (stars >= 3) s3.classList.add('active'); else s3.classList.remove('active');
    }

    const statusEl = document.getElementById('starApStatus');
    if (statusEl) {
      statusEl.textContent = statusText;
    }
  }
}

// --------------------------------------------------------------------------
// Game Logic Simulation Engine
// --------------------------------------------------------------------------

function attemptMove(dx, dy, isReplayCall = false) {
  if (window.isReplaying && !isReplayCall) return;
  if (gameStatus !== 'playing' || isAnimating || isEditorMode) return;

  // 1. Calculate direction tag
  let dir = 'down';
  if (dx === 1) dir = 'right';
  else if (dx === -1) dir = 'left';
  else if (dy === 1) dir = 'down';
  else if (dy === -1) dir = 'up';
  player.dir = dir;

  // 2. Clone state for Undo history
  saveStateToHistory();

  // 3. Process Physics Simulation
  const sim = simulateMove(dx, dy);

  if (!sim || (!sim.playerMoved && sim.boxAnimations.length === 0)) {
    // Revert history since nothing changed
    historyStack.pop();
    return;
  }

  // Record direction key
  let dirChar = '';
  if (dx === 1) dirChar = 'R';
  else if (dx === -1) dirChar = 'L';
  else if (dy === 1) dirChar = 'D';
  else if (dy === -1) dirChar = 'U';
  if (dirChar) {
    clearPath.push(dirChar);
  }

  // 4. Update Logical States based on Simulation Results
  player.x = sim.endPlayerX;
  player.y = sim.endPlayerY;
  spikesUp = sim.endSpikesUp; // Sync spikes toggle state
  
  // Update box coordinates
  sim.boxFinalCoords.forEach(bf => {
    const box = boxes.find(b => b.id === bf.id);
    if (box) {
      box.x = bf.x;
      box.y = bf.y;
      box.active = bf.active;
    }
  });

  // Apply crumbling tiles modifications
  sim.crumblingUpdates.forEach(cup => {
    boardGrid[cup.y][cup.x] = cup.tile;
  });

  // Apply filled holes modifications
  sim.holeFills.forEach(hf => {
    boardGrid[hf.y][hf.x] = 'F'; // Filled floor
  });

  remainingAP = sim.endAP;
  moveCount++;

  // 5. Construct Visual Animations
  setupAnimations(sim);

  // Recalculate switches states for new end positions
  updateSwitchesAndDoors();

  // Update HUD
  updateHUD();
}

function simulateMove(dx, dy) {
  let curPlayerX = player.x;
  let curPlayerY = player.y;
  let curAP = remainingAP;
  let simSpikesUp = spikesUp; // Track spikes toggle state

  // Clone box coordinates list for simulation tracking
  let simBoxes = boxes.map(b => ({ id: b.id, x: b.x, y: b.y, active: b.active }));
  let simGrid = boardGrid.map(row => [...row]);

  // Tracks for visual animation scheduling
  let playerSteps = [{ x: curPlayerX, y: curPlayerY, action: 'start' }];
  let boxAnimations = []; // [{ id, path: [{x, y, action}] }]
  let crumblingUpdates = []; // [{x, y, tile}]
  let holeFills = []; // [{x, y}]
  let soundsToPlay = [];
  let spikeStatesPerStep = []; // spike state after each player step (for visual toggle)

  // Helper check for box existence at (x,y)
  function getBoxAt(x, y) {
    return simBoxes.find(b => b.active && b.x === x && b.y === y);
  }

  function findOtherPortal(px, py) {
    if (levelPortalConnections && levelPortalConnections.length > 0) {
      const conn = levelPortalConnections.find(c => 
        (c.p1.x === px && c.p1.y === py) || (c.p2.x === px && c.p2.y === py)
      );
      if (conn) {
        if (conn.p1.x === px && conn.p1.y === py) {
          return { x: conn.p2.x, y: conn.p2.y };
        } else {
          return { x: conn.p1.x, y: conn.p1.y };
        }
      }
    }
    for (let r = 0; r < levelHeight; r++) {
      for (let c = 0; c < levelWidth; c++) {
        if (simGrid[r][c] === 'P' && (c !== px || r !== py)) {
          return { x: c, y: r };
        }
      }
    }
    return null;
  }

  // Helper check for walls / closed doors
  function isBlocked(x, y) {
    if (x < 0 || x >= levelWidth || y < 0 || y >= levelHeight) return true;
    const tile = simGrid[y][x];
    if (tile === 'W' || tile === ' ') return true;
    if (tile === 'D') {
      return !isDoorOpenInSim(x, y, simBoxes);
    }
    return false;
  }

  // Helper check for one-way constraints
  function canEnterOneWay(x, y, vx, vy) {
    const tile = simGrid[y][x];
    if (tile === '^' && (vx !== 0 || vy !== -1)) return false;
    if (tile === '>' && (vx !== 1 || vy !== 0)) return false;
    if (tile === 'v' && (vx !== 0 || vy !== 1)) return false;
    if (tile === '<' && (vx !== -1 || vy !== 0)) return false;
    return true;
  }

  // 1. One-way constraint from current tile
  const currentTile = simGrid[curPlayerY][curPlayerX];
  if (['^', '>', 'v', '<'].includes(currentTile)) {
    if (!canEnterOneWay(curPlayerX, curPlayerY, dx, dy)) {
      return null;
    }
  }

  let nextPX = curPlayerX + dx;
  let nextPY = curPlayerY + dy;

  // Check bounds & basic walls
  if (isBlocked(nextPX, nextPY)) return null;

  // Check target tile one-way entering constraint
  if (['^', '>', 'v', '<'].includes(simGrid[nextPY][nextPX])) {
    if (!canEnterOneWay(nextPX, nextPY, dx, dy)) return null;
  }

  let playerMoved = false;
  let pushedBox = getBoxAt(nextPX, nextPY);

  // Initial AP cost for starting a move
  curAP--;

  if (pushedBox) {
    // Try to push box
    let boxTargetX = nextPX + dx;
    let boxTargetY = nextPY + dy;

    // Check one-way constraints for the box's current tile exit
    const boxCurrentTile = simGrid[nextPY][nextPX];
    if (['^', '>', 'v', '<'].includes(boxCurrentTile)) {
      if (!canEnterOneWay(nextPY, nextPX, dx, dy)) return null;
    }

    // Check bounds, blocks, & teleport portal (P) behind box (boxes cannot enter portal)
    if (isBlocked(boxTargetX, boxTargetY) || getBoxAt(boxTargetX, boxTargetY) || simGrid[boxTargetY][boxTargetX] === 'P') {
      return null;
    }

    // Check one-way constraints for the box's target tile entry
    if (['^', '>', 'v', '<'].includes(simGrid[boxTargetY][boxTargetX])) {
      if (!canEnterOneWay(boxTargetX, boxTargetY, dx, dy)) return null;
    }

    // Push is successful, trace box movement
    playerMoved = true;
    
    // Player takes 1 step (to nextPX, nextPY)
    simSpikesUp = !simSpikesUp; // Spike state toggles
    spikeStatesPerStep.push(simSpikesUp);
    
    if (simGrid[nextPY][nextPX] === 'T' && simSpikesUp) {
      curAP -= 10;
      playerSteps.push({ x: nextPX, y: nextPY, action: 'spike' });
      soundsToPlay.push({ delay: 50, type: 'spike' });
    } else {
      playerSteps.push({ x: nextPX, y: nextPY, action: 'walk' });
      soundsToPlay.push({ delay: 50, type: 'step' });
    }
    
    // Register crumbling for player leaving current tile
    triggerCrumbleTile(curPlayerX, curPlayerY, crumblingUpdates, simGrid);

    let boxPath = [{ x: nextPX, y: nextPY, action: 'start' }];

    // Ice sliding trace for box
    let bx = boxTargetX;
    let by = boxTargetY;
    let boxActive = true;

    if (simGrid[by][bx] === 'H') {
      // Direct push into hole
      boxPath.push({ x: bx, y: by, action: 'fall' });
      boxActive = false;
      holeFills.push({ x: bx, y: by });
      simGrid[by][bx] = 'F'; // Filled Floor in sim
      soundsToPlay.push({ delay: 150, type: 'splash' });
    } else {
      boxPath.push({ x: bx, y: by, action: 'slide' });
      triggerCrumbleTile(nextPX, nextPY, crumblingUpdates, simGrid); // Box left original tile

      if (simGrid[by][bx] === 'I') {
        // Slide on ice loop
        soundsToPlay.push({ delay: 100, type: 'slide' });
        while (true) {
          let nextBX = bx + dx;
          let nextBY = by + dy;

          // Slide obstacle & portal check (box cannot enter portal)
          if (isBlocked(nextBX, nextBY) || getBoxAt(nextBX, nextBY) || simGrid[nextBY][nextBX] === 'P') break;

          // One-way check
          if (['^', '>', 'v', '<'].includes(simGrid[nextBY][nextBX])) {
            if (!canEnterOneWay(nextBX, nextBY, dx, dy)) break;
          }

          // Move box forward on ice
          bx = nextBX;
          by = nextBY;

          if (simGrid[by][bx] === 'H') {
            boxPath.push({ x: bx, y: by, action: 'fall' });
            boxActive = false;
            holeFills.push({ x: bx, y: by });
            simGrid[by][bx] = 'F';
            soundsToPlay.push({ delay: 300, type: 'splash' });
            break;
          }

          boxPath.push({ x: bx, y: by, action: 'slide' });

          if (simGrid[by][bx] !== 'I') {
            break;
          }
        }
      }
    }

    pushedBox.x = bx;
    pushedBox.y = by;
    pushedBox.active = boxActive;

    boxAnimations.push({
      id: pushedBox.id,
      path: boxPath
    });

    // Check if player steps onto ice (where the box was originally)
    let px = nextPX;
    let py = nextPY;
    if (simGrid[py][px] === 'I') {
      soundsToPlay.push({ delay: 150, type: 'slide' });
      while (true) {
        let nextPX = px + dx;
        let nextPY = py + dy;

        if (isBlocked(nextPX, nextPY) || getBoxAt(nextPX, nextPY)) break;

        if (['^', '>', 'v', '<'].includes(simGrid[nextPY][nextPX])) {
          if (!canEnterOneWay(nextPX, nextPY, dx, dy)) break;
        }

        triggerCrumbleTile(px, py, crumblingUpdates, simGrid);
        
        px = nextPX;
        py = nextPY;

        // Player takes 1 step during slide
        simSpikesUp = !simSpikesUp; // Spike state toggles
        spikeStatesPerStep.push(simSpikesUp);

        if (simGrid[py][px] === 'H') {
          playerSteps.push({ x: px, y: py, action: 'fall' });
          curAP = 0;
          soundsToPlay.push({ delay: 250, type: 'fail' });
          break;
        }

        if (simGrid[py][px] === 'T' && simSpikesUp) {
          curAP -= 10;
          playerSteps.push({ x: px, y: py, action: 'spike' });
          soundsToPlay.push({ delay: 200, type: 'spike' });
          break; // Stop sliding since player dies
        } else {
          playerSteps.push({ x: px, y: py, action: 'slide' });
        }

        // Check teleport portal during sliding
        if (simGrid[py][px] === 'P') {
          const portalDest = findOtherPortal(px, py);
          if (portalDest) {
            playerSteps.push({ x: portalDest.x, y: portalDest.y, action: 'teleport' });
            soundsToPlay.push({ delay: 200, type: 'teleport' });
            px = portalDest.x;
            py = portalDest.y;
            break; // slide breaks immediately upon warping
          }
        }

        if (simGrid[py][px] !== 'I') break;
      }
    }

    curPlayerX = px;
    curPlayerY = py;

  } else {
    // Normal player movement without box push
    playerMoved = true;
    let px = nextPX;
    let py = nextPY;

    triggerCrumbleTile(curPlayerX, curPlayerY, crumblingUpdates, simGrid);

    // Player takes 1 step
    simSpikesUp = !simSpikesUp; // Spike state toggles
    spikeStatesPerStep.push(simSpikesUp);

    if (simGrid[py][px] === 'H') {
      playerSteps.push({ x: px, y: py, action: 'fall' });
      curAP = 0;
      soundsToPlay.push({ delay: 100, type: 'fail' });
    } else if (simGrid[py][px] === 'P') {
      // Walked onto portal
      playerSteps.push({ x: px, y: py, action: 'walk' });
      const portalDest = findOtherPortal(px, py);
      if (portalDest) {
        playerSteps.push({ x: portalDest.x, y: portalDest.y, action: 'teleport' });
        soundsToPlay.push({ delay: 50, type: 'teleport' });
        px = portalDest.x;
        py = portalDest.y;
      }
    } else if (simGrid[py][px] === 'I') {
      if (simGrid[py][px] === 'T' && simSpikesUp) {
        curAP -= 10;
        playerSteps.push({ x: px, y: py, action: 'spike' });
        soundsToPlay.push({ delay: 50, type: 'spike' });
      } else {
        playerSteps.push({ x: px, y: py, action: 'slide' });
        soundsToPlay.push({ delay: 50, type: 'slide' });
      }

      while (true) {
        let nextPX = px + dx;
        let nextPY = py + dy;

        if (isBlocked(nextPX, nextPY) || getBoxAt(nextPX, nextPY)) break;

        if (['^', '>', 'v', '<'].includes(simGrid[nextPY][nextPX])) {
          if (!canEnterOneWay(nextPX, nextPY, dx, dy)) break;
        }

        triggerCrumbleTile(px, py, crumblingUpdates, simGrid);

        px = nextPX;
        py = nextPY;

        // Player takes 1 step during slide
        simSpikesUp = !simSpikesUp; // Spike state toggles
        spikeStatesPerStep.push(simSpikesUp);

        if (simGrid[py][px] === 'H') {
          playerSteps.push({ x: px, y: py, action: 'fall' });
          curAP = 0;
          soundsToPlay.push({ delay: 250, type: 'fail' });
          break;
        }

        if (simGrid[py][px] === 'T' && simSpikesUp) {
          curAP -= 10;
          playerSteps.push({ x: px, y: py, action: 'spike' });
          soundsToPlay.push({ delay: 200, type: 'spike' });
          break; // Stop sliding since player dies
        } else {
          playerSteps.push({ x: px, y: py, action: 'slide' });
        }

        // Check teleport portal during sliding
        if (simGrid[py][px] === 'P') {
          const portalDest = findOtherPortal(px, py);
          if (portalDest) {
            playerSteps.push({ x: portalDest.x, y: portalDest.y, action: 'teleport' });
            soundsToPlay.push({ delay: 100, type: 'teleport' });
            px = portalDest.x;
            py = portalDest.y;
            break; // slide breaks immediately upon warping
          }
        }

        if (simGrid[py][px] !== 'I') break;
      }
    } else if (simGrid[py][px] === 'T' && simSpikesUp) {
      curAP -= 10;
      playerSteps.push({ x: px, y: py, action: 'spike' });
      soundsToPlay.push({ delay: 50, type: 'spike' });
    } else {
      playerSteps.push({ x: px, y: py, action: 'walk' });
      soundsToPlay.push({ delay: 50, type: 'step' });
    }

    curPlayerX = px;
    curPlayerY = py;
  }

  curAP = Math.max(0, curAP);

  return {
    playerMoved,
    endPlayerX: curPlayerX,
    endPlayerY: curPlayerY,
    endAP: curAP,
    endSpikesUp: simSpikesUp, // Return final spikes state
    spikeStatesPerStep,       // Per-step spike states for visual animation
    initialSpikesUp: spikesUp, // Spike state before this move (for visual schedule start)
    playerSteps,
    boxAnimations,
    boxFinalCoords: simBoxes,
    crumblingUpdates,
    holeFills,
    soundsToPlay
  };
}

function triggerCrumbleTile(x, y, crumblingUpdates, simGrid) {
  const tile = simGrid[y][x];
  if (tile === 'X') {
    simGrid[y][x] = 'C';
    crumblingUpdates.push({ x, y, tile: 'C' });
  } else if (tile === 'C') {
    simGrid[y][x] = 'H'; // turns into hole
    crumblingUpdates.push({ x, y, tile: 'H' });
  }
}

// Logic check for doors opening status during simulation
function isDoorOpenInSim(doorX, doorY, simBoxes) {
  // Find switches connected to this door
  const conns = connections.filter(c => c.door.x === doorX && c.door.y === doorY);
  if (conns.length === 0) return false; // Unlinked door is closed by default

  return conns.some(conn => {
    const sx = conn.switch.x;
    const sy = conn.switch.y;
    const switchType = boardGrid[sy][sx];

    // If sticky switch and already active previously, remains open
    if (switchType === 'K' && activeStickySwitches.has(`${sx},${sy}`)) {
      return true;
    }

    // Check if player is on the switch in the CURRENT logical position
    if (player.x === sx && player.y === sy) {
      if (switchType === 'K') activeStickySwitches.add(`${sx},${sy}`);
      return true;
    }

    const boxOnSwitch = simBoxes.find(b => b.active && b.x === sx && b.y === sy);
    if (boxOnSwitch) {
      if (switchType === 'K') activeStickySwitches.add(`${sx},${sy}`);
      return true;
    }

    return false;
  });
}

// Recalculates door opened states globally
function updateSwitchesAndDoors() {
  // Check occupied switches to activate them
  connections.forEach(conn => {
    const sx = conn.switch.x;
    const sy = conn.switch.y;
    const type = boardGrid[sy][sx];

    let occupied = (player.x === sx && player.y === sy) || boxes.some(b => b.active && b.x === sx && b.y === sy);

    if (occupied) {
      if (type === 'K') {
        activeStickySwitches.add(`${sx},${sy}`);
      }
    }
  });
}

function isDoorOpen(doorX, doorY) {
  // Crush prevention check
  const doorOccupied = (player.x === doorX && player.y === doorY) || boxes.some(b => b.active && b.x === doorX && b.y === doorY);
  if (doorOccupied) return true;

  // An open door could be open due to any connected switches being active
  const conns = connections.filter(c => c.door.x === doorX && c.door.y === doorY);
  if (conns.length === 0) return false;

  return conns.some(conn => {
    const sx = conn.switch.x;
    const sy = conn.switch.y;
    const switchType = boardGrid[sy][sx];

    // Switch check
    if (switchType === 'K' && activeStickySwitches.has(`${sx},${sy}`)) {
      return true;
    }

    // Current positions check
    return (player.x === sx && player.y === sy) || boxes.some(b => b.active && b.x === sx && b.y === sy);
  });
}

// --------------------------------------------------------------------------
// Animation Flow Scheduler
// --------------------------------------------------------------------------

function setupAnimations(sim) {
  isAnimating = true;
  animationQueue = [];

  // Duration per cell in frames
  const CELL_WALK_DUR = 8;
  const CELL_SLIDE_DUR = 6;
  const CELL_SLIDE_PAUSE = 3; // Brief pause at each cell during sliding (frames)

  // Build spike visual toggle schedule
  // Starts from the pre-move spike state, toggles at the startFrame of each player step
  spikeToggleSchedule = [{ frame: 0, spikesUp: sim.initialSpikesUp }];
  visualSpikesUp = sim.initialSpikesUp;

  // 1. Setup Player animations chain
  let playerTime = 0;
  for (let i = 1; i < sim.playerSteps.length; i++) {
    const from = sim.playerSteps[i - 1];
    const to = sim.playerSteps[i];
    const isSlide = to.action === 'slide' || to.action === 'spike';
    const isTeleport = to.action === 'teleport';
    const dur = isTeleport ? 14 : (isSlide ? CELL_SLIDE_DUR : CELL_WALK_DUR);

    // Schedule visual spike toggle at the start of this player step
    if (sim.spikeStatesPerStep && sim.spikeStatesPerStep[i - 1] !== undefined) {
      spikeToggleSchedule.push({ frame: playerTime, spikesUp: sim.spikeStatesPerStep[i - 1] });
    }

    animationQueue.push({
      target: 'player',
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      action: to.action,
      startFrame: playerTime,
      endFrame: playerTime + dur,
      duration: dur,
      progress: 0
    });

    playerTime += dur;

    // Insert a brief hold pause after each sliding step (gives a rhythmic "step" feel)
    if (to.action === 'slide') {
      animationQueue.push({
        target: 'player',
        fromX: to.x,
        fromY: to.y,
        toX: to.x,
        toY: to.y,
        action: 'hold',
        startFrame: playerTime,
        endFrame: playerTime + CELL_SLIDE_PAUSE,
        duration: CELL_SLIDE_PAUSE,
        progress: 0
      });
      playerTime += CELL_SLIDE_PAUSE;
    }
  }

  // 2. Setup Box animations chains
  sim.boxAnimations.forEach(banim => {
    let boxTime = 0;
    // Pushed box moves concurrently with the player starting after player's first step
    // Player's first step is walking into the box, so box starts at frame CELL_WALK_DUR (approx)
    const boxStartDelay = CELL_WALK_DUR;
    
    for (let i = 1; i < banim.path.length; i++) {
      const from = banim.path[i - 1];
      const to = banim.path[i];
      const isSlide = to.action === 'slide';
      const dur = isSlide ? CELL_SLIDE_DUR : CELL_WALK_DUR;

      animationQueue.push({
        target: 'box',
        id: banim.id,
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
        action: to.action,
        startFrame: boxStartDelay + boxTime,
        endFrame: boxStartDelay + boxTime + dur,
        duration: dur,
        progress: 0
      });

      boxTime += dur;
    }
  });

  // 3. Play dynamic sounds synced to animations
  sim.soundsToPlay.forEach(snd => {
    setTimeout(() => {
      if (snd.type === 'step') sound.playStep();
      else if (snd.type === 'slide') sound.playSlide();
      else if (snd.type === 'splash') sound.playSplash();
      else if (snd.type === 'spike') sound.playSpike();
      else if (snd.type === 'fail') sound.playFail();
      else if (snd.type === 'crumble') sound.playCrumble();
      else if (snd.type === 'teleport') sound.playTeleport();
    }, snd.delay);
  });

  // Trigger crumbling particles and sound effects
  sim.crumblingUpdates.forEach(cup => {
    if (cup.tile === 'H') {
      setTimeout(() => {
        sound.playCrumble();
        particles.add(
          cup.x * tileSize + tileSize / 2,
          cup.y * tileSize + tileSize / 2,
          '#6d4c41', // dirt brown
          15, 3, 5, 40
        );
        shakeScreen(15, 8);
      }, 150);
    } else {
      setTimeout(() => {
        particles.add(
          cup.x * tileSize + tileSize / 2,
          cup.y * tileSize + tileSize / 2,
          '#bcaaa4', // cracked stone gray
          5, 1, 3, 20
        );
      }, 100);
    }
  });

  // Trigger water splashes for hole fills
  sim.holeFills.forEach(hf => {
    setTimeout(() => {
      particles.add(
        hf.x * tileSize + tileSize / 2,
        hf.y * tileSize + tileSize / 2,
        '#00b0ff', // cyan water splash
        20, 4, 4, 30
      );
      particles.add(
        hf.x * tileSize + tileSize / 2,
        hf.y * tileSize + tileSize / 2,
        '#6d4c41', // wood shards
        8, 2.5, 3, 25
      );
    }, 200);
  });
}

function updateAnimations() {
  if (!isAnimating) return;

  let allFinished = true;
  
  // Find maximum frame count in queue
  let maxFrame = 0;
  animationQueue.forEach(anim => {
    if (anim.endFrame > maxFrame) maxFrame = anim.endFrame;
  });

  // Maintain animation tick counter
  if (!this.animTick) this.animTick = 0;
  this.animTick++;

  // Apply spike visual toggle schedule
  for (let i = spikeToggleSchedule.length - 1; i >= 0; i--) {
    if (this.animTick >= spikeToggleSchedule[i].frame) {
      visualSpikesUp = spikeToggleSchedule[i].spikesUp;
      break;
    }
  }

  // Update entities visual coords
  // Default to final logical coords, then override with active interpolations
  player.animX = player.x;
  player.animY = player.y;

  boxes.forEach(b => {
    b.animX = b.x;
    b.animY = b.y;
  });

  animationQueue.forEach(anim => {
    const start = anim.startFrame;
    const end = anim.endFrame;
    
    if (this.animTick >= start && this.animTick <= end) {
      // Active interpolation
      const t = (this.animTick - start) / anim.duration;
      // Linear lerp
      const ix = anim.fromX + (anim.toX - anim.fromX) * t;
      const iy = anim.fromY + (anim.toY - anim.fromY) * t;

      if (anim.target === 'player') {
        if (anim.action === 'teleport') {
          if (t <= 0.5) {
            player.animX = anim.fromX;
            player.animY = anim.fromY;
            player.scale = 1.0 - (t * 2);
          } else {
            player.animX = anim.toX;
            player.animY = anim.toY;
            player.scale = (t - 0.5) * 2;
          }
        } else {
          player.animX = ix;
          player.animY = iy;
          
          // Spike visual trigger
          if (anim.action === 'spike' && t > 0.3) {
            activeSpikesAnim[`${anim.toX},${anim.toY}`] = 1.0;
            particles.add(anim.toX * tileSize + tileSize/2, anim.toY * tileSize + tileSize/2, '#ff1744', 8, 3, 3, 20);
            shakeScreen(10, 4);
          }

          // Fall visual shrink
          if (anim.action === 'fall') {
            player.scale = 1.0 - t; // Shrinks to 0
          }
        }
      } else if (anim.target === 'box') {
        const b = boxes.find(bx => bx.id === anim.id);
        if (b) {
          b.animX = ix;
          b.animY = iy;
          if (anim.action === 'fall') {
            b.scale = 1.0 - t;
          }
        }
      }
      allFinished = false;
    } else if (this.animTick < start) {
      // Future animation
      allFinished = false;
    } else {
      // Finished animation
      if (anim.target === 'player' && anim.action === 'fall') {
        player.scale = 0;
      }
      const b = boxes.find(bx => bx.id === anim.id);
      if (b && anim.action === 'fall') {
        b.scale = 0;
      }
    }
  });

  if (allFinished) {
    isAnimating = false;
    this.animTick = 0;
    spikeToggleSchedule = [];
    visualSpikesUp = spikesUp; // Sync visual state to final logical state
    
    // Clear scale overlays
    player.scale = 1.0;
    boxes.forEach(b => b.scale = 1.0);

    // Finalize triggers after animations finish
    checkVictoryOrLoss();
  }
}

function shakeScreen(intensity, duration) {
  shakeIntensity = intensity;
  shakeDuration = duration;
}

function checkVictoryOrLoss() {
  // Count total goal zones and how many have boxes on them
  let totalGoals = 0;
  let goalsCovered = 0;

  for (let y = 0; y < levelHeight; y++) {
    for (let x = 0; x < levelWidth; x++) {
      if (boardGrid[y][x] === 'G') {
        totalGoals++;
        // Check if any active box is standing on this goal
        const hasBox = boxes.some(b => b.active && b.x === x && b.y === y);
        if (hasBox) {
          goalsCovered++;
        }
      }
    }
  }

  // Victory: all goal zones are covered by a box
  if (totalGoals > 0 && goalsCovered === totalGoals) {
    gameStatus = 'victory';
    sound.playWin();
    showOverlay("VICTORY", "모든 상자를 정해진 목표 지점에 옮겨놓았습니다!", false);
  } else if (boardGrid[player.y][player.x] === 'H') {
    gameStatus = 'gameover';
    sound.playFail();
    const reason = "심연의 구덩이 속으로 추락했습니다.";
    showOverlay("GAME OVER", reason, true);
  } else if (boardGrid[player.y][player.x] === 'T' && spikesUp) {
    gameStatus = 'gameover';
    sound.playFail();
    const reason = "날카로운 가시에 찔렸습니다!";
    showOverlay("GAME OVER", reason, true);
  }
}

function showOverlay(title, desc, failed) {
  const overlay = document.getElementById('screenOverlay');
  const titleEl = document.getElementById('overlayTitle');
  const descEl = document.getElementById('overlayDesc');
  const btnNext = document.getElementById('btnOverlayNext');
  const btnRestart = document.getElementById('btnOverlayRestart');
  const btnMenu = document.getElementById('btnOverlayMenu');
  const starsEl = document.getElementById('overlayStarsDisplay');

  titleEl.textContent = title;
  overlay.classList.remove('hidden');
  if (btnMenu) btnMenu.classList.remove('hidden');

  if (failed) {
    overlay.classList.add('failure');
    btnNext.textContent = "다시 시도 (R)";
    btnRestart.classList.add('hidden'); // We repurpose main button
    if (starsEl) starsEl.innerHTML = '';
    descEl.textContent = desc;
  } else {
    overlay.classList.remove('failure');
    
    if (window.customMapMode === 'editor') {
      btnNext.textContent = "에디터로 복귀";
      if (btnMenu) btnMenu.classList.add('hidden');
      if (starsEl) {
        starsEl.innerHTML = '';
        for (let i = 1; i <= 3; i++) {
          const starIcon = document.createElement('span');
          starIcon.className = 'star-icon active';
          starIcon.textContent = '★';
          starIcon.style.animationDelay = `${(i - 1) * 0.15}s`;
          starsEl.appendChild(starIcon);
        }
      }
      editorOptimalAP = maxAP - remainingAP;
      editorOptimalMoves = moveCount;
      editorOptimalPath = clearPath;
      editorVerified = true;

      // Automatically update the editor's Max AP to the optimal AP spent to clear
      editorMaxAP = editorOptimalAP;
      const maxApInput = document.getElementById('editorMapMaxApInput');
      if (maxApInput) {
        maxApInput.value = editorMaxAP;
      }
      saveEditorDraftSilent();
      
      const publishBtn = document.getElementById('btnEditorPublish');
      if (publishBtn) publishBtn.disabled = false;

      descEl.innerHTML = `모험가님이 제작한 퍼즐의 탈출 검증에 성공했습니다!<br>최적 기록: ${editorOptimalAP} AP (${editorOptimalMoves} Moves)<br>이제 에디터로 복귀하여 이 맵을 서버에 배포할 수 있습니다!`;
      if (btnMenu) btnMenu.classList.add('hidden');
      btnRestart.classList.remove('hidden');
    } else if (window.customMapMode === 'play') {
      btnNext.textContent = "목록으로 복귀";
      if (btnMenu) btnMenu.classList.add('hidden');
      
      const spentAP = maxAP - remainingAP;
      const optimalAP = currentPlayingCustomMap.optimalAP || 0;
      let stars = 1;
      if (spentAP <= optimalAP) {
        stars = 3;
      } else if (spentAP <= Math.floor(optimalAP * 1.3)) {
        stars = 2;
      }
      
      if (starsEl) {
        starsEl.innerHTML = '';
        for (let i = 1; i <= 3; i++) {
          const starIcon = document.createElement('span');
          starIcon.className = 'star-icon' + (i <= stars ? ' active' : '');
          starIcon.textContent = '★';
          starIcon.style.animationDelay = `${(i - 1) * 0.15}s`;
          starsEl.appendChild(starIcon);
        }
      }
      
      saveCustomMapRecord(currentPlayingCustomMap.id, stars, moveCount);
      
      descEl.innerHTML = `친구의 맵을 멋지게 클리어했습니다!<br>소비 AP: ${spentAP} AP (${moveCount} Moves)<br>(친구의 최적 AP: ${optimalAP} AP)`;
      btnRestart.classList.remove('hidden');
    } else {
      btnNext.textContent = "다음 레벨";
      
      // Calculate and render stars
      let stars = 1;
      if (starsEl) {
        starsEl.innerHTML = '';
        const lvl = DEFAULT_LEVELS[currentLevelIdx];
        if (lvl) {
          const spentAP = maxAP - remainingAP;
          const optimalAP = lvl.optimalAP || 0;
          const threeStarLimit = optimalAP;
          const twoStarLimit = Math.floor(optimalAP * 1.3);

          if (spentAP <= threeStarLimit) {
            stars = 3;
          } else if (spentAP <= twoStarLimit) {
            stars = 2;
          }

          // Add 3 star icons with sequential pop animations
          for (let i = 1; i <= 3; i++) {
            const starIcon = document.createElement('span');
            starIcon.className = 'star-icon' + (i <= stars ? ' active' : '');
            starIcon.textContent = '★';
            starIcon.style.animationDelay = `${(i - 1) * 0.15}s`;
            starsEl.appendChild(starIcon);
          }
        }
      }
      
      // Save best record for current level and update left HUD
      saveBestRecord(currentLevelIdx, stars, moveCount);
      updateRecordHUD();

      // Check if all levels are completed to display the campaign summary table
      if (checkAllLevelsCleared()) {
        let tableHtml = `<div style="margin-top: 15px; text-align: center;">`;
        tableHtml += `<p style="color: #00e676; font-weight: bold; font-size: 1.15rem; text-shadow: 0 0 10px rgba(0, 230, 118, 0.6); margin-bottom: 10px;">🏆 모든 스테이지 클리어! 🏆</p>`;
        tableHtml += `<table class="overlay-summary-table">`;
        tableHtml += `<thead><tr><th>스테이지</th><th>최고 별점</th><th>최소 이동</th></tr></thead><tbody>`;
        
        let totalStars = 0;
        let totalMoves = 0;
        DEFAULT_LEVELS.forEach((lvl, idx) => {
          const best = getBestRecord(idx);
          const sCount = best ? best.stars : 0;
          let mCount = 0;
          if (best && best.moves) {
            mCount = parseInt(String(best.moves).replace('이동', '').trim(), 10) || 0;
          }
          totalStars += sCount;
          totalMoves += mCount;
          tableHtml += `<tr><td>${getLevelDisplayNumber(idx)}: ${lvl.name.split('. ')[1] || lvl.name}</td><td style="color: #ffea00;">${'★'.repeat(sCount)}</td><td>${mCount} Move</td></tr>`;
        });
        
        tableHtml += `<tr class="total-row"><td>총 합계 (Total)</td><td style="color: #ffea00;">★ ${totalStars} / ${DEFAULT_LEVELS.length * 3}</td><td>${totalMoves} Moves</td></tr>`;
        tableHtml += `</tbody></table></div>`;
        desc = tableHtml;
      }

      descEl.innerHTML = desc;
      
      // If last level, disable next button
      if (!isCustomTestPlay() && currentLevelIdx >= DEFAULT_LEVELS.length - 1) {
        btnNext.textContent = "캠페인 완료!";
      }
      btnRestart.classList.remove('hidden');
    }
  }
}

function isCustomTestPlay() {
  const container = document.getElementById('appContainer');
  return container.classList.contains('testing-mode');
}

// --------------------------------------------------------------------------
// Drawing & Programmatic Graphics Renderer
// --------------------------------------------------------------------------

function gameLoop() {
  // Update stage play timer based on actual play state
  const now = Date.now();
  if (gameStatus === 'playing' && isGameActive() && !window.isReplaying) {
    const best = !currentCustomLevelData ? getBestRecord(currentLevelIdx) : null;
    const alreadyThreeStars = best && best.stars === 3;
    if (window.lastTimerTick && !alreadyThreeStars) {
      const prevSec = Math.floor((window.stagePlayTime || 0) / 1000);
      window.stagePlayTime = (window.stagePlayTime || 0) + (now - window.lastTimerTick);
      const currSec = Math.floor(window.stagePlayTime / 1000);

      const user = localStorage.getItem('runic_dungeon_user') || '';
      if (user && !currentCustomLevelData) {
        if (currSec !== prevSec) {
          localStorage.setItem(`runic_dungeon_play_time_${user}_${currentLevelIdx}`, Math.round(window.stagePlayTime));
          
          // 백업용: 30초마다 클라우드에 비동기로 플레이 시간 임시 백업 (부담 방지)
          if (!window.lastCloudBackupTime) {
            window.lastCloudBackupTime = now;
          }
          if (now - window.lastCloudBackupTime > 30000) {
            window.lastCloudBackupTime = now;
            uploadUserRecordsCloud(user);
          }
        }
      }
    }
    // Update Timer Display in HUD in real-time
    const timerEl = document.getElementById('timerDisplay');
    if (timerEl) {
      const totalSec = Math.floor((window.stagePlayTime || 0) / 1000);
      const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const s = String(totalSec % 60).padStart(2, '0');
      timerEl.textContent = `${m}:${s}`;
    }
  }
  window.lastTimerTick = now;

  updateAnimations();
  particles.update();

  // Handle screen shake decrements
  if (shakeDuration > 0) {
    shakeDuration--;
  }

  draw();
  requestAnimationFrame(gameLoop);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // Apply Screen Shake
  if (shakeDuration > 0) {
    const dx = (Math.random() * 2 - 1) * shakeIntensity;
    const dy = (Math.random() * 2 - 1) * shakeIntensity;
    ctx.translate(dx, dy);
  }

  // Offset
  ctx.translate(offsetX, offsetY);

  // 1. Draw Grid Tiles
  for (let y = 0; y < levelHeight; y++) {
    for (let x = 0; x < levelWidth; x++) {
      drawTile(x, y, boardGrid[y][x]);
    }
  }

  // 2. Draw Connection Lines
  if (isEditorMode) {
    drawEditorConnections();
  } else {
    drawGameplayConnections();
  }

  // 3. Draw Active Spikes Overlay Animations
  for (const key in activeSpikesAnim) {
    if (activeSpikesAnim[key] > 0) {
      activeSpikesAnim[key] -= 0.05; // Fade out spike popup timer
    }
  }

  // 4. Draw Boxes
  boxes.forEach(box => {
    if (box.active) {
      drawBox(box);
    }
  });

  // 5. Draw Player
  if (gameStatus !== 'gameover' || boardGrid[player.y][player.x] !== 'H') {
    drawPlayer();
  }

  // 6. Draw Particles
  particles.draw(ctx);

  ctx.restore();
}

function drawTile(x, y, type) {
  const px = x * tileSize;
  const py = y * tileSize;

  if (type === ' ') {
    ctx.fillStyle = '#080c14';
    ctx.fillRect(px, py, tileSize, tileSize);
    return;
  }

  // Background cell floor
  ctx.fillStyle = '#101424';
  ctx.fillRect(px, py, tileSize, tileSize);
  
  // Grid line border
  ctx.strokeStyle = '#181e36';
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, tileSize, tileSize);

  switch (type) {
    case 'W': // Wall
      // Draw modern dark runic wall block
      const grad = ctx.createLinearGradient(px, py, px + tileSize, py + tileSize);
      grad.addColorStop(0, '#263238');
      grad.addColorStop(1, '#10171d');
      ctx.fillStyle = grad;
      ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
      
      // Cyber neon inner glow border
      ctx.strokeStyle = '#00a8ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
      
      // Tech decoration block
      ctx.fillStyle = 'rgba(0, 168, 255, 0.15)';
      ctx.fillRect(px + 8, py + 8, tileSize - 16, tileSize - 16);
      break;

    case 'I': { // Ice
      ctx.save();
      // Draw frosty light-blue/cyan ice block (milky glass texture)
      const iceGrad = ctx.createLinearGradient(px, py, px + tileSize, py + tileSize);
      iceGrad.addColorStop(0, 'rgba(178, 235, 242, 0.85)'); // frosty cyan-white
      iceGrad.addColorStop(0.5, 'rgba(128, 222, 234, 0.65)'); // semi-transparent cyan
      iceGrad.addColorStop(1, 'rgba(77, 208, 225, 0.8)'); // deeper icy cyan
      ctx.fillStyle = iceGrad;
      ctx.fillRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
      
      // Frosty white border (prevents visual confusion with neon blue walls)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2.0;
      ctx.strokeRect(px + 1.5, py + 1.5, tileSize - 3, tileSize - 3);
      
      // Soft cyan inner border for depth
      ctx.strokeStyle = 'rgba(0, 188, 212, 0.3)';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(px + 3, py + 3, tileSize - 6, tileSize - 6);
      
      // Glare lines (diagonal shine highlights)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(px + tileSize * 0.2, py + tileSize * 0.8);
      ctx.lineTo(px + tileSize * 0.8, py + tileSize * 0.2);
      ctx.moveTo(px + tileSize * 0.35, py + tileSize * 0.8);
      ctx.lineTo(px + tileSize * 0.8, py + tileSize * 0.35);
      ctx.stroke();

      // Snowflake/frost star center emblem
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const cx = px + tileSize/2;
      const cy = py + tileSize/2;
      const r = tileSize * 0.16;
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 4;
        const dx = Math.cos(angle) * r;
        const dy = Math.sin(angle) * r;
        ctx.moveTo(cx - dx, cy - dy);
        ctx.lineTo(cx + dx, cy + dy);
      }
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'H': // Hole (Pit)
      // Vortex dark navy hole
      const rgrad = ctx.createRadialGradient(
        px + tileSize/2, py + tileSize/2, 2,
        px + tileSize/2, py + tileSize/2, tileSize/2
      );
      rgrad.addColorStop(0, '#000000');
      rgrad.addColorStop(0.7, '#070a16');
      rgrad.addColorStop(1, '#1b233d');
      ctx.fillStyle = rgrad;
      ctx.beginPath();
      ctx.arc(px + tileSize/2, py + tileSize/2, tileSize/2 - 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Subtle rim
      ctx.strokeStyle = 'rgba(0, 168, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;

    case 'F': // Filled Floor (Bridge)
      // Draw background hole abyss first
      drawTile(x, y, 'H');
      // Draw crossing planks/bridge
      ctx.fillStyle = '#8d6e63'; // Wood plank brown
      ctx.fillRect(px + 4, py + tileSize/6, tileSize - 8, tileSize/4);
      ctx.fillRect(px + 4, py + tileSize/2 + 2, tileSize - 8, tileSize/4);
      
      // Wood grains
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(px + 8, py + tileSize/6 + 3, tileSize - 16, 2);
      ctx.fillRect(px + 8, py + tileSize/2 + 5, tileSize - 16, 2);
      break;

    case 'S': // Momentary Switch
    case 'K': // Sticky Switch
      const isSticky = type === 'K';
      const switchKey = `${x},${y}`;
      let active = (player.x === x && player.y === y) || boxes.some(b => b.active && b.x === x && b.y === y);
      if (isSticky && activeStickySwitches.has(switchKey)) {
        active = true;
      }

      ctx.save();
      ctx.translate(px + tileSize/2, py + tileSize/2);

      const r = tileSize / 2;

      // 1. Draw outer drop shadow of the bezel
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(1.5, 3, r * 0.72, 0, Math.PI * 2);
      ctx.fill();

      // 2. Bezel (silver ring)
      const bezelGrad = ctx.createLinearGradient(-r * 0.72, -r * 0.72, r * 0.72, r * 0.72);
      bezelGrad.addColorStop(0, '#ffffff'); // bright reflection
      bezelGrad.addColorStop(0.3, '#d1d5db'); // silver
      bezelGrad.addColorStop(0.7, '#8e98a5'); // dark silver
      bezelGrad.addColorStop(1, '#374151'); // shadow silver
      ctx.fillStyle = bezelGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      ctx.fill();

      // 3. Inner bezel groove (dark ring)
      ctx.fillStyle = '#0a0d16';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.60, 0, Math.PI * 2);
      ctx.fill();

      // 4. Dome parameters (pressed/active shifts down)
      const buttonOffsetY = active ? r * 0.05 : -r * 0.05;
      const buttonRadius = r * 0.50;

      // Shadow cast inside the groove (only when inactive)
      if (!active) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(0, r * 0.08, buttonRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Determine dome colors based on state
      let colorBase, colorHighlight, colorShadow;
      if (isSticky) {
        if (active) {
          colorBase = '#d500f9';
          colorHighlight = '#f8bbd0';
          colorShadow = '#4a148c';
        } else {
          colorBase = '#ffea00';
          colorHighlight = '#ffff8d';
          colorShadow = '#f57f17';
        }
      } else {
        if (active) {
          colorBase = '#00e676';
          colorHighlight = '#b9f6ca';
          colorShadow = '#1b5e20';
        } else {
          colorBase = '#ff1744';
          colorHighlight = '#ff8a80';
          colorShadow = '#b71c1c';
        }
      }

      // 6. Draw the glossy 3D dome button body
      const lightX = -buttonRadius * 0.28;
      const lightY = -buttonRadius * 0.28 + buttonOffsetY;
      const domeGrad = ctx.createRadialGradient(
        lightX, lightY, buttonRadius * 0.05,
        0, buttonOffsetY, buttonRadius
      );
      domeGrad.addColorStop(0, colorHighlight);
      domeGrad.addColorStop(0.35, colorBase);
      domeGrad.addColorStop(1, colorShadow);

      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.arc(0, buttonOffsetY, buttonRadius, 0, Math.PI * 2);
      ctx.fill();

      // 7. Draw glossy crescent reflection overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.save();
      ctx.translate(lightX * 0.8, -buttonRadius * 0.35 + buttonOffsetY);
      ctx.rotate(-Math.PI / 6);
      ctx.beginPath();
      ctx.ellipse(0, 0, buttonRadius * 0.40, buttonRadius * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 8. Draw central identifier icon (translates with the dome)
      if (isSticky) {
        // Draw Key Icon for Sticky Switch (tilted for design, shifted with the dome)
        ctx.save();
        ctx.translate(0, buttonOffsetY);
        ctx.scale(0.8, 0.8);
        ctx.rotate(-Math.PI / 4);
        ctx.strokeStyle = active ? '#ffffff' : '#1e293b'; // dark gray on yellow, white on purple
        ctx.lineWidth = 1.8;
        
        ctx.beginPath();
        // Key head
        ctx.arc(-tileSize/12, 0, tileSize/15, 0, Math.PI * 2);
        // Key shaft
        ctx.moveTo(-tileSize/12 + tileSize/15, 0);
        ctx.lineTo(tileSize/7, 0);
        // Key teeth
        ctx.moveTo(tileSize/7 - 2.5, 0);
        ctx.lineTo(tileSize/7 - 2.5, tileSize/12);
        ctx.moveTo(tileSize/7 - 6.5, 0);
        ctx.lineTo(tileSize/7 - 6.5, tileSize/12);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
      break;

    case 'D': // Door (Locked / Unlocked Vault Gate)
      const open = isDoorOpen(x, y);
      const dScale = tileSize / 48;
      if (open) {
        // Open door frame background (greenish transparent glow)
        ctx.fillStyle = 'rgba(0, 230, 118, 0.04)';
        ctx.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 4, py + 4, tileSize - 8, tileSize - 8);

        // Open door panels pushed to the left and right sides
        ctx.fillStyle = '#1b2631';
        ctx.fillRect(px + 3 * dScale, py + 3 * dScale, tileSize/6, tileSize - 6 * dScale);
        ctx.fillRect(px + tileSize - 3 * dScale - tileSize/6, py + 3 * dScale, tileSize/6, tileSize - 6 * dScale);
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.4)';
        ctx.strokeRect(px + 3 * dScale, py + 3 * dScale, tileSize/6, tileSize - 6 * dScale);
        ctx.strokeRect(px + tileSize - 3 * dScale - tileSize/6, py + 3 * dScale, tileSize/6, tileSize - 6 * dScale);

        // Unlocked padlock icon in the center
        ctx.save();
        ctx.translate(px + tileSize/2, py + tileSize/2);

        // Lock shackle (popped open and rotated)
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2.5 * dScale;
        ctx.beginPath();
        ctx.arc(-tileSize/16, -tileSize/8, tileSize/8, Math.PI * 1.1, Math.PI * 0.1, false);
        ctx.stroke();

        // Lock body (green)
        ctx.fillStyle = '#1b2a22';
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2 * dScale;
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 4 * dScale;
        ctx.beginPath();
        ctx.roundRect(-tileSize/6, -tileSize/12, tileSize/3, tileSize/3.5, 4 * dScale);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Keyhole
        ctx.fillStyle = 'rgba(0, 230, 118, 0.6)';
        ctx.beginPath();
        ctx.arc(0, tileSize/16, 2 * dScale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else {
        // Render heavy locked gate
        ctx.fillStyle = '#212a34'; // darker steel blue-gray
        ctx.fillRect(px + 3 * dScale, py + 3 * dScale, tileSize - 6 * dScale, tileSize - 6 * dScale);
        ctx.strokeStyle = '#00b0ff'; // Neon blue border
        ctx.lineWidth = 2.5 * dScale;
        ctx.strokeRect(px + 3 * dScale, py + 3 * dScale, tileSize - 6 * dScale, tileSize - 6 * dScale);

        // Vertical split line
        ctx.strokeStyle = '#121921';
        ctx.lineWidth = 2 * dScale;
        ctx.beginPath();
        ctx.moveTo(px + tileSize/2, py + 3 * dScale);
        ctx.lineTo(px + tileSize/2, py + tileSize - 3 * dScale);
        ctx.stroke();

        // Horizontal panel ribs
        ctx.strokeStyle = 'rgba(0, 176, 255, 0.15)';
        ctx.lineWidth = 1.5 * dScale;
        ctx.beginPath();
        ctx.moveTo(px + 6 * dScale, py + tileSize * 0.25);
        ctx.lineTo(px + tileSize - 6 * dScale, py + tileSize * 0.25);
        ctx.moveTo(px + 6 * dScale, py + tileSize * 0.75);
        ctx.lineTo(px + tileSize - 6 * dScale, py + tileSize * 0.75);
        ctx.stroke();

        // Padlock icon in the center
        ctx.save();
        ctx.translate(px + tileSize/2, py + tileSize/2);

        // Lock shackle
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 2.5 * dScale;
        ctx.beginPath();
        ctx.arc(0, -tileSize/10, tileSize/8, Math.PI, 0, false);
        ctx.stroke();

        // Lock body
        ctx.fillStyle = '#2c3e50';
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 2 * dScale;
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 4 * dScale;
        ctx.beginPath();
        ctx.roundRect(-tileSize/6, -tileSize/12, tileSize/3, tileSize/3.5, 4 * dScale);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Keyhole inside padlock body
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(0, tileSize/16, 2.5 * dScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-1.5 * dScale, tileSize/16);
        ctx.lineTo(1.5 * dScale, tileSize/16);
        ctx.lineTo(2.5 * dScale, tileSize/16 + 5 * dScale);
        ctx.lineTo(-2.5 * dScale, tileSize/16 + 5 * dScale);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
      break;

    case 'T': // Spike Trap (Top-down view redesign)
      const key = `${x},${y}`;
      const isUp = visualSpikesUp || (activeSpikesAnim[key] && activeSpikesAnim[key] > 0);
      
      // 1. Trap metal base plate (charcoal panel)
      ctx.fillStyle = '#21252b';
      ctx.fillRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
      ctx.strokeStyle = '#3e4451';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 2, py + 2, tileSize - 4, tileSize - 4);

      // Corner screws detail for realistic paneling
      ctx.fillStyle = '#4b5263';
      const screwOffset = 5;
      ctx.fillRect(px + screwOffset, py + screwOffset, 2, 2);
      ctx.fillRect(px + tileSize - screwOffset - 2, py + screwOffset, 2, 2);
      ctx.fillRect(px + screwOffset, py + tileSize - screwOffset - 2, 2, 2);
      ctx.fillRect(px + tileSize - screwOffset - 2, py + tileSize - screwOffset - 2, 2, 2);

      // 2. Draw 3x3 grid of spike sockets
      const gridPositions = [tileSize * 0.25, tileSize * 0.5, tileSize * 0.75];
      const socketRadius = tileSize * 0.09;
      const cos30 = 0.866;
      
      gridPositions.forEach(sy => {
        gridPositions.forEach(sx => {
          const cx = px + sx;
          const cy = py + sy;
          const r = socketRadius;
          
          // Draw dark socket cup (triangular shape)
          ctx.fillStyle = '#0f1115';
          ctx.beginPath();
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx + r * cos30, cy + r * 0.5);
          ctx.lineTo(cx - r * cos30, cy + r * 0.5);
          ctx.closePath();
          ctx.fill();
          
          // Socket metal rim
          ctx.strokeStyle = '#2c313c';
          ctx.lineWidth = 1;
          ctx.stroke();

          if (isUp) {
            // Draw 3D triangular spike (pyramid)
            // Left face (lightest silver-gray)
            ctx.fillStyle = '#eceff1';
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx - r * cos30, cy + r * 0.5);
            ctx.closePath();
            ctx.fill();

            // Right face (medium metallic gray)
            ctx.fillStyle = '#90a4ae';
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r * cos30, cy + r * 0.5);
            ctx.lineTo(cx, cy);
            ctx.closePath();
            ctx.fill();

            // Bottom face (shadowed dark gray)
            ctx.fillStyle = '#37474f';
            ctx.beginPath();
            ctx.moveTo(cx - r * cos30, cy + r * 0.5);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx + r * cos30, cy + r * 0.5);
            ctx.closePath();
            ctx.fill();

            // Highlight/ridge lines to give sharp definition
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx, cy); // Vertical ridge
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - r * cos30, cy + r * 0.5);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + r * cos30, cy + r * 0.5);
            ctx.stroke();

            // LED Glowing Alert Red center dot representing spike warning point
            ctx.fillStyle = '#ff1744';
            ctx.shadowColor = '#ff1744';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset glow

            // Center reflection highlight
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - 0.5, cy - 0.5, 0.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Draw retracted dark hollow indicator (safe state)
            ctx.fillStyle = '#090b10';
            ctx.beginPath();
            const rInner = r * 0.55;
            ctx.moveTo(cx, cy - rInner);
            ctx.lineTo(cx + rInner * cos30, cy + rInner * 0.5);
            ctx.lineTo(cx - rInner * cos30, cy + rInner * 0.5);
            ctx.closePath();
            ctx.fill();
          }
        });
      });
      break;

    case '^':
    case '>':
    case 'v':
    case '<':
      // One-way Arrow Tiles
      ctx.save();
      ctx.translate(px + tileSize/2, py + tileSize/2);
      
      let rotAngle = 0;
      if (type === '^') rotAngle = -Math.PI / 2;
      else if (type === '>') rotAngle = 0;
      else if (type === 'v') rotAngle = Math.PI / 2;
      else if (type === '<') rotAngle = Math.PI;
      ctx.rotate(rotAngle);

      // Draw arrow path
      ctx.fillStyle = 'rgba(0, 176, 255, 0.08)';
      ctx.fillRect(-tileSize/2 + 2, -tileSize/2 + 2, tileSize - 4, tileSize - 4);
      
      // Neon arrow head
      ctx.strokeStyle = 'rgba(0, 176, 255, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(-10, 8);
      ctx.stroke();

      // Traveling energy dot arpeggio
      const timeMs = Date.now();
      const offsetDot = (timeMs / 10) % tileSize - tileSize/2;
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(offsetDot, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      break;

    case 'C': // Crumbling 1
    case 'X': // Crumbling 2
      ctx.save();
      // Draw outer beveled dark frame (metallic/stone plate) - Brighter & distinct from pure dark background
      const gradPlate = ctx.createLinearGradient(px, py, px + tileSize, py + tileSize);
      if (type === 'X') {
        // Durability 2: Slate steel plate (distinct grey-blue)
        gradPlate.addColorStop(0, '#4e566d');
        gradPlate.addColorStop(1, '#2c3345');
      } else {
        // Durability 1: Distressed reddish copper plate (distinct rusty red)
        gradPlate.addColorStop(0, '#6d3930');
        gradPlate.addColorStop(1, '#3b1c18');
      }
      ctx.fillStyle = gradPlate;
      
      // Distinct glowing border to stand out from background tiles
      ctx.save();
      if (type === 'C') {
        ctx.strokeStyle = '#ff3d00';
        ctx.shadowColor = '#ff3d00';
        ctx.shadowBlur = 6;
      } else {
        ctx.strokeStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 4;
      }
      ctx.lineWidth = 2.0; // Thicker border
      
      // Rounded rectangle for the plate
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(px + 2, py + 2, tileSize - 4, tileSize - 4, 6);
      } else {
        ctx.rect(px + 2, py + 2, tileSize - 4, tileSize - 4);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Corner metallic rivets (mechanical/dungeon feel)
      ctx.fillStyle = type === 'C' ? '#ff3d00' : '#455a64';
      const rOffset = 6;
      const rSize = 2;
      const rivetsList = [
        [px + rOffset, py + rOffset],
        [px + tileSize - rOffset, py + rOffset],
        [px + rOffset, py + tileSize - rOffset],
        [px + tileSize - rOffset, py + tileSize - rOffset]
      ];
      rivetsList.forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
        ctx.fill();
        // Highlight on rivet
        ctx.fillStyle = type === 'C' ? '#ff9e80' : '#cfd8dc';
        ctx.beginPath();
        ctx.arc(rx - 0.5, ry - 0.5, rSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render glowing energy cracks
      ctx.save();
      const pulseVal = 1 + 0.15 * Math.sin(Date.now() / 150);
      if (type === 'C') {
        ctx.strokeStyle = '#ff3d00';
        ctx.shadowColor = '#ff3d00';
        ctx.shadowBlur = 8 * pulseVal;
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1.2;
      }

      ctx.beginPath();
      // Organic crack lines
      ctx.moveTo(px + 8, py + 8);
      ctx.lineTo(px + tileSize * 0.45, py + tileSize * 0.45);
      ctx.lineTo(px + tileSize * 0.55, py + tileSize * 0.35);
      ctx.lineTo(px + tileSize - 8, py + 8);

      ctx.moveTo(px + 10, py + tileSize - 10);
      ctx.lineTo(px + tileSize * 0.4, py + tileSize * 0.6);
      ctx.lineTo(px + tileSize * 0.5, py + tileSize * 0.5);
      ctx.lineTo(px + tileSize - 10, py + tileSize - 10);

      if (type === 'C') {
        // Heavy fractures for 1 durability
        ctx.moveTo(px + tileSize * 0.5, py + tileSize * 0.5);
        ctx.lineTo(px + tileSize - 6, py + tileSize/2);
        ctx.moveTo(px + tileSize * 0.45, py + tileSize * 0.45);
        ctx.lineTo(px + tileSize/2, py + 6);
      }
      ctx.stroke();
      ctx.restore();

      // Durability Indicator - Engraved glowing Arabic numerals with highly visible distinct colors and thin black outline
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const numStr = type === 'C' ? '1' : '2';
      const cScale = tileSize / 48;
      ctx.font = `900 ${Math.max(12, tileSize * 0.38)}px 'Orbitron', sans-serif`;

      // 1. Draw thin black outline stroke first
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.0 * cScale;
      ctx.shadowBlur = 0; // No neon glow on the black outline itself
      ctx.strokeText(numStr, px + tileSize/2, py + tileSize/2);
      ctx.restore();

      // 2. Draw neon filled number on top
      ctx.save();
      if (type === 'C') {
        // Durability 1: Bright Orange-Red '1'
        ctx.fillStyle = '#ff3d00';
        ctx.shadowColor = '#ff3d00';
        ctx.shadowBlur = 6 * cScale * pulseVal;
      } else {
        // Durability 2: Bright Lime Green '2'
        ctx.fillStyle = '#00e676';
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 5 * cScale;
      }
      ctx.fillText(numStr, px + tileSize/2, py + tileSize/2);
      ctx.restore();

      ctx.restore();

      // Additional durability display for Editor Mode
      if (isEditorMode) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px monospace';
        ctx.fillText(type === 'C' ? "(1)" : "(2)", px + 10, py + tileSize - 8);
      }
      ctx.restore();
      break;

    case 'G': // Goal Zone (Sokoban target)
      const hasBoxOnGoal = boxes.some(b => b.active && b.x === x && b.y === y);
      
      ctx.save();
      ctx.translate(px + tileSize/2, py + tileSize/2);

      if (hasBoxOnGoal) {
        // Glowing Green Target Zone (Success state)
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 10;
        
        // Solid green circle plate outline
        ctx.beginPath();
        ctx.arc(0, 0, tileSize/2.8, 0, Math.PI * 2);
        ctx.stroke();

        // Small green star in center
        ctx.fillStyle = '#00e676';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Glowing Gold Target Zone (Empty state)
        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]); // Dashed line for zone
        
        ctx.beginPath();
        ctx.arc(0, 0, tileSize/2.8, 0, Math.PI * 2);
        ctx.stroke();

        // Draw a classic gold star symbol in the center
        ctx.fillStyle = 'rgba(255, 234, 0, 0.4)';
        ctx.beginPath();
        const numPoints = 5;
        const outerRadius = tileSize / 6;
        const innerRadius = tileSize / 12;
        let rot = Math.PI / 2 * 3;
        let cx = 0, cy = 0;
        let step = Math.PI / numPoints;

        ctx.moveTo(0, -outerRadius);
        for (let i = 0; i < numPoints; i++) {
          cx = Math.cos(rot) * outerRadius;
          cy = Math.sin(rot) * outerRadius;
          ctx.lineTo(cx, cy);
          rot += step;

          cx = Math.cos(rot) * innerRadius;
          cy = Math.sin(rot) * innerRadius;
          ctx.lineTo(cx, cy);
          rot += step;
        }
        ctx.closePath();
        ctx.fill();
        
        // Spawn small floating magic sparkles around unoccupied goals
        if (Math.random() < 0.04) {
          particles.add(px + tileSize/2, py + tileSize/2, '#ffea00', 1, 0.4, 2, 30);
        }
      }

      ctx.restore();
      break;

    case 'P': { // Teleport Portal (Color-coded glowing triangle based on pair connection)
      ctx.save();
      ctx.translate(px + tileSize/2, py + tileSize/2);

      // Determine portal color
      let portalColor = '#00e676';
      let portalInnerColor = '#a3ffc1';
      let fillStyleColor = 'rgba(0, 230, 118, 0.15)';

      if (levelPortalConnections && levelPortalConnections.length > 0) {
        const portalConnIdx = levelPortalConnections.findIndex(c => 
          (c.p1.x === x && c.p1.y === y) || (c.p2.x === x && c.p2.y === y)
        );
        if (portalConnIdx !== -1) {
          const colors = [
            { outer: '#00e676', inner: '#a3ffc1', fill: 'rgba(0, 230, 118, 0.15)' }, // Green
            { outer: '#ffea00', inner: '#fff9c4', fill: 'rgba(255, 234, 0, 0.15)' }, // Yellow
            { outer: '#00b0ff', inner: '#b3e5fc', fill: 'rgba(0, 176, 255, 0.15)' }, // Blue
            { outer: '#ff1744', inner: '#ffcdd2', fill: 'rgba(255, 23, 68, 0.15)' }  // Red
          ];
          const choice = colors[portalConnIdx % colors.length];
          portalColor = choice.outer;
          portalInnerColor = choice.inner;
          fillStyleColor = choice.fill;
        } else {
          // Unlinked portal: draw with gray/muted color
          portalColor = '#9e9e9e';
          portalInnerColor = '#e0e0e0';
          fillStyleColor = 'rgba(158, 158, 158, 0.15)';
        }
      }

      ctx.strokeStyle = portalColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = portalColor;
      ctx.shadowBlur = 8;
      ctx.fillStyle = fillStyleColor;

      ctx.beginPath();
      ctx.moveTo(0, -tileSize/3.2);
      ctx.lineTo(tileSize/3.5, tileSize/3.5);
      ctx.lineTo(-tileSize/3.5, tileSize/3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Add a smaller inner glowing triangle
      ctx.strokeStyle = portalInnerColor;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(0, -tileSize/6.5);
      ctx.lineTo(tileSize/7, tileSize/7);
      ctx.lineTo(-tileSize/7, tileSize/7);
      ctx.closePath();
      ctx.stroke();

      // Spawn small floating magic sparkles around portal
      if (Math.random() < 0.05) {
        particles.add(px + tileSize/2, py + tileSize/2, portalColor, 1, 0.5, 2, 25);
      }

      ctx.restore();
      break;
    }

    case '.': // Normal Floor
    default:
      // Draw subtle centered tile border inside
      ctx.strokeStyle = '#121626';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
      break;
  }

  // Draw matching connection letters on switches and doors
  if (type === 'S' || type === 'K' || type === 'D') {
    const connIdx = connections.findIndex(c => 
      (c.switch.x === x && c.switch.y === y) || 
      (c.door.x === x && c.door.y === y)
    );
    if (connIdx !== -1) {
      ctx.save();
      const label = String.fromCharCode(65 + connIdx); // 'A', 'B', 'C', ...
      const badgeColors = ['#ffea00', '#00b0ff', '#d500f9', '#00e676'];
      const badgeColor = badgeColors[connIdx % badgeColors.length];
      
      const bx = px + tileSize - 11;
      const by = py + 11;
      
      ctx.shadowColor = badgeColor;
      ctx.shadowBlur = 5;
      
      ctx.fillStyle = '#090b10';
      ctx.strokeStyle = badgeColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx, by);
      ctx.restore();
    }
  }
}

function drawBox(box) {
  const scale = box.scale !== undefined ? box.scale : 1.0;
  if (scale <= 0) return;

  const bx = box.animX * tileSize + tileSize/2;
  const by = box.animY * tileSize + tileSize/2;
  // 모바일(작은 타일)일 경우 여백을 2px로 조절하여 각 방향당 1px씩의 깔끔한 여백을 둠
  const margin = tileSize < 36 ? 2 : 10;
  const bSize = (tileSize - margin) * scale;

  ctx.save();
  ctx.translate(bx, by);

  // Runic glow box gradient
  const grad = ctx.createLinearGradient(-bSize/2, -bSize/2, bSize/2, bSize/2);
  grad.addColorStop(0, '#5d4037'); // Ancient wood/stone brown
  grad.addColorStop(1, '#3e2723');
  ctx.fillStyle = grad;

  // Render Box Shape
  ctx.fillRect(-bSize/2, -bSize/2, bSize, bSize);
  
  // Neon frame border
  ctx.strokeStyle = '#ff9100'; // Amber warning glow
  ctx.lineWidth = 2 * scale;
  ctx.strokeRect(-bSize/2 + 2, -bSize/2 + 2, bSize - 4, bSize - 4);

  // Inner Runic Mark X
  ctx.strokeStyle = 'rgba(255, 145, 0, 0.5)';
  ctx.beginPath();
  ctx.moveTo(-bSize/3, -bSize/3);
  ctx.lineTo(bSize/3, bSize/3);
  ctx.moveTo(bSize/3, -bSize/3);
  ctx.lineTo(-bSize/3, bSize/3);
  ctx.stroke();

  // Glow core dot
  ctx.fillStyle = '#ffea00';
  ctx.beginPath();
  ctx.arc(0, 0, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPlayer() {
  const scale = player.scale !== undefined ? player.scale : 1.0;
  if (scale <= 0) return;

  const px = player.animX * tileSize + tileSize/2;
  const py = player.animY * tileSize + tileSize/2;
  const r = (tileSize/2.6) * scale;

  ctx.save();
  ctx.translate(px, py);

  // Subtle floating offset (bobbing up and down)
  const floatOffset = Math.sin(Date.now() / 250) * 2 * scale;

  // 1. Reactive drop shadow (resizes based on floating height)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, r * 1.1, r * 0.65 - floatOffset * 0.3, r * 0.14 - floatOffset * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Apply floating translation to robot body and parts
  ctx.translate(0, floatOffset);

  // 2. Body (Egg/Sphere white metallic body - Armless design)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#b0bec5';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.arc(0, r * 0.45, r * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Body seam line detail
  ctx.strokeStyle = '#cfd8dc';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.arc(0, r * 0.45, r * 0.42, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();

  // 3. Neck (Connecting body and head)
  ctx.fillStyle = '#cfd8dc';
  ctx.strokeStyle = '#b0bec5';
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.roundRect(-r * 0.15, -r * 0.12, r * 0.3, r * 0.25, r * 0.05 * scale);
  ctx.fill();
  ctx.stroke();

  // 4. Ears (Small capsules on head sides)
  ctx.fillStyle = '#eceff1';
  ctx.beginPath();
  ctx.roundRect(-r * 0.92, -r * 0.58, r * 0.18, r * 0.42, r * 0.09 * scale);
  ctx.roundRect(r * 0.74, -r * 0.58, r * 0.18, r * 0.42, r * 0.09 * scale);
  ctx.fill();
  ctx.stroke();

  // 5. Head (Round capsule shape)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#b0bec5';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.roundRect(-r * 0.78, -r * 0.85, r * 1.56, r * 1.1, r * 0.46 * scale);
  ctx.fill();
  ctx.stroke();

  // 6. Visor Screen (Dark blue/charcoal oval)
  ctx.fillStyle = '#0b1625';
  ctx.beginPath();
  ctx.roundRect(-r * 0.60, -r * 0.73, r * 1.20, r * 0.76, r * 0.26 * scale);
  ctx.fill();

  // 7. Glowing Visor Eyes & Gentle Smile Mouth
  ctx.strokeStyle = '#00e5ff';
  ctx.fillStyle = '#00e5ff';
  ctx.lineCap = 'round';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 6 * scale;

  let lookX = 0;
  if (player.dir === 'left') lookX = -r * 0.08;
  else if (player.dir === 'right') lookX = r * 0.08;

  const eyeY = -r * 0.42;
  const eyeSpacing = r * 0.28;
  // 타일 크기 36 이하(모바일 환경)일 경우 캐릭터 눈 크기(eyeR)를 2.75로 축소, PC는 기존 3.5 유지
  const eyeR = (tileSize < 36 ? 2.75 : 3.5) * scale;

  // Left Eye
  ctx.beginPath();
  ctx.arc(-eyeSpacing + lookX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Right Eye
  ctx.beginPath();
  ctx.arc(eyeSpacing + lookX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Subtle Smile Mouth
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.arc(lookX, eyeY + 6.5 * scale, 2.0 * scale, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  ctx.shadowBlur = 0; // Reset glows

  ctx.restore();
}

function drawEditorConnections() {
  connections.forEach((conn, index) => {
    const sx = conn.switch.x * tileSize + tileSize/2;
    const sy = conn.switch.y * tileSize + tileSize/2;
    const dx = conn.door.x * tileSize + tileSize/2;
    const dy = conn.door.y * tileSize + tileSize/2;

    ctx.save();
    // Glowing neon dotted link lines
    ctx.strokeStyle = `hsl(${(index * 45) % 360}, 100%, 60%)`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(dx, dy);
    ctx.stroke();

    // Link tag label
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(`#${index + 1}`, (sx + dx) / 2, (sy + dy) / 2);
    ctx.restore();
  });
}

function drawGameplayConnections() {
  if (currentChapterIdx !== 0 || window.customMapMode) return;

  connections.forEach((conn, index) => {
    const sx = conn.switch.x * tileSize + tileSize/2;
    const sy = conn.switch.y * tileSize + tileSize/2;
    const dx = conn.door.x * tileSize + tileSize/2;
    const dy = conn.door.y * tileSize + tileSize/2;

    ctx.save();
    const badgeColors = ['#ffea00', '#00b0ff', '#d500f9', '#00e676'];
    const color = badgeColors[index % badgeColors.length];
    
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.25; // Soft sub-floor wiring
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(dx, dy);
    ctx.stroke();
    ctx.restore();
  });
}

// --------------------------------------------------------------------------
// Input & Touch Event Handlers
// --------------------------------------------------------------------------

function handleKeyDown(e) {
  if (window.isReplaying) {
    if (e.key === 'Escape') {
      window.stopReplay();
    }
    e.preventDefault();
    return;
  }
  if (!localStorage.getItem('runic_dungeon_user')) return; // Ignore controls if not logged in
  if (isEditorMode && !isCustomTestPlay()) return; // Ignore controls if sketching in editor

  // Intercept game interaction keys
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      e.preventDefault();
      attemptMove(0, -1);
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      e.preventDefault();
      attemptMove(0, 1);
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      e.preventDefault();
      attemptMove(-1, 0);
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      e.preventDefault();
      attemptMove(1, 0);
      break;
    case 'z':
    case 'Z':
    case 'ㅋ':
      if (isGameActive() && !window.isReplaying && isEditorTesting) {
        e.preventDefault();
        undo();
        canvas.focus();
      }
      break;
    case 'y':
    case 'Y':
    case 'ㅛ':
      if (isGameActive() && !window.isReplaying && isEditorTesting) {
        e.preventDefault();
        redo();
        canvas.focus();
      }
      break;
    case 'r':
    case 'R':
    case 'ㄱ':
    case 'ㄲ':
      if (isGameActive() && !window.isReplaying) {
        e.preventDefault();
        restartLevel();
        canvas.focus();
      }
      break;
  }
}

function isGameActive() {
  const login = document.getElementById('loginOverlay');
  const chapter = document.getElementById('chapterSelectOverlay');
  const stage = document.getElementById('stageSelectOverlay');
  const leaderboard = document.getElementById('leaderboardModal');
  const help = document.getElementById('helpModal');
  const modeSelect = document.getElementById('modeSelectOverlay');
  const customMapMenu = document.getElementById('customMapMenuOverlay');
  const customMapList = document.getElementById('customMapListOverlay');
  const mapEditor = document.getElementById('mapEditorOverlay');
  const friendMaps = document.getElementById('friendMapsOverlay');
  const updateHistory = document.getElementById('updateHistoryModal');

  return (!login || login.classList.contains('hidden')) &&
         (!chapter || chapter.classList.contains('hidden')) &&
         (!stage || stage.classList.contains('hidden')) &&
         (!leaderboard || leaderboard.classList.contains('hidden')) &&
         (!help || help.classList.contains('hidden')) &&
         (!modeSelect || modeSelect.classList.contains('hidden')) &&
         (!customMapMenu || customMapMenu.classList.contains('hidden')) &&
         (!customMapList || customMapList.classList.contains('hidden')) &&
         (!mapEditor || mapEditor.classList.contains('hidden')) &&
         (!friendMaps || friendMaps.classList.contains('hidden')) &&
         (!updateHistory || updateHistory.classList.contains('hidden'));
}

function setupTouchControls() {
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    if (!isGameActive()) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (isGameActive()) {
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (!isGameActive()) return;
    if (window.isReplaying) return;
    if (isEditorMode && !isCustomTestPlay()) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Threshold swipe to trigger action
    const swipeThreshold = 30;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > swipeThreshold) {
        if (diffX > 0) attemptMove(1, 0);  // Right
        else attemptMove(-1, 0);           // Left
      }
    } else {
      if (Math.abs(diffY) > swipeThreshold) {
        if (diffY > 0) attemptMove(0, 1);  // Down
        else attemptMove(0, -1);           // Up
      }
    }
  }, { passive: true });
}

// --------------------------------------------------------------------------
// Undo / Redo Mechanics
// --------------------------------------------------------------------------

function saveStateToHistory() {
  const state = {
    player: { x: player.x, y: player.y, dir: player.dir },
    boxes: boxes.map(b => ({ id: b.id, x: b.x, y: b.y, active: b.active })),
    grid: boardGrid.map(row => [...row]),
    ap: remainingAP,
    moves: moveCount,
    activeSticky: new Set(activeStickySwitches),
    spikesUp: spikesUp,
    clearPath: [...clearPath]
  };
  historyStack.push(state);
  redoStack = []; // Clear redo stack on new action
}

function undo() {
  if (window.isReplaying) return;
  if (gameStatus !== 'playing' || isAnimating || historyStack.length === 0) return;

  // Save current state to Redo Stack
  const current = {
    player: { x: player.x, y: player.y, dir: player.dir },
    boxes: boxes.map(b => ({ id: b.id, x: b.x, y: b.y, active: b.active })),
    grid: boardGrid.map(row => [...row]),
    ap: remainingAP,
    moves: moveCount,
    activeSticky: new Set(activeStickySwitches),
    spikesUp: spikesUp,
    clearPath: [...clearPath]
  };
  redoStack.push(current);

  const prev = historyStack.pop();

  // Restore states
  player.x = prev.player.x;
  player.y = prev.player.y;
  player.animX = prev.player.x;
  player.animY = prev.player.y;
  player.dir = prev.player.dir;

  boxes = prev.boxes.map(b => ({
    id: b.id, x: b.x, y: b.y, animX: b.x, animY: b.y, active: b.active
  }));

  boardGrid = prev.grid.map(row => [...row]);
  remainingAP = prev.ap;
  moveCount = prev.moves;
  activeStickySwitches = new Set(prev.activeSticky);
  spikesUp = prev.spikesUp;
  clearPath = [...prev.clearPath];

  updateSwitchesAndDoors();
  updateHUD();
  sound.playTone(300, 'sine', 0.1, 0.1, 150); // Reverse pitch slide tone
}

function redo() {
  if (window.isReplaying) return;
  if (gameStatus !== 'playing' || isAnimating || redoStack.length === 0) return;

  // Save current state to History Stack
  const current = {
    player: { x: player.x, y: player.y, dir: player.dir },
    boxes: boxes.map(b => ({ id: b.id, x: b.x, y: b.y, active: b.active })),
    grid: boardGrid.map(row => [...row]),
    ap: remainingAP,
    moves: moveCount,
    activeSticky: new Set(activeStickySwitches),
    spikesUp: spikesUp,
    clearPath: [...clearPath]
  };
  historyStack.push(current);

  const next = redoStack.pop();

  // Restore states
  player.x = next.player.x;
  player.y = next.player.y;
  player.animX = next.player.x;
  player.animY = next.player.y;
  player.dir = next.player.dir;

  boxes = next.boxes.map(b => ({
    id: b.id, x: b.x, y: b.y, animX: b.x, animY: b.y, active: b.active
  }));

  boardGrid = next.grid.map(row => [...row]);
  remainingAP = next.ap;
  moveCount = next.moves;
  activeStickySwitches = new Set(next.activeSticky);
  spikesUp = next.spikesUp;
  clearPath = [...next.clearPath];

  updateSwitchesAndDoors();
  updateHUD();
  sound.playTone(150, 'sine', 0.1, 0.1, 300); // Forward pitch slide tone
}

function restartLevel() {
  loadLevel(currentLevelIdx, currentCustomLevelData, true);
}

function formatTime(seconds) {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    return `${m}분 ${s}초`;
  }
  return `${s}초`;
}

// --------------------------------------------------------------------------
// Campaign Progress Tracker Helpers
// --------------------------------------------------------------------------
function getBestRecord(levelIdx) {
  const data = localStorage.getItem(`runic_dungeon_best_record_${levelIdx}`);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function saveBestRecord(levelIdx, stars, moves) {
  const currentBest = getBestRecord(levelIdx);
  let shouldUpdate = false;
  let timestamp = Date.now();
  
  const username = localStorage.getItem('runic_dungeon_user') || '';
  let retriesToSave = parseInt(localStorage.getItem(`runic_dungeon_retry_count_${username}_${levelIdx}`), 10) || 1;
  let clearTimeToSave = Math.round((window.stagePlayTime || 0) / 1000);
  
  if (!currentBest) {
    shouldUpdate = true;
  } else {
    // Robust moves parsing to handle legacy string data like "21이동" or "21 Move"
    const currentBestMoves = parseInt(String(currentBest.moves).replace(/[^0-9]/g, ''), 10) || 0;
    const currentBestTime = parseInt(currentBest.clearTime || 0, 10) || 999999;
    
    if (stars > currentBest.stars) {
      shouldUpdate = true;
    } else if (stars === currentBest.stars) {
      if (moves < currentBestMoves) {
        shouldUpdate = true;
      } else if (moves === currentBestMoves) {
        // If moves are equal, update only if clear time is better (less) or if no clearTime was saved
        if (clearTimeToSave < currentBestTime || !currentBest.clearTime) {
          shouldUpdate = true;
        } else {
          // Same moves, same or worse time: update path only, keep old timestamp, clearTime, and retries
          shouldUpdate = true;
          timestamp = currentBest.timestamp;
          clearTimeToSave = currentBest.clearTime || clearTimeToSave;
          retriesToSave = currentBest.retries || retriesToSave;
        }
      }
    }
  }
  
  if (shouldUpdate) {
    if (stars === 3 && username) {
      localStorage.removeItem(`runic_dungeon_play_time_${username}_${levelIdx}`);
    }

    localStorage.setItem(`runic_dungeon_best_record_${levelIdx}`, JSON.stringify({ 
      stars, 
      moves, 
      path: clearPath.join(''),
      timestamp,
      retries: retriesToSave,
      clearTime: clearTimeToSave
    }));
    
    // Cloud sync upload
    if (username) {
      uploadUserRecordsCloud(username);
    }
  }
}

function saveCustomMapRecord(mapId, stars, moves) {
  const username = localStorage.getItem('runic_dungeon_user') || '';
  if (!username) return;

  const recordKey = `runic_dungeon_custom_record_${username}_${mapId}`;
  const currentBestStr = localStorage.getItem(recordKey);
  const currentBest = currentBestStr ? JSON.parse(currentBestStr) : null;
  
  let retriesToSave = parseInt(localStorage.getItem(`runic_dungeon_retry_count_${username}_${mapId}`), 10) || 1;
  let clearTimeToSave = Math.round((window.stagePlayTime || 0) / 1000);
  
  let shouldUpdate = false;
  
  if (!currentBest) {
    shouldUpdate = true;
  } else {
    const currentBestMoves = parseInt(String(currentBest.moves).replace(/[^0-9]/g, ''), 10) || 0;
    const currentBestTime = parseInt(currentBest.clearTime || 0, 10) || 999999;
    
    if (stars > currentBest.stars) {
      shouldUpdate = true;
    } else if (stars === currentBest.stars) {
      if (moves < currentBestMoves) {
        shouldUpdate = true;
      } else if (moves === currentBestMoves) {
        if (clearTimeToSave < currentBestTime || !currentBest.clearTime) {
          shouldUpdate = true;
        }
      }
    }
  }
  
  if (shouldUpdate) {
    if (stars === 3) {
      localStorage.removeItem(`runic_dungeon_play_time_${username}_${mapId}`);
    }

    localStorage.setItem(recordKey, JSON.stringify({ 
      stars, 
      moves, 
      path: clearPath.join(''),
      timestamp: Date.now(),
      retries: retriesToSave,
      clearTime: clearTimeToSave
    }));
    
    uploadUserRecordsCloud(username);
  }
}

async function showCustomMapLeaderboard(mapId, mapName) {
  const modal = document.getElementById('customLeaderboardModal');
  const tbody = document.getElementById('customLeaderboardTableBody');
  tbody.innerHTML = '<tr><td colspan="7" style="padding: 20px;">데이터를 불러오는 중... (Syncing Cloud)</td></tr>';
  modal.classList.remove('hidden');

  const modalTitle = modal.querySelector('.modal-header h2');
  if (modalTitle) {
    modalTitle.textContent = `🏆 [${mapName}] 맵 랭킹`;
  }

  const users = Object.keys(USER_PASSWORDS).filter(u => u !== '관리자');
  const currentLoggedUser = localStorage.getItem('runic_dungeon_user');

  try {
    const dbData = await fetchCloudData();
    if (!dbData) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding: 20px; color: #ff1744;">순위표 데이터를 가져오는 중 오류가 발생했습니다.</td></tr>';
      return;
    }

    const records = [];

    users.forEach(u => {
      const userRecords = dbData[u] || {};
      const rec = userRecords[mapId];
      if (rec) {
        records.push({
          name: u,
          stars: parseInt(rec.stars, 10) || 0,
          moves: parseInt(rec.moves, 10) || 0,
          retries: parseInt(rec.retries || 1, 10) || 1,
          clearTime: parseInt(rec.clearTime || 0, 10) || 0,
          timestamp: parseInt(rec.timestamp || 0, 10) || 0
        });
      }
    });

    records.sort((a, b) => {
      if (b.stars !== a.stars) {
        return b.stars - a.stars;
      }
      if (a.moves !== b.moves) {
        return a.moves - b.moves;
      }
      if (a.clearTime !== b.clearTime) {
        return a.clearTime - b.clearTime;
      }
      return a.timestamp - b.timestamp;
    });

    tbody.innerHTML = '';
    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding: 20px; color: var(--text-muted);">아직 클리어 기록이 없습니다. 첫 클리어에 도전해보세요!</td></tr>';
      return;
    }

    records.forEach((stat, index) => {
      const row = document.createElement('tr');
      if (stat.name === currentLoggedUser) {
        row.className = 'current-user-row';
      }

      let rankText = `${index + 1}`;
      if (index === 0) rankText = '<span class="rank-badge rank-1">1</span>';
      else if (index === 1) rankText = '<span class="rank-badge rank-2">2</span>';
      else if (index === 2) rankText = '<span class="rank-badge rank-3">3</span>';

      const dateStr = stat.timestamp ? new Date(stat.timestamp).toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-';

      row.innerHTML = `
        <td>${rankText}</td>
        <td>${getUserIcon(stat.name)} ${stat.name}</td>
        <td style="color: #ffea00; font-weight: bold;">★ ${stat.stars}</td>
        <td>${stat.retries}회</td>
        <td>${formatTime(stat.clearTime)}</td>
        <td>${stat.moves}회</td>
        <td style="font-size: 0.85rem; color: var(--text-muted);">${dateStr}</td>
      `;
      tbody.appendChild(row);
    });

  } catch (e) {
    console.error("Custom Leaderboard fetch error:", e);
    tbody.innerHTML = '<tr><td colspan="7" style="padding: 20px; color: #ff1744;">순위표 데이터를 가져오는 중 오류가 발생했습니다.</td></tr>';
  }
}

function checkAllLevelsCleared() {
  for (let i = 0; i < DEFAULT_LEVELS.length; i++) {
    if (!getBestRecord(i)) return false;
  }
  return true;
}

function updateRecordHUD() {
  const ids = ['recordList', 'mobileRecordList'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.innerHTML = '';
    DEFAULT_LEVELS.forEach((lvl, idx) => {
      const levelChapter = lvl.chapter !== undefined ? lvl.chapter : 0;
      if (levelChapter !== currentChapterIdx) return;
      if (lvl.locked) return; // Skip locked stages in record HUD

      const best = getBestRecord(idx);
      const isActive = idx === currentLevelIdx;
      
      const row = document.createElement('div');
      row.className = `record-row ${isActive ? 'active-level' : ''}`;
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'record-level-name';
      nameSpan.textContent = `${getLevelDisplayNumber(idx)}: ${lvl.name.split('. ')[1] || lvl.name}`;
      
      const statsDiv = document.createElement('div');
      statsDiv.className = 'record-stats';
      
      const starsSpan = document.createElement('span');
      starsSpan.className = 'record-stars';
      starsSpan.textContent = best ? '★'.repeat(best.stars) : '☆☆☆';
      
      const movesSpan = document.createElement('span');
      movesSpan.className = 'record-moves';
      const movesVal = best ? String(best.moves).replace('이동', '').trim() : '-';
      movesSpan.textContent = movesVal;
      
      statsDiv.appendChild(starsSpan);
      statsDiv.appendChild(movesSpan);
      row.appendChild(nameSpan);
      row.appendChild(statsDiv);
      
      el.appendChild(row);
    });
  });
}

// --------------------------------------------------------------------------
// Authentication & Cloud Sync (jsonhosting.com)
// --------------------------------------------------------------------------
const USER_PASSWORDS = {
  '엽이': 'tmdduql11',
  '영기': 'dudrldmaak22',
  '조씨': 'alsTlqndls33',
  '앵웅': 'doddnd44',
  '톰토': 'xhadkxh66',
  '관리자': 'password55'
};

function checkLoginState() {
  const user = localStorage.getItem('runic_dungeon_user');
  if (user && USER_PASSWORDS[user]) {
    hideLoginOverlay(user);
    syncUserRecordsFromCloud(user);
    showModeSelectMenu();
  } else {
    showLoginOverlay();
  }
}

function showLoginOverlay() {
  localStorage.removeItem('runic_dungeon_user');
  document.getElementById('appContainer').classList.add('hidden');
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.getElementById('loginUserList').classList.remove('hidden');
  document.getElementById('loginPasswordForm').classList.add('hidden');
  document.getElementById('loginErrorMsg').classList.add('hidden');
  document.getElementById('userProfileTag').classList.add('hidden');
  document.getElementById('btnLeaderboard').classList.add('hidden');
  document.getElementById('btnAdminPaths').classList.add('hidden');
  document.getElementById('btnChapterSelectAdminPaths').classList.add('hidden');
  document.getElementById('btnStageSelectAdminPaths').classList.add('hidden');
}

function hideLoginOverlay(username) {
  localStorage.setItem('runic_dungeon_user', username);
  document.getElementById('loginOverlay').classList.add('hidden');
  
  const tag = document.getElementById('userProfileTag');
  tag.classList.remove('hidden');
  document.getElementById('userProfileIcon').innerHTML = getUserIcon(username);
  document.getElementById('loggedInUserName').textContent = username;
  document.getElementById('btnLeaderboard').classList.remove('hidden');
  
  const btnAdminPaths = document.getElementById('btnAdminPaths');
  const btnChapterSelectAdminPaths = document.getElementById('btnChapterSelectAdminPaths');
  const btnStageSelectAdminPaths = document.getElementById('btnStageSelectAdminPaths');
  
  if (username === '관리자') {
    if (btnAdminPaths) btnAdminPaths.classList.remove('hidden');
    if (btnChapterSelectAdminPaths) btnChapterSelectAdminPaths.classList.remove('hidden');
    if (btnStageSelectAdminPaths) btnStageSelectAdminPaths.classList.remove('hidden');
  } else {
    if (btnAdminPaths) btnAdminPaths.classList.add('hidden');
    if (btnChapterSelectAdminPaths) btnChapterSelectAdminPaths.classList.add('hidden');
    if (btnStageSelectAdminPaths) btnStageSelectAdminPaths.classList.add('hidden');
  }
}

function attemptLogin(username, password) {
  const errorMsgEl = document.getElementById('loginErrorMsg');
  errorMsgEl.classList.add('hidden');
  
  const correctPass = USER_PASSWORDS[username];
  if (correctPass && password === correctPass) {
    sound.init();
    hideLoginOverlay(username);
    syncUserRecordsFromCloud(username);
    showModeSelectMenu();
  } else {
    // Show error message as requested
    errorMsgEl.textContent = `${username}이 아닙니다! 나가주세요!`;
    errorMsgEl.classList.remove('hidden');
    // Simple shake trigger
    errorMsgEl.style.animation = 'none';
    setTimeout(() => { errorMsgEl.style.animation = ''; }, 10);
  }
}

function logout() {
  // Clear local best records to prevent pollution between players
  DEFAULT_LEVELS.forEach((_, idx) => {
    localStorage.removeItem(`runic_dungeon_best_record_${idx}`);
  });
  localStorage.removeItem('runic_dungeon_user');
  location.reload();
}

const DB_OBJECT_ID = '9e762e1a';
const DB_EDIT_KEY = 'e1604ec46cb395e7662360f0a8e88b85ac38ac5a1681e23d2180a8aee6f321f7';
const CORS_PROXY_URL = 'https://solitary-frog-b23f.jangsc203.workers.dev/';

// Admin utility: directly patch any field on a player's stage record
// Usage: await adminPatchRecord('조씨', 7, { retries: 30, clearTime: 1127, moves: 73 })
window.adminPatchRecord = async function(username, stageIdx, fields) {
  const raw = await fetch(`${CORS_PROXY_URL}?url=${encodeURIComponent(`https://jsonhosting.com/api/json/${DB_OBJECT_ID}/raw?t=${Date.now()}`)}`);
  const obj = await raw.json();
  const dbData = obj.data || {};
  const key = String(stageIdx);
  if (!dbData[username]) { console.error('유저 없음:', username); return; }
  if (!dbData[username][key] && !dbData[username][stageIdx]) { console.error('스테이지 기록 없음:', stageIdx); return; }
  const recKey = dbData[username][key] !== undefined ? key : stageIdx;
  Object.assign(dbData[username][recKey], fields);
  const res = await fetch(`${CORS_PROXY_URL}?url=${encodeURIComponent(`https://jsonhosting.com/api/json/${DB_OBJECT_ID}`)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Edit-Key': DB_EDIT_KEY },
    body: JSON.stringify({ name: 'RunicDungeonLeaderboard', data: dbData })
  });
  if (res.ok) {
    console.log('✅ 수정 완료! ' + username + ' 스테이지 ' + stageIdx, dbData[username][recKey]);
    // Also update localStorage if the patched user is currently logged in
    const currentUser = localStorage.getItem('runic_dungeon_user') || '';
    if (username === currentUser) {
      const updatedRec = dbData[username][recKey];
      if (updatedRec && parseInt(updatedRec.stars, 10) > 0) {
        localStorage.setItem('runic_dungeon_best_record_' + stageIdx, JSON.stringify(updatedRec));
      } else {
        localStorage.removeItem('runic_dungeon_best_record_' + stageIdx);
      }
      updateRecordHUD();
    }
    alert('✅ ' + username + ' 스테이지 ' + stageIdx + ' 수정 완료!\n' + JSON.stringify(fields, null, 2));
  } else {
    console.error('PATCH 실패:', res.status);
  }
};

async function uploadUserRecordsCloud(username) {
  try {
    const userRecords = {};
    DEFAULT_LEVELS.forEach((_, idx) => {
      const rec = localStorage.getItem(`runic_dungeon_best_record_${idx}`);
      if (rec) {
        userRecords[idx] = JSON.parse(rec);
      } else {
        // 백업용: 클리어하지 않았으나 시도 횟수나 플레이 시간이 있는 경우 업로드
        const retries = parseInt(localStorage.getItem(`runic_dungeon_retry_count_${username}_${idx}`), 10) || 0;
        const playTime = parseInt(localStorage.getItem(`runic_dungeon_play_time_${username}_${idx}`), 10) || 0;
        if (retries > 0 || playTime > 0) {
          userRecords[idx] = {
            stars: 0,
            moves: 0,
            retries: retries,
            clearTime: Math.round(playTime / 1000)
          };
        }
      }
    });

    const prefix = `runic_dungeon_custom_record_${username}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const mapId = key.substring(prefix.length);
        const rec = localStorage.getItem(key);
        if (rec) {
          userRecords[mapId] = JSON.parse(rec);
        }
      }
    }

    let dbData = {};
    let fetchSuccess = false;
    try {
      const targetUrl = `https://jsonhosting.com/api/json/${DB_OBJECT_ID}/raw?t=${Date.now()}`;
      const proxiedUrl = `${CORS_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxiedUrl);
      if (res.ok) {
        const obj = await res.json();
        dbData = obj.data || {};
        fetchSuccess = true;
      } else {
        console.error("Fetch DB error status during upload:", res.status);
      }
    } catch (e) {
      console.error("Fetch DB error during upload:", e);
    }

    // If fetch failed, DO NOT overwrite the DB as it would delete other users' records!
    if (!fetchSuccess) {
      console.warn("Aborting upload to prevent database overwrites during outage.");
      return;
    }

    dbData[username] = userRecords;

    const targetPutUrl = `https://jsonhosting.com/api/json/${DB_OBJECT_ID}`;
    const proxiedPutUrl = `${CORS_PROXY_URL}?url=${encodeURIComponent(targetPutUrl)}`;
    const putRes = await fetch(proxiedPutUrl, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'X-Edit-Key': DB_EDIT_KEY
      },
      body: JSON.stringify({
        name: "RunicDungeonLeaderboard",
        data: dbData
      })
    });
    if (!putRes.ok) {
      console.error("Failed to update DB on upload:", putRes.status);
    }
  } catch (e) {
    console.error('Cloud upload error:', e);
  }
}

async function syncUserRecordsFromCloud(username) {
  try {
    const targetUrl = `https://jsonhosting.com/api/json/${DB_OBJECT_ID}/raw?t=${Date.now()}`;
    const proxiedUrl = `${CORS_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxiedUrl);
    if (res.ok) {
      const obj = await res.json();
      const dbData = obj.data || {};
      const userRecords = dbData[username];
      
      if (userRecords) {
        DEFAULT_LEVELS.forEach((_, idx) => {
          const rec = userRecords[idx];
          if (rec) {
            const starsVal = parseInt(rec.stars, 10) || 0;
            if (starsVal > 0) {
              localStorage.setItem(`runic_dungeon_best_record_${idx}`, JSON.stringify(rec));
            } else {
              localStorage.removeItem(`runic_dungeon_best_record_${idx}`);
            }

            // Sync unfinished progress keys (retry count and play time)
            if (rec.retries !== undefined) {
              localStorage.setItem(`runic_dungeon_retry_count_${username}_${idx}`, rec.retries);
            } else {
              localStorage.removeItem(`runic_dungeon_retry_count_${username}_${idx}`);
            }

            if (rec.clearTime !== undefined) {
              localStorage.setItem(`runic_dungeon_play_time_${username}_${idx}`, rec.clearTime * 1000);
            } else {
              localStorage.removeItem(`runic_dungeon_play_time_${username}_${idx}`);
            }
          } else {
            localStorage.removeItem(`runic_dungeon_best_record_${idx}`);
            localStorage.removeItem(`runic_dungeon_retry_count_${username}_${idx}`);
            localStorage.removeItem(`runic_dungeon_play_time_${username}_${idx}`);
          }
        });
        updateRecordHUD();
        if (!document.getElementById('stageSelectOverlay').classList.contains('hidden')) {
          renderStageSelectGrid();
        }
      } else {
        // Cloud has no records for this user (either deleted or new user)
        // Clear local records to prevent re-uploading deleted progress
        DEFAULT_LEVELS.forEach((_, idx) => {
          localStorage.removeItem(`runic_dungeon_best_record_${idx}`);
          localStorage.removeItem(`runic_dungeon_retry_count_${username}_${idx}`);
          localStorage.removeItem(`runic_dungeon_play_time_${username}_${idx}`);
        });
        updateRecordHUD();
        if (!document.getElementById('stageSelectOverlay').classList.contains('hidden')) {
          renderStageSelectGrid();
        }
      }
    } else {
      console.error("Cloud sync failed (response not ok):", res.status);
    }
  } catch (e) {
    console.error('Cloud sync error:', e);
  }
}

async function showLeaderboardModal(chapterIdx = null) {
  window.currentLeaderboardChapterIdx = chapterIdx;
  const modal = document.getElementById('leaderboardModal');
  const tbody = document.getElementById('leaderboardTableBody');
  tbody.innerHTML = '<tr><td colspan="6" style="padding: 20px;">데이터를 불러오는 중... (Syncing Cloud)</td></tr>';
  modal.classList.remove('hidden');

  const modalTitle = modal.querySelector('.modal-header h2');
  if (modalTitle) {
    if (chapterIdx === 0) {
      modalTitle.textContent = '🏆 챕터 순위표 : 기초 훈련';
    } else if (chapterIdx !== null) {
      modalTitle.textContent = `🏆 챕터 순위표 : ${chapterIdx}장`;
    } else {
      modalTitle.textContent = '🏆 실시간 명예의 전당 (순위표)';
    }
  }
  
  const users = Object.keys(USER_PASSWORDS).filter(u => u !== '관리자');
  const currentLoggedUser = localStorage.getItem('runic_dungeon_user');
  
  try {
    const targetUrl = `https://jsonhosting.com/api/json/${DB_OBJECT_ID}/raw?t=${Date.now()}`;
    const proxiedUrl = `${CORS_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxiedUrl);
    let dbData = {};
    if (res.ok) {
      const obj = await res.json();
      dbData = obj.data || {};
    } else {
      console.error("Leaderboard fetch failed:", res.status);
      tbody.innerHTML = '<tr><td colspan="6" style="padding: 20px; color: #ff1744;">순위표 데이터를 가져오는 중 오류가 발생했습니다. (HTTP ' + res.status + ')</td></tr>';
      return;
    }
    
    const statsList = users.map(u => {
      const userRecords = dbData[u] || {};
      let totalStars = 0;
      let totalRetries = 0;
      let totalTime = 0;
      let totalMoves = 0;
      let clearedStages = [];
      let latestClearTime = 0;
      
      DEFAULT_LEVELS.forEach((lvl, idx) => {
        const ch = lvl.chapter !== undefined ? lvl.chapter : 0;
        if (chapterIdx === null && ch === 0) return;
        if (chapterIdx !== null && ch !== chapterIdx) return;
        if (lvl.locked) return;

        const rec = userRecords[idx];
        if (rec && parseInt(rec.stars, 10) > 0) {
          totalStars += parseInt(rec.stars, 10) || 0;
          const retryVal = parseInt(rec.retries || 1, 10) || 1;
          totalRetries += retryVal;
          const timeVal = parseInt(rec.clearTime || 0, 10) || 0;
          totalTime += timeVal;
          
          const movesVal = rec.moves !== undefined ? parseInt(String(rec.moves).replace(/[^0-9]/g, ''), 10) || 0 : 0;
          totalMoves += movesVal;
          
          clearedStages.push(getLevelDisplayNumber(idx));
          
          if (rec.timestamp) {
            const t = parseInt(rec.timestamp, 10) || 0;
            if (t > latestClearTime) {
              latestClearTime = t;
            }
          }
        }
      });
      
      const numCleared = clearedStages.length;
      const avgRetries = numCleared > 0 ? parseFloat((totalRetries / numCleared).toFixed(1)) : 0;
      const avgTime = numCleared > 0 ? Math.round(totalTime / numCleared) : 0;
      
      return {
        name: u,
        totalStars,
        avgRetries,
        avgTime,
        totalMoves,
        numCleared,
        latestClearTime,
        userRecords
      };
    });
    
    statsList.sort((a, b) => {
      if (a.numCleared === 0 && b.numCleared > 0) return 1;
      if (b.numCleared === 0 && a.numCleared > 0) return -1;
      if (a.numCleared === 0 && b.numCleared === 0) return 0;
      
      if (b.totalStars !== a.totalStars) {
        return b.totalStars - a.totalStars;
      }
      if (a.avgTime !== b.avgTime) {
        return a.avgTime - b.avgTime;
      }
      if (a.avgRetries !== b.avgRetries) {
        return a.avgRetries - b.avgRetries;
      }
      
      // Tie-breaker: earlier achievement time gets higher rank (0/legacy timestamps treated as older)
      const timeA = a.latestClearTime || 1;
      const timeB = b.latestClearTime || 1;
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return 0;
    });
    
    tbody.innerHTML = '';
    statsList.forEach((stat, index) => {
      const row = document.createElement('tr');
      if (stat.name === currentLoggedUser) {
        row.className = 'current-user-row';
      }
      
      let rankText = `${index + 1}`;
      if (index === 0 && stat.numCleared > 0) rankText = '<span class="rank-badge rank-1">1</span>';
      else if (index === 1 && stat.numCleared > 0) rankText = '<span class="rank-badge rank-2">2</span>';
      else if (index === 2 && stat.numCleared > 0) rankText = '<span class="rank-badge rank-3">3</span>';
      
      row.innerHTML = `
        <td>${rankText}</td>
        <td>${getUserIcon(stat.name)} ${stat.name}</td>
        <td style="color: #ffea00; font-weight: bold;">★ ${stat.totalStars}</td>
        <td>-</td>
        <td>${stat.numCleared > 0 ? stat.avgRetries.toFixed(1) + '회' : '-'}</td>
        <td>${stat.numCleared > 0 ? formatTime(stat.avgTime) : '-'}</td>
        <td style="font-size: 0.95rem; color: #00e676; font-weight: bold;">${stat.numCleared}개</td>
      `;
      tbody.appendChild(row);

      // 상세 기록용 행 생성 및 추가
      let stageListHtml = '';
      let starListHtml = '';
      let movesListHtml = '';
      let attemptListHtml = '';
      let timeListHtml = '';
      let statusListHtml = '';
      let hasDetails = false;

      DEFAULT_LEVELS.forEach((lvl, idx) => {
        const ch = lvl.chapter !== undefined ? lvl.chapter : 0;
        if (chapterIdx === null && ch === 0) return;
        if (chapterIdx !== null && ch !== chapterIdx) return;
        if (lvl.locked) return;

        hasDetails = true;
        const displayNum = getLevelDisplayNumber(idx);
        const rec = stat.userRecords[idx];
        if (rec && parseInt(rec.stars, 10) > 0) {
          const starsVal = parseInt(rec.stars, 10) || 0;
          const retryVal = parseInt(rec.retries || 1, 10) || 1;
          const timeVal = parseInt(rec.clearTime || 0, 10) || 0;
          
          const movesVal = rec.moves !== undefined ? parseInt(String(rec.moves).replace(/[^0-9]/g, ''), 10) || 0 : 0;

          stageListHtml += `<span style="opacity:0.7;">${displayNum}</span><br>`;
          starListHtml += `★ ${starsVal}<br>`;
          movesListHtml += `${movesVal > 0 ? movesVal + ' AP' : '-'}<br>`;
          attemptListHtml += `${retryVal}회<br>`;
          timeListHtml += `${formatTime(timeVal)}<br>`;
          statusListHtml += `<span style="color: #00e676;">완료</span><br>`;
        } else {
          stageListHtml += `<span style="opacity:0.4;">${displayNum}</span><br>`;
          starListHtml += `<span style="color: rgba(255,255,255,0.15);">★ 0</span><br>`;
          movesListHtml += `<span style="color: rgba(255,255,255,0.15);">-</span><br>`;
          attemptListHtml += `<span style="color: rgba(255,255,255,0.15);">-</span><br>`;
          timeListHtml += `<span style="color: rgba(255,255,255,0.15);">-</span><br>`;
          statusListHtml += `<span style="color: rgba(255,255,255,0.15);">미진입</span><br>`;
        }
      });

      if (hasDetails) {
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'details-row';
        if (stat.name === currentLoggedUser) {
          detailsRow.classList.add('current-user-details-row');
        }
        detailsRow.innerHTML = `
          <td></td>
          <td style="font-size: 0.8rem; text-align: center; font-family: monospace; line-height: 1.5; padding-top: 4px; padding-bottom: 8px;">${stageListHtml}</td>
          <td style="color: #ffea00; font-size: 0.8rem; line-height: 1.5; padding-top: 4px; padding-bottom: 8px;">${starListHtml}</td>
          <td style="color: #00e676; font-size: 0.8rem; line-height: 1.5; padding-top: 4px; padding-bottom: 8px;">${movesListHtml}</td>
          <td style="color: #ff9100; font-size: 0.8rem; line-height: 1.5; padding-top: 4px; padding-bottom: 8px;">${attemptListHtml}</td>
          <td style="color: #00e5ff; font-size: 0.8rem; font-family: monospace; line-height: 1.5; padding-top: 4px; padding-bottom: 8px;">${timeListHtml}</td>
          <td style="font-size: 0.8rem; line-height: 1.5; padding-top: 4px; padding-bottom: 8px;">${statusListHtml}</td>
        `;
        tbody.appendChild(detailsRow);
      }
    });
    
  } catch (e) {
    console.error('Error fetching leaderboard:', e);
    tbody.innerHTML = '<tr><td colspan="7" style="padding: 20px; color: #ff1744;">순위표 데이터를 가져오는 중 오류가 발생했습니다.</td></tr>';
  }
}

window.adminPathsSelectedUser = null;
window.adminPathsSelectedChapter = null;

function getUserIconLarge(username) {
  if (username === '엽이') {
    return `<svg viewBox="0 0 36 36" width="1.2em" height="1.2em" style="vertical-align: middle; display: inline-block;">
      <defs>
        <linearGradient id="sliceGradLarge" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFF9C4" />
          <stop offset="40%" stop-color="#FFEE58" />
          <stop offset="100%" stop-color="#FBC02D" />
        </linearGradient>
      </defs>
      <path d="M 14,24 A 8,8 0 0,1 30,24 Z" fill="url(#sliceGradLarge)" stroke="#F5B041" stroke-width="0.8"/>
      <path d="M 16,23 A 6,6 0 0,1 28,23 Z" fill="#FFFDE7" opacity="0.6"/>
      <path d="M 10,28 A 8,8 0 0,1 26,28 Z" fill="url(#sliceGradLarge)" stroke="#F5B041" stroke-width="0.8"/>
      <path d="M 12,27 A 6,6 0 0,1 24,27 Z" fill="#FFFDE7" opacity="0.6"/>
      <path d="M 6,32 A 8,8 0 0,1 22,32 Z" fill="url(#sliceGradLarge)" stroke="#F5B041" stroke-width="0.8"/>
      <path d="M 8,31 A 6,6 0 0,1 20,31 Z" fill="#FFFDE7" opacity="0.6"/>
    </svg>`;
  }
  const icons = {
    '영기': '🍠',
    '조씨': '🗡️',
    '앵웅': '🚬',
    '톰토': '🍅',
    '관리자': '🛡️'
  };
  return icons[username] || '🤖';
}

window.selectAdminPathsUser = function(user) {
  window.adminPathsSelectedUser = user;
  window.adminPathsSelectedChapter = null;
  showAdminPathsModal();
};

window.selectAdminPathsChapter = function(chIdx) {
  window.adminPathsSelectedChapter = chIdx;
  showAdminPathsModal();
};

async function showAdminPathsModal() {
  const modal = document.getElementById('adminPathsModal');
  const pathListDiv = document.getElementById('adminPathList');
  const modalTitle = modal.querySelector('.modal-header h2');
  
  // Update header text based on drill-down state
  let headerText = '🕵️ 모험가 클리어 경로';
  if (window.adminPathsSelectedUser) {
    headerText += ` > ${window.adminPathsSelectedUser}`;
    if (window.adminPathsSelectedChapter !== null && window.adminPathsSelectedChapter !== undefined) {
      const chNames = ["기초 훈련", "제 1장"];
      headerText += ` > ${chNames[window.adminPathsSelectedChapter] || '기타'}`;
    }
  }
  if (modalTitle) modalTitle.textContent = headerText;

  pathListDiv.innerHTML = '<div style="padding: 20px; text-align: center;">데이터를 불러오는 중... (Syncing Cloud)</div>';
  modal.classList.remove('hidden');
  
  const users = Object.keys(USER_PASSWORDS);
  
  try {
    const targetUrl = `https://jsonhosting.com/api/json/${DB_OBJECT_ID}/raw?t=${Date.now()}`;
    const proxiedUrl = `${CORS_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxiedUrl);
    let dbData = {};
    if (res.ok) {
      const obj = await res.json();
      dbData = obj.data || {};
    } else {
      console.error("Admin paths fetch failed:", res.status);
      pathListDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #ff1744;">데이터를 가져오는 중 오류가 발생했습니다. (HTTP ' + res.status + ')</div>';
      return;
    }
    
    pathListDiv.innerHTML = '';
    
    // Filter users who have at least one record
    const activeUsers = users.filter(u => dbData[u] && Object.keys(dbData[u]).length > 0);
    
    // Level 1: Adventurer List
    if (!window.adminPathsSelectedUser) {
      if (activeUsers.length === 0) {
        pathListDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">클리어 경로를 기록한 모험가가 아직 없습니다.</div>';
        return;
      }
      
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
      grid.style.gap = '12px';
      grid.style.marginTop = '10px';
      
      activeUsers.forEach(u => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.style.cssText = 'padding: 20px 15px; font-size: 1rem; font-weight: bold; background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.15); border-radius: 10px; color: #fff; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s;';
        
        btn.onmouseover = () => {
          btn.style.background = 'rgba(0,229,255,0.2)';
          btn.style.borderColor = 'rgba(0,229,255,0.35)';
          btn.style.transform = 'translateY(-2px)';
        };
        btn.onmouseout = () => {
          btn.style.background = 'rgba(0,229,255,0.08)';
          btn.style.borderColor = 'rgba(0,229,255,0.15)';
          btn.style.transform = 'translateY(0)';
        };
        btn.onclick = () => window.selectAdminPathsUser(u);
        
        const count = Object.keys(dbData[u] || {}).length;
        btn.innerHTML = `
          <span style="font-size: 1.8rem; line-height: 1;">${getUserIconLarge(u)}</span>
          <span>${u} 모험가</span>
          <span style="font-size: 0.75rem; color: rgba(255,255,255,0.5); font-weight: normal;">총 ${count}개 클리어</span>
        `;
        grid.appendChild(btn);
      });
      
      pathListDiv.appendChild(grid);
      return;
    }
    
    // Level 2: Chapter List for Selected User
    const userRecords = dbData[window.adminPathsSelectedUser] || {};
    if (window.adminPathsSelectedChapter === null || window.adminPathsSelectedChapter === undefined) {
      // Back button
      const backBtn = document.createElement('button');
      backBtn.className = 'btn btn-secondary';
      backBtn.style.cssText = 'margin-bottom: 15px; padding: 6px 12px; font-size: 0.8rem; background: rgba(255,255,255,0.15); border: none; cursor: pointer; border-radius: 4px; color: #fff; font-weight: bold; transition: background 0.2s;';
      backBtn.onmouseover = () => backBtn.style.background = 'rgba(255,255,255,0.25)';
      backBtn.onmouseout = () => backBtn.style.background = 'rgba(255,255,255,0.15)';
      backBtn.textContent = '↩️ 모험가 선택으로';
      backBtn.onclick = () => window.selectAdminPathsUser(null);
      pathListDiv.appendChild(backBtn);
      
      const listContainer = document.createElement('div');
      listContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-top: 5px;';
      
      const chapters = [
        { idx: 0, name: '⚙️ 기초 훈련' },
        { idx: 1, name: '📦 제 1장: 박스 창고' }
      ];
      
      chapters.forEach(ch => {
        const clearedInChapter = Object.keys(userRecords).filter(stageIdx => {
          const lvl = DEFAULT_LEVELS[parseInt(stageIdx, 10)];
          const chIdx = lvl && lvl.chapter !== undefined ? lvl.chapter : 0;
          return chIdx === ch.idx;
        }).length;
        
        if (clearedInChapter === 0) return;
        
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.style.cssText = 'padding: 14px 20px; text-align: left; font-size: 0.95rem; font-weight: bold; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;';
        btn.onmouseover = () => btn.style.background = 'rgba(255,255,255,0.1)';
        btn.onmouseout = () => btn.style.background = 'rgba(255,255,255,0.05)';
        btn.onclick = () => window.selectAdminPathsChapter(ch.idx);
        
        btn.innerHTML = `
          <span>${ch.name}</span>
          <span style="color: #00e5ff; font-size: 0.8rem; background: rgba(0, 229, 255, 0.15); padding: 3px 8px; border-radius: 12px;">${clearedInChapter}개 완료</span>
        `;
        listContainer.appendChild(btn);
      });
      
      pathListDiv.appendChild(listContainer);
      return;
    }
    
    // Level 3: Stage Clear Cards List
    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-secondary';
    backBtn.style.cssText = 'margin-bottom: 15px; padding: 6px 12px; font-size: 0.8rem; background: rgba(255,255,255,0.15); border: none; cursor: pointer; border-radius: 4px; color: #fff; font-weight: bold; transition: background 0.2s;';
    backBtn.onmouseover = () => backBtn.style.background = 'rgba(255,255,255,0.25)';
    backBtn.onmouseout = () => backBtn.style.background = 'rgba(255,255,255,0.15)';
    backBtn.textContent = '↩️ 챕터 선택으로';
    backBtn.onclick = () => window.selectAdminPathsChapter(null);
    pathListDiv.appendChild(backBtn);
    
    const grid = document.createElement('div');
    grid.className = 'user-stages-grid';
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 5px;';
    
    const clearedStageIndices = Object.keys(userRecords)
      .map(k => parseInt(k, 10))
      .filter(stageIdx => {
        const lvl = DEFAULT_LEVELS[stageIdx];
        const chIdx = lvl && lvl.chapter !== undefined ? lvl.chapter : 0;
        return chIdx === window.adminPathsSelectedChapter;
      })
      .sort((a, b) => a - b);
      
    if (clearedStageIndices.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; padding: 20px; text-align: center; color: rgba(255,255,255,0.4);">이 챕터에 클리어 기록이 없습니다.</div>';
    } else {
      clearedStageIndices.forEach(stageIdx => {
        const rec = userRecords[stageIdx];
        if (rec) {
          const stageName = DEFAULT_LEVELS[stageIdx].name.split('. ')[1] || DEFAULT_LEVELS[stageIdx].name;
          const retryCount = rec.retries || 1;
          
          const card = document.createElement('div');
          card.className = 'stage-path-card';
          card.style.cssText = 'background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 4px;';
          card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold;">
              <span style="color: #00e5ff;">${getLevelDisplayNumber(stageIdx)}</span>
              <span style="color: #ffea00; font-size: 0.85rem;">★ ${rec.stars}</span>
            </div>
            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${stageName}">
              ${stageName}
            </div>
            <div style="color: rgba(255,255,255,0.7); font-size: 0.8rem; margin-top: 2px;">
              이동: <span style="color: #00e676; font-weight: bold;">${rec.moves}</span> | 시도: <span style="color: #ff9100; font-weight: bold;">${retryCount}회</span>${rec.clearTime !== undefined ? ` | 시간: <span style="color: #00e5ff; font-weight: bold;">${formatTime(rec.clearTime)}</span>` : ''}
            </div>
            <button onclick="window.startReplay('${window.adminPathsSelectedUser}', ${stageIdx}, '${rec.path}')" class="btn btn-secondary" style="margin-top: 6px; padding: 4px 8px; font-size: 0.75rem; width: 100%; border: none; background: rgba(0, 229, 255, 0.2); color: #fff; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(0, 229, 255, 0.4)'" onmouseout="this.style.background='rgba(0, 229, 255, 0.2)'">▶ 재생</button>
            <div style="display: flex; gap: 5px; margin-top: 5px;">
              <button onclick="window.resetStageStarsOnlyAndRefreshTable('${window.adminPathsSelectedUser}', ${stageIdx})" style="flex: 1; padding: 3px 6px; font-size: 0.68rem; background: rgba(255, 160, 0, 0.25); border: 1px solid rgba(255, 160, 0, 0.5); cursor: pointer; border-radius: 4px; color: #ffa000; font-weight: bold; line-height: 1.3;" title="별 획득만 0으로 초기화 (시간/시도횟수 유지)">⭐ 별 초기화</button>
              <button onclick="window.deleteStageRecordAndRefreshTable('${window.adminPathsSelectedUser}', ${stageIdx})" style="flex: 1; padding: 3px 6px; font-size: 0.68rem; background: rgba(255, 23, 68, 0.25); border: 1px solid rgba(255, 23, 68, 0.5); cursor: pointer; border-radius: 4px; color: #ff1744; font-weight: bold; line-height: 1.3;" title="모든 기록 완전 초기화 (하드 리셋)">🗑️ 하드 리셋</button>
            </div>
          `;
          grid.appendChild(card);
        }
      });
    }
    
    pathListDiv.appendChild(grid);
    
  } catch (e) {
    console.error('Error fetching admin paths:', e);
    pathListDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #ff1744;">데이터를 가져오는 중 오류가 발생했습니다.</div>';
  }
}



// Replay Playback Engine Functions
window.startReplay = function(username, stageIdx, pathString) {
  if (window.isReplaying) return;
  if (!pathString) {
    alert("해당 층은 클리어 경로 기록이 없어 재생할 수 없습니다.");
    return;
  }
  
  window.replayOriginalLevelIdx = currentLevelIdx;
  
  // Track and hide all currently active overlays so they don't block the canvas
  const overlaysToCheck = [
    'loginOverlay',
    'modeSelectOverlay',
    'chapterSelectOverlay',
    'stageSelectOverlay',
    'adminUserSelectOverlay',
    'adminUserStageOverlay',
    'customMapMenuOverlay',
    'customMapListOverlay',
    'mapEditorOverlay',
    'friendMapsOverlay',
    'leaderboardModal',
    'adminPathsModal'
  ];
  
  window.replayHiddenOverlays = [];
  overlaysToCheck.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('hidden')) {
      window.replayHiddenOverlays.push(id);
      el.classList.add('hidden');
    }
  });
  
  // Make sure appContainer is visible so the canvas is rendered!
  const appContainer = document.getElementById('appContainer');
  if (appContainer) {
    if (appContainer.classList.contains('hidden')) {
      window.replayAppContainerWasHidden = true;
      appContainer.classList.remove('hidden');
    } else {
      window.replayAppContainerWasHidden = false;
    }
  }
  
  window.isReplaying = true;
  window.replayPath = pathString.split('');
  window.replayIndex = 0;
  
  // Load target level
  loadLevel(stageIdx);
  
  // Show replay overlay
  const replayOverlay = document.getElementById('replayOverlay');
  const replayInfo = document.getElementById('replayInfo');
  const replayStepText = document.getElementById('replayStepText');
  
  if (replayOverlay) replayOverlay.classList.remove('hidden');
  if (replayInfo) {
    const levelName = DEFAULT_LEVELS[stageIdx].name.split('. ')[1] || DEFAULT_LEVELS[stageIdx].name;
    replayInfo.textContent = `${username} 모험가 - ${getLevelDisplayNumber(stageIdx)} (${levelName})`;
  }
  if (replayStepText) {
    replayStepText.textContent = `[0 / ${window.replayPath.length}]`;
  }
  
  // Start playback steps loop
  window.replayTimeoutId = setTimeout(executeReplayStep, 800);
};

window.stopReplay = function() {
  if (!window.isReplaying) return;
  window.isReplaying = false;
  
  if (window.replayTimeoutId) {
    clearTimeout(window.replayTimeoutId);
    window.replayTimeoutId = null;
  }
  
  // Hide replay overlay
  const replayOverlay = document.getElementById('replayOverlay');
  if (replayOverlay) replayOverlay.classList.add('hidden');
  
  // Restore original stage select level
  if (window.replayOriginalLevelIdx !== undefined) {
    loadLevel(window.replayOriginalLevelIdx);
  }
  
  // Restore all previously visible overlays/modals
  if (window.replayHiddenOverlays) {
    window.replayHiddenOverlays.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });
    window.replayHiddenOverlays = null;
  }
  
  // Restore appContainer visibility
  if (window.replayAppContainerWasHidden) {
    const appContainer = document.getElementById('appContainer');
    if (appContainer) appContainer.classList.add('hidden');
  }
};

function executeReplayStep() {
  if (!window.isReplaying) return;
  
  if (isAnimating) {
    // Poll animation state again shortly
    window.replayTimeoutId = setTimeout(executeReplayStep, 50);
    return;
  }
  
  if (gameStatus !== 'playing') {
    // If the game reaches victory or fail state, stop replay shortly
    window.replayTimeoutId = setTimeout(window.stopReplay, 1500);
    return;
  }
  
  if (window.replayIndex < window.replayPath.length) {
    const dir = window.replayPath[window.replayIndex];
    let dx = 0, dy = 0;
    if (dir === 'R') dx = 1;
    else if (dir === 'L') dx = -1;
    else if (dir === 'D') dy = 1;
    else if (dir === 'U') dy = -1;
    
    window.replayIndex++;
    
    // Update step counters
    const stepText = document.getElementById('replayStepText');
    if (stepText) {
      stepText.textContent = `[${window.replayIndex} / ${window.replayPath.length}]`;
    }
    
    // Trigger movement simulation bypass
    attemptMove(dx, dy, true);
    
    // Wait for animation frame delay to check again
    window.replayTimeoutId = setTimeout(executeReplayStep, 700);
  } else {
    // End of recorded path
    window.replayTimeoutId = setTimeout(window.stopReplay, 1500);
  }
}

function getUserIcon(username) {
  if (username === '엽이') {
    return `<svg viewBox="0 0 36 36" width="1.2em" height="1.2em" style="vertical-align: middle; display: inline-block;">
      <defs>
        <linearGradient id="sliceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFF9C4" />
          <stop offset="40%" stop-color="#FFEE58" />
          <stop offset="100%" stop-color="#FBC02D" />
        </linearGradient>
      </defs>
      <path d="M 14,24 A 8,8 0 0,1 30,24 Z" fill="url(#sliceGrad)" stroke="#F5B041" stroke-width="0.8"/>
      <path d="M 16,23 A 6,6 0 0,1 28,23 Z" fill="#FFFDE7" opacity="0.6"/>
      <path d="M 10,28 A 8,8 0 0,1 26,28 Z" fill="url(#sliceGrad)" stroke="#F5B041" stroke-width="0.8"/>
      <path d="M 12,27 A 6,6 0 0,1 24,27 Z" fill="#FFFDE7" opacity="0.6"/>
      <path d="M 6,32 A 8,8 0 0,1 22,32 Z" fill="url(#sliceGrad)" stroke="#F5B041" stroke-width="0.8"/>
      <path d="M 8,31 A 6,6 0 0,1 20,31 Z" fill="#FFFDE7" opacity="0.6"/>
    </svg>`;
  }
  const icons = {
    '영기': '🍠',
    '조씨': '🗡️',
    '앵웅': '🚬',
    '톰토': '🍅',
    '관리자': '🛡️'
  };
  return icons[username] || '🤖';
}

// Stage Selection Overlay Functions
function showStageSelectMenu() {
  document.getElementById('appContainer').classList.add('hidden');
  document.getElementById('stageSelectOverlay').classList.remove('hidden');
  const btnLeaderboard = document.getElementById('btnStageSelectLeaderboard');
  if (btnLeaderboard) {
    if (currentChapterIdx === 0) {
      btnLeaderboard.classList.add('hidden');
    } else {
      btnLeaderboard.classList.remove('hidden');
      btnLeaderboard.setAttribute('data-tooltip', `챕터 순위표 : ${currentChapterIdx}장`);
    }
  }
  renderStageSelectGrid();
}

function renderStageSelectGrid() {
  const grid = document.getElementById('stageSelectGrid');
  if (!grid) return;
  grid.innerHTML = '';
  
  DEFAULT_LEVELS.forEach((lvl, idx) => {
    const levelChapter = lvl.chapter !== undefined ? lvl.chapter : 0;
    if (levelChapter !== currentChapterIdx) return;

    const best = getBestRecord(idx);
    const card = document.createElement('div');
    card.className = 'stage-card';
    if (lvl.locked) {
      card.className = 'stage-card locked';
    }
    
    const numDiv = document.createElement('div');
    numDiv.className = 'stage-num';
    numDiv.textContent = getLevelDisplayNumber(idx);
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'stage-name';
    nameDiv.textContent = lvl.name.split('. ')[1] || lvl.name;
    
    const starsDiv = document.createElement('div');
    if (lvl.locked) {
      starsDiv.className = 'stage-stars';
      starsDiv.textContent = '🔒';
    } else {
      starsDiv.className = 'stage-stars' + (best && best.stars > 0 ? ' has-stars' : '');
      starsDiv.textContent = best ? '★'.repeat(best.stars) + '☆'.repeat(3 - best.stars) : '☆☆☆';
    }
    
    const retriesDiv = document.createElement('div');
    retriesDiv.className = 'stage-retries';
    retriesDiv.style.fontSize = '0.65rem';
    retriesDiv.style.color = 'rgba(255,255,255,0.5)';
    retriesDiv.style.marginTop = '6px';
    retriesDiv.style.fontFamily = 'var(--font-body)';
    
    if (!lvl.locked) {
      const user = localStorage.getItem('runic_dungeon_user') || '';
      const retryCount = parseInt(localStorage.getItem(`runic_dungeon_retry_count_${user}_${idx}`), 10) || 0;
      if (best && best.stars === 3) {
        const finalRetries = best.retries || retryCount || 1;
        const timeStr = best.clearTime !== undefined ? `${formatTime(best.clearTime)}` : '-';
        retriesDiv.innerHTML = `
          <span style="color: #00e676; font-weight: bold; display: block; margin-bottom: 2px;">3성 달성</span>
          <span style="display: block; color: #ffffff; margin-bottom: 2px;">${finalRetries}회</span>
          <span style="display: block; color: rgba(255,255,255,0.7);">${timeStr}</span>
        `;
      } else {
        const accumTime = parseInt(localStorage.getItem(`runic_dungeon_play_time_${user}_${idx}`), 10) || 0;
        const accumSec = Math.round(accumTime / 1000);
        const timeStr = accumSec > 0 ? `${formatTime(accumSec)}` : '';
        if (retryCount > 0) {
          retriesDiv.innerHTML = `
            <span style="color: #ff9100; font-weight: bold; display: block; margin-bottom: 2px;">시도 중</span>
            <span style="display: block; color: #ffffff; margin-bottom: 2px;">${retryCount}회</span>
            ${timeStr ? `<span style="display: block; color: rgba(255,255,255,0.7);">${timeStr}</span>` : ''}
          `;
        } else {
          retriesDiv.innerHTML = `<span style="color: rgba(255,255,255,0.35); display: block;">시도 없음</span>`;
        }
      }
    } else {
      retriesDiv.innerHTML = `<span style="color: rgba(255,255,255,0.3); display: block;">-</span>`;
    }
    
    card.appendChild(numDiv);
    card.appendChild(nameDiv);
    card.appendChild(starsDiv);
    card.appendChild(retriesDiv);
    
    card.addEventListener('click', () => {
      if (lvl.locked) {
        sound.playFail();
        shakeCardElement(card);
        return;
      }
      document.getElementById('stageSelectOverlay').classList.add('hidden');
      document.getElementById('appContainer').classList.remove('hidden');
      sound.init();
      loadLevel(idx);
      document.getElementById('levelSelect').value = idx;
      canvas.focus();
    });
    
    grid.appendChild(card);
  });
}

function shakeCardElement(card) {
  card.classList.add('shake-anim');
  setTimeout(() => {
    card.classList.remove('shake-anim');
  }, 400);
}

// Chapter Selection Overlay Functions
window.viewChapterLeaderboard = function(event, chapterIdx) {
  if (event) {
    event.stopPropagation(); // Prevent entering the chapter stage select screen!
  }
  showLeaderboardModal(chapterIdx);
};

// ==========================================================================
// Map Editor & Custom Modes Core Logic
// ==========================================================================

async function fetchCloudData() {
  const targetUrl = `https://jsonhosting.com/api/json/${DB_OBJECT_ID}/raw?t=${Date.now()}`;
  const proxiedUrl = `${CORS_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
  const res = await fetch(proxiedUrl);
  if (res.ok) {
    const obj = await res.json();
    return obj.data || {};
  }
  throw new Error("Failed to fetch cloud database: " + res.status);
}

async function saveCloudData(dbData) {
  const targetPutUrl = `https://jsonhosting.com/api/json/${DB_OBJECT_ID}`;
  const proxiedPutUrl = `${CORS_PROXY_URL}?url=${encodeURIComponent(targetPutUrl)}`;
  const putRes = await fetch(proxiedPutUrl, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'X-Edit-Key': DB_EDIT_KEY
    },
    body: JSON.stringify({
      name: "RunicDungeonLeaderboard",
      data: dbData
    })
  });
  if (!putRes.ok) {
    throw new Error("Failed to save cloud database: " + putRes.status);
  }
}

function loadLocalDrafts(username) {
  const data = localStorage.getItem('runic_dungeon_drafts_' + username);
  return data ? JSON.parse(data) : [];
}

function saveLocalDrafts(username, drafts) {
  localStorage.setItem('runic_dungeon_drafts_' + username, JSON.stringify(drafts));
}

async function syncLocalDraftsWithCloud() {
  const username = localStorage.getItem('runic_dungeon_user') || '모험가';
  let drafts = loadLocalDrafts(username);
  if (drafts.length === 0) return;

  try {
    const dbData = await fetchCloudData();
    if (!dbData) return;
    const customMaps = dbData["custom_maps"] || {};
    let updated = false;

    drafts.forEach(map => {
      const dbMap = customMaps[map.id];
      if (dbMap) {
        if (!map.published || !map.verified) {
          map.published = true;
          map.verified = true;
          updated = true;
        }
      } else {
        if (map.published) {
          map.published = false;
          map.verified = map.optimalAP !== null;
          updated = true;
        }
      }
    });

    if (updated) {
      saveLocalDrafts(username, drafts);
      renderCustomMapList();
    }
  } catch (e) {
    console.error("Failed to sync drafts with cloud:", e);
  }
}


function showModeSelectMenu() {
  document.getElementById('loginOverlay').classList.add('hidden');
  document.getElementById('chapterSelectOverlay').classList.add('hidden');
  document.getElementById('stageSelectOverlay').classList.add('hidden');
  document.getElementById('customMapMenuOverlay').classList.add('hidden');
  document.getElementById('customMapListOverlay').classList.add('hidden');
  document.getElementById('mapEditorOverlay').classList.add('hidden');
  document.getElementById('friendMapsOverlay').classList.add('hidden');
  document.getElementById('adminUserSelectOverlay').classList.add('hidden');
  document.getElementById('adminUserStageOverlay').classList.add('hidden');
  document.getElementById('appContainer').classList.add('hidden');
  
  document.getElementById('modeSelectOverlay').classList.remove('hidden');

  const username = localStorage.getItem('runic_dungeon_user') || '모험가';
  const adminCard = document.getElementById('btnModeAdminPaths');
  const modeGrid = document.querySelector('.mode-grid');
  const selectBox = document.querySelector('.mode-select-box');
  if (adminCard) {
    if (username === '관리자') {
      adminCard.classList.remove('hidden');
      if (modeGrid) modeGrid.classList.add('admin-grid');
      if (selectBox) selectBox.classList.add('admin-layout');
    } else {
      adminCard.classList.add('hidden');
      if (modeGrid) modeGrid.classList.remove('admin-grid');
      if (selectBox) selectBox.classList.remove('admin-layout');
    }
  }
}

function showCustomMapMenu() {
  document.getElementById('modeSelectOverlay').classList.add('hidden');
  document.getElementById('customMapListOverlay').classList.add('hidden');
  document.getElementById('mapEditorOverlay').classList.add('hidden');
  document.getElementById('friendMapsOverlay').classList.add('hidden');
  document.getElementById('appContainer').classList.add('hidden');
  
  document.getElementById('customMapMenuOverlay').classList.remove('hidden');
}

function showCustomMapList() {
  document.getElementById('customMapMenuOverlay').classList.add('hidden');
  document.getElementById('mapEditorOverlay').classList.add('hidden');
  
  document.getElementById('customMapListOverlay').classList.remove('hidden');
  renderCustomMapList();
  syncLocalDraftsWithCloud();
}

function getActiveMapSizeString(map) {
  let minX = map.width;
  let maxX = 0;
  let minY = map.height;
  let maxY = 0;
  let hasActiveElements = false;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.grid[y][x] !== ' ') {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        hasActiveElements = true;
      }
    }
  }

  if (map.entities) {
    map.entities.forEach(ent => {
      minX = Math.min(minX, ent.x);
      maxX = Math.max(maxX, ent.x);
      minY = Math.min(minY, ent.y);
      maxY = Math.max(maxY, ent.y);
      hasActiveElements = true;
    });
  }

  if (hasActiveElements) {
    const activeW = maxX - minX + 1;
    const activeH = maxY - minY + 1;
    return `${activeW}x${activeH}`;
  }
  return `${map.width}x${map.height}`;
}

function renderCustomMapList() {
  const username = localStorage.getItem('runic_dungeon_user') || '모험가';
  const drafts = loadLocalDrafts(username);
  const grid = document.getElementById('customMapGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (drafts.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 0.95rem; font-family: var(--font-body);">제작한 맵이 없습니다. 새 맵을 만들어보세요!</div>';
    return;
  }

  drafts.forEach((map) => {
    const card = document.createElement('div');
    card.className = 'stage-card';

    const statusDiv = document.createElement('div');
    statusDiv.className = 'stage-num';
    statusDiv.style.fontSize = '1.05rem';
    statusDiv.style.margin = '4px 0';
    if (map.published) {
      statusDiv.innerHTML = `<span style="color: #00e676; text-shadow: 0 0 10px rgba(0, 230, 118, 0.4);">🚀 배포 완료</span>`;
    } else {
      statusDiv.innerHTML = `<span style="color: #ff9100; text-shadow: 0 0 10px rgba(255, 145, 0, 0.4);">💾 임시 저장</span>`;
    }

    const nameDiv = document.createElement('div');
    nameDiv.className = 'stage-name';
    nameDiv.textContent = map.name;

    const sizeDiv = document.createElement('div');
    sizeDiv.className = 'stage-stars';
    sizeDiv.style.fontSize = '0.85rem';
    sizeDiv.style.color = 'var(--color-primary)';
    sizeDiv.textContent = `📏 ${getActiveMapSizeString(map)}`;

    const apDiv = document.createElement('div');
    apDiv.className = 'stage-retries';
    apDiv.style.fontSize = '0.7rem';
    apDiv.style.color = 'rgba(255, 255, 255, 0.7)';
    apDiv.style.marginTop = '4px';
    apDiv.style.fontFamily = 'var(--font-body)';
    
    const apText = map.optimalAP !== null && map.optimalAP !== undefined ? `${map.optimalAP} AP` : '미검증';
    apDiv.innerHTML = `<span style="color: #00e5ff; font-weight: bold;">최적:</span> ${apText}`;

    // Action buttons container
    const actionsDiv = document.createElement('div');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.gap = '8px';
    actionsDiv.style.marginTop = '10px';
    actionsDiv.style.width = '100%';
    actionsDiv.style.justifyContent = 'center';
    actionsDiv.style.zIndex = '10';

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn btn-danger';
    btnDelete.style.flex = '1';
    btnDelete.style.padding = '6px 0';
    btnDelete.style.fontSize = '0.75rem';
    btnDelete.style.margin = '0';
    btnDelete.textContent = '🗑️ 삭제';
    btnDelete.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteLocalMapDraft(map.id);
    });

    const btnRight = document.createElement('button');
    btnRight.style.flex = '1';
    btnRight.style.padding = '6px 0';
    btnRight.style.fontSize = '0.75rem';
    btnRight.style.margin = '0';

    if (map.published) {
      btnRight.className = 'btn';
      btnRight.style.backgroundColor = '#ff9100';
      btnRight.style.color = '#fff';
      btnRight.textContent = '🚫 배포 취소';
      btnRight.addEventListener('click', async (e) => {
        e.stopPropagation();
        await unpublishEditorMap(map.id);
      });
    } else {
      btnRight.className = 'btn btn-primary';
      btnRight.textContent = '✏️ 편집';
      btnRight.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditorForMap(map.id);
      });
    }

    actionsDiv.appendChild(btnDelete);
    actionsDiv.appendChild(btnRight);

    card.appendChild(statusDiv);
    card.appendChild(nameDiv);
    card.appendChild(sizeDiv);
    card.appendChild(apDiv);
    card.appendChild(actionsDiv);

    card.addEventListener('click', () => {
      if (map.published) {
        alert("배포된 퍼즐은 직접 수정할 수 없습니다. 수정을 원하시면 먼저 '배포 취소'를 눌러주세요!");
      } else {
        openEditorForMap(map.id);
      }
    });

    grid.appendChild(card);
  });
}

async function unpublishEditorMap(mapId) {
  if (!confirm("정말로 이 맵의 배포를 취소하시겠습니까?\n서버에서 맵이 내려가지만, 제작 목록에는 유지됩니다.")) return;
  const username = localStorage.getItem('runic_dungeon_user') || '모험가';
  
  try {
    const dbData = await fetchCloudData();
    if (dbData && dbData["custom_maps"] && dbData["custom_maps"][mapId]) {
      delete dbData["custom_maps"][mapId];
      await saveCloudData(dbData);
      console.log("Map unpublished from cloud database.");
    }
  } catch (err) {
    console.error("Failed to unpublish map from cloud database:", err);
    alert("서버 연결 실패로 배포 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    return;
  }

  let drafts = loadLocalDrafts(username);
  const idx = drafts.findIndex(m => m.id === mapId);
  if (idx !== -1) {
    drafts[idx].published = false;
    saveLocalDrafts(username, drafts);
  }

  alert("배포가 취소되었습니다. 이제 임시 저장 상태로 수정할 수 있습니다.");
  renderCustomMapList();
}

async function deleteLocalMapDraft(mapId) {
  if (!confirm("정말로 이 맵을 삭제하시겠습니까?")) return;
  const username = localStorage.getItem('runic_dungeon_user') || '모험가';
  let drafts = loadLocalDrafts(username);
  drafts = drafts.filter(m => m.id !== mapId);
  saveLocalDrafts(username, drafts);
  renderCustomMapList();

  try {
    const dbData = await fetchCloudData();
    if (dbData && dbData["custom_maps"] && dbData["custom_maps"][mapId]) {
      delete dbData["custom_maps"][mapId];
      await saveCloudData(dbData);
      console.log("Cloud database synchronized. Map deleted.");
    }
  } catch (err) {
    console.error("Failed to delete map from cloud database:", err);
  }
}

function openEditorForMap(mapId) {
  const username = localStorage.getItem('runic_dungeon_user') || '모험가';
  const drafts = loadLocalDrafts(username);
  const map = drafts.find(m => m.id === mapId);
  if (!map) return;

  currentEditingMapId = mapId;
  editorGridWidth = map.width || 15;
  editorGridHeight = map.height || 15;
  editorMapName = map.name;
  editorMaxAP = map.maxAP || 50;

  // Auto-migrate and expand smaller grids (e.g. 10x10) to 15x15
  if (editorGridWidth < 15 || editorGridHeight < 15) {
    let newGrid = Array(15).fill(null).map(() => Array(15).fill(' '));
    for (let y = 0; y < Math.min(editorGridHeight, 15); y++) {
      for (let x = 0; x < Math.min(editorGridWidth, 15); x++) {
        newGrid[y][x] = map.grid[y][x];
      }
    }
    editorGrid = newGrid;
    editorGridWidth = 15;
    editorGridHeight = 15;
  } else {
    editorGrid = map.grid.map(row => [...row]);
  }
  editorEntities = map.entities.map(e => ({ ...e }));
  editorConnections = map.connections ? map.connections.map(c => ({
    switch: { ...c.switch },
    door: { ...c.door }
  })) : [];
  editorPortalConnections = map.portalConnections ? map.portalConnections.map(c => ({
    p1: { ...c.p1 },
    p2: { ...c.p2 }
  })) : [];
  editorVerified = map.verified || map.published || false;
  editorOptimalAP = map.optimalAP || null;
  editorOptimalMoves = map.optimalMoves || null;
  editorOptimalPath = map.optimalPath || null;
  editorSelectedTool = 'W';
  editorLinkStart = null;

  document.getElementById('editorMapNameInput').value = editorMapName;
  document.getElementById('editorMapMaxApInput').value = editorVerified ? editorMaxAP : "최적 클리어로 갱신";
  document.getElementById('editorLinkStatus').textContent = "선택 해제됨";

  const paletteBtns = document.querySelectorAll('#editorPalette .palette-item');
  paletteBtns.forEach(btn => btn.classList.remove('active'));
  const defaultBtn = document.querySelector(`#editorPalette .palette-item[data-type="W"]`);
  if (defaultBtn) defaultBtn.classList.add('active');

  document.getElementById('btnEditorPublish').disabled = !editorVerified;

  document.getElementById('customMapListOverlay').classList.add('hidden');
  document.getElementById('mapEditorOverlay').classList.remove('hidden');

  isEditorMode = true;
  renderEditorGrid();
}

function createNewCustomMap() {
  const username = localStorage.getItem('runic_dungeon_user') || '모험가';
  const drafts = loadLocalDrafts(username);
  
  const newMapId = "map_" + Date.now();
  const newMap = {
    id: newMapId,
    name: "새로운 퍼즐",
    width: 15,
    height: 15,
    maxAP: 50,
    grid: Array(15).fill(null).map(() => Array(15).fill(' ')),
    entities: [],
    connections: [],
    portalConnections: [],
    published: false,
    verified: false,
    optimalAP: null,
    optimalMoves: null,
    optimalPath: null
  };
  
  drafts.push(newMap);
  saveLocalDrafts(username, drafts);
  
  openEditorForMap(newMapId);
}

function renderEditorGrid() {
  const gridEl = document.getElementById('editorGrid');
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${editorGridWidth}, 40px)`;
  gridEl.style.gridTemplateRows = `repeat(${editorGridHeight}, 40px)`;

  for (let y = 0; y < editorGridHeight; y++) {
    for (let x = 0; x < editorGridWidth; x++) {
      const cell = document.createElement('div');
      cell.className = 'editor-cell';
      cell.dataset.x = x;
      cell.dataset.y = y;

      const tileType = editorGrid[y][x];
      let bgClass = 'cell-wall';
      switch (tileType) {
        case 'W': bgClass = 'cell-wall'; break;
        case '.': bgClass = 'cell-floor'; break;
        case 'I': bgClass = 'cell-ice'; break;
        case 'H': bgClass = 'cell-hole'; break;
        case 'G': bgClass = 'cell-goal'; break;
        case 'S': bgClass = 'cell-switch-temp'; break;
        case 'K': bgClass = 'cell-switch-perm'; break;
        case 'D': bgClass = 'cell-door'; break;
        case 'T': bgClass = 'cell-spikes'; break;
        case 'C': bgClass = 'cell-crumb1'; break;
        case 'X': bgClass = 'cell-crumb2'; break;
        case 'P': bgClass = 'cell-portal'; break;
        case '^': case 'v': case '<': case '>': bgClass = 'cell-oneway'; break;
        case ' ': bgClass = 'cell-empty'; break;
      }
      cell.classList.add(bgClass);

      const connIdx = editorConnections.findIndex(c => 
        (c.switch.x === x && c.switch.y === y) || (c.door.x === x && c.door.y === y)
      );
      if (connIdx !== -1) {
        const badgeColors = ['#ffea00', '#00b0ff', '#d500f9', '#00e676'];
        const color = badgeColors[connIdx % badgeColors.length];
        cell.style.borderColor = color;
        cell.style.boxShadow = `0 0 8px ${color}, inset 0 0 8px ${color}`;

        const badge = document.createElement('span');
        badge.className = 'conn-badge';
        badge.textContent = String.fromCharCode(65 + connIdx);
        cell.appendChild(badge);
      }

      if (tileType === 'P') {
        const portalConnIdx = editorPortalConnections.findIndex(c => 
          (c.p1.x === x && c.p1.y === y) || (c.p2.x === x && c.p2.y === y)
        );
        if (portalConnIdx !== -1) {
          const portalColors = ['#00e676', '#ffea00', '#00b0ff', '#ff1744'];
          const color = portalColors[portalConnIdx % portalColors.length];
          cell.style.borderColor = color;
          cell.style.color = color;
          cell.style.boxShadow = `0 0 10px ${color}, inset 0 0 5px ${color}`;

          const badge = document.createElement('span');
          badge.className = 'conn-badge';
          badge.textContent = portalConnIdx + 1;
          badge.style.background = color;
          badge.style.color = '#000';
          cell.appendChild(badge);
        } else {
          cell.style.borderColor = '#9e9e9e';
          cell.style.color = '#9e9e9e';
          cell.style.boxShadow = 'none';
        }
      }

      // Check if this cell is currently selected as the link starting point
      if (editorLinkStart && editorLinkStart.x === x && editorLinkStart.y === y) {
        cell.classList.add('link-start-selected');
      }

      const entity = editorEntities.find(e => e.x === x && e.y === y);
      if (entity) {
        if (entity.type === 'player') {
          cell.textContent = '🤖';
        } else if (entity.type === 'box') {
          cell.textContent = '📦';
        }
      } else {
        switch (tileType) {
          case 'W': cell.textContent = '🧱'; break;
          case '.': cell.textContent = ''; break;
          case ' ': cell.textContent = ''; break;
          case 'I': cell.textContent = '❄️'; break;
          case 'H': cell.textContent = '🕳️'; break;
          case 'G': cell.textContent = '🌟'; break;
          case 'S': cell.textContent = '🔴'; break;
          case 'K': cell.textContent = '🟡'; break;
          case 'D': cell.textContent = '🔒'; break;
          case 'T': cell.textContent = '🔺'; break;
          case 'C': cell.textContent = '1'; break;
          case 'X': cell.textContent = '2'; break;
          case 'P': cell.textContent = '▲'; break;
          case '^': cell.textContent = '⬆️'; break;
          case 'v': cell.textContent = '⬇️'; break;
          case '<': cell.textContent = '⬅️'; break;
          case '>': cell.textContent = '➡️'; break;
        }
      }

      cell.addEventListener('mousedown', (e) => {
        window.isMouseDown = true;
        handleEditorCellClick(x, y);
      });

      cell.addEventListener('mouseenter', () => {
        if (window.isMouseDown && editorSelectedTool !== 'link') {
          handleEditorCellClick(x, y);
        }
      });

      gridEl.appendChild(cell);
    }
  }
  updateEditorConnectionsList();
}

function updateEditorConnectionsList() {
  const listEl = document.getElementById('editorConnectionsList');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (editorConnections.length === 0 && editorPortalConnections.length === 0) {
    listEl.innerHTML = '<div style="color: #666; text-align: center; font-style: italic; margin-top: 10px;">연결된 장치 없음</div>';
    return;
  }

  // Render switch-door connections
  editorConnections.forEach((conn, index) => {
    const label = String.fromCharCode(65 + index); // 'A', 'B', 'C', ...
    const badgeColors = ['#ffea00', '#00b0ff', '#d500f9', '#00e676'];
    const color = badgeColors[index % badgeColors.length];

    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.padding = '4px 6px';
    item.style.background = 'rgba(255, 255, 255, 0.03)';
    item.style.borderLeft = `3px solid ${color}`;
    item.style.borderRadius = '2px';
    item.style.fontSize = '0.72rem';
    item.style.marginBottom = '2px';
    
    const text = document.createElement('span');
    text.innerHTML = `<b style="color: ${color}">${label}</b>: 스위치(${conn.switch.x},${conn.switch.y}) ➔ 문(${conn.door.x},${conn.door.y})`;
    item.appendChild(text);

    // delBtn
    const delBtn = document.createElement('span');
    delBtn.innerHTML = '❌';
    delBtn.style.cursor = 'pointer';
    delBtn.style.fontSize = '0.65rem';
    delBtn.style.opacity = '0.6';
    delBtn.style.marginLeft = '4px';
    delBtn.addEventListener('mouseenter', () => delBtn.style.opacity = '1');
    delBtn.addEventListener('mouseleave', () => delBtn.style.opacity = '0.6');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeConnectionAt(conn.switch.x, conn.switch.y);
      invalidateEditorVerification();
      renderEditorGrid();
    });
    item.appendChild(delBtn);

    listEl.appendChild(item);
  });

  // Render portal connections
  editorPortalConnections.forEach((conn, index) => {
    const portalColors = ['#00e676', '#ffea00', '#00b0ff', '#ff1744']; // Green, Yellow, Blue, Red
    const color = portalColors[index % portalColors.length];

    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.padding = '4px 6px';
    item.style.background = 'rgba(255, 255, 255, 0.03)';
    item.style.borderLeft = `3px solid ${color}`;
    item.style.borderRadius = '2px';
    item.style.fontSize = '0.72rem';
    item.style.marginBottom = '2px';
    
    const text = document.createElement('span');
    text.innerHTML = `<b style="color: ${color}">포탈 짝 ${index + 1}</b>: (${conn.p1.x},${conn.p1.y}) ⇄ (${conn.p2.x},${conn.p2.y})`;
    item.appendChild(text);

    // delBtn
    const delBtn = document.createElement('span');
    delBtn.innerHTML = '❌';
    delBtn.style.cursor = 'pointer';
    delBtn.style.fontSize = '0.65rem';
    delBtn.style.opacity = '0.6';
    delBtn.style.marginLeft = '4px';
    delBtn.addEventListener('mouseenter', () => delBtn.style.opacity = '1');
    delBtn.addEventListener('mouseleave', () => delBtn.style.opacity = '0.6');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removePortalConnectionAt(conn.p1.x, conn.p1.y);
      invalidateEditorVerification();
      renderEditorGrid();
    });
    item.appendChild(delBtn);

    listEl.appendChild(item);
  });
}

function removePortalConnectionAt(x, y) {
  editorPortalConnections = editorPortalConnections.filter(c => 
    !(c.p1.x === x && c.p1.y === y || c.p2.x === x && c.p2.y === y)
  );
}

function removeConnectionAt(x, y) {
  editorConnections = editorConnections.filter(c => 
    !(c.switch.x === x && c.switch.y === y || c.door.x === x && c.door.y === y)
  );
  removePortalConnectionAt(x, y);
}

function handleEditorCellClick(x, y) {
  const currentTile = editorGrid[y][x];

  if (editorSelectedTool === 'link') {
    const statusEl = document.getElementById('editorLinkStatus');
    if (!editorLinkStart) {
      // Step 1: Select either Switch, Door, or Portal
      if (currentTile !== 'S' && currentTile !== 'K' && currentTile !== 'D' && currentTile !== 'P') {
        window.isMouseDown = false;
        alert("첫 번째 클릭은 스위치(🔴/🟡), 잠긴 문(🔒) 또는 포탈(P)을 선택해야 합니다!");
        return;
      }
      editorLinkStart = { x, y, type: currentTile };
      if (currentTile === 'S' || currentTile === 'K') {
        statusEl.textContent = `${currentTile === 'S' ? '임시 스위치' : '지속 스위치'}(${x},${y}) 선택됨. 연결할 문(🔒)을 클릭하세요.`;
      } else if (currentTile === 'D') {
        statusEl.textContent = `잠긴 문(${x},${y}) 선택됨. 연결할 스위치(🔴/🟡)를 클릭하세요.`;
      } else {
        statusEl.textContent = `포탈(${x},${y}) 선택됨. 연결할 반대편 포탈(P)을 클릭하세요.`;
      }
      renderEditorGrid();
    } else {
      // Step 2: Select matching opposite type or handle portals
      if (x === editorLinkStart.x && y === editorLinkStart.y) {
        window.isMouseDown = false;
        alert("자기 자신과 연결할 수 없습니다!");
        return;
      }

      // If portal selection flow
      if (editorLinkStart.type === 'P') {
        if (currentTile !== 'P') {
          window.isMouseDown = false;
          alert("포탈은 다른 포탈(P)과만 연결할 수 있습니다!");
          return;
        }

        // Remove any existing portal connections for either portal
        removePortalConnectionAt(editorLinkStart.x, editorLinkStart.y);
        removePortalConnectionAt(x, y);

        // Link them
        editorPortalConnections.push({
          p1: { x: editorLinkStart.x, y: editorLinkStart.y },
          p2: { x, y }
        });

        editorLinkStart = null;
        statusEl.textContent = "포탈 연결 성공!";
        setTimeout(() => {
          if (editorSelectedTool === 'link') {
            statusEl.textContent = "연결할 스위치(🔴/🟡), 잠긴 문(🔒) 또는 포탈(P)을 클릭하세요.";
          }
        }, 1500);

        invalidateEditorVerification();
        renderEditorGrid();
        return;
      }

      // If non-portal (switch/door) flow but current is portal
      if (currentTile === 'P') {
        window.isMouseDown = false;
        alert("스위치/문은 포탈과 연결할 수 없습니다!");
        return;
      }

      const isStartSwitch = (editorLinkStart.type === 'S' || editorLinkStart.type === 'K');
      const isCurrentSwitch = (currentTile === 'S' || currentTile === 'K');
      
      // If clicking same category again, update first selection instead of erroring
      if (isStartSwitch && isCurrentSwitch) {
        editorLinkStart = { x, y, type: currentTile };
        statusEl.textContent = `${currentTile === 'S' ? '임시 스위치' : '지속 스위치'}(${x},${y}) 선택됨. 연결할 문(🔒)을 클릭하세요.`;
        renderEditorGrid();
        return;
      }
      if (!isStartSwitch && currentTile === 'D') {
        editorLinkStart = { x, y, type: currentTile };
        statusEl.textContent = `잠긴 문(${x},${y}) 선택됨. 연결할 스위치(🔴/🟡)를 클릭하세요.`;
        renderEditorGrid();
        return;
      }

      // Check compatibility
      if (isStartSwitch && currentTile !== 'D') {
        window.isMouseDown = false;
        alert("스위치와 연결하려면 잠긴 문(🔒)을 클릭해야 합니다!");
        return;
      }
      if (!isStartSwitch && !isCurrentSwitch) {
        window.isMouseDown = false;
        alert("잠긴 문과 연결하려면 스위치(🔴/🟡)를 클릭해야 합니다!");
        return;
      }

      // Determine Switch and Door objects
      let switchObj, doorObj;
      if (isStartSwitch) {
        switchObj = { x: editorLinkStart.x, y: editorLinkStart.y };
        doorObj = { x, y };
      } else {
        switchObj = { x, y };
        doorObj = { x: editorLinkStart.x, y: editorLinkStart.y };
      }

      // Remove any existing connection for this switch or this door to keep 1-to-1
      removeConnectionAt(switchObj.x, switchObj.y);
      removeConnectionAt(doorObj.x, doorObj.y);

      // Link them
      editorConnections.push({
        switch: switchObj,
        door: doorObj
      });

      editorLinkStart = null;
      statusEl.textContent = "연결 성공!";
      setTimeout(() => {
        if (editorSelectedTool === 'link') {
          statusEl.textContent = "연결할 스위치(🔴/🟡), 잠긴 문(🔒) 또는 포탈(P)을 클릭하세요.";
        }
      }, 1500);

      invalidateEditorVerification();
      renderEditorGrid();
    }
    return;
  }

  // Handle placing individual switch or door tiles
  if (editorSelectedTool === 'S' || editorSelectedTool === 'K' || editorSelectedTool === 'D') {
    if (currentTile === 'W' || currentTile === ' ') {
      window.isMouseDown = false;
      alert("바닥 타일을 먼저 설치해야 합니다!");
      return;
    }
    editorGrid[y][x] = editorSelectedTool;
    editorEntities = editorEntities.filter(e => !(e.x === x && e.y === y));
    removeConnectionAt(x, y);
    invalidateEditorVerification();
    renderEditorGrid();
    return;
  }

  if (editorSelectedTool === 'empty') {
    editorGrid[y][x] = ' ';
    editorEntities = editorEntities.filter(e => !(e.x === x && e.y === y));
    removeConnectionAt(x, y);
    invalidateEditorVerification();
    renderEditorGrid();
  } else if (editorSelectedTool === 'W') {
    editorGrid[y][x] = 'W';
    editorEntities = editorEntities.filter(e => !(e.x === x && e.y === y));
    removeConnectionAt(x, y);
    invalidateEditorVerification();
    renderEditorGrid();
  } else if (editorSelectedTool === '.') {
    editorGrid[y][x] = '.';
    editorEntities = editorEntities.filter(e => !(e.x === x && e.y === y));
    removeConnectionAt(x, y);
    invalidateEditorVerification();
    renderEditorGrid();
  } else if (['I', 'H', 'G', 'T', 'C', 'X', 'P', '^', 'v', '<', '>'].includes(editorSelectedTool)) {
    if (currentTile === 'W' || currentTile === ' ') {
      window.isMouseDown = false;
      alert("바닥 타일을 먼저 설치해야 합니다!");
      return;
    }
    editorGrid[y][x] = editorSelectedTool;
    editorEntities = editorEntities.filter(e => !(e.x === x && e.y === y));
    removeConnectionAt(x, y);
    invalidateEditorVerification();
    renderEditorGrid();
  } else if (editorSelectedTool === 'player') {
    if (currentTile === 'W' || currentTile === ' ') {
      window.isMouseDown = false;
      alert("바닥 타일을 먼저 설치해야 합니다!");
      return;
    }
    editorEntities = editorEntities.filter(e => e.type !== 'player');
    editorEntities = editorEntities.filter(e => !(e.x === x && e.y === y));
    editorEntities.push({ type: 'player', x, y });
    invalidateEditorVerification();
    renderEditorGrid();
  } else if (editorSelectedTool === 'box') {
    if (currentTile === 'W' || currentTile === ' ') {
      window.isMouseDown = false;
      alert("바닥 타일을 먼저 설치해야 합니다!");
      return;
    }
    editorEntities = editorEntities.filter(e => !(e.x === x && e.y === y));
    editorEntities.push({ type: 'box', x, y });
    invalidateEditorVerification();
    renderEditorGrid();
  }
}

function invalidateEditorVerification() {
  editorVerified = false;
  const maxApInput = document.getElementById('editorMapMaxApInput');
  if (maxApInput) {
    maxApInput.value = "최적 클리어로 갱신";
  }
  const publishBtn = document.getElementById('btnEditorPublish');
  if (publishBtn) {
    publishBtn.disabled = true;
  }
}

window.addEventListener('mouseup', () => {
  window.isMouseDown = false;
});

function startEditorTestPlay() {
  let goalCount = 0;
  for (let y = 0; y < editorGridHeight; y++) {
    for (let x = 0; x < editorGridWidth; x++) {
      if (editorGrid[y][x] === 'G') goalCount++;
    }
  }

  const playerCount = editorEntities.filter(e => e.type === 'player').length;
  const boxCount = editorEntities.filter(e => e.type === 'box').length;

  if (playerCount !== 1) {
    alert("플레이어(🤖)가 반드시 1개 있어야 합니다!");
    return;
  }
  if (goalCount === 0) {
    alert("목표 지점(🌟)이 최소 1개 있어야 합니다!");
    return;
  }
  if (boxCount === 0) {
    alert("상자(📦)가 최소 1개 있어야 합니다!");
    return;
  }

  // Validate that all portals (P) are connected
  let portalCoords = [];
  for (let y = 0; y < editorGridHeight; y++) {
    for (let x = 0; x < editorGridWidth; x++) {
      if (editorGrid[y][x] === 'P') {
        portalCoords.push({ x, y });
      }
    }
  }
  for (const portal of portalCoords) {
    const isLinked = editorPortalConnections.some(c => 
      (c.p1.x === portal.x && c.p1.y === portal.y) || (c.p2.x === portal.x && c.p2.y === portal.y)
    );
    if (!isLinked) {
      alert(`연결되지 않은 포탈(P)이 있습니다! (${portal.x}, ${portal.y}) 위치의 포탈을 다른 포탈과 연결해 주세요.`);
      return;
    }
  }

  editorMapName = document.getElementById('editorMapNameInput').value.trim() || "새로운 퍼즐";
  if (!editorVerified) {
    editorMaxAP = 99;
  } else {
    editorMaxAP = parseInt(document.getElementById('editorMapMaxApInput').value, 10) || 99;
  }

  const customMapData = {
    name: editorMapName,
    width: editorGridWidth,
    height: editorGridHeight,
    maxAP: editorMaxAP,
    grid: editorGrid.map(row => [...row]),
    entities: editorEntities.map(e => ({ ...e })),
    connections: editorConnections.map(c => ({
      switch: { ...c.switch },
      door: { ...c.door }
    }))
  };

  window.customMapMode = 'editor';
  isEditorTesting = true;
  isEditorMode = false;
  
  document.getElementById('appContainer').classList.add('testing-mode');
  document.getElementById('mapEditorOverlay').classList.add('hidden');
  document.getElementById('appContainer').classList.remove('hidden');

  document.getElementById('levelSelect').innerHTML = `<option value="-1">🛠️ 테스트 맵</option>`;
  document.getElementById('levelSelect').value = "-1";
  document.getElementById('levelSelect').disabled = true;

  const keyHint = document.getElementById('testModeKeyHint');
  if (keyHint) keyHint.style.display = 'inline-flex';

  const playBackBtn = document.getElementById('btnPlayBackToMenu');
  if (playBackBtn) {
    playBackBtn.innerHTML = '<span class="icon">🛠️</span> <span class="text">에디터로 돌아가기</span>';
    playBackBtn.setAttribute('data-tooltip', '에디터 화면으로 돌아가기');
  }

  sound.init();
  loadLevel(null, customMapData);
  canvas.focus();
}

function saveEditorDraftSilent() {
  const username = localStorage.getItem('runic_dungeon_user') || '모험가';
  let drafts = loadLocalDrafts(username);
  
  editorMapName = document.getElementById('editorMapNameInput').value.trim() || "새로운 퍼즐";
  const parsedMaxAp = parseInt(document.getElementById('editorMapMaxApInput').value, 10);
  editorMaxAP = isNaN(parsedMaxAp) ? (editorMaxAP || 50) : parsedMaxAp;

  const idx = drafts.findIndex(m => m.id === currentEditingMapId);
  if (idx !== -1) {
    drafts[idx].name = editorMapName;
    drafts[idx].width = editorGridWidth;
    drafts[idx].height = editorGridHeight;
    drafts[idx].maxAP = editorMaxAP;
    drafts[idx].grid = editorGrid.map(row => [...row]);
    drafts[idx].entities = editorEntities.map(e => ({ ...e }));
    drafts[idx].connections = editorConnections.map(c => ({
      switch: { ...c.switch },
      door: { ...c.door }
    }));
    drafts[idx].portalConnections = editorPortalConnections.map(c => ({
      p1: { ...c.p1 },
      p2: { ...c.p2 }
    }));
    drafts[idx].published = drafts[idx].published || false;
    drafts[idx].verified = editorVerified;
    drafts[idx].optimalAP = editorOptimalAP;
    drafts[idx].optimalMoves = editorOptimalMoves;
    drafts[idx].optimalPath = editorOptimalPath;
  }

  saveLocalDrafts(username, drafts);
}

function saveEditorDraft() {
  saveEditorDraftSilent();
  alert("임시 저장되었습니다.\n\n⚠️ 주의: 브라우저 인터넷 사용 기록(쿠키 및 사이트 데이터)을 삭제하면 임시 저장된 맵이 모두 사라질 수 있습니다. 안전하게 보존하시려면 꼭 '배포하기'를 완료해 주세요.");
}

async function publishEditorMap() {
  if (!editorVerified) {
    alert("먼저 테스트 플레이로 맵을 깨야 배포할 수 있습니다!");
    return;
  }

  const username = localStorage.getItem('runic_dungeon_user') || '모험가';
  
  editorMapName = document.getElementById('editorMapNameInput').value.trim() || "새로운 퍼즐";
  const parsedMaxAp = parseInt(document.getElementById('editorMapMaxApInput').value, 10);
  editorMaxAP = isNaN(parsedMaxAp) ? (editorMaxAP || 50) : parsedMaxAp;

  const publishData = {
    id: currentEditingMapId,
    name: editorMapName,
    creator: username,
    width: editorGridWidth,
    height: editorGridHeight,
    maxAP: editorMaxAP,
    optimalAP: editorOptimalAP,
    optimalMoves: editorOptimalMoves,
    optimalPath: editorOptimalPath,
    published: true,
    grid: editorGrid.map(row => [...row]),
    entities: editorEntities.map(e => ({ ...e })),
    connections: editorConnections.map(c => ({
      switch: { ...c.switch },
      door: { ...c.door }
    })),
    portalConnections: editorPortalConnections.map(c => ({
      p1: { ...c.p1 },
      p2: { ...c.p2 }
    }))
  };

  const publishBtn = document.getElementById('btnEditorPublish');
  publishBtn.disabled = true;
  publishBtn.textContent = "🚀 배포 중...";

  try {
    const dbData = await fetchCloudData();
    let customMaps = dbData["custom_maps"] || {};
    customMaps[currentEditingMapId] = publishData;
    dbData["custom_maps"] = customMaps;
    await saveCloudData(dbData);

    let drafts = loadLocalDrafts(username);
    const idx = drafts.findIndex(m => m.id === currentEditingMapId);
    if (idx !== -1) {
      drafts[idx].published = true;
      drafts[idx].verified = true;
      drafts[idx].optimalAP = editorOptimalAP;
      drafts[idx].optimalMoves = editorOptimalMoves;
      drafts[idx].optimalPath = editorOptimalPath;
      drafts[idx].name = editorMapName;
      drafts[idx].width = editorGridWidth;
      drafts[idx].height = editorGridHeight;
      drafts[idx].maxAP = editorMaxAP;
      drafts[idx].grid = editorGrid.map(row => [...row]);
      drafts[idx].entities = editorEntities.map(e => ({ ...e }));
      drafts[idx].connections = editorConnections.map(c => ({
        switch: { ...c.switch },
        door: { ...c.door }
      }));
      drafts[idx].portalConnections = editorPortalConnections.map(c => ({
        p1: { ...c.p1 },
        p2: { ...c.p2 }
      }));
    }
    saveLocalDrafts(username, drafts);

    alert("배포 완료되었습니다! 이제 모든 모험가가 이 맵을 즐길 수 있습니다.");
    
    isEditorMode = false;
    document.getElementById('mapEditorOverlay').classList.add('hidden');
    document.getElementById('customMapListOverlay').classList.remove('hidden');
    renderCustomMapList();
  } catch (e) {
    console.error("Publish error:", e);
    alert("배포하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  } finally {
    publishBtn.textContent = "🚀 배포하기";
    publishBtn.disabled = !editorVerified;
  }
}

function exitTestPlayAndReturnToEditor() {
  document.getElementById('screenOverlay').classList.add('hidden');
  document.getElementById('appContainer').classList.remove('testing-mode');
  document.getElementById('appContainer').classList.add('hidden');
  window.customMapMode = null;
  isEditorTesting = false;

  const keyHint = document.getElementById('testModeKeyHint');
  if (keyHint) keyHint.style.display = 'none';

  document.getElementById('mapEditorOverlay').classList.remove('hidden');
  
  isEditorMode = true;
  renderEditorGrid();

  const playBackBtn = document.getElementById('btnPlayBackToMenu');
  if (playBackBtn) {
    playBackBtn.innerHTML = '<span class="icon">↩️</span> <span class="text">메뉴로 돌아가기</span>';
    playBackBtn.setAttribute('data-tooltip', '이전 메뉴로 돌아가기');
  }
}

function exitCustomPlayAndReturnToList() {
  document.getElementById('screenOverlay').classList.add('hidden');
  document.getElementById('appContainer').classList.remove('custom-play-mode');
  document.getElementById('appContainer').classList.add('hidden');
  window.customMapMode = null;
  currentPlayingCustomMap = null;

  document.getElementById('friendMapsOverlay').classList.remove('hidden');
  document.getElementById('customMapMenuOverlay').classList.add('hidden');

  const playBackBtn = document.getElementById('btnPlayBackToMenu');
  if (playBackBtn) {
    playBackBtn.innerHTML = '<span class="icon">↩️</span> <span class="text">메뉴로 돌아가기</span>';
    playBackBtn.setAttribute('data-tooltip', '이전 메뉴로 돌아가기');
  }
}

async function openFriendMapsList() {
  document.getElementById('customMapMenuOverlay').classList.add('hidden');
  document.getElementById('friendMapsOverlay').classList.remove('hidden');
  await renderFriendMapsList();
}

async function renderFriendMapsList() {
  const grid = document.getElementById('friendMapsGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 0.95rem; font-family: var(--font-body);">데이터를 불러오는 중... (Syncing Cloud)</div>';

  try {
    const dbData = await fetchCloudData();
    const customMapsObj = dbData["custom_maps"] || {};
    const customMaps = Object.values(customMapsObj).filter(m => m.published);

    grid.innerHTML = '';
    if (customMaps.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 0.95rem; font-family: var(--font-body);">배포된 맵이 없습니다. 첫 번째로 맵을 배포해 보세요!</div>';
      return;
    }

    customMaps.sort((a, b) => b.id.localeCompare(a.id));

    customMaps.forEach((map) => {
      const card = document.createElement('div');
      card.className = 'stage-card';

      const numDiv = document.createElement('div');
      numDiv.className = 'stage-num';
      numDiv.style.fontSize = '1.05rem';
      numDiv.style.wordBreak = 'break-all';
      numDiv.style.whiteSpace = 'normal';
      numDiv.style.textAlign = 'center';
      numDiv.style.lineHeight = '1.2';
      numDiv.style.margin = '4px 0';
      numDiv.textContent = map.creator;

      const nameDiv = document.createElement('div');
      nameDiv.className = 'stage-name';
      nameDiv.textContent = map.name;

      const sizeDiv = document.createElement('div');
      sizeDiv.className = 'stage-stars';
      sizeDiv.style.fontSize = '0.85rem';
      sizeDiv.style.color = 'var(--color-primary)';
      sizeDiv.textContent = `📏 ${getActiveMapSizeString(map)}`;

      const apDiv = document.createElement('div');
      apDiv.className = 'stage-retries';
      apDiv.style.fontSize = '0.7rem';
      apDiv.style.color = 'rgba(255, 255, 255, 0.7)';
      apDiv.style.marginTop = '4px';
      apDiv.style.fontFamily = 'var(--font-body)';
      apDiv.innerHTML = `<span style="color: #ff9100; font-weight: bold;">최적:</span> ${map.optimalAP} AP (${map.optimalMoves} Move)`;

      const actionsDiv = document.createElement('div');
      actionsDiv.style.display = 'flex';
      actionsDiv.style.gap = '8px';
      actionsDiv.style.marginTop = '10px';
      actionsDiv.style.width = '100%';
      actionsDiv.style.justifyContent = 'center';
      actionsDiv.style.zIndex = '10';

      const btnRank = document.createElement('button');
      btnRank.className = 'btn btn-primary';
      btnRank.style.flex = '1';
      btnRank.style.padding = '6px 0';
      btnRank.style.fontSize = '0.75rem';
      btnRank.style.margin = '0';
      btnRank.style.backgroundColor = '#00e5ff';
      btnRank.style.color = '#000';
      btnRank.style.fontWeight = 'bold';
      btnRank.textContent = '🏆 랭킹';
      btnRank.addEventListener('click', (e) => {
        e.stopPropagation();
        showCustomMapLeaderboard(map.id, map.name);
      });

      actionsDiv.appendChild(btnRank);

      card.appendChild(numDiv);
      card.appendChild(nameDiv);
      card.appendChild(sizeDiv);
      card.appendChild(apDiv);
      card.appendChild(actionsDiv);

      card.addEventListener('click', () => {
        sound.init();
        startFriendMapPlay(map);
      });

      grid.appendChild(card);
    });
  } catch (e) {
    console.error("Fetch custom maps error:", e);
    grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; color: var(--color-danger); font-size: 0.95rem; font-family: var(--font-body);">데이터를 불러오는 중 오류가 발생했습니다.</div>';
  }
}

function startFriendMapPlay(map) {
  currentPlayingCustomMap = map;
  window.customMapMode = 'play';
  
  document.getElementById('friendMapsOverlay').classList.add('hidden');
  document.getElementById('customMapMenuOverlay').classList.add('hidden');
  document.getElementById('appContainer').classList.add('custom-play-mode');
  document.getElementById('appContainer').classList.remove('hidden');

  document.getElementById('levelSelect').innerHTML = `<option value="-2">👥 ${map.creator}의 맵: ${map.name}</option>`;
  document.getElementById('levelSelect').value = "-2";
  document.getElementById('levelSelect').disabled = true;

  const playBackBtn = document.getElementById('btnPlayBackToMenu');
  if (playBackBtn) {
    playBackBtn.innerHTML = '<span class="icon">👥</span> <span class="text">목록으로 돌아가기</span>';
    playBackBtn.setAttribute('data-tooltip', '친구 맵 목록으로 돌아가기');
  }

  const mapData = {
    name: map.name,
    width: map.width,
    height: map.height,
    maxAP: map.maxAP,
    grid: map.grid.map(row => [...row]),
    entities: map.entities.map(e => ({ ...e })),
    connections: map.connections ? map.connections.map(c => ({
      switch: { ...c.switch },
      door: { ...c.door }
    })) : []
  };

  sound.init();
  loadLevel(null, mapData);
  canvas.focus();
}

function showChapterSelectMenu() {
  document.getElementById('modeSelectOverlay').classList.add('hidden');
  document.getElementById('stageSelectOverlay').classList.add('hidden');
  document.getElementById('appContainer').classList.add('hidden');
  document.getElementById('chapterSelectOverlay').classList.remove('hidden');
}


// Global script load initializer
window.onload = initGame;

async function showAdminUserSelectMenu() {
  document.getElementById('modeSelectOverlay').classList.add('hidden');
  document.getElementById('adminUserSelectOverlay').classList.remove('hidden');
  
  const grid = document.getElementById('adminUserSelectGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted); font-family: var(--font-body);">모험가 목록을 불러오는 중...</div>';
  
  try {
    const dbData = await fetchCloudData();
    const users = Object.keys(USER_PASSWORDS);
    
    grid.innerHTML = '';
    users.forEach(u => {
      const card = document.createElement('div');
      card.className = 'chapter-card';
      card.style.cursor = 'pointer';
      
      const iconDiv = document.createElement('div');
      iconDiv.className = 'chapter-num';
      iconDiv.style.fontSize = '2.5rem';
      iconDiv.innerHTML = getUserIcon(u);
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'chapter-name';
      nameDiv.style.marginTop = '10px';
      nameDiv.textContent = u;
      
      const userRecords = dbData[u] || {};
      const clearedCount = Object.keys(userRecords).filter(k => !k.startsWith('map_')).length;
      
      const descDiv = document.createElement('div');
      descDiv.className = 'chapter-desc';
      descDiv.textContent = `클리어한 스테이지: ${clearedCount}개`;
      
      card.appendChild(iconDiv);
      card.appendChild(nameDiv);
      card.appendChild(descDiv);
      
      card.addEventListener('click', () => {
        showAdminUserStageMenu(u, dbData[u] || {});
      });
      
      grid.appendChild(card);
    });
  } catch (e) {
    console.error("Failed to load admin user list:", e);
    grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--color-danger); font-family: var(--font-body);">목록을 불러오는 중 오류가 발생했습니다.</div>';
  }
}

async function showAdminUserStageMenu(targetUser, userRecords) {
  document.getElementById('adminUserSelectOverlay').classList.add('hidden');
  document.getElementById('adminUserStageOverlay').classList.remove('hidden');
  
  const titleEl = document.getElementById('adminUserStageTitle');
  if (titleEl) {
    titleEl.textContent = `🕵️ ${targetUser} 모험가 기록`;
  }
  
  const tbody = document.getElementById('adminUserStageTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  
  DEFAULT_LEVELS.forEach((lvl, idx) => {
    const ch = lvl.chapter !== undefined ? lvl.chapter : 0;
    const firstIdxOfChapter = DEFAULT_LEVELS.findIndex(l => (l.chapter !== undefined ? l.chapter : 0) === ch);
    const lvlNumInChapter = idx - firstIdxOfChapter + 1;
    const displayStr = ch === 0 ? `0-${lvlNumInChapter}` : `${ch}-${lvlNumInChapter}`;
    
    const record = userRecords[idx];
    
    
    const row = document.createElement('tr');
    if (record) {
      const starsText = '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars);
      const timeText = formatTime(record.clearTime);
      const retryCount = record.retries || 1;
      
      row.innerHTML = `
        <td style="font-family: var(--font-body); font-weight: 500; font-size: 0.72rem; line-height: 1.2;">
          <span style="color: var(--color-primary); font-weight: bold; display: block;">${displayStr}</span>
          <span style="font-size: 0.65rem; color: #8892b0; display: block; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${lvl.name}</span>
        </td>
        <td style="color: #ffea00; font-weight: bold; font-family: var(--font-body); font-size: 0.7rem; letter-spacing: -1px;">${starsText}</td>
        <td style="font-family: var(--font-body); font-size: 0.7rem;">${retryCount}회</td>
        <td style="font-family: var(--font-body); font-size: 0.7rem;">${timeText}</td>
        <td style="font-family: var(--font-body);">
          <button onclick="window.startReplay('${targetUser}', ${idx}, '${record.path}')" class="btn btn-primary" style="padding: 4px 6px; font-size: 0.68rem; margin: 0; white-space: nowrap;">▶재생</button>
        </td>
        <td style="font-family: var(--font-body); white-space: nowrap;">
          <button onclick="window.resetStageStarsOnlyAndRefreshTable('${targetUser}', ${idx})" style="padding: 3px 5px; font-size: 0.65rem; background: rgba(255,160,0,0.15); border: 1px solid rgba(255,160,0,0.4); cursor: pointer; border-radius: 4px; color: #ffa000; font-weight: bold; margin-right: 2px;" title="별 획득만 0으로 초기화">⭐별</button>
          <button onclick="window.deleteStageRecordAndRefreshTable('${targetUser}', ${idx})" style="padding: 3px 5px; font-size: 0.65rem; background: rgba(255,23,68,0.15); border: 1px solid rgba(255,23,68,0.4); cursor: pointer; border-radius: 4px; color: #ff1744; font-weight: bold;" title="전체 삭제">🗑️</button>
        </td>
      `;
    } else {
      row.innerHTML = `
        <td style="font-family: var(--font-body); font-weight: 500; font-size: 0.72rem; line-height: 1.2;">
          <span style="color: #ff9100; font-weight: bold; display: block;">${displayStr}</span>
          <span style="font-size: 0.65rem; color: #8892b0; display: block; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${lvl.name}</span>
        </td>
        <td style="color: var(--text-muted); font-family: var(--font-body); font-size: 0.7rem;">-</td>
        <td style="font-family: var(--font-body); font-size: 0.7rem; color: #8892b0;">시도 중</td>
        <td style="color: var(--text-muted); font-family: var(--font-body); font-size: 0.7rem;">-</td>
        <td style="font-family: var(--font-body);">-</td>
        <td style="font-family: var(--font-body);">-</td>
      `;
    }
    
    tbody.appendChild(row);
  });
}

// Wrapper: hard reset a stage and refresh the table view
window.deleteStageRecordAndRefreshTable = async function(username, stageIdx) {
  if (!confirm(`${username} 모험가의 ${getLevelDisplayNumber(stageIdx)} 기록을 완전히 삭제하시겠습니까?\n(시간, 시도 횟수, 별 획득 모두 초기화)`)) return;
  try {
    const res = await fetch(`${CORS_PROXY_URL}?url=${encodeURIComponent(`https://jsonhosting.com/api/json/${DB_OBJECT_ID}/raw?t=${Date.now()}`)}`);
    let dbData = {};
    if (res.ok) { const obj = await res.json(); dbData = obj.data || {}; }
    else { alert('기록을 불러오는 데 실패했습니다.'); return; }
    if (dbData[username] && dbData[username][stageIdx]) {
      delete dbData[username][stageIdx];
    }
    const putRes = await fetch(`${CORS_PROXY_URL}?url=${encodeURIComponent(`https://jsonhosting.com/api/json/${DB_OBJECT_ID}`)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Edit-Key': DB_EDIT_KEY },
      body: JSON.stringify({ name: 'RunicDungeonLeaderboard', data: dbData })
    });
    if (putRes.ok) {
      alert(`${getLevelDisplayNumber(stageIdx)} 기록이 삭제되었습니다.`);
      const currentUser = localStorage.getItem('runic_dungeon_user') || '';
      if (username === currentUser) {
        localStorage.removeItem(`runic_dungeon_best_record_${stageIdx}`);
        localStorage.removeItem(`runic_dungeon_retry_count_${username}_${stageIdx}`);
        localStorage.removeItem(`runic_dungeon_play_time_${username}_${stageIdx}`);
        updateRecordHUD();
      }
      showAdminUserStageMenu(username, dbData[username] || {});
    } else { alert('삭제 중 오류가 발생했습니다.'); }
  } catch(e) { console.error(e); alert('서버 통신 오류'); }
};

// Wrapper: reset only stars and refresh the table view
window.resetStageStarsOnlyAndRefreshTable = async function(username, stageIdx) {
  if (!confirm(`${username} 모험가의 ${getLevelDisplayNumber(stageIdx)} 별 획득만 0으로 초기화하시겠습니까?\n(시간과 시도 횟수는 유지)`)) return;
  try {
    const res = await fetch(`${CORS_PROXY_URL}?url=${encodeURIComponent(`https://jsonhosting.com/api/json/${DB_OBJECT_ID}/raw?t=${Date.now()}`)}`);
    let dbData = {};
    if (res.ok) { const obj = await res.json(); dbData = obj.data || {}; }
    else { alert('기록을 불러오는 데 실패했습니다.'); return; }
    if (dbData[username] && dbData[username][stageIdx]) {
      dbData[username][stageIdx].stars = 0;
    } else { alert('해당 기록을 찾을 수 없습니다.'); return; }
    const putRes = await fetch(`${CORS_PROXY_URL}?url=${encodeURIComponent(`https://jsonhosting.com/api/json/${DB_OBJECT_ID}`)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Edit-Key': DB_EDIT_KEY },
      body: JSON.stringify({ name: 'RunicDungeonLeaderboard', data: dbData })
    });
    if (putRes.ok) {
      alert(`${getLevelDisplayNumber(stageIdx)} 별 획득이 초기화되었습니다.\n(시간/시도 횟수는 유지됩니다)`);
      // Remove local cache so HUD AP also disappears for current user
      const currentUser = localStorage.getItem('runic_dungeon_user') || '';
      if (username === currentUser) {
        localStorage.removeItem(`runic_dungeon_best_record_${stageIdx}`);
        updateRecordHUD();
      }
      showAdminUserStageMenu(username, dbData[username] || {});
    } else { alert('별 초기화 중 오류가 발생했습니다.'); }
  } catch(e) { console.error(e); alert('서버 통신 오류'); }
};

async function showUpdateHistoryModal() {
  const modal = document.getElementById('updateHistoryModal');
  const body = document.getElementById('updateHistoryModalBody');
  if (!modal || !body) return;

  modal.classList.remove('hidden');
  body.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">업데이트 기록을 불러오는 중...</div>';

  try {
    const response = await fetch('update.txt?t=' + Date.now());
    if (!response.ok) throw new Error('파일을 불러올 수 없습니다.');
    const text = await response.text();
    
    // Parse update.txt by day
    // Example layout in update.txt:
    // 2026년 6월 4일
    // 내용...
    //
    // 2026년 6월 5일
    // 내용...
    
    const rawLines = text.split('\n');
    const logs = [];
    let currentLog = null;

    rawLines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Check if line starts with date (e.g. 2026년 6월 4일)
      const dateRegex = /^\d{4}년\s+\d{1,2}월\s+\d{1,2}일$/;
      if (dateRegex.test(trimmed)) {
        if (currentLog) {
          logs.push(currentLog);
        }
        currentLog = {
          date: trimmed,
          changes: []
        };
      } else {
        if (currentLog) {
          currentLog.changes.push(trimmed);
        } else {
          // If no date header yet, create a default one
          currentLog = {
            date: '이전 기록',
            changes: [trimmed]
          };
        }
      }
    });

    if (currentLog) {
      logs.push(currentLog);
    }

    // Sort logs (latest date first)
    logs.reverse();

    if (logs.length === 0) {
      body.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">기록이 비어 있습니다.</div>';
      return;
    }

    let html = '<div class="guide-grid">';
    logs.forEach(log => {
      html += `
        <div class="guide-card" style="flex-direction: column; gap: 8px; width: 100%; border: 1px solid rgba(0, 176, 255, 0.15); box-shadow: 0 0 10px rgba(0, 176, 255, 0.05);">
          <div style="font-family: var(--font-title); font-size: 1.05rem; font-weight: bold; color: var(--color-primary); display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); width: 100%; padding-bottom: 6px;">
            <span>📅</span> ${log.date}
          </div>
          <ul style="margin: 0; padding-left: 20px; list-style-type: square; width: 100%; display: flex; flex-direction: column; gap: 4px;">
      `;
      log.changes.forEach(change => {
        html += `<li style="font-size: 0.82rem; color: var(--text-main); line-height: 1.45; text-align: left;">${change}</li>`;
      });
      html += `
          </ul>
        </div>
      `;
    });
    html += '</div>';

    body.innerHTML = html;
  } catch (e) {
    console.error("Failed to load updates:", e);
    body.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--color-danger);">기록을 불러오는 중 오류가 발생했습니다.</div>';
  }
}
