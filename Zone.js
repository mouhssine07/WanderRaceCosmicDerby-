/**
 * Zone.js - Handles environmental zones with different effects
 */

class Zone {
  constructor(x, y, r, type) {
    this.pos = createVector(x, y);
    this.r = r;
    this.type = type; // 'nebulosa', 'trou_noir', 'flux_energie', 'asteroid_field'
    
    // Visuals
    this.pulse = 0;
    this.angle = random(TWO_PI);
  }

  update() {
    this.pulse += 0.05;
    this.angle += 0.01;
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    noStroke();
    
    if (this.type === 'nebulosa') {
      // Violet nebula
      fill(150, 0, 255, 30 + sin(this.pulse) * 10);
      for (let i = 0; i < 3; i++) {
        ellipse(random(-10, 10), random(-10, 10), this.r * 2 + i * 20);
      }
    } else if (this.type === 'trou_noir') {
      // Black hole
      fill(0, 200);
      circle(0, 0, this.r * 2);
      noFill();
      stroke(255, 100);
      strokeWeight(2);
      rotate(this.angle);
      arc(0, 0, this.r * 2.5, this.r * 2.5, 0, PI);
      rotate(PI);
      arc(0, 0, this.r * 2.3, this.r * 2.3, 0, PI);
    } else if (this.type === 'flux_energie') {
      // Energy flux (Yellow/Cyan)
      fill(0, 255, 255, 20);
      circle(0, 0, this.r * 2);
      stroke(0, 255, 255, 100);
      noFill();
      rotate(-this.angle * 2);
      for(let i=0; i<4; i++) {
          line(-this.r, 0, this.r, 0);
          rotate(PI/4);
      }
    }
    pop();
  }

  affect(vehicle) {
    let d = p5.Vector.dist(this.pos, vehicle.pos);
    if (d < this.r) {
      if (this.type === 'nebulosa') {
        vehicle.speed *= 0.95; // Drag effect
        if (vehicle === player && frameCount % 60 === 0) {
            vehicle.addPopup("☁ NEBULA DRAG", color(150, 0, 255));
        }
      } else if (this.type === 'trou_noir') {
        let pull = p5.Vector.sub(this.pos, vehicle.pos);
        pull.setMag(0.5); // Gravitational pull
        vehicle.pos.add(pull);
        if (vehicle === player && frameCount % 120 === 0) {
            vehicle.addPopup("🕳 GRAVITY PULL", color(100));
        }
      } else if (this.type === 'flux_energie') {
          // Handled in sketch.js for spawn rates, 
          // but maybe a small speed boost?
          vehicle.speed = min(vehicle.speed + 0.1, vehicle.maxSpeed * 1.2);
      }
    }
  }
}
