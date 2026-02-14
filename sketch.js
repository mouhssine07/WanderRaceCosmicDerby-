/**
 * sketch.js - Open World Engine for Cosmic Derby
 *
 * Features:
 * - 5000x5000 Map with Camera Follow
 * - Dynamic Weather (Rain/Clear)
 * - Car-like Physics orchestration
 * - Ranking System
 */

// =============================================================================
// GAME CONFIGURATION
// =============================================================================

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;
const INITIAL_AI_COUNT = 20;

// Env Configuration
const WEATHER_CYCLE_FRAMES = 1800; // 30 seconds per weather change approx

// =============================================================================
// =============================================================================
// GAME STATE
// =============================================================================

let gameState = "MENU"; // 'MENU', 'PLAYING', 'GAME_OVER', 'VICTORY'
let playerName = "";
let showMenu = false; // Menu overlay state (game continues in background)
let showDashboard = true; // Dashboard toggle (H key)

let player;
let aiVehicles = [];
let points = []; // Power-ups
let stars = []; // Score Stars (New)
let obstacles = [];
let zones = []; // Environmental Zones
let particles;
let totalScore = 0;

// Systems
let dashboard; 
let profile; // Persistent profile
let gameModeManager; // Handle modes
let spatialGrid; // Optimization
let socialManager; // Sharing
let tutorialManager; // Onboarding
let uiManager; // Improved HUD
let mobileManager; // Mobile controls
let soundManager; // Audio system
let networkManager; // Multiplayer

// Game tracking variables
let gameStats = null;
let collectedStars = 0;
let scoreRecorded = false;
let perfWarningLogged = false; // Prevent log spam

// Environment
let weatherState = "clear"; // 'clear' or 'rain'
let weatherTimer = 0;
let tractionMultiplier = 1.0;

// Camera
let camX = 0;
let camY = 0;
let camZoom = 1.0; // Dynamic camera zoom
let UI_SCALE = 1.0;
let isPortrait = false;
let screenShake = 0; // Camera shake intensity

// Assets
let rocketImage;

// =============================================================================
// P5.JS LIFECYCLE
// =============================================================================

function preload() {
  rocketImage = loadImage("assets/vehicule.png");
}

function setup() {
  pixelDensity(1);
  
  // Get true viewport dimensions (accounting for mobile browser chrome)
  let canvasWidth = window.innerWidth;
  let canvasHeight = window.innerHeight;
  
  // Use visualViewport if available (more accurate on mobile)
  if (window.visualViewport) {
    canvasWidth = window.visualViewport.width;
    canvasHeight = window.visualViewport.height;
  }
  
  // Force landscape mode and fullscreen
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.body);
  canvas.style('display', 'block');
  canvas.style('position', 'fixed');
  canvas.style('top', '0');
  canvas.style('left', '0');
  
  // Request fullscreen on mobile after user interaction
  if (isMobileDevice()) {
    // Hide address bar on first touch
    document.addEventListener('touchstart', function hideAddressBar() {
      requestFullscreen();
      // Also try to scroll to hide address bar
      window.scrollTo(0, 1);
      setTimeout(() => window.scrollTo(0, 0), 100);
    }, { once: true });
  }
  
  // Listen for viewport changes (address bar show/hide)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportResize);
  }

  // Initialize Dashboard
  if (typeof Dashboard !== "undefined") {
    dashboard = new Dashboard();
    if (dashboard && dashboard.init) dashboard.init();
  }

  profile = new PlayerProfile();
  gameModeManager = new GameModeManager();
  spatialGrid = new SpatialHashGrid(WORLD_WIDTH, WORLD_HEIGHT, 300);
  socialManager = new SocialManager();
  tutorialManager = new TutorialManager();
  uiManager = new UIManager();
  mobileManager = new MobileManager();
  soundManager = new SoundManager();
  networkManager = new NetworkManager();

  // On mobile, force tutorial to be considered "completed" or inactive
  if (mobileManager.isMobile) {
      tutorialManager.active = false;
      tutorialManager.completed = true;
  } else {
      tutorialManager.loadTutorialCompletion();
  }

  // Start with menu
  gameState = "MENU";
  
  // Setup mobile name input
  setupMobileNameInput();
}

function setupMobileNameInput() {
  const mobileInput = document.getElementById('mobileNameInput');
  if (!mobileInput) return;
  
  // Only use HTML input on mobile
  if (!isMobileDevice()) {
    mobileInput.style.display = 'none';
    return;
  }
  
  // Sync HTML input with playerName variable
  mobileInput.addEventListener('input', function() {
    playerName = this.value;
  });
  
  // Handle Enter key
  mobileInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && playerName.trim().length > 0) {
      this.blur(); // Hide keyboard
      startGame();
    }
  });
  
  // Show/hide based on game state
  function updateInputVisibility() {
    if (gameState === 'MENU' && isMobileDevice()) {
      mobileInput.style.display = 'block';
      mobileInput.value = playerName;
    } else {
      mobileInput.style.display = 'none';
    }
  }
  
  // Update on game state changes
  setInterval(updateInputVisibility, 100);
}

function windowResized() {
  let newWidth = window.innerWidth;
  let newHeight = window.innerHeight;
  
  // Use visualViewport for more accurate dimensions on mobile
  if (window.visualViewport) {
    newWidth = window.visualViewport.width;
    newHeight = window.visualViewport.height;
  }
  
  resizeCanvas(newWidth, newHeight);
  
  // Re-request fullscreen if needed
  if (isMobileDevice() && !isFullscreen()) {
    requestFullscreen();
  }
}

// Handle viewport changes (mobile address bar show/hide)
function handleViewportResize() {
  if (window.visualViewport) {
    resizeCanvas(window.visualViewport.width, window.visualViewport.height);
  }
}

// Helper functions for mobile
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function requestFullscreen() {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen().catch(() => {});
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen().catch(() => {});
  } else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen().catch(() => {});
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen().catch(() => {});
  }
  
  // iOS Safari specific - try to hide address bar
  if (isMobileDevice()) {
    window.scrollTo(0, 1);
    setTimeout(() => {
      window.scrollTo(0, 0);
      if (window.visualViewport) {
        resizeCanvas(window.visualViewport.width, window.visualViewport.height);
      }
    }, 100);
  }
}

function isFullscreen() {
  return document.fullscreenElement || 
         document.webkitFullscreenElement || 
         document.mozFullScreenElement ||
         document.msFullscreenElement;
}

function initGame() {
  gameModeManager.reset();
  
  // Spawn Player
  let startX = random(100, WORLD_WIDTH - 100);
  let startY = random(100, WORLD_HEIGHT - 100);
  player = new PlayerVehicle(startX, startY, rocketImage);
  player.name = playerName; // Set player name for KOTH display
  
  // STATS TRACKING
  gameStats = {
      kills: 0,
      damageDealt: 0,
      timeAlive: 0,
      startTime: millis(),
      maxMass: 100,
      score: 0
  };
  collectedStars = 0; // Reset tutorial count

  // Initialize Team/Infection for Player
  if (gameModeManager.currentMode === GameModeManager.MODES.TDM) {
      player.team = 1;
  } else if (gameModeManager.currentMode === GameModeManager.MODES.INFECTION) {
      player.isInfected = true; // Player starts infected
  }

  // Spawn AI
  aiVehicles = [];
  for (let i = 0; i < INITIAL_AI_COUNT; i++) {
    spawnAI();
    let ai = aiVehicles[aiVehicles.length - 1];
    
    // TDM: Alternating teams
    if (gameModeManager.currentMode === GameModeManager.MODES.TDM) {
        ai.team = (i % 2 === 0) ? 2 : 1;
    }
  }

  // Spawn Power-ups
  points = [];
  for (let i = 0; i < 15; i++) {
    spawnPoint();
  }

  // Spawn Stars
  stars = [];
  for (let i = 0; i < 60; i++) {
    spawnStar();
  }

  // Spawn Obstacles
  obstacles = [];
  for (let i = 0; i < 15; i++) {
    spawnObstacle();
  }

  // Spawn Zones
  zones = [];
  spawnZones();

  particles = new ParticleSystem();

  weatherState = "clear";
  weatherTimer = 0;
  gameState = "PLAYING";
  totalScore = 0;
}

function spawnAI() {
  let x = random(100, WORLD_WIDTH - 100);
  let y = random(100, WORLD_HEIGHT - 100);
  let ai = new AIVehicle(x, y, rocketImage);
  ai.score = 0; // Track score for AI
  aiVehicles.push(ai);
}

function spawnPoint() {
  let x = random(100, WORLD_WIDTH - 100);
  let y = random(100, WORLD_HEIGHT - 100);
  points.push(new Checkpoint(x, y));
}

function spawnStar() {
  let x = random(100, WORLD_WIDTH - 100);
  let y = random(100, WORLD_HEIGHT - 100);
  stars.push(new Star(x, y));
}

function spawnObstacle() {
  obstacles.push(new Obstacle());
}

