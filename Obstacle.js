/**
 * Obstacle.js - Dynamic moving hazards
 */

class Obstacle {
  
  constructor() {
    const WORLD_WIDTH = 5000;
    const WORLD_HEIGHT = 5000;
    
    this.pos = createVector(random(WORLD_WIDTH), random(WORLD_HEIGHT));
    this.vel = p5.Vector.random2D().mult(random(1, 3));
    this.r = random(30, 60); // Radius
    
    // Visuals
    this.spikes = floor(random(5, 12));
    this.rotation = 0;
    this.rotSpeed = random(-0.05, 0.05);
    
    // Chase Behavior
    this.detectionRadius = 300;
    this.chaseSpeed = 4; // Faster than normal float
    this.chaseTimer = 0;
    this.isChasing = false;
    this.wanderVel = this.vel.copy(); // Store original wander
  }

  update(player) {
    // 1. BEHAVIOR LOGIC
    if (player && !player.isDead) {
      let dist = p5.Vector.dist(this.pos, player.pos);
      
      // Start Chase
      if (!this.isChasing && dist < this.detectionRadius) {
        this.isChasing = true;
        this.chaseTimer = 180; // Chase for 3 seconds
        
        // Alert Sound
        if (typeof soundManager !== 'undefined') soundManager.playAlert();
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
    
    // 2. PHYSICS
    this.pos.add(this.vel);
    this.rotation += this.rotSpeed;
    if (this.isChasing) this.rotation += 0.1; // Spin faster when angry
    
    // Bounce off world edges
    const WORLD_WIDTH = 5000; 
    const WORLD_HEIGHT = 5000;
    
    if (this.pos.x < 0 || this.pos.x > WORLD_WIDTH) {
       this.vel.x *= -1;
       this.wanderVel.x *= -1;
    }
    if (this.pos.y < 0 || this.pos.y > WORLD_HEIGHT) {
       this.vel.y *= -1;
       this.wanderVel.y *= -1;
    }
  }

  checkCollision(vehicle) {
    let dist = p5.Vector.dist(this.pos, vehicle.pos);
    if (dist < this.r + vehicle.r) {
      // SHIELD / DASH CHECK
      if ((vehicle.shieldTimer > 0) || (vehicle.isDashing)) {
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
        
        // 4. SOUND
        if (vehicle.constructor.name === 'PlayerVehicle' && typeof soundManager !== 'undefined') {
           soundManager.playBonusShield(); 
        }
        return; 
      }

      // Bounce vehicle
      let push = p5.Vector.sub(vehicle.pos, this.pos).normalize();
      vehicle.pos.add(push.mult(5));
      
      // Speed penalty
      vehicle.speed *= -0.5; // Bounce back
      
      // Damage
      vehicle.takeDamage(20); // 20 damage per hit
      
      // Sound
      // Use global soundManager but safely check exists (just in case)
      if (typeof soundManager !== 'undefined' && vehicle.constructor.name === 'PlayerVehicle') {
         soundManager.playHit();
      }
      
      // MASS REDUCTION
      // Shrink logic
      let shrinkAmount = 40;
      
      if (typeof vehicle.targetMass !== 'undefined') {
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
