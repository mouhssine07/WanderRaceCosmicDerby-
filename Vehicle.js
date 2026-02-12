/**
 * Vehicle.js - Base class for all vehicles in Wander Race – Cosmic Derby
 * Implements Craig Reynolds' Steering Behaviors
 *
 * Core behaviors: seek, arrive, wander, separation
 * DO NOT MODIFY this base class - extend it instead
 */

class Vehicle {
  // Static debug flag for all vehicles
  static debug = false;

  /**
   * @param {number} x - Initial x position
   * @param {number} y - Initial y position
   * @param {p5.Image} image - Sprite image (optional)
   */
  constructor(x, y, image = null) {
    // Core physics
    this.pos = createVector(x, y);
    this.vel = createVector(random(-1, 1), random(-1, 1));
    this.acc = createVector(0, 0);

    // Movement limits
    this.baseMaxSpeed = 6;
    this.maxSpeed = this.baseMaxSpeed;
    this.maxForce = 0.2;
    this.minSpeedLimit = 7.5; // Absolute minimum speed - increased from 6

    // Visual
    this.r = 20; // Radius
    this.initialR = 20; // Base radius

    this.image = image;
    this.color = color(255);

    // GROWTH SYSTEM
    this.mass = 100; // Current Mass
    this.targetMass = 100; // Target Mass for smooth growth
    this.minMass = 50;
    this.growthPulse = 0; // Visual pulse effect when growing (0-1)

    // Wander behavior parameters
    this.distanceCercle = 100;
    this.wanderRadius = 40;
    this.wanderTheta = random(TWO_PI);
    this.displaceRange = 0.3;

    // Trail system
    this.path = [];
    this.pathLength = 30;
    this.pathSpacingInFrames = 2;

    // Separation
    this.perceptionRadius = 50;

    // Health System
    this.baseMaxHealth = 100;
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.isDead = false;

    // Status Effects (Timers in frames, 60fps)
    this.powerTimer = 0; // Red
    this.healTimer = 0; // Green
    this.shieldTimer = 0; // Blue
    this.speedTimer = 0; // Yellow

    // Active Multipliers (Default 1.0)
    // Damage mult will now be mass-dependent
    this.baseDamageMult = 1.0;
    this.damageMult = 1.0;

    this.speedMult = 1.0;
    this.accelMult = 1.0; // Powerup multiplier
    this.massAccelMult = 1.0; // Base mass multiplier
    this.massTurnMult = 1.0; // Base mass multiplier

    // Visual Effects (Floating Text)
    this.popups = [];

    // COMBO SYSTEM
    this.killStreak = 0;
    this.lastKillFrame = 0;
    this.comboTimer = 0; // Duration of active combo rewards
    this.doubleXP = false;

    // GAME MODES
    this.team = null; // 1 or 2
    this.isInfected = false;
  }

  updateSize() {
    // 0. Check Death by Mass
    if (this.mass <= 0) {
      this.mass = 0;
      this.isDead = true;
      this.health = 0;
      return;
    }

    // 1. Smooth Mass Growth & DECAY
    // MASS DECAY: Large vehicles lose mass over time (Agar.io style)
    if (this.targetMass > 200) {
      // Lose ~0.02% of mass per frame when large
      this.targetMass -= this.targetMass * 0.0002;
    }

    if (abs(this.targetMass - this.mass) > 0.5) {
      this.mass = lerp(this.mass, this.targetMass, 0.05);
    } else {
      this.mass = this.targetMass;
    }

    // 2. Scale Physics/Visual Size
    // r = 20 * sqrt(mass / 100) -> 100 mass = 20r, 400 mass = 40r
    this.r = Math.max(5, this.initialR * Math.sqrt(this.mass / 100)); // Min radius 5

    // 3. Scale Stats
    // Health: Using Square Root scaling to avoid "Giant Tank" unkillable problem
    // Formula: 50 + 50 * sqrt(mass/100)
    // Results: 100 mass = 100hp, 400 mass = 150hp, 900 mass = 200hp
    this.maxHealth = 50 + 50 * Math.sqrt(this.mass / 100);

    // Decay growth pulse
    if (this.growthPulse > 0) {
      this.growthPulse *= 0.92; // Smooth decay
      if (this.growthPulse < 0.01) this.growthPulse = 0;
    }

    // Damage: +1.0x damage for every 100 extra mass (DOUBLED for Agar.io feel)
    let extraDamage = (this.mass - 100) * 0.01; // 1.0 / 100
    this.baseDamageMult = 1.0 + Math.max(0, extraDamage);

    // Push Force: Used in collisions to repel smaller vehicles
    this.pushForce = 1.0 + (this.mass - 100) * 0.015;

    // THE WEIGHT TAX: Scale Acceleration and Turn Speed (Inverse to mass)
    // Formula for Accel: 200 / (100 + mass)
    this.massAccelMult = 200 / (100 + this.mass);
    // Formula for Turn: 250 / (150 + mass)
    this.massTurnMult = 250 / (150 + this.mass);

    // SPEED SCALING: Better mobility for larger vehicles (Buffered Formula)
    // Formula: Scale factor = 300 / (200 + mass)
    // Mass 100 -> 300/300 = 1.0
    // Mass 400 -> 300/600 = 0.5
    // Mass 1000 -> 300/1200 = 0.25 (Faster than previous 0.18)
    let speedFactor = 300 / (200 + this.mass);
    this.maxSpeed = Math.max(
      this.minSpeedLimit,
      this.baseMaxSpeed * speedFactor,
    );
  }

