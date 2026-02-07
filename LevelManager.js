/**
 * LevelManager.js - Handles level progression and difficulty scaling
 * 
 * Progression: 5 checkpoints = 1 level up
 * Each level increases AI speed and aggression
 */

class LevelManager {
  
  // Progression settings
  static CHECKPOINTS_PER_LEVEL = 5;
  
  // Difficulty scaling per level
  static SPEED_MULTIPLIER = 1.10;      // +10% AI speed per level
  static AGGRESSION_DECREASE = 10;      // Threshold shrinks by 10 per level
  static AI_SPAWN_PER_LEVEL = 3;        // +3 AI per level up

  constructor() {
    this.currentLevel = 1;
    this.checkpointsThisLevel = 0;
    this.totalCheckpoints = 0;
    this.justLeveledUp = false;
    
    // Visual feedback
    this.levelUpAnimationTimer = 0;
    this.levelUpAnimationDuration = 120; // 2 seconds at 60fps
  }

  /**
   * Call when a checkpoint is captured
   * @returns {boolean} True if level up occurred
   */
  onCheckpointCaptured() {
    this.totalCheckpoints++;
    this.checkpointsThisLevel++;
    this.justLeveledUp = false;
    
    if (this.checkpointsThisLevel >= LevelManager.CHECKPOINTS_PER_LEVEL) {
      this.levelUp();
      return true;
    }
    return false;
  }

  /**
   * Trigger level up
   */
  levelUp() {
    this.currentLevel++;
    this.checkpointsThisLevel = 0;
    this.justLeveledUp = true;
    this.levelUpAnimationTimer = this.levelUpAnimationDuration;
  }

  /**
   * Get current difficulty multiplier for AI speed
   * @returns {number} Speed multiplier
   */
  getSpeedMultiplier() {
    return pow(LevelManager.SPEED_MULTIPLIER, this.currentLevel - 1);
  }

  /**
   * Get aggression threshold reduction
   * @returns {number} Amount to subtract from base threshold
   */
  getAggressionReduction() {
    return (this.currentLevel - 1) * LevelManager.AGGRESSION_DECREASE;
  }

  /**
   * Get number of AI to spawn for current level
   * @param {number} baseCount - Base AI count
   * @returns {number} Total AI count for this level
   */
  getAICount(baseCount) {
    return baseCount + (this.currentLevel - 1) * LevelManager.AI_SPAWN_PER_LEVEL;
  }

  /**
   * Get progress toward next level (0-1)
   * @returns {number} Progress fraction
   */
  getLevelProgress() {
    return this.checkpointsThisLevel / LevelManager.CHECKPOINTS_PER_LEVEL;
  }

  /**
   * Update animation timer
   */
  update() {
    if (this.levelUpAnimationTimer > 0) {
      this.levelUpAnimationTimer--;
    }
    
    // Reset flag after a few frames
    if (this.levelUpAnimationTimer < this.levelUpAnimationDuration - 10) {
      this.justLeveledUp = false;
    }
  }

  /**
   * Draw level-up visual effect
   */
  showLevelUpEffect() {
    if (this.levelUpAnimationTimer <= 0) return;
    
    let progress = this.levelUpAnimationTimer / this.levelUpAnimationDuration;
    
    push();
    // Flash overlay
    let flashAlpha = sin(progress * PI) * 100;
    fill(255, 215, 0, flashAlpha);
    noStroke();
    rect(0, 0, width, height);
    
    // Level text
    textAlign(CENTER, CENTER);
    textSize(80 + (1 - progress) * 40);
    textFont('monospace');
    
    // Glow effect
    for (let i = 5; i > 0; i--) {
      let alpha = map(i, 5, 0, 50, 200) * progress;
      fill(255, 215, 0, alpha);
      text(`LEVEL ${this.currentLevel}`, width / 2 + random(-2, 2), height / 2 + random(-2, 2));
    }
    
    // Main text
    fill(255);
    text(`LEVEL ${this.currentLevel}`, width / 2, height / 2);
    
    pop();
  }

  /**
   * Draw level HUD element
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  showHUD(x, y) {
    push();
    
    // Level badge
    fill(50, 50, 80, 200);
    stroke(255, 215, 0);
    strokeWeight(2);
    rectMode(CENTER);
    rect(x, y, 120, 50, 10);
    
    // Level text
    noStroke();
    fill(255, 215, 0);
    textAlign(CENTER, CENTER);
    textSize(24);
    textFont('monospace');
    text(`LVL ${this.currentLevel}`, x, y - 5);
    
    // Progress bar
    let barWidth = 100;
    let barHeight = 8;
    let barX = x - barWidth / 2;
    let barY = y + 15;
    
    // Background
    fill(30, 30, 50);
    noStroke();
    rect(barX + barWidth / 2, barY, barWidth, barHeight, 4);
    
    // Progress fill
    let fillWidth = barWidth * this.getLevelProgress();
    if (fillWidth > 0) {
      fill(0, 255, 200);
      rect(barX + fillWidth / 2, barY, fillWidth, barHeight, 4);
    }
    
    // Checkpoint indicators
    fill(255, 100);
    textSize(10);
    text(`${this.checkpointsThisLevel}/${LevelManager.CHECKPOINTS_PER_LEVEL}`, x, barY + 12);
    
    pop();
  }

  /**
   * Reset for new game
   */
  reset() {
    this.currentLevel = 1;
    this.checkpointsThisLevel = 0;
    this.totalCheckpoints = 0;
    this.justLeveledUp = false;
    this.levelUpAnimationTimer = 0;
  }
}
