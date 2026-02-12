/**
 * MobileManager.js - Virtual Joystick and Touch Ergonomics
 */

class MobileManager {
    constructor() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.joystickActive = false;
        this.joystickPos = createVector(130, 0); // X/Y will be set in update()
        this.joystickCurrent = createVector(130, 0);
        this.firstRun = true;
        
        this.dashButtonPos = createVector(0, 0);
        this.dashButtonSize = 80;
        
        this.quitButtonPos = createVector(40, 40);
        this.quitButtonSize = 50;
        
        this.vibrationSupport = ("vibrate" in navigator);
        this.quitToggleCooldown = 0;
    }

    update() {
        if (!this.isMobile) return;
        
        // Fixed Joystick Position (Bottom Left)
        let scale = (typeof UI_SCALE !== 'undefined') ? UI_SCALE : 1.0;
        this.joystickSize = 120 * scale;
        this.joystickRadius = 60 * scale;
        this.joystickPos.set(130 * scale, height - 130 * scale); // Increased padding
        
        if (this.firstRun) {
            this.joystickCurrent.set(this.joystickPos);
            this.firstRun = false;
        }
        
        this.dashButtonSize = 80 * scale;
        this.quitButtonSize = 50 * scale;

        // Position changes as requested
        // Left side for Quit
        this.quitButtonPos.set(50 * scale, 100 * scale);
        // Bottom Right for Dash (10px padding right, 150px padding bottom)
        // Center = Screen Edge - Radius - Padding
        let dashRadius = this.dashButtonSize / 2;
        this.dashButtonPos.set(width - dashRadius - 50 * scale, height - dashRadius - 250 * scale);

        // Handle touch inputs
        if (touches.length > 0) {
            let joystickTouch = null;
            let dashTouch = null;
            
            for (let t of touches) {
                // Left side for joystick
                if (t.x < width / 2) {
                    let dq = dist(t.x, t.y, this.quitButtonPos.x, this.quitButtonPos.y);
                    // Check quit button (top left area) - EXCEPTION TO JOYSTICK
                    // Increased hitbox to 2x the visual size for easier tapping
                    let quitHitboxRadius = this.quitButtonSize * 1.5;
                    
                    // Only allow quit if player is alive
                    let playerAlive = (typeof player !== 'undefined' && !player.isDead);
                    
                    if (dq < quitHitboxRadius && playerAlive) {
                        if (this.quitToggleCooldown <= 0) {
                            // Quit to menu
                            if (typeof returnToMenu === 'function') {
                                returnToMenu();
                            }
                            this.quitToggleCooldown = 20; // Debounce frames
                        }
                    } else {
                        // Regular joystick movement
                        this.joystickActive = true;
                        joystickTouch = t;
                    }
                } 
                // Right side for dash
                else {
                    let d = dist(t.x, t.y, this.dashButtonPos.x, this.dashButtonPos.y);
                    if (d < this.dashButtonSize / 2) {
                        dashTouch = t;
                    }
                }
            }
            
            if (this.quitToggleCooldown > 0) this.quitToggleCooldown--;
            
            if (joystickTouch) {
                this.joystickCurrent.set(joystickTouch.x, joystickTouch.y);
                // Constrain distance from fixed center
                let d = p5.Vector.dist(this.joystickPos, this.joystickCurrent);
                if (d > this.joystickRadius) {
                    let dir = p5.Vector.sub(this.joystickCurrent, this.joystickPos).setMag(this.joystickRadius);
                    this.joystickCurrent = p5.Vector.add(this.joystickPos, dir);
                }
            } else {
                this.joystickActive = false;
                // STICKY: Do not reset joystickCurrent to joystickPos
            }
            
            if (dashTouch && player && player.dash) {
                player.dash();
            }
        } else {
            this.joystickActive = false;
            // STICKY: Do not reset joystickCurrent to joystickPos
        }
        
        // Dash Button position is now fixed in update() above
    }

    render() {
        if (!this.isMobile) return;
        
        push();
        resetMatrix();
        let scale = (typeof UI_SCALE !== 'undefined') ? UI_SCALE : 1.0;
        
        // Always draw Joystick Base (Fixed)
        noFill();
        stroke(255, 50); // Faint base
        strokeWeight(2);
        circle(this.joystickPos.x, this.joystickPos.y, this.joystickSize);
        
        // Draw Joystick knob
        if (this.joystickActive) {
            stroke(255, 150);
            strokeWeight(1);
            line(this.joystickPos.x, this.joystickPos.y, this.joystickCurrent.x, this.joystickCurrent.y);

            fill(100, 200, 255, 200);
            noStroke();
            circle(this.joystickCurrent.x, this.joystickCurrent.y, 50 * scale);
        } else {
            // Idle state knob
            fill(255, 30);
            noStroke();
            circle(this.joystickPos.x, this.joystickPos.y, 40 * scale);
        }
        
        // Draw Dash Button
        let overDash = (touches.length > 0 && touches.some(t => dist(t.x, t.y, this.dashButtonPos.x, this.dashButtonPos.y) < this.dashButtonSize/2));
        fill(overDash ? color(255, 100, 0, 200) : color(255, 100, 0, 100));
        stroke(255, 150);
        strokeWeight(2);
        circle(this.dashButtonPos.x, this.dashButtonPos.y, this.dashButtonSize);
        
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(16 * scale);
        textStyle(BOLD);
        text("DASH", this.dashButtonPos.x, this.dashButtonPos.y);
        
        // Draw Quit Button (disabled if player is dead)
        let playerAlive = (typeof player !== 'undefined' && !player.isDead);
        
        if (playerAlive) {
            fill(255, 100, 100, 120);
            stroke(255, 150);
        } else {
            // Grayed out when dead
            fill(100, 100, 100, 80);
            stroke(150, 100);
        }
        
        circle(this.quitButtonPos.x, this.quitButtonPos.y, this.quitButtonSize);
        
        if (playerAlive) {
            fill(255);
        } else {
            fill(150);
        }
        noStroke();
        textSize(10 * scale);
        text("QUIT", this.quitButtonPos.x, this.quitButtonPos.y);
        
        pop();
    }

    getJoystickVector() {
        // STICKY: Return vector even if joystick is not active
        let v = p5.Vector.sub(this.joystickCurrent, this.joystickPos);
        return v.div(this.joystickRadius); // Normalized -1 to 1
    }

    vibrate(pattern) {
        if (this.isMobile && this.vibrationSupport) {
            navigator.vibrate(pattern);
        }
    }
}