  /**
   * Seek behavior - steer toward a target
   * @param {p5.Vector} target - Target position
   * @param {boolean} arrival - Enable arrival slowdown
   * @returns {p5.Vector} Steering force
   */
  seek(target, arrival = false) {
    let force = p5.Vector.sub(target, this.pos);
    let desiredSpeed = this.maxSpeed;

    if (arrival) {
      let slowRadius = 100;
      let distance = force.mag();
      if (distance < slowRadius) {
        desiredSpeed = map(distance, 0, slowRadius, 0, this.maxSpeed);
      }
    }

    force.setMag(desiredSpeed);
    force.sub(this.vel);
    force.limit(this.maxForce);
    return force;
  }

  /**
   * Arrive behavior - seek with slowdown near target
   * @param {p5.Vector} target - Target position
   * @returns {p5.Vector} Steering force
   */
  arrive(target) {
    return this.seek(target, true);
  }

  /**
   * Flee behavior - inverse of seek
   * @param {p5.Vector} target - Target to flee from
   * @returns {p5.Vector} Steering force
   */
  flee(target) {
    return this.seek(target).mult(-1);
  }

  /**
   * Wander behavior - random wandering using circle projection
   * @returns {p5.Vector} Steering force
   */
  wander() {
    // Project a point ahead of the vehicle
    let pointAhead = this.vel.copy();
    pointAhead.setMag(this.distanceCercle);
    pointAhead.add(this.pos);

    // Calculate point on the wander circle
    let theta = this.wanderTheta + this.vel.heading();
    let pointOnCircle = createVector(
      this.wanderRadius * cos(theta),
      this.wanderRadius * sin(theta),
    );
    pointOnCircle.add(pointAhead);

    // Randomly adjust wander angle
    this.wanderTheta += random(-this.displaceRange, this.displaceRange);

    // Calculate steering force
    let force = p5.Vector.sub(pointOnCircle, this.pos);
    force.setMag(this.maxForce);

    return force;
  }