function spawnZones() {
  const types = ['nebulosa', 'trou_noir', 'flux_energie'];
  for (let i = 0; i < 8; i++) {
    let type = random(types);
    let x = random(500, WORLD_WIDTH - 500);
    let y = random(500, WORLD_HEIGHT - 500);
    let r = random(200, 500);
    zones.push(new Zone(x, y, r, type));
  }
}

// =============================================================================
// MAIN LOOP
// =============================================================================

function draw() {
  // Update UI Scale and Orientation
  isPortrait = height > width;
  UI_SCALE = min(width, height) / 800; // Normalized to 800px base
  if (UI_SCALE < 0.6) UI_SCALE = 0.6; // Minimum scale for legibility

  background(10, 10, 30);

  // Handle menu state
  if (gameState === "MENU") {
    drawMenu();
    return;
  }

  // Handle Skins state
  if (gameState === "SKINS") {
    drawSkinsMenu();
    return;
  }

  // Handle Leaderboard state
  if (gameState === "LEADERBOARD") {
    drawLeaderboardsMenu();
    return;
  }

  // Handle game over state - still draw world behind overlay
  if (gameState === "GAME_OVER" || gameState === "VICTORY") {
    updateWeather();
  }

  // Update weather during gameplay too
  if (gameState === "PLAYING") {
    updateWeather();
  }

  // 4. CAMERA & SHAKE
  // Assuming handleCamera() is a new function or the existing camera logic will be moved there.
  // For now, I'll keep the existing camera logic and insert the stats update.
  // handleCamera(); // This line was in the diff, but not defined elsewhere.
  if (player && gameState === "PLAYING") {
    // UPDATE STATS
    if (gameStats) {
        gameStats.maxMass = Math.max(gameStats.maxMass, player.mass);
        gameStats.timeAlive = (millis() - gameStats.startTime) / 1000;
        gameStats.score = totalScore;
    }
  }
  
  if (player) {
    // Camera
    let targetCamX = width / 2 - player.pos.x;
    let targetCamY = height / 2 - player.pos.y;
    camX = lerp(camX, targetCamX, 0.1);
    camY = lerp(camY, targetCamY, 0.1);
    
    // Dynamic FOV based on mass
    let targetZoom = map(player.mass, 100, 1000, 1.0, 0.4, true);
    camZoom = lerp(camZoom, targetZoom, 0.05);
  }

  push();
  
  // Apply Zoom for Dynamic FOV
  translate(width / 2, height / 2);
  scale(camZoom);
  translate(-width / 2, -height / 2);
  
  // Handle Screen Shake
  if (screenShake > 0) {
    translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
    screenShake *= 0.9; // Fast decay
    if (screenShake < 0.1) screenShake = 0;
  }
  
  translate(camX, camY);

  drawWorldGrid();

  // Draw zones (visual only in GAME_OVER/VICTORY)
  for (let z of zones) {
    if (gameState === "PLAYING") {
      z.update();
    }
    z.show();
    if (gameState === "PLAYING") {
      z.affect(player);
      for (let ai of aiVehicles) {
        z.affect(ai);
      }
    }
  }

  if (gameState === "PLAYING") {
    // --- POINTS (Power-ups) ---
    for (let i = points.length - 1; i >= 0; i--) {
      let p = points[i];
      p.update();
      p.show();

      // Player
      if (p.checkCapture(player.pos)) {
        handlePointCapture(p, player);
        points.splice(i, 1);
        spawnPoint();
        continue;
      }

      // AI
      for (let ai of aiVehicles) {
        if (p.checkCapture(ai.pos)) {
          handlePointCapture(p, ai);
          points.splice(i, 1);
          spawnPoint();
          break;
        }
      }
    }

    // --- OBSTACLES ---
    for (let obs of obstacles) {
      obs.update(player);
      obs.show();
      obs.checkCollision(player);
      for (let ai of aiVehicles) {
        obs.checkCollision(ai);
      }
    }

    // --- AI VEHICLES ---
    for (let i = aiVehicles.length - 1; i >= 0; i--) {
      let ai = aiVehicles[i];

      // Remove dead AI
      if (ai.isDead) {
        // Explosion visual at position
        particles.explode(ai.pos.x, ai.pos.y, 30, 0);

        // Sound if near player
        if (
          typeof soundManager !== "undefined" &&
          p5.Vector.dist(player.pos, ai.pos) < 1000
        ) {
          soundManager.playExplosion();
        }

        aiVehicles.splice(i, 1);
        
        // In Elimination mode, don't respawn
        if (gameModeManager.currentMode !== GameModeManager.MODES.ELIMINATION) {
          spawnAI(); // Respawn a new one to keep population constant
        } else {
          gameModeManager.eliminateVehicle(ai);
          
          // Check if player wins (all AI eliminated)
          if (aiVehicles.length === 0 && !player.isDead) {
            gameState = "VICTORY";
            
            // Finalize stats for victory
            if (gameStats) {
              gameStats.maxMass = Math.max(gameStats.maxMass, player.mass);
              gameStats.timeAlive = (millis() - gameStats.startTime) / 1000;
              gameStats.score = totalScore;
            }
            
            // Save to leaderboard
            if (profile && !scoreRecorded) {
              profile.addLeaderboardEntry(playerName, totalScore, gameModeManager.currentMode);
              scoreRecorded = true;
            }
          }
        }
        continue;
      }

      // PASS STARS AND POINTS TO THINK
      ai.think(player, points, stars, obstacles);
      ai.updatePhysics(tractionMultiplier);
      ai.constrainToWorld(WORLD_WIDTH, WORLD_HEIGHT);
      ai.show();
      drawHealthBar(ai);
    }

    // --- STARS (Visuals) ---
    for (let s of stars) {
      s.update();
      s.show();
    }

    // 2. PHYSICS & COLLISIONS (Optimized with SpatialGrid)
    spatialGrid.clear();
    spatialGrid.insert(player);
    for (let ai of aiVehicles) spatialGrid.insert(ai);

    // STAR COLLISION (Optimized)
    handleStarCaptureOptimized();

    // VEHICLE-VEHICLE COLLISION (Optimized)
    handleVehicleCollisionsOptimized();

    // --- PLAYER ---
    if (!player.isDead) {
      player.updatePhysics(tractionMultiplier); // New physics update
      
      // Constrain handled by GameModeManager in Elimination mode
      let bounds = gameModeManager.getCurrentBounds();
      player.pos.x = constrain(player.pos.x, bounds.x + player.r, bounds.x + bounds.w - player.r);
      player.pos.y = constrain(player.pos.y, bounds.y + player.r, bounds.y + bounds.h - player.r);
      
      player.show();
    } else {
      // Cancel menu overlay if vehicle dies
      if (showMenu) {
        showMenu = false;
      }
      
      // In Elimination mode, mark player as eliminated
      if (gameModeManager.currentMode === GameModeManager.MODES.ELIMINATION) {
        gameModeManager.eliminateVehicle(player);
      }
      
      gameState = "GAME_OVER";
      
      // Finalize stats for game over
      if (gameStats) {
        gameStats.maxMass = Math.max(gameStats.maxMass, player.mass);
        gameStats.timeAlive = (millis() - gameStats.startTime) / 1000;
        gameStats.score = totalScore;
      }
      
      // Record to leaderboard
      if (profile && !scoreRecorded) {
          profile.addLeaderboardEntry(playerName, totalScore, gameModeManager.currentMode);
          scoreRecorded = true;
      }
    }
  }

  // Particles (visual only in GAME_OVER/VICTORY)
  if (gameState === "PLAYING") {
    particles.update();
  }
  particles.show();

  // Visualize Border
  noFill();
  stroke(255, 0, 0);
  strokeWeight(5);
  rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // --- WORLD OVERLAYS ---
  gameModeManager.showOverlay();

  pop(); // End Camera Transform

  // 5. UI & HUD (drawn on top, not affected by camera)
  drawHUD();
  drawWeatherEffect();
  
  if (gameState === "PLAYING") {
    socialManager.update();
    uiManager.update();
  }
  socialManager.show();
  
  uiManager.render({
    player: player,
    stars: stars,
    aiVehicles: aiVehicles,
    gameModeManager: gameModeManager
  });
  
  if (gameState === "PLAYING" && typeof tutorialManager !== 'undefined' && (!mobileManager || !mobileManager.isMobile)) {
    tutorialManager.update({
      player: player,
      collectedStars: collectedStars
    });
  }
  if (typeof tutorialManager !== 'undefined' && (!mobileManager || !mobileManager.isMobile)) {
    tutorialManager.show();
  }

  if (typeof mobileManager !== 'undefined') {
    if (gameState === "PLAYING") {
      mobileManager.update();
    }
    mobileManager.render();
  }

  // PERFORMANCE THROTTLING (Mobile Equity)
  if (frameRate() < 45 && frameCount % 300 === 0) { // Every 5 seconds instead of 1
      if (!this.perfWarningLogged) {
          console.log("Performance drop detected: Reducing particle density");
          this.perfWarningLogged = true;
      }
      if (typeof particles !== 'undefined') {
          particles.lowPerformanceMode = true;
      }
  }

  // Mode-specific HUD info
  if (gameState === "PLAYING") {
      let result = gameModeManager.update(player, aiVehicles);
      
      // Check for KOTH victory
      if (gameModeManager.currentMode === GameModeManager.MODES.KING_OF_THE_HILL && result) {
        gameState = "VICTORY";
        
        // Finalize stats for victory
        if (gameStats) {
          gameStats.maxMass = Math.max(gameStats.maxMass, player.mass);
          gameStats.timeAlive = (millis() - gameStats.startTime) / 1000;
          gameStats.score = totalScore;
        }
        
        // Save to leaderboard
        if (profile && !scoreRecorded) {
          profile.addLeaderboardEntry(playerName, player.score || totalScore, gameModeManager.currentMode);
          scoreRecorded = true;
        }
      }
      
      // Check for TDM victory
      if (gameModeManager.currentMode === GameModeManager.MODES.TDM && result) {
        gameState = "VICTORY";
        
        // Finalize stats for victory
        if (gameStats) {
          gameStats.maxMass = Math.max(gameStats.maxMass, player.mass);
          gameStats.timeAlive = (millis() - gameStats.startTime) / 1000;
          gameStats.score = gameModeManager.teamKills[player.team];
        }
        
        // Save to leaderboard
        if (profile && !scoreRecorded) {
          let teamScore = gameModeManager.teamKills[player.team];
          profile.addLeaderboardEntry(playerName, teamScore, gameModeManager.currentMode);
          scoreRecorded = true;
        }
      }
  } else if (gameState === "SKINS") {
    drawSkinsMenu();
  } else if (gameState === "LEADERBOARD") {
    drawLeaderboardsMenu();
  }
}

