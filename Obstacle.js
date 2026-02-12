/**
 * Obstacle.js - Dynamic moving hazards
 */

class Obstacle {
  constructor() {
    const WORLD_WIDTH = 5000;
    const WORLD_HEIGHT = 5000;
    const SPAWN_MARGIN = 150; // Distance from edges to spawn

    // Spawn with margin from world edges
    this.pos = createVector(
      random(SPAWN_MARGIN, WORLD_WIDTH - SPAWN_MARGIN),
      random(SPAWN_MARGIN, WORLD_HEIGHT - SPAWN_MARGIN),
    );
    this.vel = p5.Vector.random2D().mult(random(1, 3));
    this.r = random(30, 60); // Radius

    // Visuals
    this.spikes = floor(random(5, 12));
    this.rotation = 0;
    this.rotSpeed = random(-0.05, 0.05);

    // Chase Behavior
    this.detectionRadius = 200; // Reduced from 250
    this.chaseSpeed = 2.5; // Reduced from 3 - much easier to outrun
    this.chaseTimer = 0;
    this.isChasing = false;
    this.wanderVel = this.vel.copy(); // Store original wander

    // Collision cooldown to prevent sound spam
    this.collisionCooldown = 0;
  }

  update(player) {
    // 1. BEHAVIOR LOGIC
    if (player && !player.isDead) {
      let dist = p5.Vector.dist(this.pos, player.pos);

      // Start Chase
      if (!this.isChasing && dist < this.detectionRadius) {
        this.isChasing = true;
        this.chaseTimer = 120; // Chase for 2 seconds (reduced from 3)

        // Alert Sound
        if (typeof soundManager !== "undefined") soundManager.playAlert();
      }
    }

    if (this.isChasing) {
      // Chase Logic
      if (player) {
        let dir = p5.Vector.sub(player.pos, this.pos).normalize();
        this.vel = dir.mult(this.chaseSpeed);
      }

      this.chaseTimer--;
      if (this.chaseTimer <= 0) {
        // Stop Chase
        this.isChasing = false;
        this.vel = this.wanderVel.copy(); // Resume wandering
      }
    } else {
      // Restore wander velocity if needed (ensure it persists)
      // We don't change wanderVel so just keep current vel or restore?
      // If we just stopped chasing, vel was overwritten.
      // We need to ensure we drift nicely.
      // Let's just use wanderVel when not chasing.
      this.vel = this.wanderVel;
    }

    // Decrement collision cooldown
    if (this.collisionCooldown > 0) {
      this.collisionCooldown--;
    }

    // 2. PHYSICS
    this.pos.add(this.vel);
    this.rotation += this.rotSpeed;
    if (this.isChasing) this.rotation += 0.1; // Spin faster when angry

    // Bounce off world edges and keep within bounds
    const WORLD_WIDTH = 5000;
    const WORLD_HEIGHT = 5000;

    // Bounce X - reverse direction when hitting borders
    if (this.pos.x - this.r < 0) {
      this.pos.x = this.r;
      this.vel.x = abs(this.vel.x); // Always move away from left border
      this.wanderVel.x = abs(this.wanderVel.x);
    } else if (this.pos.x + this.r > WORLD_WIDTH) {
      this.pos.x = WORLD_WIDTH - this.r;
      this.vel.x = -abs(this.vel.x); // Always move away from right border
      this.wanderVel.x = -abs(this.wanderVel.x);
    }

    // Bounce Y - reverse direction when hitting borders
    if (this.pos.y - this.r < 0) {
      this.pos.y = this.r;
      this.vel.y = abs(this.vel.y); // Always move away from top border
      this.wanderVel.y = abs(this.wanderVel.y);
    } else if (this.pos.y + this.r > WORLD_HEIGHT) {
      this.pos.y = WORLD_HEIGHT - this.r;
      this.vel.y = -abs(this.vel.y); // Always move away from bottom border
      this.wanderVel.y = -abs(this.wanderVel.y);
    }
  }

  checkCollision(vehicle) {
    let dist = p5.Vector.dist(this.pos, vehicle.pos);
    if (dist < this.r + vehicle.r) {
      // SHIELD / DASH CHECK
      if (vehicle.shieldTimer > 0 || vehicle.isDashing) {
        // 1. KNOCKBACK OBSTACLE (Fly away)
        let force = 15;
        if (vehicle.isDashing) force = 30; // Stronger punch if dashing

        let push = p5.Vector.sub(this.pos, vehicle.pos).normalize().mult(force);
        this.vel = push; // Override velocity
        this.pos.add(push); // Immediate separation

        // 2. RECOIL VEHICLE (Prevent sticking)
        let recoil = p5.Vector.sub(vehicle.pos, this.pos).normalize().mult(5);
        vehicle.pos.add(recoil);

        // 3. STUN
        this.isChasing = false;
        this.chaseTimer = -60; // Stunned for 1 second

        // 4. SOUND REMOVED (User Request)
        this.collisionCooldown = 15; 
        return;
      }

      // Bounce vehicle - MUCH stronger separation
      let push = p5.Vector.sub(vehicle.pos, this.pos).normalize();
      vehicle.pos.add(push.mult(15)); // Increased from 5 to 15

      // Speed penalty
      vehicle.speed *= -0.5; // Bounce back

      // Scaled Damage - Big vehicles take less damage
      // Base: 10 damage (reduced from 20), scales down with mass
      // mass 100 = 10 damage, mass 200 = 7 damage, mass 400 = 5 damage
      let baseDamage = 10;
      let massScale = 100 / Math.max(vehicle.mass || 100, 100); // Scale inversely with mass
      let damage = Math.max(baseDamage * massScale, 5); // Min 5 damage
      vehicle.takeDamage(damage);

      // Sound Removed (User Request)
      this.collisionCooldown = 15;

      // MASS REDUCTION
      // Shrink logic
      let shrinkAmount = 40;

      if (typeof vehicle.targetMass !== "undefined") {
        vehicle.targetMass -= shrinkAmount;
        // Instant feedback on mass too (optional, or let lerp handle it but target must go down)
        // vehicle.mass -= shrinkAmount; // Let lerp handle smooth shrinking?
        // Actually, if we want "hit" feel, maybe instant drop a bit, but smooth is better?
        // Let's drop targetMass.

        if (vehicle.addPopup) vehicle.addPopup("-SIZE", color(150, 50, 50));
      } else if (vehicle.mass) {
        vehicle.mass -= shrinkAmount;
      }

      // Spin
      vehicle.angle += random(-1, 1);
    }
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);

    // Draw Detection Range (User Request)
    if (!this.isChasing) {
      noFill();
      stroke(255, 50, 50, 30); // Faint red ring
      strokeWeight(1);
      circle(0, 0, this.detectionRadius * 2);
    }

    rotate(this.rotation);

    fill(this.isChasing ? color(150, 0, 0) : 50); // Red if angry
    stroke(this.isChasing ? color(255, 0, 0) : color(150, 0, 0)); // Bright red outline if angry
    strokeWeight(2);

    // Draw spiked shape
    beginShape();
    for (let i = 0; i < TWO_PI; i += TWO_PI / this.spikes) {
      let r = this.r;
      vertex(cos(i) * r, sin(i) * r);
      vertex(cos(i + 0.5) * (r * 0.5), sin(i + 0.5) * (r * 0.5));
    }
    endShape(CLOSE);

    // Glossy center
    fill(100, 0, 0, 100);
    circle(0, 0, this.r * 0.5);

    pop();
  }
}
