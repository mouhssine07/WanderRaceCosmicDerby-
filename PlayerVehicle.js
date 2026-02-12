/**
 * PlayerVehicle.js - Car Physics Implementation
 *
 * Replaces steering behaviors with arcade car physics:
 * - Acceleration / Braking
 * - Angular steering (not force-based)
 * - Drifting/Traction logic
 */

class PlayerVehicle extends Vehicle {
  constructor(x, y, image = null) {
    super(x, y, image);

    // Physics Config (tuned for responsiveness)
    this.baseMaxSpeed = 12; // Base speed for player
    this.maxSpeed = this.baseMaxSpeed;
    this.accelerationRate = 0.4; // Faster acceleration
    this.friction = 0.96; // Drag coefficient
    this.maxTurnAngle = 0.15; // Much sharper turning (~8 degrees/frame)
    this.turnSpeed = 0.12; // Response speed

    // State
    this.speed = 0;
    this.angle = -PI / 2; // Face up
    this.driftAngle = this.angle;

    // Dash
    this.dashAvailable = true;
    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashUsedCount = 0; // Initialize dash usage counter

    // Input State
    this.targetAngle = -PI / 2;
  }

  /**
   * Apply Car Physics Constraints
   * @param {number} tractionMult - 1.0 = clear, <1.0 = slippery
   */
  updatePhysics(tractionMult = 1.0) {
    // 1. INPUT HANDLING & ANGLE CALCULATION
    let dx = mouseX - width / 2;
    let dy = mouseY - height / 2;
    
    // Joystick Override for Mobile (Persistent Steering)
    if (typeof mobileManager !== 'undefined' && mobileManager.isMobile) {
        let v = mobileManager.getJoystickVector();
        dx = v.x;
        dy = v.y;
    }
    
    this.targetAngle = atan2(dy, dx);

    // 2. STEERING (Angular Interpolation)
    let diff = this.targetAngle - this.angle;
    // Normalize to -PI...PI
    if (diff > PI) diff -= TWO_PI;
    if (diff < -PI) diff += TWO_PI;

    // Smooth steering (Arcade feel: snap quickly but smoothly)
    // Apply Mass Turn Multiplier (Weight Tax)
    let steerAmount = this.turnSpeed * tractionMult * this.massTurnMult;
    
    // Mobile Equity: +7% Rotation Speed for Mobile Players
    if (typeof mobileManager !== 'undefined' && mobileManager.isMobile) {
        steerAmount *= 1.07;
    }

    // Apply steering limit
    if (abs(diff) > steerAmount) {
      this.angle += diff > 0 ? steerAmount : -steerAmount;
    } else {
      this.angle = this.targetAngle;
    }

    // 3. ACCELERATION & FRICTION
    // Distance based speed control (or joystick magnitude)
    let inputMag = dist(mouseX, mouseY, width / 2, height / 2);
    if (typeof mobileManager !== 'undefined' && mobileManager.isMobile) {
        inputMag = mobileManager.getJoystickVector().mag() * 100; // Map 0-1 to 0-100 scale
    }
    
    let targetSpeed = 0;

    // Deadzone near car to stop
    if (inputMag > 30) {
      targetSpeed = this.maxSpeed;
    }

    // Dash Override - Scale boost with maxSpeed for consistent effect
    if (this.isDashing) {
      targetSpeed = targetSpeed * 1.5; // 50% boost regardless of size
      this.dashTimer--;
      if (this.dashTimer <= 0) this.isDashing = false;
    } else {
      // Apply Speed Multiplier (Yellow Power) - Scale with maxSpeed
      let speedBoostFactor = this.speedMult; // 1.6x for yellow power
      targetSpeed = targetSpeed * speedBoostFactor;

      // Strict Speed Limit Check (Enforce mass penalties)
      targetSpeed = Math.min(targetSpeed, this.maxSpeed * speedBoostFactor);
    }

    // Apply Acceleration
    if (inputMag > 30 || this.isDashing) {
      if (this.speed < targetSpeed) {
        // Apply Accel Multipliers (Powerup * Weight Tax)
        let accel = this.accelerationRate * this.accelMult * this.massAccelMult;
        this.speed += accel * tractionMult;
      }
    }

    // Apply Friction / Deceleration
    if (!this.isDashing) {
      if (inputMag <= 30) {
        // Stopping
        this.speed *= this.friction;
      } else if (this.speed > targetSpeed) {
        // We are faster than we should be (e.g. grew up and maxSpeed dropped)
        // Apply stronger braking than normal friction
        // Increased to 0.1 for faster feedback (User request)
        this.speed = lerp(this.speed, targetSpeed, 0.1);
      }
    }

    // Stop completely if very slow
    if (abs(this.speed) < 0.1) this.speed = 0;

    // 4. MOVEMENT VECTOR (Drift Logic)
    // If high traction, move towards angle.
    // If low traction (rain), velocity vector lags behind angle.

    // Simple Drift Implementation:
    // Blend current drift angle towards real angle based on traction
    // High traction = fast blend (grip)
    // Low traction = slow blend (slide)

    let blendFactor = 0.2 * tractionMult;

    // Vector logic
    let currentVelX = cos(this.driftAngle);
    let currentVelY = sin(this.driftAngle);
    let targetVelX = cos(this.angle);
    let targetVelY = sin(this.angle);

    // Interpolate direction
    let newDirX = lerp(currentVelX, targetVelX, blendFactor);
    let newDirY = lerp(currentVelY, targetVelY, blendFactor);

    this.driftAngle = atan2(newDirY, newDirX);

    // Apply Movement
    let finalVelX = cos(this.driftAngle) * this.speed;
    let finalVelY = sin(this.driftAngle) * this.speed;

    this.pos.x += finalVelX;
    this.pos.y += finalVelY;

    // Dash Cooldown
    if (this.dashCooldown > 0) this.dashCooldown--;

    // Update Status Effects (Timers & Multipliers)
    this.updateStatusEffects();
  }