function updateWeather() {
  weatherTimer++;

  if (weatherTimer > WEATHER_CYCLE_FRAMES) {
    weatherTimer = 0;
    // Toggle
    weatherState = weatherState === "clear" ? "rain" : "clear";
  }

  // Weather Effect
  let weatherTraction = weatherState === "rain" ? 0.7 : 1.0;
  tractionMultiplier = weatherTraction;
}

function drawWeatherEffect() {
  if (weatherState === "rain") {
    push();
    stroke(150, 150, 255, 100);
    strokeWeight(1);
    for (let i = 0; i < 100; i++) {
      let rx = random(width);
      let ry = random(height);
      line(rx, ry, rx - 2, ry + 10);
    }

    // Rain vignette/overlay
    noStroke();
    fill(0, 0, 50, 30);
    rect(0, 0, width, height);

    fill(200, 200, 255);
    textSize(18 * UI_SCALE); // Scaled
    textAlign(CENTER, TOP);
    text("⚠ HEAVY RAIN - TRACTION REDUCED", width / 2, 20 * UI_SCALE);
    pop();
  }
}

function handleStarCaptureOptimized() {
    for (let i = stars.length - 1; i >= 0; i--) {
        let s = stars[i];
        
        // Find vehicles near the star
        // Note: For stars, we check vehicles nearby the star's position
        let nearby = spatialGrid.getNearby(s); 
        
        // Check player (spatialGrid includes player)
        if (s.checkCapture(player.pos, player.r)) {
            handleStarCapture(s, player);
            stars.splice(i, 1);
            spawnStar();
            continue;
        }

        // Check AIs in nearby cells
        for (let ai of nearby) {
            if (s.checkCapture(ai.pos, ai.r)) {
                handleStarCapture(s, ai);
                stars.splice(i, 1);
                spawnStar();
                break;
            }
        }
    }
}

function handleVehicleCollisionsOptimized() {
    // Player vs AI
    let nearbyToPlayer = spatialGrid.getNearby(player);
    for (let other of nearbyToPlayer) {
        checkVehicleCollision(player, other);
    }

    // AI vs AI
    for (let i = 0; i < aiVehicles.length; i++) {
        let ai = aiVehicles[i];
        let nearby = spatialGrid.getNearby(ai);
        for (let other of nearby) {
            // Use cached index instead of indexOf - MUCH faster
            let otherIdx = aiVehicles.indexOf(other);
            if (otherIdx > i) { // Only check pairs once
                checkVehicleCollision(ai, other);
            }
        }
    }
}

function drawWorldGrid() {
  stroke(255, 50);
  strokeWeight(1);
  const gridSize = 200;

  // Vertical
  for (let x = 0; x <= WORLD_WIDTH; x += gridSize) {
    line(x, 0, x, WORLD_HEIGHT);
    if (x % 1000 === 0) {
      fill(255, 100);
      noStroke();
      text(x, x + 5, 20);
      stroke(255, 50);
    }
  }

  // Horizontal
  for (let y = 0; y <= WORLD_HEIGHT; y += gridSize) {
    line(0, y, WORLD_WIDTH, y);
    if (y % 1000 === 0) {
      fill(255, 100);
      noStroke();
      text(y, 5, y + 20);
      stroke(255, 50);
    }
  }
}

function handleStarCapture(star, vehicle) {
  // Sparkle
  particles.explode(star.pos.x, star.pos.y, 20, 50); // Gold sparks

  // GROWTH: Increase Mass (INCREASED to +50 for more dramatic growth)
  if (vehicle.targetMass) {
    let massGain = 50;
    if (vehicle.doubleXP) massGain *= 2;
    
    let previousMass = vehicle.targetMass;
    vehicle.targetMass += massGain;
    // Trigger growth pulse effect
    vehicle.growthPulse = 1.0;
    
    // Calculate power increase percentage
    let previousDamage = 1.0 + Math.max(0, (previousMass - 100) * 0.01);
    let newDamage = 1.0 + Math.max(0, (vehicle.targetMass - 100) * 0.01);
    let powerIncrease = ((newDamage - previousDamage) / previousDamage) * 100;
    
    // Popup showing growth and power
    if (vehicle.addPopup) {
      vehicle.addPopup("+GROWTH", color(255, 215, 0));
      if (powerIncrease > 0.5) {
        vehicle.addPopup(`+${Math.floor(powerIncrease)}% POWER`, color(255, 100, 0));
      }
    }

    // Heal slightly on growth
    vehicle.health = Math.min(vehicle.health + 15, vehicle.maxHealth);
  } else if (vehicle.mass) {
    vehicle.mass += 15; // Fallback
  }

  if (vehicle === player) {
    totalScore += star.scoreValue || 10;
    collectedStars = (collectedStars || 0) + 1; // Track for tutorial
    soundManager.playStarCollect(); // Sound
    if (typeof mobileManager !== 'undefined') mobileManager.vibrate(10); // Tiny buzz
    
    // VIRALITY: Mass Trigger
    if (player.mass > 500 && !player.massRecordTriggered) {
        socialManager.triggerEpicMoment('mass', player.mass);
        player.massRecordTriggered = true;
    }
    socialManager.recordMass(player.mass); // Record player's mass
  } else {
    // AI Score
    if (vehicle.score !== undefined) {
      vehicle.score += star.scoreValue || 10;
    }
  }
}

function handlePointCapture(point, vehicle) {
  // Explosion
  particles.explode(point.pos.x, point.pos.y, 50, hue(point.color));

  // Powerup Effect Only
  if (vehicle && vehicle.applyPowerup) {
    vehicle.applyPowerup(point.type);
  }

  if (vehicle === player) {
    if (point.type === "heal") soundManager.playBonusHeal();
    else if (point.type === "shield") soundManager.playBonusShield();
    else if (point.type === "speed") soundManager.playBonusSpeed();
    else if (point.type === "power") soundManager.playBonusPower();
  }
}