  /**
   * Separation behavior - avoid crowding neighbors
   * @param {Vehicle[]} vehicles - Array of vehicles to separate from
   * @returns {p5.Vector} Steering force
   */
  separation(vehicles) {
    let steering = createVector(0, 0);
    let total = 0;

    for (let other of vehicles) {
      let d = p5.Vector.dist(this.pos, other.pos);
      if (other !== this && d < this.perceptionRadius && d > 0) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(d); // Weight by distance (closer = stronger)
        steering.add(diff);
        total++;
      }
    }

    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }

    return steering;
  }

  /**
   * Apply a force to the vehicle (accumulates in acceleration)
   * @param {p5.Vector} force - Force to apply
   */
  applyForce(force) {
    this.acc.add(force);
  }

  /**
   * Update physics: velocity, position, reset acceleration
   */
  update() {
    // Physics integration
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);

    // Update trail
    if (frameCount % this.pathSpacingInFrames === 0) {
      this.path.push({
        pos: this.pos.copy(),
        speed: this.vel.mag(),
      });
    }

    // Limit trail length
    if (this.path.length > this.pathLength) {
      this.path.shift();
    }

    // Update One-Time Status Effects
    this.updateStatusEffects();

    // Kill Streak decay/timeout
    if (this.killStreak > 0 && frameCount - this.lastKillFrame > 300) { // 5s timeout
        this.killStreak = 0;
    }
    
    // XP Boost decay
    if (this.comboTimer > 0) {
        this.comboTimer--;
        if (this.comboTimer === 0) {
            this.doubleXP = false;
        }
    }
  }

  updateStatusEffects() {
    // Sync size and stats
    this.updateSize();

    // 1. POWER (Red)
    if (this.powerTimer > 0) {
      this.powerTimer--;
      // Base Power is now scaling with mass
      // Powerup multiplies that by 3.0
      this.damageMult = this.baseDamageMult * 3.0;

      // "powerMultiplierWhenBigger": 1.4 was requested, but now we have linear scaling.
      // Let's stick to the 3.0 multiplier on top of mass scaling.
    } else {
      this.damageMult = this.baseDamageMult;
    }

    // 2. HEAL (Green)
    if (this.healTimer > 0) {
      this.healTimer--;
      // Base: 10 HP/sec = ~0.166 HP/frame
      // "healMultiplier": 1.5 if mass > 100
      let healRate = 0.166;
      if (this.mass > 100) healRate *= 1.5;

      if (this.health < this.maxHealth) {
        this.health += healRate;
        if (this.health > this.maxHealth) this.health = this.maxHealth;
      }
    }

    // 3. SHIELD (Blue)
    if (this.shieldTimer > 0) {
      this.shieldTimer--;
    }

    // 4. SPEED (Yellow)
    if (this.speedTimer > 0) {
      this.speedTimer--;
      this.speedMult = 1.6;
      this.accelMult = 1.3;
    } else {
      this.speedMult = 1.0;
      this.accelMult = 1.0;
    }

    // INFECTION: +50% speed for infected
    if (this.isInfected) {
        this.speedMult *= 1.5;
    }
  }

  /**
   * Apply a powerup effect
   * @param {string} type
   */
  applyPowerup(type) {
    // Reset all
    this.powerTimer = 0;
    this.healTimer = 0;
    this.shieldTimer = 0;
    this.speedTimer = 0;

    // Apply specific
    const DURATION = 300; // 5 seconds @ 60fps

    if (type === "power") {
      this.powerTimer = DURATION;
      this.addPopup("⚔ POWER UP", color(255, 0, 0)); // Red
    } else if (type === "heal") {
      this.healTimer = DURATION;
      this.addPopup("✚ REGEN", color(0, 255, 0)); // Green
    } else if (type === "shield") {
      this.shieldTimer = DURATION;
      this.addPopup("🛡 SHIELD", color(0, 100, 255)); // Blue
    } else if (type === "speed") {
      this.speedTimer = DURATION;
      this.addPopup("⚡ SPEED", color(255, 255, 0)); // Yellow
    }
    // Debug print
    // console.log(`Applied ${type} to ${this.constructor.name}`);
  }

  addPopup(text, col) {
    this.popups.push({
      text: text,
      color: col,
      life: 60, // 1 second duration
      yOffset: 0,
    });
  }

  /**
   * Draw the vehicle and its trail
   */
  show() {
    this.drawModeAura();
    // Draw rainbow trail based on speed
    this.drawTrail();

    // Draw vehicle with growth pulse effect
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    // Apply growth pulse to size
    let displayR = this.r * (1 + this.growthPulse * 0.2);

    if (this.image) {
      imageMode(CENTER);
      let size = displayR * 2;
      rotate(-PI / 2); // Adjust for sprite orientation
      image(this.image, 0, 0, size, size);
    } else {
      strokeWeight(1);
      triangle(-displayR, -displayR / 2, -displayR, displayR / 2, displayR, 0);
    }

    // Golden aura during growth pulse
    if (this.growthPulse > 0.1) {
      noFill();
      stroke(255, 215, 0, this.growthPulse * 150);
      strokeWeight(3);
      circle(0, 0, displayR * 2.5);
    }

    pop();

    // Status Visuals
    this.showStatusEffects();
  }

  showStatusEffects() {
    push();
    translate(this.pos.x, this.pos.y);

    // 4. SPEED (Yellow) - Trail / Afterburner
    if (this.speedTimer > 0) {
      noFill();
      stroke(255, 255, 0, 150);
      strokeWeight(2);
      let r = this.r * 1.7; // Radius 1.7
      // Trail lines
      arc(0, 0, r * 2, r * 2, -PI / 3, PI / 3);
      arc(0, 0, r * 2, r * 2, PI - PI / 3, PI + PI / 3);
      this.drawTimerBar(this.speedTimer, 300, color(255, 255, 0));
    }

    // 3. SHIELD (Blue) - Force Field Bubble
    if (this.shieldTimer > 0) {
      // Inner Bubble (Low Opacity)
      fill(0, 100, 255, 50);
      stroke(0, 150, 255);
      strokeWeight(2);
      let r = this.r * 2.2; // Slightly larger

      // Pulse effect
      let pulse = sin(frameCount * 0.1) * 2;
      circle(0, 0, (r + pulse) * 2);

      // Rotating outer ring segments for tech look
      noFill();
      stroke(0, 200, 255, 200);
      strokeWeight(3);
      push();
      rotate(-frameCount * 0.05);
      arc(0, 0, r * 2.4, r * 2.4, 0, PI / 2);
      arc(0, 0, r * 2.4, r * 2.4, PI, PI + PI / 2);
      pop();

      this.drawTimerBar(this.shieldTimer, 300, color(0, 100, 255));
    }

    // 2. HEAL (Green) - Glow
    if (this.healTimer > 0) {
      noFill();
      // Glow effect (stacked circles)
      let r = this.r * 1.8; // Radius 1.8
      for (let i = 0; i < 3; i++) {
        stroke(0, 255, 0, 50 - i * 10); // Opacity 0.6 fading
        strokeWeight(2 + i * 2);
        circle(0, 0, r * 2 + sin(frameCount * 0.1) * 5);
      }
      this.drawTimerBar(this.healTimer, 300, color(0, 255, 0));
    }

    // 1. POWER (Red) - Aggressive Spikes
    if (this.powerTimer > 0) {
      noFill();
      stroke(255, 0, 0, 150 + sin(frameCount * 0.5) * 100);
      strokeWeight(2);

      let r = this.r * 1.8;

      push();
      rotate(frameCount * 0.1);
      beginShape();
      for (let i = 0; i < TWO_PI; i += PI / 4) {
        let rOffset = i % (PI / 2) === 0 ? 15 : 0; // Spikes every 90 degrees
        let finalR = r + rOffset;
        vertex(cos(i) * finalR, sin(i) * finalR);
      }
      endShape(CLOSE);
      pop();

      // Inner Core
      fill(255, 0, 0, 50);
      noStroke();
      circle(0, 0, r * 1.5);

      this.drawTimerBar(this.powerTimer, 300, color(255, 0, 0));
    }

    // Draw Popups (Floating Text)
    for (let i = this.popups.length - 1; i >= 0; i--) {
      let p = this.popups[i];
      p.life--;
      p.yOffset -= 1; // Float up

      fill(p.color);
      noStroke();
      textAlign(CENTER);
      textSize(12 * UI_SCALE); // Scaled
      // Fade out
      drawingContext.globalAlpha = map(p.life, 0, 20, 0, 1, true);
      text(p.text, 0, -this.r * 2 - 20 * UI_SCALE + p.yOffset);
      drawingContext.globalAlpha = 1.0;

      if (p.life <= 0) this.popups.splice(i, 1);
    }

    pop();
  }

  drawTimerBar(current, maxVal, c) {
    if (current <= 0) return;
    push();
    // Move below vehicle (radius is 20, define offset)
    // Dash bar is at +35. Let's put this at +45 to stack if needed, or just +35 if they share space (rarely overlap dash?).
    // Actually dash is Player specific. Powerups are generic.
    // Let's put it at +40 (underneath)
    translate(0, this.r * 2 + 5 * UI_SCALE);

    noStroke();

    // Background
    fill(50, 150);
    rectMode(CENTER);
    let barW = 40 * UI_SCALE;
    let barH = 6 * UI_SCALE;
    rect(0, 0, barW, barH, 3 * UI_SCALE); // generic background rounded

    // Foreground Bar
    fill(c);
    rectMode(CORNER);
    let w = map(current, 0, maxVal, 0, barW);
    rect(-barW/2, -barH/2, w, barH, 3 * UI_SCALE);

    pop();
  }

  // Helper for random in draw loop without affecting global seed heavily?
  // actually standard random is fine

  /**

  /**
   * Draw the vehicle's trail with rainbow colors based on speed
   */
  drawTrail() {
    if (this.path.length < 2) return;
    
    // Switch to HSB once before the loop - HUGE performance gain
    push();
    colorMode(HSB, 360, 100, 100, 255);
    noStroke();
    
    for (let i = 0; i < this.path.length; i++) {
      let p = this.path[i];

      // Alpha fades out for older points
      let alpha = map(i, 0, this.path.length, 50, 255);

      // Hue based on speed (slow = blue, fast = red)
      let hue = map(p.speed, 0, this.maxSpeed, 200, 0);

      fill(hue, 80, 100, alpha);
      let size = map(i, 0, this.path.length, 2, 6);
      circle(p.pos.x, p.pos.y, size);
    }
    
    pop();
  }

  drawModeAura() {
      push();
      translate(this.pos.x, this.pos.y);
      noFill();
      strokeWeight(3);
      
      if (this.isInfected) {
          stroke(150, 0, 255, 150 + sin(frameCount * 0.1) * 100);
          circle(0, 0, this.r * 2.5);
      } else if (this.team === 1) {
          stroke(0, 255, 255, 150);
          circle(0, 0, this.r * 2.2);
      } else if (this.team === 2) {
          stroke(255, 100, 0, 150);
          circle(0, 0, this.r * 2.2);
      }
      pop();
  }

  /**
   * Wrap around screen edges (toroidal topology)
   */
  edges() {
    // Use world bounds, not canvas bounds (width/height are canvas pixels)
    const WORLD_W = 5000;
    const WORLD_H = 5000;
    
    if (this.pos.x > WORLD_W + this.r) {
      this.pos.x = -this.r;
    } else if (this.pos.x < -this.r) {
      this.pos.x = WORLD_W + this.r;
    }
    if (this.pos.y > WORLD_H + this.r) {
      this.pos.y = -this.r;
    } else if (this.pos.y < -this.r) {
      this.pos.y = WORLD_H + this.r;
    }
  }

  /**
   * Apply behaviors (to be overridden by subclasses)
   */
  applyBehaviors() {
    // Override in subclasses
  }

  /**
   * Universal Damage Resolver
   * @param {number} amount - Raw damage value
   */
  takeDamage(amount) {
    if (this.isDead) return;
    
    this.health -= amount;
    
    // Haptic Feedback for Player
    if (this === player && typeof mobileManager !== 'undefined') {
        mobileManager.vibrate(20); // Short 20ms buzz
    }
    
    // Impact Visuals (Minor sparks on hit)
    if (typeof particles !== 'undefined') {
        particles.explode(this.pos.x, this.pos.y, 5, 0); 
    }

    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
  }

  /**
   * Reward vehicle for a kill
   */
  onKill() {
    this.killStreak++;
    this.lastKillFrame = frameCount;
    
    let rewardText = "";
    if (this.killStreak === 3) {
      rewardText = "TRIPLE KILL - SHIELD!";
      this.applyPowerup("shield");
      this.shieldTimer = 180; // 3s
    } else if (this.killStreak === 5) {
      rewardText = "RAMPAGE - DOUBLE XP!";
      this.doubleXP = true;
      this.comboTimer = 600; // 10s
    } else if (this.killStreak === 10) {
      rewardText = "UNSTOPPABLE - SHOCKWAVE!";
      this.triggerShockwave();
    }

    if (rewardText !== "") {
      this.addPopup(rewardText, color(255, 50, 255));
    } else {
      this.addPopup(`KILL x${this.killStreak}`, color(255, 255, 255));
    }

    // Persistent Profile update for player
    if (this === player && typeof profile !== 'undefined') {
        profile.addKill();
        profile.addXP(200); // 200 XP per kill
    }
  }

  triggerShockwave() {
      // Logic for shockwave handled in sketch.js or a separate particle effect
      this.addPopup("⚡ SHOCKWAVE ⚡", color(255, 255, 0));
      // Visual blast
      if (typeof particles !== 'undefined') {
          particles.explode(this.pos.x, this.pos.y, 100, 200); // Massive blue/white blast
      }
      
      // Affect nearby obstacles/mines
      if (typeof obstacles !== 'undefined') {
          for (let obs of obstacles) {
              if (p5.Vector.dist(this.pos, obs.pos) < 400) {
                  let push = p5.Vector.sub(obs.pos, this.pos).setMag(50);
                  obs.pos.add(push);
                  obs.health -= 50; // Damage mines
              }
          }
      }
  }
}
