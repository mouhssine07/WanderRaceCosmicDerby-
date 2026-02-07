/**
 * AIVehicle.js - AI Car Logic
 * 
 * Logic:
 * - Uses same Car Physics as Player (turn rates, acceleration)
 * - State Machine: IDLE, SEEK, AVOID, CHASE
 */



class AIVehicle extends Vehicle {
  
  constructor(x, y, image = null) {
    super(x, y, image);
    
    // Physics Config
    this.baseMaxSpeed = 8;
    this.maxSpeed = 8; // Will be modulated by mass
    this.accelerationRate = 0.2;
    this.decelerationRate = 0.1;
    this.maxTurnAngle = 0.05;
    this.baseTurnSpeed = 0.04;
    
    // State
    this.speed = 0;
    this.angle = random(TWO_PI);
    this.targetAngle = this.angle;
    this.speedVariation = random(0.9, 1.1); // Individual speed characteristic
    
    // AI Brain
    this.currentState = 'idle';
    this.stateTimer = 0;
    this.targetPoint = null;
    
    // Visuals
    this.hue = random(360);
    colorMode(HSB, 360, 100, 100);
    this.color = color(this.hue, 80, 100);
    colorMode(RGB, 255);
  }

  /**
   * @param {PlayerVehicle} player 
   * @param {Point[]} points 
   * @param {Star[]} stars
   * @param {Obstacle[]} obstacles 
   */
  think(player, points, stars, obstacles) {
    // defaults
    let speedMult = 0.8; // Idle speed
    
    let distToPlayer = p5.Vector.dist(this.pos, player.pos);
    
    // 1. STATE EVALUATION
    
    // Default: IDLE
    this.currentState = 'idle';
    speedMult = 0.8;
    
    // Check AVOID (Priority 1)
    if (distToPlayer < 150) {
      this.currentState = 'avoid';
      speedMult = 1.1;
    } 
    // Check CHASE/SEEK (Priority 2)
    else {
      // Look for targets (Points + Stars)
      let bestTarget = null;
      let lowestDist = Infinity;
      
      // Check Powerups
      for (let p of points) {
        let d = p5.Vector.dist(this.pos, p.pos);
        if (d < lowestDist) {
           lowestDist = d;
           bestTarget = p;
        }
      }
      
      // Check Stars (Prioritize slightly?)
      if (stars) {
        for (let s of stars) {
          let d = p5.Vector.dist(this.pos, s.pos);
          // Stars are valuable, maybe treat distance as smaller
          let heuristic = d * 0.9; 
          if (heuristic < lowestDist) {
             lowestDist = heuristic;
             bestTarget = s;
          }
        }
      }
      
      if (bestTarget) {
        this.targetPoint = bestTarget;
        
        // CHASE if close
        if (lowestDist < 400) {
           this.currentState = 'chase';
           speedMult = 1.25;
        } else {
           this.currentState = 'seek';
           speedMult = 1.0;
        }
      }
    }
    
    // 2. TARGET ANGLE CALCULATION
    
    if (this.currentState === 'idle') {
      // Wander randomly
      if (frameCount % 60 === 0 || random() < 0.02) {
        this.targetAngle += random(-PI/2, PI/2);
      }
    } else if (this.currentState === 'avoid') {
      // Face away from player
      let vecToPlayer = p5.Vector.sub(player.pos, this.pos);
      this.targetAngle = vecToPlayer.heading() + PI; // Opposite direction
    } else if (this.currentState === 'seek' || this.currentState === 'chase') {
      // Face point
      if (this.targetPoint) {
        let vecToPoint = p5.Vector.sub(this.targetPoint.pos, this.pos);
        this.targetAngle = vecToPoint.heading();
      }
    }
    
    // 3. SET PHYSICS TARGETS
    // Use maxSpeed (which effectively scales with Mass from Vehicle.updateSize)
    this.targetSpeed = this.maxSpeed * speedMult;
  }

  /**
   * Apply Physics Updates (Identical logic to player mostly)
   */
  updatePhysics(tractionMult = 1.0) {
    
    // Steering
    let diff = this.targetAngle - this.angle;
    while (diff <= -PI) diff += TWO_PI;
    while (diff > PI) diff -= TWO_PI;
    
    let turnRate = this.baseTurnSpeed;
    if (abs(diff) > turnRate) {
      this.angle += (diff > 0 ? turnRate : -turnRate);
    } else {
      this.angle = this.targetAngle;
    }
    
    // Acceleration
    // Ensure we don't exceed maxSpeed (mass limit)
    let limitSpeed = Math.min(this.targetSpeed, this.maxSpeed);
    
    if (this.speed < limitSpeed) {
      this.speed += this.accelerationRate;
    } else if (this.speed > limitSpeed) {
      this.speed -= this.decelerationRate;
    }
    
    // Move
    let velX = cos(this.angle) * this.speed;
    let velY = sin(this.angle) * this.speed;
    
    this.pos.x += velX;
    this.pos.y += velY;
    
    // Status Effects
    this.updateStatusEffects();
  }
  
  constrainToWorld(w, h) {
    if (this.pos.x < 0) { this.pos.x = 0; this.targetAngle += PI; }
    if (this.pos.y < 0) { this.pos.y = 0; this.targetAngle += PI; }
    if (this.pos.x > w) { this.pos.x = w; this.targetAngle += PI; }
    if (this.pos.y > h) { this.pos.y = h; this.targetAngle += PI; }
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    rotate(PI/2); 
    
    this.drawProceduralSprite();
    
    // State Debug
    if (Vehicle.debug) {
      fill(255);
      noStroke();
      textSize(12);
      text(this.currentState.toUpperCase(), 0, -30);
    }
    pop();
    
    // Show Status Effects (from Base Class)
    this.showStatusEffects();
  }
  
  drawProceduralSprite() {
    let w = this.r * 0.8;
    let h = this.r * 2.0; 
    
    colorMode(HSB, 360, 100, 100);
    let bodyColor = color(this.hue, 80, 100);
    let wingColor = color(this.hue, 90, 80);
    let cockpitColor = color(0, 0, 20); 
    
    stroke(0, 0, 100, 0.5); 
    strokeWeight(1);
    
    fill(wingColor);
    triangle(0, h/2, -w, h/2, 0, -h/4); 
    triangle(0, h/2, w, h/2, 0, -h/4); 
    
    fill(bodyColor);
    beginShape();
    vertex(0, -h/2);             
    vertex(w/2, h/4);            
    vertex(0, h/2);              
    vertex(-w/2, h/4);           
    endShape(CLOSE);
    
    fill(cockpitColor);
    noStroke();
    ellipse(0, -h/6, w * 0.4, h * 0.3);
    
    colorMode(RGB, 255); 
  }
}