function checkVehicleCollision(v1, v2) {
  let dist = p5.Vector.dist(v1.pos, v2.pos);
  let minDist = v1.r + v2.r;

  if (dist < minDist) {
    // Collision Response

    // SOUND
    if (v1 === player || v2 === player) {
      soundManager.playCrash();
    }

    // 1. Separate them (DOMINANT FORCE: Asymmetric based on mass ratio)
    let pushVec = p5.Vector.sub(v1.pos, v2.pos);
    pushVec.setMag(minDist - dist);
    
    // Calculate mass ratio for asymmetric push
    let totalMass = v1.mass + v2.mass;
    // Heavier vehicle stays firm, lighter one gets blasted
    let v1MassRatio = v2.mass / totalMass; 
    let v2MassRatio = v1.mass / totalMass; 
    
    // Applying "Momentum over Might" - blast the smaller one away
    let ratio = v1.mass / v2.mass;
    if (ratio > 2.0) {
       // v1 is a giant compared to v2
       v1.pos.add(p5.Vector.mult(pushVec, 0.05)); // barely moves
       v2.pos.sub(p5.Vector.mult(pushVec, 0.95)); // sent flying
    } else if (ratio < 0.5) {
       // v2 is a giant compared to v1
       v1.pos.add(p5.Vector.mult(pushVec, 0.95));
       v2.pos.sub(p5.Vector.mult(pushVec, 0.05));
    } else {
       v1.pos.add(p5.Vector.mult(pushVec, v1MassRatio));
       v2.pos.sub(p5.Vector.mult(pushVec, v2MassRatio));
    }

    // 2. Physics bounce (ASYMMETRIC - heavier vehicle maintains momentum)
    if (ratio > 1.2) {
      v1.speed *= 0.85; // Maintains 85% momentum
      v2.speed *= -0.5 * ratio; // Sent backwards powerfully
    } else if (ratio < 0.83) {
      v1.speed *= -0.5 / ratio;
      v2.speed *= 0.85;
    } else {
      v1.speed *= 0.5;
      v2.speed *= 0.5;
    }

    // Spin effect (Disruption) - lighter vehicle's control is shattered
    v1.angle += (PI / 3) / ratio;
    v2.angle -= (PI / 3) * ratio;

    // Damage Logic (PROPORTIONAL IMPACT: dominant physical force)
    let baseDamage = 15;
    
    // TDM: No friendly fire
    if (gameModeManager.currentMode === GameModeManager.MODES.TDM) {
        if (v1.team === v2.team && v1.team !== null) {
            baseDamage = 0;
        }
    }
    
    // INFECTION: Spread on touch
    if (gameModeManager.currentMode === GameModeManager.MODES.INFECTION) {
        if (v1.isInfected && !v2.isInfected) {
            v2.isInfected = true;
            v2.addPopup("☣ INFECTED", color(150, 0, 255));
            if (v1 === player) profile.addXP(100);
        } else if (v2.isInfected && !v1.isInfected) {
            v1.isInfected = true;
            v1.addPopup("☣ INFECTED", color(150, 0, 255));
            if (v2 === player) profile.addXP(100);
        }
    }

    let damage1 = baseDamage * (v2.mass / v1.mass) * v2.damageMult;
    let damage2 = baseDamage * (v1.mass / v2.mass) * v1.damageMult;

    // Resolve V1
    if (v1.shieldTimer > 0) {
      particles.explode(v1.pos.x, v1.pos.y, 10, 200);
    } else {
      v1.takeDamage(damage1);
      if (v2 === player) gameStats.damageDealt += damage1;
      if (v1.isDead) {
        v2.onKill();
        
        // TDM: Award kill to team
        if (gameModeManager.currentMode === GameModeManager.MODES.TDM && v2.team) {
          gameModeManager.awardTeamKill(v2.team);
        }
        
        if (v2 === player) {
          socialManager.recordKill(); 
          uiManager.addKillNotification("VOUS", "ENNEMI"); 
          // killStreak already incremented in onKill()
          gameStats.kills++;
        } else if (v1 === player) {
          uiManager.addKillNotification("ENNEMI", "VOUS");
        } else {
          uiManager.addKillNotification("IA", "IA");
        }
      }
    }

    // Resolve V2
    if (v2.shieldTimer > 0) {
      particles.explode(v2.pos.x, v2.pos.y, 10, 200);
    } else {
      v2.takeDamage(damage2);
      if (v1 === player) gameStats.damageDealt += damage2;
      if (v2.isDead) {
        v1.onKill();
        
        // TDM: Award kill to team
        if (gameModeManager.currentMode === GameModeManager.MODES.TDM && v1.team) {
          gameModeManager.awardTeamKill(v1.team);
        }
        
        if (v1 === player) {
            socialManager.recordKill(); 
            uiManager.addKillNotification("VOUS", "ENNEMI"); 
            // killStreak already incremented in onKill()
            gameStats.kills++;
        } else if (v2 === player) {
            uiManager.addKillNotification("ENNEMI", "VOUS");
        } else {
            uiManager.addKillNotification("IA", "IA");
        }
      }
    }

    // Impact Visuals & Screen Shake
    let impactX = (v1.pos.x + v2.pos.x) / 2;
    let impactY = (v1.pos.y + v2.pos.y) / 2;
    
    // Screen shake scales with the heavy hitter's mass
    if (v1 === player || v2 === player) {
      let biggerMass = Math.max(v1.mass, v2.mass);
      screenShake = Math.min(20, biggerMass / 40);
    }

    particles.explode(impactX, impactY, 15, 0);

    // POWER IMPACT or MASS DOMINANCE
    if (v1.damageMult > 1.2 || v2.damageMult > 1.2) {
      particles.explode(impactX, impactY, 40, 0);
    } else if (Math.abs(ratio - 1.0) > 0.5) {
      particles.explode(impactX, impactY, 25, 30); // Orange dominance sparks
    }
  }
}

function drawHUD() {
  // 1. Off-screen Threat Indicators
  drawThreatIndicators();

  // Standard HUD
  push();
  fill(255);
  textSize(14 * UI_SCALE);
  textAlign(LEFT, BASELINE);
  
  let xOffset = 20 * UI_SCALE;
  let yStart = height - (isPortrait ? 220 : 100) * UI_SCALE;
  let lineSpace = 20 * UI_SCALE;
  
  text(`ALIVE: ${aiVehicles.length + 1}`, xOffset, yStart);
  text(`POS: ${floor(player.pos.x)}, ${floor(player.pos.y)}`, xOffset, yStart + lineSpace);
  text(`MASS: ${floor(player.mass)}`, xOffset, yStart + lineSpace * 2);
  text(
    `SPEED: ${floor(player.speed)} / ${floor(player.maxSpeed)}`,
    xOffset,
    yStart + lineSpace * 3,
  );

  // Top Right Leaderboard
  drawLeaderboard();

  // Draw Dashboard
  if (
    showDashboard &&
    gameState === "PLAYING" &&
    typeof Dashboard !== "undefined"
  ) {
    if (dashboard && dashboard.show) dashboard.show();
  }

  // Player Health
  drawHealthBar(player);

  pop();

  // Game Over Screen (Draw on top of everything)
  if (gameState === "GAME_OVER") {
    drawGameOverScreen();
  }
  
  // Victory Screen (Draw on top of everything)
  if (gameState === "VICTORY") {
    drawVictoryScreen();
  }

  // Menu Overlay (Draw on top of everything - game continues)
  if (showMenu && gameState === "PLAYING") {
    drawMenuOverlay();
  }
}

function drawThreatIndicators() {
  for (let ai of aiVehicles) {
    // Only track vehicles significantly bigger than us
    if (ai.mass > player.mass * 1.3 && !ai.isDead) {
      let d = p5.Vector.dist(player.pos, ai.pos);
      // Only show if close but off-screen (approx screen radius)
      if (d > height / 2 && d < 1500) {
        let angle = p5.Vector.sub(ai.pos, player.pos).heading();
        
        push();
        resetMatrix();
        translate(width / 2, height / 2);
        rotate(angle);
        
        let edgeX = (width / 2 - 30);
        let edgeY = (height / 2 - 30);
        
        // Calculate point on screen edge
        let x = cos(angle) * edgeX;
        let y = sin(angle) * edgeY;
        
        // Constrain to screen rectangle
        if (abs(x) > width / 2 - 30) {
          x = (width / 2 - 30) * sign(x);
          y = x * tan(angle);
        }
        if (abs(y) > height / 2 - 30) {
          y = (height / 2 - 30) * sign(y);
          x = y / tan(angle);
        }
        
        resetMatrix();
        translate(width/2 + x, height/2 + y);
        rotate(angle);
        
        // Draw Arrow
        fill(255, 50, 50, map(d, 500, 1500, 255, 0));
        noStroke();
        triangle(0, 0, -15, -7, -15, 7);
        pop();
      }
    }
  }
}

function sign(x) {
  return x >= 0 ? 1 : -1;
}