  constrainToWorld(w, h) {
    this.pos.x = constrain(this.pos.x, 0, w);
    this.pos.y = constrain(this.pos.y, 0, h);
  }

  dash() {
    if (this.dashCooldown <= 0) {
      this.isDashing = true;
      this.dashTimer = 30; // 0.5s of dash
      this.dashCooldown = 300; // 5 seconds @ 60fps

      // INVISIBLE/INVINCIBLE during the dash
      this.shieldTimer = Math.max(this.shieldTimer, 30); 

      // IMPULSE: Immediate speed boost x3
      let boostSpeed = max(this.maxSpeed, this.speed) * 3.0;
      this.speed = boostSpeed;

      this.addPopup("🚀 DASH !!", color(0, 255, 255));
      soundManager.playDash();
    }
  }

  show() {
    this.drawModeAura();
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle); // Rotate visual to match Steering Angle (not drift angle, looks better)
    rotate(PI / 2);

    // Dash Visuals
    if (this.isDashing) {
      noFill();
      stroke(0, 255, 255, 150);
      strokeWeight(4);
      // Speed lines / Shockwave
      arc(0, 0, this.r * 2.5, this.r * 2.5, -PI / 4, PI / 4);
    }

    this.drawProceduralSprite();

    pop();

    // Show Status Effects (from Base Class)
    this.showStatusEffects();

    // Enhanced Debug Visualization
    if (Vehicle.debug) {
      push();
      translate(this.pos.x, this.pos.y);

      // Perception/target circle
      noFill();
      stroke(255, 100, 0, 150);
      strokeWeight(1);
      circle(0, 0, 500);

      // Direction line (heading)
      stroke(255, 255, 0, 200);
      strokeWeight(2);
      let headingLength = this.r * 3;
      let dirX = cos(this.angle) * headingLength;
      let dirY = sin(this.angle) * headingLength;
      line(0, 0, dirX, dirY);

      // Velocity vector
      stroke(0, 255, 100, 200);
      strokeWeight(2);
      line(0, 0, this.vel.x * 2, this.vel.y * 2);

      // Speed and Mass info
      fill(200, 200, 200);
      noStroke();
      textSize(11);
      textAlign(CENTER, CENTER);
      text(`S:${floor(this.speed)}/${floor(this.maxSpeed)}`, 0, this.r + 20);
      text(`M:${floor(this.mass)}`, 0, this.r + 35);

      pop();
    }

    // Cooldown Bar
    if (this.dashCooldown > 0) {
      push();
      translate(this.pos.x, this.pos.y + 35);
      noStroke();
      fill(50, 150);
      rectMode(CENTER);
      rect(0, 0, 30, 4, 2);
      fill(0, 255, 255);
      rectMode(CORNER);
      let w = map(this.dashCooldown, 300, 0, 0, 30);
      rect(-15, -2, w, 4, 2);
      pop();
    }
  }

  drawProceduralSprite() {
    let w = this.r * 0.9;
    let h = this.r * 2.4; 
    let currentSkin = (profile && profile.data) ? profile.data.currentSkin : 'default';

    push();

    // 1. CHOOSE COLORS BASED ON SKIN
    let bodyColor = color(70, 70, 80);
    let detailColor = color(0, 200, 255);
    let glowColor = color(0, 255, 255, 100);

    if (currentSkin === 'neon') {
        bodyColor = color(20, 20, 30);
        detailColor = color(255, 0, 255);
        glowColor = color(0, 255, 255, 150);
    } else if (currentSkin === 'phoenix') {
        bodyColor = color(100, 20, 0);
        detailColor = color(255, 200, 0);
        glowColor = color(255, 50, 0, 150);
    } else if (currentSkin === 'galaxy') {
        bodyColor = color(10, 10, 50);
        detailColor = color(150, 0, 255);
        glowColor = color(100, 0, 255, 100);
    } else if (currentSkin === 'deathstar') {
        bodyColor = color(100);
        detailColor = color(50);
        glowColor = color(255, 0, 0, 100);
    }

    // 2. RENDERING
    // Glow
    noStroke();
    fill(glowColor);
    ellipse(0, 0, h, h);

    // Body Setup
    fill(bodyColor);
    stroke(detailColor);
    strokeWeight(1.5);
    
    if (currentSkin === 'deathstar') {
        // Circular ship
        circle(0, 0, h * 0.7);
        fill(detailColor);
        circle(h*0.2, -h*0.1, h*0.15); // "The dish"
    } else {
        // Rocket/Ship shape
        beginShape();
        vertex(0, -h / 2); // Nose
        bezierVertex(w, -h / 4, w, h / 4, w / 2, h / 2); // Right wing
        vertex(-w / 2, h / 2); // Bottom
        bezierVertex(-w, h / 4, -w, -h / 4, 0, -h / 2); // Left wing
        endShape(CLOSE);

        // Cockpit
        fill(detailColor);
        ellipse(0, -h / 6, w / 1.5, h / 4);
    }

    // Dash / Specific details
    if (this.isDashing) {
      noStroke();
      fill(detailColor);
      ellipse(0, h / 2, w * 0.8, w * 0.6);
    }

    if (currentSkin === 'neon') {
        strokeWeight(2);
        line(-w, 0, w, 0); // Neon bar
    } else if (currentSkin === 'phoenix') {
        // Flame effect
        fill(255, 100, 0, 200);
        triangle(-w/2, h/2, w/2, h/2, 0, h/2 + random(10, 30));
    }

    pop();
  }
}
