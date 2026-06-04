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
    this.muted = true;
    this.bgmPlaying = false;
    this.notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C4 to C5
    this.melody = [0, 2, 4, 5, 4, 2, 0, 4, 7, 6, 4, 5, 7, 4, 2, 0];
    this.melodyIdx = 0;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
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
      
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
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
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
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
      this.playTone(freq / 2, 'triangle', 0.2, 0.04);
      
      // Play arpeggiated lead on every fourth note
      if (this.melodyIdx % 4 === 0) {
        this.playTone(freq, 'sine', 0.4, 0.02);
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
let activeStickySwitches = new Set(); // Coordinates "x,y" of sticky switches pressed

// Entities
let player = { x: 0, y: 0, animX: 0, animY: 0, dir: 'down' };
let boxes = []; // [{id, x, y, animX, animY, active}]

// Undo/Redo Stacks
let historyStack = [];
let redoStack = [];

// Animation States
let isAnimating = false;
let animationQueue = []; // [{type: 'player'/'box'/'spike'/'crumble', fromX, fromY, toX, toY, progress, duration, eventData}]
let activeSpikesAnim = {}; // "x,y" -> float timer for spike popup
let shakeDuration = 0;
let shakeIntensity = 0;

// Tile Palette mapping for drawing
const TILE_SIZE_MAX = 128;
let tileSize = 48;
let offsetX = 0;
let offsetY = 0;

// Editor Mode status
let isEditorMode = false;
let spikesUp = false; // Spikes stateful state (toggles on player moves)

// --------------------------------------------------------------------------
// Initialization & Level Loading
// --------------------------------------------------------------------------

function initGame() {
  // Populate levels selector
  const select = document.getElementById('levelSelect');
  select.innerHTML = '';
  DEFAULT_LEVELS.forEach((lvl, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = lvl.name;
    select.appendChild(opt);
  });

  select.addEventListener('change', (e) => {
    sound.init();
    loadLevel(parseInt(e.target.value));
    canvas.focus();
  });

  // Controls UI binding
  document.getElementById('btnSoundToggle').addEventListener('click', () => {
    const muted = sound.toggle();
    document.getElementById('btnSoundToggle').innerHTML = `<span class="icon">${muted ? '🔇' : '🔊'}</span>`;
  });

  document.getElementById('btnHelpToggle').addEventListener('click', () => {
    document.getElementById('helpModal').classList.remove('hidden');
  });

  document.getElementById('btnHelpClose').addEventListener('click', () => {
    document.getElementById('helpModal').classList.add('hidden');
  });

  document.getElementById('btnHelpConfirm').addEventListener('click', () => {
    document.getElementById('helpModal').classList.add('hidden');
    sound.init();
  });

  document.getElementById('btnUndo').addEventListener('click', () => { undo(); canvas.focus(); });
  document.getElementById('btnRedo').addEventListener('click', () => { redo(); canvas.focus(); });
  document.getElementById('btnRestart').addEventListener('click', () => { restartLevel(); canvas.focus(); });

  document.getElementById('btnOverlayNext').addEventListener('click', () => {
    if (gameStatus === 'victory') {
      const nextIdx = currentLevelIdx + 1;
      if (nextIdx < DEFAULT_LEVELS.length) {
        document.getElementById('levelSelect').value = nextIdx;
        loadLevel(nextIdx);
      } else {
        alert("모든 기본 레벨을 완주하셨습니다! 축하합니다!");
        document.getElementById('screenOverlay').classList.add('hidden');
      }
    } else {
      restartLevel();
    }
  });

  document.getElementById('btnOverlayRestart').addEventListener('click', () => {
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
  document.getElementById('btnLeaderboardConfirm').addEventListener('click', () => {
    document.getElementById('leaderboardModal').classList.add('hidden');
  });
  document.getElementById('btnLeaderboardRefresh').addEventListener('click', () => {
    showLeaderboardModal();
  });

  // Bind Logout Listener
  document.getElementById('btnLogout').addEventListener('click', () => {
    logout();
  });

  // Load first level
  loadLevel(0);

  // Start Animation Loop
  requestAnimationFrame(gameLoop);

  // Check initial login state
  checkLoginState();
}

function loadLevel(index, customLevelData = null) {
  historyStack = [];
  redoStack = [];
  animationQueue = [];
  activeSpikesAnim = {};
  isAnimating = false;
  activeStickySwitches.clear();
  gameStatus = 'playing';
  document.getElementById('screenOverlay').classList.add('hidden');
  document.getElementById('btnOverlayRestart').classList.add('hidden');

  let lvl = customLevelData;
  if (!lvl) {
    currentLevelIdx = index;
    lvl = DEFAULT_LEVELS[index];
    document.getElementById('levelSelect').value = index;
  }

  levelName = lvl.name;
  levelDesc = lvl.description || "";
  levelWidth = lvl.width;
  levelHeight = lvl.height;
  maxAP = lvl.maxAP;
  remainingAP = lvl.maxAP;
  moveCount = 0;
  spikesUp = false; // Reset spikes to retracted at start of level

  // Clone 2D grid
  boardGrid = lvl.grid.map(row => [...row]);

  // Clone connections
  connections = lvl.connections ? lvl.connections.map(c => ({
    switch: { x: c.switch.x, y: c.switch.y },
    door: { x: c.door.x, y: c.door.y }
  })) : [];

  // Parse entities
  boxes = [];
  let boxId = 0;
  lvl.entities.forEach(ent => {
    if (ent.type === 'player') {
      player.x = ent.x;
      player.y = ent.y;
      player.animX = ent.x;
      player.animY = ent.y;
      player.dir = 'down';
    } else if (ent.type === 'box') {
      boxes.push({
        id: boxId++,
        x: ent.x,
        y: ent.y,
        animX: ent.x,
        animY: ent.y,
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
  const containerH = container.clientHeight || 480;
  
  // Calculate tile size to fit grid comfortably
  const scaleX = containerW / levelWidth;
  const scaleY = containerH / levelHeight;
  tileSize = Math.min(scaleX, scaleY, TILE_SIZE_MAX);
  
  // Ensure size is integer
  tileSize = Math.floor(tileSize);

  canvas.width = levelWidth * tileSize;
  canvas.height = levelHeight * tileSize;
  
  offsetX = (canvas.width - levelWidth * tileSize) / 2;
  offsetY = (canvas.height - levelHeight * tileSize) / 2;
}

function updateHUD() {
  document.getElementById('levelName').textContent = levelName;
  document.getElementById('levelDesc').textContent = levelDesc;
  document.getElementById('apText').textContent = `${remainingAP} / ${maxAP}`;
  document.getElementById('moveCount').textContent = moveCount;

  const fill = document.getElementById('apProgressFill');
  const pct = Math.max(0, Math.min(100, (remainingAP / maxAP) * 100));
  fill.style.width = `${pct}%`;

  if (pct < 30) {
    fill.classList.add('danger');
  } else {
    fill.classList.remove('danger');
  }

  // Update Star Rating HUD
  const lvl = DEFAULT_LEVELS[currentLevelIdx];
  if (lvl) {
    const spentAP = maxAP - remainingAP;
    const optimalAP = lvl.optimalAP || 0;
    const threeStarLimit = optimalAP;
    const twoStarLimit = Math.floor(optimalAP * 1.3);

    let stars = 1;
    let statusText = "별 1개 확정";

    if (spentAP <= threeStarLimit) {
      stars = 3;
      statusText = `별 3개까지 남은 행동력: ${threeStarLimit - spentAP} AP`;
    } else if (spentAP <= twoStarLimit) {
      stars = 2;
      statusText = `별 2개까지 남은 행동력: ${twoStarLimit - spentAP} AP`;
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

function attemptMove(dx, dy) {
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

  // Helper check for box existence at (x,y)
  function getBoxAt(x, y) {
    return simBoxes.find(b => b.active && b.x === x && b.y === y);
  }

  // Helper check for walls / closed doors
  function isBlocked(x, y) {
    if (x < 0 || x >= levelWidth || y < 0 || y >= levelHeight) return true;
    const tile = simGrid[y][x];
    if (tile === 'W') return true;
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

    // Check bounds & blocks behind box
    if (isBlocked(boxTargetX, boxTargetY) || getBoxAt(boxTargetX, boxTargetY)) {
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
    
    if (simGrid[nextPY][nextPX] === 'T' && simSpikesUp) {
      curAP -= 5;
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

          // Slide obstacle check
          if (isBlocked(nextBX, nextBY) || getBoxAt(nextBX, nextBY)) break;

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

        if (simGrid[py][px] === 'H') {
          playerSteps.push({ x: px, y: py, action: 'fall' });
          curAP = 0;
          soundsToPlay.push({ delay: 250, type: 'fail' });
          break;
        }

        if (simGrid[py][px] === 'T' && simSpikesUp) {
          curAP -= 5;
          playerSteps.push({ x: px, y: py, action: 'spike' });
          soundsToPlay.push({ delay: 200, type: 'spike' });
        } else {
          playerSteps.push({ x: px, y: py, action: 'slide' });
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

    if (simGrid[py][px] === 'H') {
      playerSteps.push({ x: px, y: py, action: 'fall' });
      curAP = 0;
      soundsToPlay.push({ delay: 100, type: 'fail' });
    } else if (simGrid[py][px] === 'I') {
      if (simGrid[py][px] === 'T' && simSpikesUp) {
        curAP -= 5;
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

        if (simGrid[py][px] === 'H') {
          playerSteps.push({ x: px, y: py, action: 'fall' });
          curAP = 0;
          soundsToPlay.push({ delay: 250, type: 'fail' });
          break;
        }

        if (simGrid[py][px] === 'T' && simSpikesUp) {
          curAP -= 5;
          playerSteps.push({ x: px, y: py, action: 'spike' });
          soundsToPlay.push({ delay: 200, type: 'spike' });
        } else {
          playerSteps.push({ x: px, y: py, action: 'slide' });
        }

        if (simGrid[py][px] !== 'I') break;
      }
    } else if (simGrid[py][px] === 'T' && simSpikesUp) {
      curAP -= 5;
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
  if (conns.length === 0) return true; // Unlinked door is open by default

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
  if (conns.length === 0) return true;

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
  const CELL_SLIDE_DUR = 5;

  // 1. Setup Player animations chain
  let playerTime = 0;
  for (let i = 1; i < sim.playerSteps.length; i++) {
    const from = sim.playerSteps[i - 1];
    const to = sim.playerSteps[i];
    const isSlide = to.action === 'slide' || to.action === 'spike';
    const dur = isSlide ? CELL_SLIDE_DUR : CELL_WALK_DUR;

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
  }
}

function showOverlay(title, desc, failed) {
  const overlay = document.getElementById('screenOverlay');
  const titleEl = document.getElementById('overlayTitle');
  const descEl = document.getElementById('overlayDesc');
  const btnNext = document.getElementById('btnOverlayNext');
  const btnRestart = document.getElementById('btnOverlayRestart');
  const starsEl = document.getElementById('overlayStarsDisplay');

  titleEl.textContent = title;
  overlay.classList.remove('hidden');

  if (failed) {
    overlay.classList.add('failure');
    btnNext.textContent = "다시 시도 (R)";
    btnRestart.classList.add('hidden'); // We repurpose main button
    if (starsEl) starsEl.innerHTML = '';
    descEl.textContent = desc;
  } else {
    overlay.classList.remove('failure');
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
        tableHtml += `<tr><td>${idx+1}층: ${lvl.name.split('. ')[1] || lvl.name}</td><td style="color: #ffea00;">${'★'.repeat(sCount)}</td><td>${mCount} Move</td></tr>`;
      });
      
      tableHtml += `<tr class="total-row"><td>총 합계 (Total)</td><td style="color: #ffea00;">★ ${totalStars} / 15</td><td>${totalMoves} Moves</td></tr>`;
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

function isCustomTestPlay() {
  const container = document.getElementById('appContainer');
  return container.classList.contains('testing-mode');
}

// --------------------------------------------------------------------------
// Drawing & Programmatic Graphics Renderer
// --------------------------------------------------------------------------

function gameLoop() {
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

  // 2. Draw Connection Lines in Editor mode
  if (isEditorMode) {
    drawEditorConnections();
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
      if (open) {
        // Open door frame background (greenish transparent glow)
        ctx.fillStyle = 'rgba(0, 230, 118, 0.04)';
        ctx.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 4, py + 4, tileSize - 8, tileSize - 8);

        // Open door panels pushed to the left and right sides
        ctx.fillStyle = '#1b2631';
        ctx.fillRect(px + 3, py + 3, tileSize/6, tileSize - 6);
        ctx.fillRect(px + tileSize - 3 - tileSize/6, py + 3, tileSize/6, tileSize - 6);
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.4)';
        ctx.strokeRect(px + 3, py + 3, tileSize/6, tileSize - 6);
        ctx.strokeRect(px + tileSize - 3 - tileSize/6, py + 3, tileSize/6, tileSize - 6);

        // Unlocked padlock icon in the center (green, shackle popped open)
        ctx.save();
        ctx.translate(px + tileSize/2, py + tileSize/2);

        // Lock shackle (popped open and rotated)
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-tileSize/16, -tileSize/8, tileSize/8, Math.PI * 1.1, Math.PI * 0.1, false);
        ctx.stroke();

        // Lock body (green)
        ctx.fillStyle = '#1b2a22';
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(-tileSize/6, -tileSize/12, tileSize/3, tileSize/3.5, 4);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Keyhole
        ctx.fillStyle = 'rgba(0, 230, 118, 0.6)';
        ctx.beginPath();
        ctx.arc(0, tileSize/16, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else {
        // Render heavy locked gate
        ctx.fillStyle = '#212a34'; // darker steel blue-gray
        ctx.fillRect(px + 3, py + 3, tileSize - 6, tileSize - 6);
        ctx.strokeStyle = '#00b0ff'; // Neon blue border
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px + 3, py + 3, tileSize - 6, tileSize - 6);

        // Vertical split line showing double door panels
        ctx.strokeStyle = '#121921';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + tileSize/2, py + 3);
        ctx.lineTo(px + tileSize/2, py + tileSize - 3);
        ctx.stroke();

        // Horizontal panel ribs for mechanical look
        ctx.strokeStyle = 'rgba(0, 176, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px + 6, py + tileSize * 0.25);
        ctx.lineTo(px + tileSize - 6, py + tileSize * 0.25);
        ctx.moveTo(px + 6, py + tileSize * 0.75);
        ctx.lineTo(px + tileSize - 6, py + tileSize * 0.75);
        ctx.stroke();

        // Padlock icon in the center
        ctx.save();
        ctx.translate(px + tileSize/2, py + tileSize/2);

        // Lock shackle (loop) - red/orange indicating locked
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, -tileSize/10, tileSize/8, Math.PI, 0, false);
        ctx.stroke();

        // Lock body (rounded rect)
        ctx.fillStyle = '#2c3e50';
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(-tileSize/6, -tileSize/12, tileSize/3, tileSize/3.5, 4);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Keyhole inside padlock body
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(0, tileSize/16, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-1.5, tileSize/16);
        ctx.lineTo(1.5, tileSize/16);
        ctx.lineTo(2.5, tileSize/16 + 5);
        ctx.lineTo(-2.5, tileSize/16 + 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
      break;

    case 'T': // Spike Trap (Top-down view redesign)
      const key = `${x},${y}`;
      const isUp = spikesUp || (activeSpikesAnim[key] && activeSpikesAnim[key] > 0);
      
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
      ctx.font = `900 ${Math.max(16, tileSize * 0.32)}px 'Orbitron', sans-serif`;

      // 1. Draw thin black outline stroke first
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 0; // No neon glow on the black outline itself
      ctx.strokeText(numStr, px + tileSize/2, py + tileSize/2);
      ctx.restore();

      // 2. Draw neon filled number on top
      ctx.save();
      if (type === 'C') {
        // Durability 1: Bright Orange-Red '1'
        ctx.fillStyle = '#ff3d00';
        ctx.shadowColor = '#ff3d00';
        ctx.shadowBlur = 8 * pulseVal;
      } else {
        // Durability 2: Bright Lime Green '2'
        ctx.fillStyle = '#00e676';
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 6;
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

    case '.': // Normal Floor
    default:
      // Draw subtle centered tile border inside
      ctx.strokeStyle = '#121626';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
      break;
  }
}

function drawBox(box) {
  const scale = box.scale !== undefined ? box.scale : 1.0;
  if (scale <= 0) return;

  const bx = box.animX * tileSize + tileSize/2;
  const by = box.animY * tileSize + tileSize/2;
  const bSize = (tileSize - 10) * scale;

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

  // 7. Glowing Visor Eyes (Expressionless/neutral circular eyes) & Gentle Smile Mouth
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
  const eyeR = 3.5 * scale;

  // Left Eye (Circular for neutral expression)
  ctx.beginPath();
  ctx.arc(-eyeSpacing + lookX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Right Eye (Circular for neutral expression)
  ctx.beginPath();
  ctx.arc(eyeSpacing + lookX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Subtle Smile Mouth (thin line creating a gentle smiling expression on the visor screen)
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.arc(lookX, eyeY + 7 * scale, 2.5 * scale, 0.1 * Math.PI, 0.9 * Math.PI);
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

// --------------------------------------------------------------------------
// Input & Touch Event Handlers
// --------------------------------------------------------------------------

function handleKeyDown(e) {
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
      undo();
      break;
    case 'y':
    case 'Y':
      redo();
      break;
    case 'r':
    case 'R':
      restartLevel();
      break;
    case 'Escape':
      // Open level list selector dropdown
      document.getElementById('levelSelect').focus();
      break;
  }
}

function setupTouchControls() {
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
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
    spikesUp: spikesUp
  };
  historyStack.push(state);
  redoStack = []; // Clear redo stack on new action
}

function undo() {
  if (gameStatus !== 'playing' || isAnimating || historyStack.length === 0) return;

  // Save current state to Redo Stack
  const current = {
    player: { x: player.x, y: player.y, dir: player.dir },
    boxes: boxes.map(b => ({ id: b.id, x: b.x, y: b.y, active: b.active })),
    grid: boardGrid.map(row => [...row]),
    ap: remainingAP,
    moves: moveCount,
    activeSticky: new Set(activeStickySwitches),
    spikesUp: spikesUp
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

  updateSwitchesAndDoors();
  updateHUD();
  sound.playTone(300, 'sine', 0.1, 0.1, 150); // Reverse pitch slide tone
}

function redo() {
  if (gameStatus !== 'playing' || isAnimating || redoStack.length === 0) return;

  // Save current state to History Stack
  const current = {
    player: { x: player.x, y: player.y, dir: player.dir },
    boxes: boxes.map(b => ({ id: b.id, x: b.x, y: b.y, active: b.active })),
    grid: boardGrid.map(row => [...row]),
    ap: remainingAP,
    moves: moveCount,
    activeSticky: new Set(activeStickySwitches),
    spikesUp: spikesUp
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

  updateSwitchesAndDoors();
  updateHUD();
  sound.playTone(150, 'sine', 0.1, 0.1, 300); // Forward pitch slide tone
}

function restartLevel() {
  loadLevel(currentLevelIdx);
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
  if (!currentBest) {
    shouldUpdate = true;
  } else {
    if (stars > currentBest.stars) {
      shouldUpdate = true;
    } else if (stars === currentBest.stars && moves < currentBest.moves) {
      shouldUpdate = true;
    }
  }
  if (shouldUpdate) {
    localStorage.setItem(`runic_dungeon_best_record_${levelIdx}`, JSON.stringify({ stars, moves }));
    
    // Cloud sync upload
    const username = localStorage.getItem('runic_dungeon_user');
    if (username) {
      uploadUserRecordsCloud(username);
    }
  }
}

function checkAllLevelsCleared() {
  for (let i = 0; i < DEFAULT_LEVELS.length; i++) {
    if (!getBestRecord(i)) return false;
  }
  return true;
}

function updateRecordHUD() {
  const recordList = document.getElementById('recordList');
  if (!recordList) return;
  
  recordList.innerHTML = '';
  DEFAULT_LEVELS.forEach((lvl, idx) => {
    const best = getBestRecord(idx);
    const isActive = idx === currentLevelIdx;
    
    const row = document.createElement('div');
    row.className = `record-row ${isActive ? 'active-level' : ''}`;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'record-level-name';
    nameSpan.textContent = `${idx + 1}층: ${lvl.name.split('. ')[1] || lvl.name}`;
    
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
    
    recordList.appendChild(row);
  });
}

// --------------------------------------------------------------------------
// Authentication & Cloud Sync (kvdb.io)
// --------------------------------------------------------------------------
const USER_PASSWORDS = {
  '엽이': 'tmdduql11',
  '영기': 'dudrldmaak22',
  '조씨': 'alsTlqndls33',
  '앵웅': 'doddnd44',
  '관리자': 'password55'
};

const KVDB_BUCKET_ID = 'Mz6jZ7tY88aJp2yU7c8q2z';

function checkLoginState() {
  const user = localStorage.getItem('runic_dungeon_user');
  if (user && USER_PASSWORDS[user]) {
    hideLoginOverlay(user);
    syncUserRecordsFromCloud(user);
  } else {
    showLoginOverlay();
  }
}

function showLoginOverlay() {
  localStorage.removeItem('runic_dungeon_user');
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.getElementById('loginUserList').classList.remove('hidden');
  document.getElementById('loginPasswordForm').classList.add('hidden');
  document.getElementById('loginErrorMsg').classList.add('hidden');
  document.getElementById('userProfileTag').classList.add('hidden');
  document.getElementById('btnLeaderboard').classList.add('hidden');
  document.getElementById('btnLogout').classList.add('hidden');
}

function hideLoginOverlay(username) {
  localStorage.setItem('runic_dungeon_user', username);
  document.getElementById('loginOverlay').classList.add('hidden');
  
  const tag = document.getElementById('userProfileTag');
  tag.classList.remove('hidden');
  document.getElementById('userProfileIcon').innerHTML = getUserIcon(username);
  document.getElementById('loggedInUserName').textContent = username;
  document.getElementById('btnLeaderboard').classList.remove('hidden');
  document.getElementById('btnLogout').classList.remove('hidden');
}

function attemptLogin(username, password) {
  const errorMsgEl = document.getElementById('loginErrorMsg');
  errorMsgEl.classList.add('hidden');
  
  const correctPass = USER_PASSWORDS[username];
  if (correctPass && password === correctPass) {
    hideLoginOverlay(username);
    syncUserRecordsFromCloud(username);
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

const DB_OBJECT_ID = 'ff8081819d82fab6019e93df3c823d46';

async function uploadUserRecordsCloud(username) {
  try {
    const userRecords = {};
    DEFAULT_LEVELS.forEach((_, idx) => {
      const rec = localStorage.getItem(`runic_dungeon_best_record_${idx}`);
      if (rec) {
        userRecords[idx] = JSON.parse(rec);
      }
    });

    let dbData = {};
    try {
      const res = await fetch(`https://api.restful-api.dev/objects/${DB_OBJECT_ID}?t=${Date.now()}`);
      if (res.ok) {
        const obj = await res.json();
        dbData = obj.data || {};
      }
    } catch (e) {
      console.error("Fetch DB error during upload:", e);
    }

    dbData[username] = userRecords;

    await fetch(`https://api.restful-api.dev/objects/${DB_OBJECT_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "RunicDungeonLeaderboard",
        data: dbData
      })
    });
  } catch (e) {
    console.error('Cloud upload error:', e);
  }
}

async function syncUserRecordsFromCloud(username) {
  try {
    const res = await fetch(`https://api.restful-api.dev/objects/${DB_OBJECT_ID}?t=${Date.now()}`);
    if (res.ok) {
      const obj = await res.json();
      const dbData = obj.data || {};
      const userRecords = dbData[username];
      
      if (userRecords) {
        DEFAULT_LEVELS.forEach((_, idx) => {
          if (userRecords[idx]) {
            localStorage.setItem(`runic_dungeon_best_record_${idx}`, JSON.stringify(userRecords[idx]));
          } else {
            localStorage.removeItem(`runic_dungeon_best_record_${idx}`);
          }
        });
        updateRecordHUD();
      } else {
        uploadUserRecordsCloud(username);
      }
    }
  } catch (e) {
    console.error('Cloud sync error:', e);
  }
}

async function showLeaderboardModal() {
  const modal = document.getElementById('leaderboardModal');
  const tbody = document.getElementById('leaderboardTableBody');
  tbody.innerHTML = '<tr><td colspan="6" style="padding: 20px;">데이터를 불러오는 중... (Syncing Cloud)</td></tr>';
  modal.classList.remove('hidden');
  
  const users = Object.keys(USER_PASSWORDS);
  const currentLoggedUser = localStorage.getItem('runic_dungeon_user');
  
  try {
    const res = await fetch(`https://api.restful-api.dev/objects/${DB_OBJECT_ID}?t=${Date.now()}`);
    let dbData = {};
    if (res.ok) {
      const obj = await res.json();
      dbData = obj.data || {};
    }
    
    const statsList = users.map(u => {
      const userRecords = dbData[u] || {};
      let totalStars = 0;
      let totalMoves = 0;
      let clearedStages = [];
      
      DEFAULT_LEVELS.forEach((lvl, idx) => {
        const rec = userRecords[idx];
        if (rec) {
          totalStars += parseInt(rec.stars, 10) || 0;
          const moveVal = parseInt(String(rec.moves).replace('이동', '').trim(), 10) || 0;
          totalMoves += moveVal;
          clearedStages.push(idx + 1);
        }
      });
      
      const numCleared = clearedStages.length;
      const avgMoves = numCleared > 0 ? (totalMoves / numCleared).toFixed(1) : 0;
      
      return {
        name: u,
        totalStars,
        totalMoves,
        avgMoves: parseFloat(avgMoves),
        clearedStages: clearedStages.join(', ') || '-',
        numCleared
      };
    });
    
    statsList.sort((a, b) => {
      if (a.numCleared === 0 && b.numCleared > 0) return 1;
      if (b.numCleared === 0 && a.numCleared > 0) return -1;
      if (a.numCleared === 0 && b.numCleared === 0) return 0;
      
      if (b.totalStars !== a.totalStars) {
        return b.totalStars - a.totalStars;
      }
      if (a.totalMoves !== b.totalMoves) {
        return a.totalMoves - b.totalMoves;
      }
      return a.avgMoves - b.avgMoves;
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
        <td>${stat.numCleared > 0 ? stat.avgMoves : '-'}</td>
        <td>${stat.numCleared > 0 ? stat.totalMoves : '-'}</td>
        <td style="font-size: 0.8rem; color: #00e676;">${stat.clearedStages}층</td>
      `;
      tbody.appendChild(row);
    });
    
  } catch (e) {
    console.error('Error fetching leaderboard:', e);
    tbody.innerHTML = '<tr><td colspan="6" style="padding: 20px; color: #ff1744;">순위표 데이터를 가져오는 중 오류가 발생했습니다.</td></tr>';
  }
}

function getUserIcon(username) {
  if (username === '엽이') {
    return `<svg viewBox="0 0 36 36" width="18" height="18" style="vertical-align: middle; display: inline-block;">
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
    '관리자': '🛡️'
  };
  return icons[username] || '🤖';
}

// Global script load initializer
window.onload = initGame;
