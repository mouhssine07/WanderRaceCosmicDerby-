/**
 * Particle.js - Simple explosion particle system
 * Spawns colorful particles that fade out over time
 */

class Particle {
  
  /**
   * @param {number} x - Initial x position
   * @param {number} y - Initial y position
   * @param {number} hue - Base hue color (0-360)
   */
  constructor(x, y, hue = null) {
    this.pos = createVector(x, y);
    
    // Random velocity for explosion effect
    let angle = random(TWO_PI);
    let speed = random(2, 8);
    this.vel = createVector(cos(angle) * speed, sin(angle) * speed);
    
    // Friction to slow down
    this.friction = 0.96;
    
    // Lifespan (in frames)
    this.lifespan = random(40, 80);
    this.maxLifespan = this.lifespan;
    
    // Color
    this.hue = hue !== null ? hue : random(360);
    this.saturation = random(70, 100);
    this.brightness = 100;
    
    // Size
    this.size = random(3, 8);
  }

  /**
   * Update particle physics
   */
  update() {
    // Apply velocity
    this.pos.add(this.vel);
    
    // Apply friction
    this.vel.mult(this.friction);
    
    // Decrease lifespan
    this.lifespan--;
    
    // Shrink over time
    this.size *= 0.98;
  }

  /**
   * Draw the particle
   */
  show() {
    push();
    colorMode(HSB, 360, 100, 100, 255);
    
    // Alpha based on remaining lifespan
    let alpha = map(this.lifespan, 0, this.maxLifespan, 0, 255);
    
    noStroke();
    fill(this.hue, this.saturation, this.brightness, alpha);
    circle(this.pos.x, this.pos.y, this.size);
    
    // Optional: add a small glow
    fill(this.hue, this.saturation, this.brightness, alpha * 0.3);
    circle(this.pos.x, this.pos.y, this.size * 2);
    
    colorMode(RGB, 255);
    pop();
  }

  /**
   * Check if particle is dead
   * @returns {boolean} True if particle should be removed
   */
  isDead() {
    return this.lifespan <= 0 || this.size < 0.5;
  }
}


/**
 * ParticleSystem - Manager for groups of particles
 */
class ParticleSystem {
  
  constructor() {
    this.particles = [];
  }

  /**
   * Create an explosion at a position
   * @param {number} x - Explosion x position
   * @param {number} y - Explosion y position
   * @param {number} count - Number of particles (default 60)
   * @param {number} hue - Base hue for color variety (optional)
   */
  explode(x, y, count = 60, hue = null) {
    for (let i = 0; i < count; i++) {
      // Vary hue slightly for each particle
      let particleHue = hue !== null ? (hue + random(-30, 30) + 360) % 360 : null;
      this.particles.push(new Particle(x, y, particleHue));
    }
  }

  /**
   * Update all particles and remove dead ones
   */
  update() {
    // Update particles
    for (let particle of this.particles) {
      particle.update();
    }
    
    // Remove dead particles
    this.particles = this.particles.filter(p => !p.isDead());
  }

  /**
   * Draw all particles
   */
  show() {
    for (let particle of this.particles) {
      particle.show();
    }
  }

  /**
   * Get current particle count
   * @returns {number} Number of active particles
   */
  count() {
    return this.particles.length;
  }

  /**
   * Clear all particles
   */
  clear() {
    this.particles = [];
  }
}
