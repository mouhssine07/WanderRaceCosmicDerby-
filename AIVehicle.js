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
    this.currentState = "idle";
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
    let speedMult = 0.8; // Idle speed
    let distToPlayer = p5.Vector.dist(this.pos, player.pos);
    let massRatio = this.mass / player.mass;

    // 1. STATE EVALUATION & TACTICS
    
    // PRIORITY 1: GLOBAL SURVIVAL (Heal Search)
    if (this.health < this.maxHealth * 0.4) {
      let healTarget = null;
      let minHealDist = Infinity;
      for (let p of points) {
        if (p.type === 'heal') {
          let d = p5.Vector.dist(this.pos, p.pos);
          if (d < minHealDist) {
            minHealDist = d;
            healTarget = p;
          }
        }
      }
      if (healTarget) {
        this.currentState = "heal_seek";
        this.targetPoint = healTarget;
        speedMult = 1.1;
      }
    }
    
    // PRIORITY 2: INTERACTION WITH PLAYER
    if (this.currentState !== "heal_seek") {
      // Scouts avoid combat at all costs
      let threatDist = this.aiClass === "scout" ? 600 : 400;

      if (distToPlayer < threatDist) {
        if (massRatio > 1.3 && this.aiClass !== "scout") {
          // PREDATOR: I HUNT
          this.currentState = "hunt";
          speedMult = 1.25;
        } else {
          // PREY: I AVOID
          this.currentState = "avoid";
          speedMult = 1.2;
        }
      } else {
        // PRIORITY 3: GROWTH & POWERUP STRATEGY
        let bestTarget = null;
        let lowestHeuristic = Infinity;

        // TACTICAL POWERUP PICKUP
        for (let p of points) {
          let d = p5.Vector.dist(this.pos, p.pos);
          let h = d;
          
          // Tactical Weighting
          if (p.type === 'shield' && this.health < this.maxHealth * 0.7) h *= 0.5; // High priority for shield if slightly damaged
          if (p.type === 'power' && this.currentState === "hunt") h *= 0.3; // Very high priority if hunting
          
          if (h < lowestHeuristic) {
            lowestHeuristic = h;
            bestTarget = p;
          }
        }

        // STARS (Growth focus)
        if (stars) {
          for (let s of stars) {
            let d = p5.Vector.dist(this.pos, s.pos);
            let h = d * (this.aiClass === "scout" ? 0.4 : 0.8); // Scouts are star-obsessed
            if (h < lowestHeuristic) {
              lowestHeuristic = h;
              bestTarget = s;
            }
          }
        }

        if (bestTarget) {
          this.targetPoint = bestTarget;
          this.currentState = "seek";
          speedMult = 1.0;
        } else {
          this.currentState = "idle";
          speedMult = 0.7;
        }
      }
    }

    // 2. TARGET ANGLE CALCULATION

    if (this.currentState === "idle") {
      if (frameCount % 60 === 0 || random() < 0.02) {
        this.targetAngle += random(-PI / 2, PI / 2);
      }
    } else if (this.currentState === "avoid") {
      let vecToPlayer = p5.Vector.sub(player.pos, this.pos);
      this.targetAngle = vecToPlayer.heading() + PI;
    } else if (this.currentState === "hunt") {
      // Direct chase
      let vecToPlayer = p5.Vector.sub(player.pos, this.pos);
      this.targetAngle = vecToPlayer.heading();
    } else if (this.currentState === "seek" || this.currentState === "heal_seek" || this.currentState === "chase") {
      if (this.targetPoint) {
        let vecToPoint = p5.Vector.sub(this.targetPoint.pos, this.pos);
        this.targetAngle = vecToPoint.heading();
      }
    }

    // 3. SET PHYSICS TARGETS
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

    // Apply Mass Turn Multiplier (Weight Tax)
    let turnRate = this.baseTurnSpeed * this.massTurnMult;
    if (abs(diff) > turnRate) {
      this.angle += diff > 0 ? turnRate : -turnRate;
    } else {
      this.angle = this.targetAngle;
    }

    // Acceleration
    // Ensure we don't exceed maxSpeed (mass limit)
    let limitSpeed = Math.min(this.targetSpeed, this.maxSpeed);

    if (this.speed < limitSpeed) {
      // Apply Mass Accel Multiplier (Weight Tax)
      this.speed += this.accelerationRate * this.massAccelMult;
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
    if (this.pos.x < 0) {
      this.pos.x = 0;
      this.targetAngle += PI;
    }
    if (this.pos.y < 0) {
      this.pos.y = 0;
      this.targetAngle += PI;
    }
    if (this.pos.x > w) {
      this.pos.x = w;
      this.targetAngle += PI;
    }
    if (this.pos.y > h) {
      this.pos.y = h;
      this.targetAngle += PI;
    }
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    rotate(PI / 2);

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

    // Enhanced Debug Visualization
    if (Vehicle.debug) {
      push();
      translate(this.pos.x, this.pos.y);

      // Perception radius circle
      noFill();
      stroke(100, 200, 255, 100);
      strokeWeight(1);
      circle(0, 0, this.perceptionRadius * 2);

      // Direction line (heading)
      stroke(255, 255, 0, 200);
      strokeWeight(2);
      let headingLength = this.r * 3;
      let dirX = cos(this.angle) * headingLength;
      let dirY = sin(this.angle) * headingLength;
      line(0, 0, dirX, dirY);

      // Velocity vector
      stroke(0, 255, 100, 200);
      strokeWeight(1.5);
      line(0, 0, this.vel.x * 2, this.vel.y * 2);

      // State color indicator
      let stateColor =
        this.currentState === "WANDER"
          ? [100, 200, 255]
          : this.currentState === "SEEK"
            ? [100, 255, 100]
            : this.currentState === "FLEE"
              ? [255, 100, 100]
              : [200, 200, 200];

      stroke(stateColor[0], stateColor[1], stateColor[2], 200);
      strokeWeight(2);
      noFill();
      circle(0, 0, this.r * 1.5);

      // Mass/Size label
      fill(200, 200, 200);
      noStroke();
      textSize(10);
      textAlign(CENTER, CENTER);
      text(`M:${floor(this.mass)}`, 0, this.r + 15);

      pop();
    }
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
    triangle(0, h / 2, -w, h / 2, 0, -h / 4);
    triangle(0, h / 2, w, h / 2, 0, -h / 4);

    fill(bodyColor);
    beginShape();
    vertex(0, -h / 2);
    vertex(w / 2, h / 4);
    vertex(0, h / 2);
    vertex(-w / 2, h / 4);
    endShape(CLOSE);

    fill(cockpitColor);
    noStroke();
    ellipse(0, -h / 6, w * 0.4, h * 0.3);

    colorMode(RGB, 255);
  }
}
