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

    // Input State
    this.targetAngle = -PI / 2;
  }

  /**
   * Apply Car Physics Constraints
   * @param {number} tractionMult - 1.0 = clear, <1.0 = slippery
   */
  updatePhysics(tractionMult = 1.0) {
    // 1. INPUT HANDLING & ANGLE CALCULATION
    // Calculate vector to mouse (relative to screen center)
    let dx = mouseX - width / 2;
    let dy = mouseY - height / 2;
    this.targetAngle = atan2(dy, dx);

    // 2. STEERING (Angular Interpolation)
    let diff = this.targetAngle - this.angle;
    // Normalize to -PI...PI
    if (diff > PI) diff -= TWO_PI;
    if (diff < -PI) diff += TWO_PI;

    // Smooth steering (Arcade feel: snap quickly but smoothly)
    // Dynamic turn speed: faster when slow, slightly slower when very fast (optional, but good for stability)
    let steerAmount = this.turnSpeed * tractionMult;

    // Apply steering limit
    if (abs(diff) > steerAmount) {
      this.angle += diff > 0 ? steerAmount : -steerAmount;
    } else {
      this.angle = this.targetAngle;
    }

    // 3. ACCELERATION & FRICTION
    // Distance based speed control
    let distToMouse = dist(mouseX, mouseY, width / 2, height / 2);
    let targetSpeed = 0;

    // Deadzone near car to stop
    if (distToMouse > 30) {
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
    if (distToMouse > 30 || this.isDashing) {
      if (this.speed < targetSpeed) {
        // Apply Accel Multiplier
        let accel = this.accelerationRate * this.accelMult;
        // Heavier vehicles accelerate slower too?
        // let massFactor = 100 / (50 + this.mass);
        // accel *= massFactor; // Optional feel
        this.speed += accel * tractionMult;
      }
    }

    // Apply Friction / Deceleration
    if (!this.isDashing) {
      if (distToMouse <= 30) {
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
      this.dashTimer = 25;
      this.dashCooldown = 180; // 3 seconds

      // IMPULSE: Immediate speed boost
      // If moving slow, boost to max * 1.5 instantly
      // If moving fast, boost to speed * 1.5
      let boostSpeed = max(this.maxSpeed, this.speed) * 2.0; // Significant boost
      this.speed = boostSpeed;

      soundManager.playDash();
    }
  }

  show() {
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
      let w = map(this.dashCooldown, 180, 0, 0, 30);
      rect(-15, -2, w, 4, 2);
      pop();
    }
  }

  drawProceduralSprite() {
    let w = this.r * 0.9;
    let h = this.r * 2.4; // Sleeker
    let bodyColor = this.isDashing ? color(0, 255, 255) : color(255, 215, 0);
    let wingColor = this.isDashing ? color(50, 200, 255) : color(255, 180, 0);
    let cockpitColor = color(20, 20, 40, 200);

    stroke(255, 200);
    strokeWeight(1);

    // Rear Wings
    fill(wingColor);
    triangle(0, h / 3, -w * 1.2, h / 2, -w * 0.5, 0);
    triangle(0, h / 3, w * 1.2, h / 2, w * 0.5, 0);

    // Main Body
    fill(bodyColor);
    beginShape();
    vertex(0, -h / 2); // Nose
    bezierVertex(w / 2, -h / 4, w * 0.8, h / 4, w / 2, h / 2);
    vertex(0, h / 2 + 5); // Engine exhaust
    vertex(-w / 2, h / 2);
    bezierVertex(-w * 0.8, h / 4, -w / 2, -h / 4, 0, -h / 2);
    endShape(CLOSE);

    // Cockpit
    fill(cockpitColor);
    ellipse(0, -h / 8, w * 0.5, h * 0.35);

    // Engine Glow (Redesigned for performance and readability)
    if (this.isDashing) {
      noStroke();
      // Core
      fill(255);
      ellipse(0, h / 2, w * 0.4, w * 0.3);
      // Glow rings
      fill(0, 255, 255, 100);
      ellipse(0, h / 2, w * 0.8, w * 0.6);
      fill(0, 255, 255, 50);
      ellipse(0, h / 2, w * 1.2, w * 0.9);
    }
  }
}
