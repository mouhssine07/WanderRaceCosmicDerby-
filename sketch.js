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

let gameState = "MENU"; // 'MENU', 'PLAYING', 'GAME_OVER'
let playerName = "";
let isPaused = false; // Pause state for in-game menu
let showDashboard = true; // Dashboard toggle (H key)

let player;
let aiVehicles = [];
let points = []; // Power-ups
let stars = []; // Score Stars (New)
let obstacles = [];
let particles;
let totalScore = 0;

// Systems
let levelManager; // Kept for basic scoring tracking if needed, but mainly for legacy
let dashboard; // Will need updates for new parameters

// Environment
let weatherState = "clear"; // 'clear' or 'rain'
let weatherTimer = 0;
let tractionMultiplier = 1.0;

// Camera
let camX = 0;
let camY = 0;

// Assets
let rocketImage;

// =============================================================================
// P5.JS LIFECYCLE
// =============================================================================

function preload() {
  rocketImage = loadImage("assets/vehicule.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight); // Full window for open world feel

  // Initialize Dashboard
  if (typeof Dashboard !== "undefined") {
    dashboard = new Dashboard();
    if (dashboard && dashboard.init) dashboard.init();
  }

  // Start with menu
  gameState = "MENU";
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function initGame() {
  // Spawn Player
  let startX = random(100, WORLD_WIDTH - 100);
  let startY = random(100, WORLD_HEIGHT - 100);
  player = new PlayerVehicle(startX, startY, rocketImage);

  // Spawn AI
  aiVehicles = [];
  for (let i = 0; i < INITIAL_AI_COUNT; i++) {
    spawnAI();
  }

  // Spawn Power-ups
  points = [];
  for (let i = 0; i < 15; i++) {
    spawnPoint();
  }

  // Spawn Stars
  stars = [];
  for (let i = 0; i < 30; i++) {
    spawnStar();
  }

  // Spawn Obstacles
  obstacles = [];
  for (let i = 0; i < 15; i++) {
    spawnObstacle();
  }

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

// =============================================================================
// MAIN LOOP
// =============================================================================

function draw() {
  background(10, 10, 30);

  // Handle menu state
  if (gameState === "MENU") {
    drawMenu();
    return;
  }

  // Handle game over state - still draw world behind overlay
  if (gameState === "GAME_OVER") {
    updateWeather();
  }

  // Camera
  let targetCamX = width / 2 - player.pos.x;
  let targetCamY = height / 2 - player.pos.y;
  camX = lerp(camX, targetCamX, 0.1);
  camY = lerp(camY, targetCamY, 0.1);

  push();
  translate(camX, camY);

  drawWorldGrid();

  if (gameState === "PLAYING" || gameState === "GAME_OVER") {
    // --- STARS (Score) ---
    for (let i = stars.length - 1; i >= 0; i--) {
      let s = stars[i];
      s.update();
      s.show();

      // Player
      if (s.checkCapture(player.pos)) {
        handleStarCapture(s, player);
        stars.splice(i, 1);
        spawnStar();
        continue;
      }

      // AI
      for (let ai of aiVehicles) {
        if (s.checkCapture(ai.pos)) {
          handleStarCapture(s, ai);
          stars.splice(i, 1);
          spawnStar();
          break;
        }
      }
    }

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
        spawnAI(); // Respawn a new one to keep population constant
        continue;
      }

      // PASS STARS AND POINTS TO THINK
      ai.think(player, points, stars, obstacles);
      ai.updatePhysics(tractionMultiplier);
      ai.constrainToWorld(WORLD_WIDTH, WORLD_HEIGHT);
      ai.show();

      drawHealthBar(ai);
      checkVehicleCollision(player, ai);

      // AI vs AI collision (Optional, computationally expensive N^2)
      // for (let j = i + 1; j < aiVehicles.length; j++) {
      //   checkVehicleCollision(ai, aiVehicles[j]);
      // }
    }

    // --- PLAYER ---
    if (!player.isDead) {
      player.updatePhysics(tractionMultiplier); // New physics update
      player.constrainToWorld(WORLD_WIDTH, WORLD_HEIGHT);
      player.show();
    } else {
      gameState = "GAME_OVER";
      // Optional: One-time explosion if not already done?
      // The particle system handles explosion.
    }
  }

  // Particles
  particles.update();
  particles.show();

  // Visualize Border
  noFill();
  stroke(255, 0, 0);
  strokeWeight(5);
  rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  pop(); // End Camera Transform

  // 5. UI & HUD (drawn on top, not affected by camera)
  drawHUD();
  drawWeatherEffect();
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
    textSize(20);
    textAlign(CENTER, TOP);
    text("⚠ HEAVY RAIN - TRACTION REDUCED", width / 2, 20);
    pop();
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

  // GROWTH: Increase Mass
  // +25 Mass per star (Boosted for visibility)
  if (vehicle.targetMass) {
    vehicle.targetMass += 25;
    // Popup
    if (vehicle.addPopup) vehicle.addPopup("+GROWTH", color(255, 215, 0));

    // Heal slightly on growth
    vehicle.health = Math.min(vehicle.health + 10, vehicle.maxHealth);
  } else if (vehicle.mass) {
    vehicle.mass += 10; // Fallback
  }

  if (vehicle === player) {
    totalScore += star.scoreValue || 10;
    vehicle.addPopup("+" + (star.scoreValue || 10), color(255, 215, 0));
    soundManager.playStarCollect(); // Sound
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

    // 1. Separate them
    let pushVec = p5.Vector.sub(v1.pos, v2.pos);
    pushVec.setMag(minDist - dist);
    v1.pos.add(p5.Vector.div(pushVec, 2));
    v2.pos.sub(p5.Vector.div(pushVec, 2));

    // 2. Physics bounce (Simplified)
    // Reduce speed
    // If we had a true physics engine we'd exchange momentum, but for arcade style:
    v1.speed *= 0.5;
    v2.speed *= 0.5;

    // Spin effect (Disruption)
    v1.angle += PI / 4;
    v2.angle -= PI / 4;

    // Damage Logic (With Multipliers)
    let damage1 = 10 * v2.damageMult;
    let damage2 = 10 * v1.damageMult;

    // Resolve V1
    if (v1.shieldTimer > 0) {
      // Blocked
      particles.explode(v1.pos.x, v1.pos.y, 10, 200); // Blue spark
    } else {
      v1.takeDamage(damage1);
    }

    // Resolve V2
    if (v2.shieldTimer > 0) {
      particles.explode(v2.pos.x, v2.pos.y, 10, 200);
    } else {
      v2.takeDamage(damage2);
    }

    // Bounce calculation (Boosted by power)
    let bounceForce = 0.5 * Math.max(v1.damageMult, v2.damageMult); // Stronger bounce if powered
    v1.speed *= -bounceForce;
    v2.speed *= -bounceForce;

    // Impact Visuals
    let impactX = (v1.pos.x + v2.pos.x) / 2;
    let impactY = (v1.pos.y + v2.pos.y) / 2;

    // Normal Impact
    particles.explode(impactX, impactY, 10, 0);

    // POWER IMPACT (Red Shockwave)
    if (v1.damageMult > 1.2 || v2.damageMult > 1.2) {
      particles.explode(impactX, impactY, 30, 0); // Extra Red sparks

      // Draw shockwave (direct drawing for immediate feedback, or add to particle system - simplistic here)
      // We'll rely on the extra particles for now, or we can add a 'shockwave' particle type if needed.
      // Let's add a visual text too? No, clutter.
    }
  }
}

function drawHUD() {
  // Minimap Mockup (Bottom Right)
  /*
  push();
  translate(width - 160, height - 160);
  fill(0, 150);
  rect(0, 0, 150, 150);
  noStroke();
  
  // Player dot
  fill(0, 255, 0);
  let mapX = map(player.pos.x, 0, WORLD_WIDTH, 0, 150);
  let mapY = map(player.pos.y, 0, WORLD_HEIGHT, 0, 150);
  circle(mapX, mapY, 4);
  pop();
  */

  // Standard HUD
  push();
  fill(255);
  textSize(16);
  textAlign(LEFT, BASELINE);
  text(`ALIVE: ${aiVehicles.length + 1}`, 20, height - 80);
  text(`POS: ${floor(player.pos.x)}, ${floor(player.pos.y)}`, 20, height - 60);
  text(`MASS: ${floor(player.mass)}`, 20, height - 40);
  text(
    `SPEED: ${floor(player.speed)} / ${floor(player.maxSpeed)}`,
    20,
    height - 20,
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

  // Pause Menu (Draw on top of everything)
  if (isPaused && gameState === "PLAYING") {
    drawPauseMenu();
  }
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
    allVehicles.push({
      Label: "AI",
      score: ai.score || 0,
      mass: ai.mass,
      color: ai.color,
    });
  }

  // Sort by Score
  allVehicles.sort((a, b) => b.score - a.score);

  // Draw
  push();
  resetMatrix();
  translate(width - 320, 20); // Moved left to fit larger board

  // Background
  noStroke();
  fill(0, 150);
  rect(0, 0, 300, 350, 10); // Larger background

  // Header
  fill(255, 215, 0);
  textSize(24); // Bigger Title
  textAlign(CENTER, TOP);
  text("LEADERBOARD", 150, 15);

  // List
  textSize(18); // Bigger Text
  textAlign(LEFT, TOP);
  let y = 55; // Start lower

  for (let i = 0; i < Math.min(allVehicles.length, 10); i++) {
    let v = allVehicles[i];

    // Rank
    fill(200);
    text(`#${i + 1}`, 15, y);

    // Name
    fill(v.color);
    text(v.Label, 60, y);

    // Score
    fill(255);
    textAlign(RIGHT, TOP);
    text(Math.floor(v.score), 200, y);

    // Mass (Small)
    fill(150);
    textSize(14);
    text(`${Math.floor(v.mass)}kg`, 290, y + 2);

    // Reset for next row
    textSize(18);
    textAlign(LEFT, TOP);

    y += 30; // More spacing
  }
  pop();
}

function drawGameOverScreen() {
  push();
  resetMatrix(); // Ensure we are in screen space

  // Dark Overlay
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);

  // Title
  fill(255, 50, 50);
  textSize(64);
  textStyle(BOLD);
  text("YOU DIED", width / 2, height / 2 - 120);

  // Score
  fill(255);
  textSize(32);
  textStyle(NORMAL);
  text("Final Score: " + totalScore, width / 2, height / 2 - 30);

  // Player name
  fill(150, 200, 255);
  textSize(18);
  text("Player: " + playerName, width / 2, height / 2 + 20);

  // Button dimensions
  let buttonW = 160;
  let buttonH = 50;
  let buttonGap = 40;

  // Center buttons horizontally with gap between them
  let totalButtonWidth = buttonW * 2 + buttonGap;
  let startX = width / 2 - totalButtonWidth / 2;

  // Draw replay button
  drawGameOverButton(startX, height / 2 + 90, buttonW, buttonH, "REPLAY", "R");

  // Draw menu button
  drawGameOverButton(
    startX + buttonW + buttonGap,
    height / 2 + 90,
    buttonW,
    buttonH,
    "MENU",
    "M",
  );

  // Instructions
  fill(150, 150, 200);
  textSize(14);
  textAlign(CENTER);
  textStyle(NORMAL);
  text("Press R to replay or M to return to menu", width / 2, height / 2 + 170);

  pop();
}

