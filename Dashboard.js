/**
 * Dashboard.js - Real-time control panel with sliders
 * Allows adjusting game parameters during gameplay
 */

class Dashboard {
  
  constructor() {
    this.visible = true;
    this.x = 10;
    this.y = 120;
    this.width = 200;
    this.padding = 10;
    
    // Create sliders (will be positioned in setup)
    this.sliders = {};
    this.labels = {};
    
    // Slider configurations
    this.sliderConfigs = [
      { name: 'playerMaxSpeed', label: 'Player Speed', min: 8, max: 25, default: 12, step: 0.5 },
      { name: 'aiMaxSpeed', label: 'AI Max Speed', min: 3, max: 15, default: 8, step: 0.5 },
      { name: 'aiCount', label: 'AI Count', min: 0, max: 100, default: 20, step: 1 },
      { name: 'obstacleCount', label: 'Obstacles', min: 0, max: 100, default: 15, step: 1 }
    ];
    
    this.initialized = false;
  }

  /**
   * Create slider elements (call after createCanvas)
   */
  init() {
    if (this.initialized) return;
    
    let yOffset = this.y + 40;
    
    for (let config of this.sliderConfigs) {
      // Create slider
      let slider = createSlider(config.min, config.max, config.default, config.step);
      slider.position(this.x + this.padding, yOffset);
      slider.style('width', (this.width - this.padding * 2) + 'px');
      slider.addClass('dashboard-slider');
      
      this.sliders[config.name] = slider;
      this.labels[config.name] = { 
        text: config.label, 
        y: yOffset - 15,
        config: config
      };
      
      yOffset += 50;
    }
    
    // Calculate total height
    this.height = yOffset - this.y + 10;
    
    this.initialized = true;
  }

  /**
   * Get current slider values
   * @returns {Object} Current values
   */
  getValues() {
    let values = {};
    for (let name in this.sliders) {
      values[name] = this.sliders[name].value();
    }
    return values;
  }

  /**
   * Apply slider values to game
   * @param {AIVehicle[]} aiVehicles - Array of AI vehicles to update
   */
  apply(aiVehicles) {
    let values = this.getValues();
    
    // Apply to AI vehicles
    for (let ai of aiVehicles) {
      // Update base speed (scaled by variation)
      if (ai.speedVariation) {
        ai.baseSpeed = values.aiMaxSpeed * ai.speedVariation;
      } else {
        ai.baseSpeed = values.aiMaxSpeed;
      }
    }
  }

  /**
   * Apply values to player
   * @param {PlayerVehicle} player
   */
  applyToPlayer(player) {
    if (!player) return;
    let values = this.getValues();
    player.maxSpeed = values.playerMaxSpeed;
  }

  /**
   * Get desired AI count (for spawning/removing)
   * @returns {number} Target AI count
   */
  getTargetAICount() {
    return floor(this.sliders.aiCount.value());
  }

  /**
   * Toggle visibility
   */
  toggle() {
    this.visible = !this.visible;
    
    // Show/hide sliders
    for (let name in this.sliders) {
      if (this.visible) {
        this.sliders[name].show();
      } else {
        this.sliders[name].hide();
      }
    }
  }

  /**
   * Draw dashboard panel
   */
  show() {
    if (!this.visible || !this.initialized) return;
    
    push();
    
    // Panel background
    fill(20, 20, 40, 220);
    stroke(100, 100, 150);
    strokeWeight(1);
    rect(this.x, this.y, this.width, this.height, 8);
    
    // Title
    fill(255);
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    textFont('monospace');
    text('⚙ DASHBOARD', this.x + this.padding, this.y + 8);
    
    // Toggle hint
    fill(150);
    textSize(10);
    text('Press H to hide', this.x + this.padding, this.y + 22);
    
    // Slider labels and values
    fill(200);
    textSize(11);
    for (let name in this.labels) {
      let label = this.labels[name];
      let value = this.sliders[name].value();
      
      // Format value display
      let valueStr = label.config.step < 1 ? value.toFixed(1) : floor(value);
      
      text(`${label.text}: ${valueStr}`, this.x + this.padding, label.y);
    }
    
    pop();
  }

  /**
   * Hide all sliders (for game reset)
   */
  hide() {
    for (let name in this.sliders) {
      this.sliders[name].hide();
    }
  }

  /**
   * Show all sliders
   */
  showSliders() {
    if (this.visible) {
      for (let name in this.sliders) {
        this.sliders[name].show();
      }
    }
  }
}
