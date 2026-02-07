/**
 * Star.js - Scoring Item
 * Purely for points. No physics mass or power-up effects.
 */
class Star {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.rotation = random(TWO_PI);
    this.captureRadius = 30;
    this.scoreValue = 10;
    this.color = color(255, 215, 0); // Gold
  }

  update() {
    this.rotation += 0.03;
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rotation);
    
    // Star Shape
    fill(this.color);
    stroke(255, 255, 150);
    strokeWeight(2);
    
    beginShape();
    let nPoints = 5;
    let r1 = 15; // Outer
    let r2 = 7;  // Inner
    let angle = TWO_PI / nPoints;
    let halfAngle = angle / 2.0;
    
    for (let a = 0; a < TWO_PI; a += angle) {
      let sx = cos(a) * r1;
      let sy = sin(a) * r1;
      vertex(sx, sy);
      sx = cos(a + halfAngle) * r2;
      sy = sin(a + halfAngle) * r2;
      vertex(sx, sy);
    }
    endShape(CLOSE);
    
    pop();
  }
  
  checkCapture(pos) {
    return p5.Vector.dist(this.pos, pos) < this.captureRadius;
  }
}