function drawGameOverButton(x, y, w, h, label, key) {
  // Check if mouse is over button
  let isHovering = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;

  // Button color changes on hover
  if (isHovering) {
    fill(100, 255, 150);
  } else {
    fill(100, 200, 255);
  }

  stroke(150, 255, 200);
  strokeWeight(2);
  rectMode(CORNER);
  rect(x, y, w, h, 5);

  // Button text
  fill(10, 10, 30);
  textSize(20);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text(label, x + w / 2, y + h / 2);
}

function drawPauseMenu() {
  push();
  resetMatrix(); // Ensure we are in screen space

  // Dark Overlay
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);

  // Title
  fill(100, 200, 255);
  textSize(64);
  textStyle(BOLD);
  text("PAUSED", width / 2, height / 2 - 80);

  // Instructions
  fill(200, 200, 200);
  textSize(18);
  textStyle(NORMAL);
  text("Press ESC to resume or click a button", width / 2, height / 2 - 10);

  // Button dimensions
  let buttonW = 160;
  let buttonH = 50;
  let buttonGap = 40;

  // Center buttons horizontally with gap between them
  let totalButtonWidth = buttonW * 2 + buttonGap;
  let startX = width / 2 - totalButtonWidth / 2;

  // Draw resume button
  drawGameOverButton(
    startX,
    height / 2 + 60,
    buttonW,
    buttonH,
    "RESUME",
    "ESC",
  );

  // Draw quit button
  drawGameOverButton(
    startX + buttonW + buttonGap,
    height / 2 + 60,
    buttonW,
    buttonH,
    "QUIT",
    "Q",
  );

  pop();
}

