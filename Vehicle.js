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
    this.accelMult = 1.0;

    // Visual Effects (Floating Text)
    this.popups = [];
  }

  updateSize() {
    // 0. Check Death by Mass
    if (this.mass <= 0) {
      this.mass = 0;
      this.isDead = true;
      this.health = 0;
      return;
    }

    // 1. Smooth Mass Growth
    if (abs(this.targetMass - this.mass) > 0.5) {
      this.mass = lerp(this.mass, this.targetMass, 0.05);
    } else {
      this.mass = this.targetMass;
    }

    // 2. Scale Physics/Visual Size
    // r = 20 * sqrt(mass / 100) -> 100 mass = 20r, 400 mass = 40r
    this.r = Math.max(5, this.initialR * Math.sqrt(this.mass / 100)); // Min radius 5

    // 3. Scale Stats
    // Health: +50 HP for every 100 extra mass
    let extraHealth = (this.mass - 100) * 0.5;
    this.maxHealth = this.baseMaxHealth + extraHealth;

    // Damage: +0.5x damage for every 100 extra mass
    let extraDamage = (this.mass - 100) * 0.005; // 0.5 / 100
    this.baseDamageMult = 1.0 + Math.max(0, extraDamage);

    // SPEED SCALING: Heavier = Slower (User requested inverse formula)
    // Formula: Scale factor starts at 1.0 for Mass 100.
    // Factor = 200 / (100 + mass)
    // Mass 100 -> 200/200 = 1.0
    // Mass 200 -> 200/300 = 0.66
    // Mass 300 -> 200/400 = 0.50
    let speedFactor = 200 / (100 + this.mass);
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
    // Draw rainbow trail based on speed
    this.drawTrail();

    // Draw vehicle
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    if (this.image) {
      imageMode(CENTER);
      let size = this.r * 2;
      rotate(-PI / 2); // Adjust for sprite orientation
      image(this.image, 0, 0, size, size);
    } else {
      strokeWeight(1);
      triangle(-this.r, -this.r / 2, -this.r, this.r / 2, this.r, 0);
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
      textSize(14);
      // Fade out
      drawingContext.globalAlpha = map(p.life, 0, 20, 0, 1, true);
      text(p.text, 0, -this.r * 2 - 20 + p.yOffset);
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
    translate(0, this.r * 2 + 5);

    noStroke();

    // Background
    fill(50, 150);
    rectMode(CENTER);
    rect(0, 0, 40, 6, 3); // generic background rounded

    // Foreground Bar
    fill(c);
    rectMode(CORNER);
    let w = map(current, 0, maxVal, 0, 40);
    rect(-20, -3, w, 6, 3);

    pop();
  }

  // Helper for random in draw loop without affecting global seed heavily?
  // actually standard random is fine

  /**

  /**
   * Draw the vehicle's trail with rainbow colors based on speed
   */
  drawTrail() {
    noStroke();
    for (let i = 0; i < this.path.length; i++) {
      let p = this.path[i];

      // Alpha fades out for older points
      let alpha = map(i, 0, this.path.length, 50, 255);

      // Hue based on speed (slow = blue, fast = red)
      let hue = map(p.speed, 0, this.maxSpeed, 200, 0);

      push();
      colorMode(HSB, 360, 100, 100, 255);
      fill(hue, 80, 100, alpha);
      let size = map(i, 0, this.path.length, 2, 6);
      circle(p.pos.x, p.pos.y, size);
      pop();
    }
  }

  /**
   * Wrap around screen edges (toroidal topology)
   */
  edges() {
    if (this.pos.x > width + this.r) {
      this.pos.x = -this.r;
    } else if (this.pos.x < -this.r) {
      this.pos.x = width + this.r;
    }
    if (this.pos.y > height + this.r) {
      this.pos.y = -this.r;
    } else if (this.pos.y < -this.r) {
      this.pos.y = height + this.r;
    }
  }

  /**
   * Apply behaviors (to be overridden by subclasses)
   */
  applyBehaviors() {
    // Override in subclasses
  }

  /**
   * Apply damage to vehicle
   * @param {number} amount
   */
  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
  }
}
