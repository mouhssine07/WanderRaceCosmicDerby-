/**
 * Dashboard.js - Info panel with game controls summary
 * Shows key bindings for controls
 */

class Dashboard {
  constructor() {
    this.visible = true;
    this.x = 10;
    this.y = 0; // Will be calculated dynamically in show()
    this.padding = 20;
    this.lineHeight = 26;
    this.initialized = true;
  }

  /**
   * Create dashboard (no sliders needed)
   */
  init() {
    // No initialization needed
  }

  /**
   * Toggle visibility
   */
  toggle() {
    this.visible = !this.visible;
  }

  /**
   * Draw dashboard info panel
   */
  show() {
    if (!this.visible) return;

    push();
    resetMatrix();

    // Calculate dimensions
    let lines = [
      "SPACE - Dash",
      "H - Hide Dashboard",
      "ESC - Display Menu",
      "D - Toggle Debug",
    ];
    let width = 200;
    let height = this.padding * 2 + lines.length * this.lineHeight;

    // Position at center-left of screen
    let yPos = height / 2 - height / 2;
    yPos = 100;

    // Panel background with border
    fill(15, 20, 45, 230);
    stroke(80, 150, 220);
    strokeWeight(2);
    rect(this.x, yPos, width, height, 5);

    // Title
    fill(100, 200, 255);
    noStroke();
    textSize(14);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    text("CONTROLS", this.x + this.padding, yPos + this.padding - 3);

    // Control keys
    fill(200, 220, 240);
    textSize(12);
    textStyle(NORMAL);
    textAlign(LEFT, TOP);

    let yOffset = yPos + this.padding + 22;
    for (let line of lines) {
      text(line, this.x + this.padding, yOffset);
      yOffset += this.lineHeight;
    }

    pop();
  }

  /**
   * Hide (legacy method for compatibility)
   */
  hide() {
    // No sliders to hide
  }

  /**
   * Show sliders (legacy method for compatibility)
   */
  showSliders() {
    // No sliders
  }
}
