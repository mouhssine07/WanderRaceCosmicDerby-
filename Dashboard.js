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
    
    // Disable on mobile as requested (using buttons instead)
    if (typeof mobileManager !== 'undefined' && mobileManager.isMobile) return;

    push();
    resetMatrix();

    // Calculate dimensions - Scaled
    let isMobile = (typeof mobileManager !== 'undefined' && mobileManager.isMobile);
    
    let lines = isMobile ? [
      "JOYSTICK - Diriger",
      "DASH - S'élancer",
      "BOUTON II - Menu",
      "TAP - Interagir"
    ] : [
      "SPACE - Dash",
      "H - Hide Dashboard",
      "ESC - Display Menu",
      "D - Toggle Debug",
    ];
    let panelW = 160 * UI_SCALE;
    let panelH = (this.padding * 2 + lines.length * this.lineHeight) * UI_SCALE;

    // Position at center-left of screen
    let yPos = 100 * UI_SCALE;

    // Panel background with border
    fill(15, 20, 45, 230);
    stroke(80, 150, 220);
    strokeWeight(2);
    rect(this.x, yPos, panelW, panelH, 5 * UI_SCALE);

    // Title
    fill(100, 200, 255);
    noStroke();
    textSize(12 * UI_SCALE);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    text("CONTROLS", this.x + this.padding * UI_SCALE, yPos + this.padding * UI_SCALE - 3);

    // Control keys
    fill(200, 220, 240);
    textSize(10 * UI_SCALE);
    textStyle(NORMAL);
    textAlign(LEFT, TOP);

    let yOffset = yPos + (this.padding + 18) * UI_SCALE;
    for (let line of lines) {
      text(line, this.x + this.padding * UI_SCALE, yOffset);
      yOffset += this.lineHeight * UI_SCALE;
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