function drawLeaderboard() {
  // Collect all vehicles
  let allVehicles = [
    {
      Label: playerName,
      score: totalScore,
      mass: player.mass,
      color: color(0, 255, 0),
    },
  ];
  for (let ai of aiVehicles) {
    // Determine color based on mass comparison with player
    let displayColor = color(200);
    if (ai.mass > player.mass * 1.3) {
      displayColor = color(255, 50, 50); // Threat (Red)
    } else if (ai.mass < player.mass * 0.7) {
      displayColor = color(50, 255, 50); // Prey (Green)
    }

    allVehicles.push({
      Label: "AI",
      score: ai.score || 0,
      mass: ai.mass,
      color: displayColor,
    });
  }

  // Sort by Score
  allVehicles.sort((a, b) => b.score - a.score);

  // Draw
  push();
  resetMatrix();
  
  let boardW = 200 * UI_SCALE;
  let boardH = 300 * UI_SCALE;
  let margin = 20 * UI_SCALE;
  
  translate(width - boardW - margin, margin);

  // Background
  noStroke();
  fill(0, 150);
  rect(0, 0, boardW, boardH, 10 * UI_SCALE);

  // Header
  fill(255, 215, 0);
  textSize(16 * UI_SCALE);
  textAlign(CENTER, TOP);
  text("LEADERBOARD", boardW / 2, 10 * UI_SCALE);

  // List
  textSize(12 * UI_SCALE);
  textAlign(LEFT, TOP);
  let y = 40 * UI_SCALE;

  for (let i = 0; i < Math.min(allVehicles.length, 10); i++) {
    let v = allVehicles[i];

    // Rank
    fill(200);
    text(`#${i + 1}`, 10 * UI_SCALE, y);

    // Name
    fill(v.color);
    text(v.Label.substring(0, 8), 40 * UI_SCALE, y);

    // Score
    fill(255);
    textAlign(RIGHT, TOP);
    text(Math.floor(v.score), boardW - 40 * UI_SCALE, y);

    // Mass (Small) - Only if not too cramped
    if (boardW > 150 * UI_SCALE) {
        fill(150);
        textSize(10 * UI_SCALE);
        text(`${Math.floor(v.mass)}kg`, boardW - 5 * UI_SCALE, y + 2 * UI_SCALE);
        textSize(12 * UI_SCALE);
    }

    textAlign(LEFT, TOP);
    y += 24 * UI_SCALE;
  }
  pop();
}

function drawVictoryScreen() {
  push();
  resetMatrix();
  
  // Victory overlay
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  
  // Victory title with glow
  textAlign(CENTER, CENTER);
  fill(255, 215, 0, 50);
  textSize(80 * UI_SCALE);
  textStyle(BOLD);
  text("🏆 VICTOIRE! 🏆", width / 2 + 4, height / 2 - 100 * UI_SCALE + 4);
  
  fill(255, 215, 0);
  text("🏆 VICTOIRE! 🏆", width / 2, height / 2 - 100 * UI_SCALE);
  
  // Subtitle - dynamic based on mode
  fill(200, 255, 200);
  textSize(24 * UI_SCALE);
  textStyle(NORMAL);
  let subtitle = "Vous êtes le dernier survivant!";
  if (gameModeManager.currentMode === GameModeManager.MODES.KING_OF_THE_HILL) {
    subtitle = "Vous avez conquis la colline!";
  } else if (gameModeManager.currentMode === GameModeManager.MODES.TDM) {
    let playerTeam = player.team === 1 ? "CYAN" : "ORANGE";
    subtitle = `Team ${playerTeam} a gagné!`;
  }
  text(subtitle, width / 2, height / 2 - 40 * UI_SCALE);
  
  // Score
  fill(255);
  textSize(32 * UI_SCALE);
  let displayScore = totalScore;
  if (gameModeManager.currentMode === GameModeManager.MODES.KING_OF_THE_HILL) {
    displayScore = Math.floor(player.score || 0);
  } else if (gameModeManager.currentMode === GameModeManager.MODES.TDM) {
    displayScore = gameModeManager.teamKills[player.team];
  }
  text(`Score: ${displayScore}`, width / 2, height / 2 + 20 * UI_SCALE);
  
  pop();
  
  // Larger buttons on mobile
  let buttonW = isMobileDevice() ? 200 * UI_SCALE : 160 * UI_SCALE;
  let buttonH = isMobileDevice() ? 70 * UI_SCALE : 50 * UI_SCALE;
  let buttonGap = 20 * UI_SCALE;
  
  if (isPortrait) {
      let buttonY = height - 180 * UI_SCALE;
      drawGameOverButton(width / 2 - buttonW / 2, buttonY, buttonW, buttonH, "REPLAY", "R");
      drawGameOverButton(width / 2 - buttonW / 2, buttonY + buttonH + buttonGap, buttonW, buttonH, "MENU", "M");
  } else {
      let totalButtonWidth = buttonW * 2 + buttonGap;
      let startX = width / 2 - totalButtonWidth / 2;
      let buttonY = height - 150 * UI_SCALE;
      drawGameOverButton(startX, buttonY, buttonW, buttonH, "REPLAY", "R");
      drawGameOverButton(startX + buttonW + buttonGap, buttonY, buttonW, buttonH, "MENU", "M");
  }

  push();
  fill(150, 150, 200);
  textSize(14 * UI_SCALE);
  textAlign(CENTER);
  textStyle(NORMAL);
  text("Press R to replay or M to return to menu", width / 2, height - 40 * UI_SCALE);
  pop();
}

function drawGameOverScreen() {
  if (uiManager && gameStats) {
      uiManager.showEndScreenStats(gameStats);
  }

  // Larger buttons on mobile
  let buttonW = isMobileDevice() ? 200 * UI_SCALE : 160 * UI_SCALE;
  let buttonH = isMobileDevice() ? 70 * UI_SCALE : 50 * UI_SCALE;
  let buttonGap = 20 * UI_SCALE;
  
  if (isPortrait) {
      let buttonY = height - 180 * UI_SCALE;
      drawGameOverButton(width / 2 - buttonW / 2, buttonY, buttonW, buttonH, "REPLAY", "R");
      drawGameOverButton(width / 2 - buttonW / 2, buttonY + buttonH + buttonGap, buttonW, buttonH, "MENU", "M");
  } else {
      let totalButtonWidth = buttonW * 2 + buttonGap;
      let startX = width / 2 - totalButtonWidth / 2;
      let buttonY = height - 150 * UI_SCALE;
      drawGameOverButton(startX, buttonY, buttonW, buttonH, "REPLAY", "R");
      drawGameOverButton(startX + buttonW + buttonGap, buttonY, buttonW, buttonH, "MENU", "M");
  }

  push();
  fill(150, 150, 200);
  textSize(14 * UI_SCALE);
  textAlign(CENTER);
  textStyle(NORMAL);
  text("Press R to replay or M to return to menu", width / 2, height - 40 * UI_SCALE);
  pop();
}

function drawGameOverButton(x, y, w, h, label, key) {
  // Larger hit area on mobile
  let hitPadding = isMobileDevice() ? 15 : 0;
  let isHovering = mouseX > x - hitPadding && 
                   mouseX < x + w + hitPadding && 
                   mouseY > y - hitPadding && 
                   mouseY < y + h + hitPadding;

  // Button color changes on hover
  if (isHovering) {
    fill(100, 255, 150);
  } else {
    fill(100, 200, 255);
  }

  stroke(150, 255, 200);
  strokeWeight(isMobileDevice() ? 3 : 2);
  rectMode(CORNER);
  rect(x, y, w, h, 8);

  // Button text
  fill(10, 10, 30);
  textSize(isMobileDevice() ? 24 * UI_SCALE : 20 * UI_SCALE);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text(label, x + w / 2, y + h / 2);
}

function drawMenuOverlay() {
  push();
  resetMatrix(); // Ensure we are in screen space

  // Semi-transparent Overlay (lighter so game is visible)
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  
  // Check if mobile
  let isMobile = (typeof mobileManager !== 'undefined' && mobileManager.isMobile);

  // Responsive sizing
  let titleSize = isMobile ? 36 * UI_SCALE : 48 * UI_SCALE;
  let warningSize = isMobile ? 14 * UI_SCALE : 16 * UI_SCALE;
  let instructionSize = isMobile ? 12 * UI_SCALE : 14 * UI_SCALE;
  let buttonW = isMobile ? 140 * UI_SCALE : 160 * UI_SCALE;
  let buttonH = isMobile ? 60 * UI_SCALE : 50 * UI_SCALE;
  let buttonGap = isMobile ? 15 * UI_SCALE : 20 * UI_SCALE;
  
  // Vertical spacing
  let centerY = height / 2;
  let titleY = centerY - (isMobile ? 100 * UI_SCALE : 80 * UI_SCALE);
  let warningY = centerY - (isMobile ? 50 * UI_SCALE : 40 * UI_SCALE);
  let instructionY = centerY - (isMobile ? 10 * UI_SCALE : 10 * UI_SCALE);
  let buttonY = centerY + (isMobile ? 60 * UI_SCALE : 50 * UI_SCALE);

  // Title
  fill(100, 200, 255);
  textSize(titleSize);
  textStyle(BOLD);
  text("MENU", width / 2, titleY);

  // Warning
  fill(255, 150, 50);
  textSize(warningSize);
  textStyle(BOLD);
  text("⚠️ GAME IS STILL ACTIVE!", width / 2, warningY);

  // Instructions (hide on mobile if too cramped)
  if (!isMobile || height > 600) {
    fill(200, 200, 200);
    textSize(instructionSize);
    textStyle(NORMAL);
    text(isMobile ? "Tap a button" : "Press ESC to close or click a button", width / 2, instructionY);
  }

  // Button layout - stack vertically on mobile if screen is narrow
  let stackButtons = isMobile && width < 400;
  
  if (stackButtons) {
    // Vertical stack
    let buttonX = width / 2 - buttonW / 2;
    
    // Close button
    drawGameOverButton(
      buttonX,
      buttonY - buttonH - buttonGap / 2,
      buttonW,
      buttonH,
      "CLOSE",
      "",
    );
    
    // Quit button
    drawGameOverButton(
      buttonX,
      buttonY + buttonGap / 2,
      buttonW,
      buttonH,
      "QUIT TO MENU",
      "",
    );
  } else {
    // Horizontal layout
    let totalButtonWidth = buttonW * 2 + buttonGap;
    let startX = width / 2 - totalButtonWidth / 2;
    
    // Close button
    drawGameOverButton(
      startX,
      buttonY,
      buttonW,
      buttonH,
      "CLOSE",
      isMobile ? "" : "ESC",
    );
    
    // Quit button
    drawGameOverButton(
      startX + buttonW + buttonGap,
      buttonY,
      buttonW,
      buttonH,
      "QUIT",
      isMobile ? "" : "Q",
    );
  }

  pop();
}