function drawHealthBar(v) {
  if (v === player) {
    // Large HUD bar
    push();
    noStroke();
    fill(50, 100);
    rect(20, 20, 200, 20);

    fill(v.health > 30 ? color(0, 255, 0) : color(255, 0, 0));
    let w = map(v.health, 0, v.maxHealth, 0, 200);
    rect(20, 20, w, 20);

    fill(255);
    textSize(12);
    textAlign(CENTER, CENTER);
    text(`${floor(v.health)}%`, 120, 30);
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
  textSize(72);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text("WANDER RACE", width / 2, height / 4);

  // Subtitle
  fill(150, 200, 255);
  textSize(32);
  textStyle(NORMAL);
  text("Cosmic Derby", width / 2, height / 4 + 70);

  // Instructions
  fill(200, 200, 200);
  textSize(18);
  text("Enter your name and click PLAY", width / 2, height / 2 - 40);

  // Input field background
  fill(30, 30, 50);
  stroke(100, 200, 255);
  strokeWeight(2);
  rect(width / 2 - 150, height / 2 + 10, 300, 50, 5);

  // Player name input display - centered
  fill(200, 200, 200);
  textSize(22);
  textAlign(CENTER, CENTER);
  text(
    playerName + (frameCount % 20 < 10 ? "|" : ""),
    width / 2,
    height / 2 + 37,
  );

  // Play button
  drawPlayButton();

  // Instructions at bottom
  fill(100, 150, 200);
  textSize(14);
  textAlign(CENTER);
  text(
    "Collect stars ⭐ to grow | Avoid mines 🛑 | Defeat other vehicles",
    width / 2,
    height - 100,
  );
  text(
    "Controls: Move mouse to steer | Space or Click to dash",
    width / 2,
    height - 60,
  );
}

function drawPlayButton() {
  let buttonX = width / 2;
  let buttonY = height / 2 + 120;
  let buttonW = 150;
  let buttonH = 50;

  // Check if mouse is over button
  let isHovering =
    mouseX > buttonX - buttonW / 2 &&
    mouseX < buttonX + buttonW / 2 &&
    mouseY > buttonY - buttonH / 2 &&
    mouseY < buttonY + buttonH / 2;

  // Button color changes on hover
  if (isHovering) {
    fill(100, 255, 150);
  } else {
    fill(100, 200, 255);
  }

  stroke(150, 255, 200);
  strokeWeight(2);
  rect(buttonX - buttonW / 2, buttonY - buttonH / 2, buttonW, buttonH, 5);

  // Button text
  fill(10, 10, 30);
  textSize(24);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text("PLAY", buttonX, buttonY);
}

function startGame() {
  // Trim whitespace and set player name, default to "Player" if empty
  playerName = playerName.trim() || "Player";
  gameState = "PLAYING";
  initGame();
}

function returnToMenu() {
  // Reset game state and go back to menu
  playerName = "";
  gameState = "MENU";
  totalScore = 0;
}

function mousePressed() {
  // Menu play button click
  if (gameState === "MENU") {
    let buttonX = width / 2;
    let buttonY = height / 2 + 120;
    let buttonW = 150;
    let buttonH = 50;

    if (
      mouseX > buttonX - buttonW / 2 &&
      mouseX < buttonX + buttonW / 2 &&
      mouseY > buttonY - buttonH / 2 &&
      mouseY < buttonY + buttonH / 2
    ) {
      startGame();
      return;
    }
  }

  // Game Over button clicks
  if (gameState === "GAME_OVER") {
    let buttonW = 160;
    let buttonH = 50;
    let buttonGap = 40;
    let totalButtonWidth = buttonW * 2 + buttonGap;
    let startX = width / 2 - totalButtonWidth / 2;
    let buttonY = height / 2 + 90;

    // Replay button
    let replayX = startX;
    if (
      mouseX > replayX &&
      mouseX < replayX + buttonW &&
      mouseY > buttonY &&
      mouseY < buttonY + buttonH
    ) {
      initGame();
      return;
    }

    // Menu button
    let menuX = startX + buttonW + buttonGap;
    if (
      mouseX > menuX &&
      mouseX < menuX + buttonW &&
      mouseY > buttonY &&
      mouseY < buttonY + buttonH
    ) {
      returnToMenu();
      return;
    }
  }

  // Pause menu button clicks
  if (isPaused && gameState === "PLAYING") {
    let buttonW = 160;
    let buttonH = 50;
    let buttonGap = 40;
    let totalButtonWidth = buttonW * 2 + buttonGap;
    let startX = width / 2 - totalButtonWidth / 2;
    let buttonY = height / 2 + 80;

    // Resume button
    let resumeX = startX;
    if (
      mouseX > resumeX &&
      mouseX < resumeX + buttonW &&
      mouseY > buttonY &&
      mouseY < buttonY + buttonH
    ) {
      isPaused = false;
      return;
    }

    // Quit button
    let quitX = startX + buttonW + buttonGap;
    if (
      mouseX > quitX &&
      mouseX < quitX + buttonW &&
      mouseY > buttonY &&
      mouseY < buttonY + buttonH
    ) {
      isPaused = false;
      returnToMenu();
      return;
    }
  }

  // Ensure Audio Context is running (Browser Policy)
  userStartAudio();
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

  // Game Over handling
  if (gameState === "GAME_OVER") {
    if (key === "r" || key === "R") {
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
    isPaused = !isPaused;
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
    } else if (gameState === "PLAYING" && !isPaused) {
      player.dash();
    }
  }
}
// =============================================================================
// HELP MENU & BUTTON
// =============================================================================
