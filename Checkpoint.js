/**
 * Checkpoint.js - Power-up System
 * 
 * Types:
 * - Green: Health Pack (+Health)
 * - Blue: Nitrous (+Speed Duration)
 * - Red: Executioner (Instakill Touch)
 * - Yellow: Shield (Invincibility)
 */

class Checkpoint {
  
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.rotation = random(TWO_PI);
    this.captureRadius = 40;
    this.pulsePhase = random(TWO_PI);
    
    // Determine Type
    let r = random();
    if (r < 0.25) {
      this.type = 'heal';
      this.color = color(0, 255, 0); // Green
      this.icon = "✚";
    } else if (r < 0.50) {
      this.type = 'shield'; 
      this.color = color(0, 100, 255); // Blue 
      this.icon = "🛡";
    } else if (r < 0.75) {
      this.type = 'speed';
      this.color = color(255, 255, 0); // Yellow
      this.icon = "⚡";
    } else {
      this.type = 'power';
      this.color = color(255, 0, 0); // Red
      this.icon = "⚔";
    }
  }

  update() {
    this.pulsePhase += 0.05;
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // Orb Visual
    noFill();
    stroke(this.color);
    strokeWeight(2);
    
    // Inner pulsing ring
    let r1 = 20 + sin(this.pulsePhase) * 5;
    circle(0, 0, r1 * 2);
    
    // Outer ring
    let r2 = 30 + cos(this.pulsePhase) * 5;
    strokeWeight(1);
    circle(0, 0, r2 * 2);
    
    // Icon
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(20);
    text(this.icon, 0, 2);
    
    pop();
  }

  checkCapture(pos) {
    return p5.Vector.dist(this.pos, pos) < this.captureRadius;
  }
}