function drawHealthBar(v) {
  if (v === player) {
    // Large HUD bar
    push();
    noStroke();
    fill(50, 100);
    let barW = 200 * UI_SCALE;
    let barH = 20 * UI_SCALE;
    let bx = 20 * UI_SCALE;
    let by = 20 * UI_SCALE;
    rect(bx, by, barW, barH, 5 * UI_SCALE);

    fill(v.health > 30 ? color(0, 255, 0) : color(255, 0, 0));
    let w = map(v.health, 0, v.maxHealth, 0, barW);
    rect(bx, by, w, barH, 5 * UI_SCALE);

    fill(255);
    textSize(12 * UI_SCALE);
    textAlign(CENTER, CENTER);
    text(`${floor(v.health)}%`, bx + barW/2, by + barH/2);
    pop();
  } else {
    // Small overhead bar
    push();
    translate(v.pos.x, v.pos.y);
    noStroke();
    fill(50, 150);
    rectMode(CENTER);
    rect(0, -30, 40, 4);

    fill(v.health > 30 ? color(0, 255, 0) : color(255, 0, 0));
    rectMode(CORNER);
    let w = map(v.health, 0, v.maxHealth, 0, 40);
    rect(-20, -32, w, 4);
    pop();
  }
}

// =============================================================================
// MENU FUNCTIONS
// =============================================================================

function drawMenu() {
  // Dark background
  fill(10, 10, 30);
  rect(0, 0, width, height);

  // Title
  fill(100, 200, 255);
  textSize(60 * UI_SCALE);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text("WANDER RACE", width / 2, height / 2 - (isPortrait ? 250 : 150) * UI_SCALE);

  // Subtitle
  fill(150, 200, 255);
  textSize(24 * UI_SCALE);
  textStyle(NORMAL);
  text("Cosmic Derby", width / 2, height / 2 - (isPortrait ? 200 : 100) * UI_SCALE);

  // Audio Context Status - More prominent overlay if not running
  if (typeof getAudioContext === 'function' && getAudioContext().state !== 'running') {
    push();
    fill(0, 0, 0, 100);
    rect(0, 0, width, height);
    fill(255, 100, 100);
    textSize(20 * UI_SCALE);
    textStyle(BOLD);
    text("⚠️ TAP ANYWHERE TO UNMUTE SOUND", width / 2, height / 2 - (isPortrait ? 220 : 120) * UI_SCALE);
    pop();
  }

  // Instructions
  fill(200, 200, 200);
  textSize(14 * UI_SCALE);
  textStyle(NORMAL);
  let instrY = height / 2 - (isPortrait ? 100 : 40) * UI_SCALE;
  text("Enter your name and click PLAY", width / 2, instrY);

  // Input field background (only show on desktop or if no HTML input)
  if (!isMobileDevice() || !document.getElementById('mobileNameInput')) {
    fill(30, 30, 50);
    stroke(100, 200, 255);
    strokeWeight(2);
    let inputY = height / 2 - (isPortrait ? 50 : -10) * UI_SCALE;
    rect(width / 2 - 150 * UI_SCALE, inputY, 300 * UI_SCALE, 50 * UI_SCALE, 5);

    // Player name input display - centered
    fill(200, 200, 200);
    textSize(22 * UI_SCALE);
    textAlign(CENTER, CENTER);
    text(
      playerName + (frameCount % 20 < 10 ? "|" : ""),
      width / 2,
      inputY + 27 * UI_SCALE,
    );
  } else {
    // On mobile, show instruction to tap the input field
    fill(200, 200, 200);
    textSize(18 * UI_SCALE);
    textAlign(CENTER, CENTER);
    text("👆 Tap the input field above to enter your name", width / 2, height / 2 + 10 * UI_SCALE);
  }

  // Play button
  drawPlayButton();

  // Shop/Skins Button
  drawSkinsButton();

  // Leaderboards Button
  drawLeaderboardsButton();

  // Mode Selection
  drawModeButtons();

  // Developer credits
  push();
  let rectW = min(width - 40, 600 * UI_SCALE);
  let rectH = 30 * UI_SCALE;
  fill(20, 30, 60, 200);
  stroke(150, 200, 255);
  strokeWeight(1);
  let creditsY = height - (isPortrait ? 40 : 30) * UI_SCALE;
  rect(width / 2 - rectW/2, creditsY - rectH/2, rectW, rectH, 5);

  fill(255);
  textSize(10 * UI_SCALE);
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
  text(
    "Game developed by Mouhssine Jaiba & Hamza ech-choukairi",
    width / 2,
    creditsY
  );
  pop();
}

function drawPlayButton() {
  // Larger buttons on mobile
  let buttonW = isMobileDevice() ? 200 * UI_SCALE : 150 * UI_SCALE;
  let buttonH = isMobileDevice() ? 70 * UI_SCALE : 50 * UI_SCALE;
  let buttonX = width / 2;
  let buttonY = height / 2 + (isPortrait ? 30 : 120) * UI_SCALE; // Adjusted for name input

  // Larger hit area for mobile (invisible padding)
  let hitPadding = isMobileDevice() ? 20 : 0;
  let isHovering = mouseX > buttonX - buttonW / 2 - hitPadding && 
                   mouseX < buttonX + buttonW / 2 + hitPadding && 
                   mouseY > buttonY - buttonH / 2 - hitPadding && 
                   mouseY < buttonY + buttonH / 2 + hitPadding;

  fill(isHovering ? color(100, 255, 150) : color(100, 200, 255));
  stroke(150, 255, 200);
  strokeWeight(3);
  rect(buttonX - buttonW / 2, buttonY - buttonH / 2, buttonW, buttonH, 8);

  fill(10, 10, 30);
  textSize(isMobileDevice() ? 28 * UI_SCALE : 24 * UI_SCALE);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text("PLAY", buttonX, buttonY);
}

function drawModeButtons() {
    // Larger buttons on mobile
    let buttonW = isMobileDevice() ? 180 * UI_SCALE : 140 * UI_SCALE;
    let buttonH = isMobileDevice() ? 55 * UI_SCALE : 35 * UI_SCALE;
    let modes = Object.values(GameModeManager.MODES);
    
    textAlign(CENTER, CENTER);
    textSize(16 * UI_SCALE);
    fill(255, 200);
    
    if (isPortrait) {
        // Pushed further down to separate from Skins/Leaderboards buttons (which are at +100)
        let startY = height / 2 + 180 * UI_SCALE; 
        text("MODE:", width / 2, startY - 25 * UI_SCALE);
        for (let i = 0; i < modes.length; i++) {
            let y = startY + i * (buttonH + 15 * UI_SCALE); // More spacing on mobile
            drawIndividualModeButton(width / 2, y, buttonW, buttonH, modes[i]);
        }
    } else {
        let buttonY = height / 2 + 190 * UI_SCALE;
        let spacing = isMobileDevice() ? 200 * UI_SCALE : 160 * UI_SCALE;
        text("CHOOSE MODE:", width / 2, buttonY - 40 * UI_SCALE);
        for (let i = 0; i < modes.length; i++) {
            let x = width / 2 + (i - (modes.length-1)/2) * spacing;
            drawIndividualModeButton(x, buttonY, buttonW, buttonH, modes[i]);
        }
    }
}

function drawIndividualModeButton(x, y, w, h, mode) {
    let isSelected = gameModeManager.currentMode === mode;
    
    // Larger hit area for mobile
    let hitPadding = isMobileDevice() ? 15 : 0;
    let isHovering = mouseX > x - w/2 - hitPadding && 
                     mouseX < x + w/2 + hitPadding && 
                     mouseY > y - h/2 - hitPadding && 
                     mouseY < y + h/2 + hitPadding;

    if (isSelected) fill(255, 215, 0);
    else if (isHovering) fill(150, 255, 200);
    else fill(50, 100, 150);

    stroke(255, 150);
    strokeWeight(isMobileDevice() ? 2 : 1);
    rect(x - w/2, y - h/2, w, h, 8);
    
    fill(isSelected ? 0 : 255);
    noStroke();
    textSize(isMobileDevice() ? 13 * UI_SCALE : 10 * UI_SCALE);
    text(mode.toUpperCase(), x, y);
}

function startGame() {
  // Trim whitespace and set player name, default to "Player" if empty
  playerName = playerName.trim() || "Player";
  
  // Hide mobile input if it exists
  const mobileInput = document.getElementById('mobileNameInput');
  if (mobileInput) {
    mobileInput.style.display = 'none';
    mobileInput.blur(); // Hide keyboard
  }
  
  gameState = "PLAYING";
  initGame();
  scoreRecorded = false; // Reset flag for new game
}

function returnToMenu() {
  // Reset game state and go back to menu
  playerName = "";
  gameState = "MENU";
  totalScore = 0;
  scoreRecorded = false; // Reset flag
  
  // Show mobile input if on mobile
  const mobileInput = document.getElementById('mobileNameInput');
  if (mobileInput && isMobileDevice()) {
    mobileInput.style.display = 'block';
    mobileInput.value = '';
  }
}

function mousePressed() {
  let buttonX, buttonY, buttonW, buttonH, spacing, modes;
  
  // Ensure Audio Context is running (Browser Policy)
  resumeAudio();

  // Social click priority
  if (socialManager.handleMouseClick()) return;

  // Mode: MENU
  if (gameState === "MENU") {
    // Play button
    let playW = 150 * UI_SCALE;
    let playH = 50 * UI_SCALE;
    let playX = width / 2;
    let playY = height / 2 + (isPortrait ? 30 : 120) * UI_SCALE;
    
    if (mouseOverButton(playX, playY, playW, playH)) {
      startGame();
      return;
    }

    // Skins button
    let skinsW = 140 * UI_SCALE;
    let skinsH = 45 * UI_SCALE;
    let skinsX = width / 2 - (isPortrait ? 80 : 160) * UI_SCALE;
    let skinsY = height / 2 + (isPortrait ? 100 : 120) * UI_SCALE;
    
    if (mouseOverButton(skinsX, skinsY, skinsW, skinsH)) {
        gameState = "SKINS";
        return;
    }

    // Mode button clicks
    let modes = Object.values(GameModeManager.MODES);
    let modeW = 140 * UI_SCALE;
    let modeH = 35 * UI_SCALE;

    if (isPortrait) {
        let startY = height / 2 + 180 * UI_SCALE;
        for (let i = 0; i < modes.length; i++) {
            let y = startY + i * (modeH + 8 * UI_SCALE);
            if (mouseOverButton(width/2, y, modeW, modeH)) {
                gameModeManager.setMode(modes[i]);
                if (typeof soundManager !== 'undefined') soundManager.playStarCollect();
                return;
            }
        }
    } else {
        let modeY = height / 2 + 190 * UI_SCALE;
        let spacing = 160 * UI_SCALE;
        for (let i = 0; i < modes.length; i++) {
            let x = width / 2 + (i - (modes.length-1)/2) * spacing;
            if (mouseOverButton(x, modeY, modeW, modeH)) {
                gameModeManager.setMode(modes[i]);
                if (typeof soundManager !== 'undefined') soundManager.playStarCollect();
                return;
            }
        }
    }

    // Leaderboards button
    let leadX = width / 2 + (isPortrait ? 80 : 160) * UI_SCALE;
    if (mouseOverButton(leadX, skinsY, skinsW, skinsH)) {
        gameState = "LEADERBOARD";
        return;
    }
  }

  // Mode: LEADERBOARD
  if (gameState === "LEADERBOARD") {
    let bw = 150 * UI_SCALE;
    let bh = 50 * UI_SCALE;
    let bx = width/2;
    let by = height - 100 * UI_SCALE;
    if (mouseOverButton(bx, by, bw, bh)) {
        gameState = "MENU";
        return;
    }
  }

  // Mode: SKINS
  if (gameState === "SKINS") {
    let bw = 150 * UI_SCALE;
    let bh = 50 * UI_SCALE;
    let bx = width/2;
    let by = height - 100 * UI_SCALE;
    if (mouseOverButton(bx, by, bw, bh)) {
        gameState = "MENU";
        return;
    }

    let skins = PlayerProfile.SKINS.FREE.concat(PlayerProfile.SKINS.PREMIUM);
    let cols = isPortrait ? 2 : 3;
    let cardW = 200 * UI_SCALE;
    let cardH = 130 * UI_SCALE;
    let gap = 20 * UI_SCALE;
    for (let i = 0; i < skins.length; i++) {
        let col = i % cols, row = floor(i / cols);
        let x = width/2 + (col - (cols-1)/2) * (cardW + gap);
        let y = (isPortrait ? 180 : 250) * UI_SCALE + row * (cardH + gap);
        if (mouseOverButton(x, y, cardW, cardH)) {
            profile.setSkin(skins[i].id);
            if (typeof soundManager !== 'undefined') soundManager.playStarCollect();
            return;
        }
    }
  }

  // Mode: GAME_OVER or VICTORY
  if (gameState === "GAME_OVER" || gameState === "VICTORY") {
    let bw = 160 * UI_SCALE;
    let bh = 50 * UI_SCALE;
    let bg = 20 * UI_SCALE;
    
    if (isPortrait) {
        let by = height - 180 * UI_SCALE;
        // Replay
        if (mouseOverButton(width/2, by + bh/2, bw, bh)) { 
          gameState = "PLAYING"; 
          initGame(); 
          return; 
        }
        // Menu
        if (mouseOverButton(width/2, by + bh + bg + bh/2, bw, bh)) { returnToMenu(); return; }
    } else {
        let tw = bw * 2 + bg;
        let sx = width/2 - tw/2;
        let by = height - 150 * UI_SCALE;
        // Replay
        if (mouseX > sx && mouseX < sx + bw && mouseY > by && mouseY < by + bh) { 
          gameState = "PLAYING"; 
          initGame(); 
          return; 
        }
        // Menu
        if (mouseX > sx + bw + bg && mouseX < sx + bw + bg + bw && mouseY > by && mouseY < by + bh) { returnToMenu(); return; }
    }
  }

  // MENU OVERLAY (ESC menu during gameplay)
  if (showMenu && gameState === "PLAYING") {
    let isMobile = (typeof mobileManager !== 'undefined' && mobileManager.isMobile);
    let buttonW = isMobile ? 140 * UI_SCALE : 160 * UI_SCALE;
    let buttonH = isMobile ? 60 * UI_SCALE : 50 * UI_SCALE;
    let buttonGap = isMobile ? 15 * UI_SCALE : 20 * UI_SCALE;
    let centerY = height / 2;
    let buttonY = centerY + (isMobile ? 60 * UI_SCALE : 50 * UI_SCALE);
    
    // Stack vertically on narrow mobile screens
    let stackButtons = isMobile && width < 400;
    
    if (stackButtons) {
      let buttonX = width / 2 - buttonW / 2;
      
      // Close button (top)
      if (mouseX > buttonX && mouseX < buttonX + buttonW && 
          mouseY > buttonY - buttonH - buttonGap / 2 && mouseY < buttonY - buttonGap / 2) {
        showMenu = false;
        return;
      }
      
      // Quit button (bottom)
      if (mouseX > buttonX && mouseX < buttonX + buttonW && 
          mouseY > buttonY + buttonGap / 2 && mouseY < buttonY + buttonH + buttonGap / 2) {
        showMenu = false;
        returnToMenu();
        return;
      }
    } else {
      // Horizontal layout
      let totalW = buttonW * 2 + buttonGap;
      let startX = width / 2 - totalW / 2;
      
      // Close button (left)
      if (mouseX > startX && mouseX < startX + buttonW && 
          mouseY > buttonY && mouseY < buttonY + buttonH) {
        showMenu = false;
        return;
      }
      
      // Quit button (right)
      if (mouseX > startX + buttonW + buttonGap && mouseX < startX + buttonW * 2 + buttonGap && 
          mouseY > buttonY && mouseY < buttonY + buttonH) {
        showMenu = false;
        returnToMenu();
        return;
      }
    }
  }
}

/**
 * Robust Audio Resume for Mobile/Browser Policies
 */
function resumeAudio() {
  if (typeof soundManager !== 'undefined') {
      soundManager.resume();
  }
  userStartAudio(); // p5.sound helper
}

function touchStarted() {
  resumeAudio();
  // Optional: prevent default if specifically handling a button, but joystick needs it
  // return false; 
}

// Helper to simplify button hover checks
function mouseOverButton(x, y, w, h) {
  return mouseX > x - w / 2 && mouseX < x + w / 2 && mouseY > y - h / 2 && mouseY < y + h / 2;
}

function keyPressed() {
  // Menu input handling
  if (gameState === "MENU") {
    if (key === "Backspace") {
      playerName = playerName.slice(0, -1);
      return false;
    } else if (key.length === 1 && playerName.length < 20) {
      // Allow letters, numbers, and spaces
      if (/[a-zA-Z0-9 ]/.test(key)) {
        playerName += key;
        return false;
      }
    }
    return false;
  }

  // Game Over or Victory handling
  if (gameState === "GAME_OVER" || gameState === "VICTORY") {
    if (key === "r" || key === "R") {
      gameState = "PLAYING";
      initGame();
      return false;
    }
    if (key === "m" || key === "M") {
      returnToMenu();
      return false;
    }
  }

  // Pause menu handling (Escape key)
  if (gameState === "PLAYING" && key === "Escape") {
    showMenu = !showMenu;
    return false;
  }

  // Ensure Audio Context is running
  userStartAudio();

  if (key === "d" || key === "D") Vehicle.debug = !Vehicle.debug;
  if ((key === "h" || key === "H") && gameState === "PLAYING")
    showDashboard = !showDashboard;

  if (key === " ") {
    if (gameState === "MENU") {
      startGame();
    } else if (gameState === "PLAYING") {
      player.dash();
    }
  }
}
// =============================================================================
// HELP MENU & BUTTON
// =============================================================================

function drawSkinsButton() {
  // Larger on mobile
  let buttonW = isMobileDevice() ? 170 * UI_SCALE : 140 * UI_SCALE;
  let buttonH = isMobileDevice() ? 60 * UI_SCALE : 45 * UI_SCALE;
  let buttonX = width / 2;
  let buttonY = height / 2 + (isPortrait ? 100 : 120) * UI_SCALE; // Spaced below Play
  
  // Left of Play in landscape, Below in portrait?
  // Let's keep them side-by-side but smaller for mobile
  let x = buttonX - (isPortrait ? 80 : 160) * UI_SCALE;
  
  // Larger hit area for mobile
  let hitPadding = isMobileDevice() ? 15 : 0;
  let isHovering = mouseX > x - buttonW/2 - hitPadding && 
                   mouseX < x + buttonW/2 + hitPadding && 
                   mouseY > buttonY - buttonH/2 - hitPadding && 
                   mouseY < buttonY + buttonH/2 + hitPadding;
  
  push();
  rectMode(CENTER);
  fill(isHovering ? color(255, 100, 255) : color(180, 50, 180));
  stroke(255, 150, 255);
  strokeWeight(isMobileDevice() ? 3 : 2);
  rect(x, buttonY, buttonW, buttonH, 8);
  
  fill(255);
  noStroke();
  textSize(isMobileDevice() ? 22 * UI_SCALE : 20 * UI_SCALE);
  textAlign(CENTER, CENTER);
  text("SKINS", x, buttonY);
  pop();
}

function drawSkinsMenu() {
    push();
    resetMatrix();
    fill(10, 10, 30, 230);
    rect(0, 0, width, height);

    fill(255, 100, 255);
    textSize(36 * UI_SCALE);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    text("GARAGE & SKINS", width / 2, 80 * UI_SCALE);

    let skins = PlayerProfile.SKINS.FREE.concat(PlayerProfile.SKINS.PREMIUM);
    let cols = isPortrait ? 2 : 3;
    let cardW = 200 * UI_SCALE;
    let cardH = 130 * UI_SCALE;
    let gap = 20 * UI_SCALE;

    for (let i = 0; i < skins.length; i++) {
        let skin = skins[i];
        let col = i % cols;
        let row = floor(i / cols);
        let x = width/2 + (col - (cols-1)/2) * (cardW + gap);
        let y = (isPortrait ? 180 : 250) * UI_SCALE + row * (cardH + gap);

        let isUnlocked = profile.data.unlockedSkins.includes(skin.id);
        let isSelected = profile.data.currentSkin === skin.id;
        
        rectMode(CENTER);
        if (isSelected) fill(255, 215, 0, 100);
        else if (isUnlocked) fill(30, 30, 50, 200);
        else fill(10, 10, 20, 150);
        
        stroke(isUnlocked ? 255 : 100);
        strokeWeight(isSelected ? 3 : 1);
        rect(x, y, cardW, cardH, 10);

        fill(isUnlocked ? 255 : 150);
        noStroke();
        textSize(16 * UI_SCALE);
        textStyle(BOLD);
        text(skin.name, x, y - 20 * UI_SCALE);
        
        textSize(10 * UI_SCALE);
        textStyle(NORMAL);
        fill(isUnlocked ? color(0, 255, 0) : color(255, 100, 100));
        text(isUnlocked ? "UNLOCKED" : (skin.requirement || skin.price), x, y + 10 * UI_SCALE);

        if (isSelected) {
            fill(255, 215, 0);
            text("EQUIPPED", x, y + 40 * UI_SCALE);
        }
    }

    // Back Button
    let bw = 150 * UI_SCALE;
    let bh = 50 * UI_SCALE;
    let bx = width/2;
    let by = height - 100 * UI_SCALE;
    let overBack = mouseOverButton(bx, by, bw, bh);
    
    fill(overBack ? color(100, 255, 150) : color(100, 200, 255));
    rectMode(CENTER);
    rect(bx, by, bw, bh, 5);
    
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(20 * UI_SCALE);
    text("BACK", bx, by);
    pop();
}

function drawLeaderboardsButton() {
  // Larger on mobile
  let buttonW = isMobileDevice() ? 170 * UI_SCALE : 140 * UI_SCALE;
  let buttonH = isMobileDevice() ? 60 * UI_SCALE : 45 * UI_SCALE;
  let buttonX = width / 2;
  let buttonY = height / 2 + (isPortrait ? 100 : 120) * UI_SCALE; // Same Y as Skins
  
  // Right of Play in landscape, side-by-side with Skins in portrait
  let x = buttonX + (isPortrait ? 80 : 160) * UI_SCALE;
  
  // Larger hit area for mobile
  let hitPadding = isMobileDevice() ? 15 : 0;
  let isHovering = mouseX > x - buttonW/2 - hitPadding && 
                   mouseX < x + buttonW/2 + hitPadding && 
                   mouseY > buttonY - buttonH/2 - hitPadding && 
                   mouseY < buttonY + buttonH/2 + hitPadding;
  
  push();
  rectMode(CENTER);
  fill(isHovering ? color(255, 215, 0) : color(180, 150, 0));
  stroke(255, 255, 150);
  strokeWeight(isMobileDevice() ? 3 : 2);
  rect(x, buttonY, buttonW, buttonH, 8);
  
  fill(0);
  noStroke();
  textSize(isMobileDevice() ? 15 * UI_SCALE : 16 * UI_SCALE);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text("LEADERBOARD", x, buttonY);
  pop();
}

function drawLeaderboardsMenu() {
    push();
    resetMatrix();
    fill(10, 10, 30, 240);
    rect(0, 0, width, height);

    fill(255, 215, 0);
    textSize(36 * UI_SCALE); // Scaled
    textAlign(CENTER);
    textStyle(BOLD);
    text("GLOBAL LEGENDS", width / 2, 80 * UI_SCALE);

    let leaderboard = profile.data.leaderboard || [];
    let startY = 180 * UI_SCALE;
    let rowH = 40 * UI_SCALE;

    // Header - Responsive Column Offsets
    let col1 = width/2 - 250 * UI_SCALE;
    let col2 = width/2 - 180 * UI_SCALE;
    let col3 = width/2 + 50 * UI_SCALE;
    let col4 = width/2 + 150 * UI_SCALE;

    if (isPortrait) {
        col1 = 20 * UI_SCALE;
        col2 = 80 * UI_SCALE;
        col3 = width - 120 * UI_SCALE;
        col4 = width - 50 * UI_SCALE;
    }

    fill(200);
    textSize(14 * UI_SCALE);
    textAlign(LEFT);
    text("RANK", col1, startY);
    text("PLAYER", col2, startY);
    text("SCORE", col3, startY);
    text("DATE", col4, startY);
    
    stroke(255, 50);
    line(col1 - 10, startY + 10, col4 + 20, startY + 10);

    for (let i = 0; i < 10; i++) {
        let y = startY + 40 * UI_SCALE + i * rowH;
        let entry = leaderboard[i];

        if (i < 3) fill(255, 215, 0); // Gold, Silver, Bronze effect
        else fill(255);

        textAlign(LEFT);
        textSize(16 * UI_SCALE);
        text(`#${i + 1}`, col1, y);
        
        if (entry) {
            text(entry.name.substring(0, isPortrait ? 10 : 20), col2, y);
            text(entry.score, col3, y);
            textSize(10 * UI_SCALE);
            fill(150);
            text(entry.date, col4, y);
        } else {
            fill(100);
            text("---", col2, y);
            text("0", col3, y);
        }
    }

    // Back Button
    let bw = 150 * UI_SCALE;
    let bh = 50 * UI_SCALE;
    let bx = width/2;
    let by = height - 100 * UI_SCALE;
    let overBack = mouseOverButton(bx, by, bw, bh);
    
    fill(overBack ? color(100, 255, 150) : color(100, 200, 255));
    rectMode(CENTER);
    rect(bx, by, bw, bh, 5);
    
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(20 * UI_SCALE);
    text("BACK", bx, by);
    pop();
}
