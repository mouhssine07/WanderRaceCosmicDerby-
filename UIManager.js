/**
 * UIManager.js - Handles improved HUD, Minimap, and Kill Feed
 */

class UIManager {
    constructor() {
        this.killFeed = [];
        this.killFeedTimer = 300; // Time for notifications to disappear
        this.minimapSize = 150;
        this.minimapPadding = 20;
    }

    /**
     * Show notification in the kill feed
     */
    addKillNotification(attacker, victim) {
        this.killFeed.push({
            text: `${attacker} 💥 ${victim}`,
            timer: this.killFeedTimer,
            opacity: 255
        });
        if (this.killFeed.length > 5) this.killFeed.shift();
    }

    update() {
        for (let i = this.killFeed.length - 1; i >= 0; i--) {
            this.killFeed[i].timer--;
            if (this.killFeed[i].timer < 60) {
                this.killFeed[i].opacity = map(this.killFeed[i].timer, 0, 60, 0, 255);
            }
            if (this.killFeed[i].timer <= 0) {
                this.killFeed.splice(i, 1);
            }
        }
    }

    render(game) {
        this.drawKillFeed();
        this.drawMinimap(game);
        this.drawDashCooldown(game.player);
    }

    drawKillFeed() {
        push();
        resetMatrix();
        textAlign(RIGHT, TOP);
        textSize(14 * UI_SCALE);
        textStyle(BOLD);
        
        let yOffset = 20 * UI_SCALE;
        for (let entry of this.killFeed) {
            fill(255, entry.opacity);
            text(entry.text, width - 20 * UI_SCALE, yOffset);
            yOffset += 20 * UI_SCALE;
        }
        pop();
    }

    drawMinimap(game) {
        let mSize = 150 * UI_SCALE;
        let padding = 20 * UI_SCALE;
        let x = width - mSize - padding;
        let y = height - mSize - padding;

        push();
        resetMatrix();
        
        // Background
        fill(10, 20, 40, 180);
        stroke(100, 200, 255, 150);
        strokeWeight(2);
        rect(x, y, mSize, mSize);

        // Entities mapping (Internal helper)
        const getMPos = (v, maxV) => map(v, 0, maxV, 0, mSize);

        // Safe Zone (if any)
        if (game.gameModeManager && game.gameModeManager.currentMode === 'Elimination') {
            let bounds = game.gameModeManager.getCurrentBounds();
            let sx = getMPos(bounds.x, WORLD_WIDTH);
            let sy = getMPos(bounds.y, WORLD_HEIGHT);
            let sw = getMPos(bounds.w, WORLD_WIDTH);
            let sh = getMPos(bounds.h, WORLD_HEIGHT);
            noFill();
            stroke(255, 0, 0, 100);
            rect(x + sx, y + sy, sw, sh);
        }

        // Entities
        noStroke();
        
        // Stars
        fill(255, 200, 0, 150);
        for (let s of game.stars) {
            circle(x + getMPos(s.pos.x, WORLD_WIDTH), y + getMPos(s.pos.y, WORLD_HEIGHT), 2);
        }

        // AI
        fill(255, 0, 0);
        for (let ai of game.aiVehicles) {
            circle(x + getMPos(ai.pos.x, WORLD_WIDTH), y + getMPos(ai.pos.y, WORLD_HEIGHT), 3);
        }

        // Player
        fill(0, 255, 255);
        stroke(255);
        strokeWeight(1);
        circle(x + getMPos(game.player.pos.x, WORLD_WIDTH), y + getMPos(game.player.pos.y, WORLD_HEIGHT), 5);

        pop();
    }

    drawDashCooldown(player) {
        if (!player) return;
        
        push();
        resetMatrix();
        let barW = 150 * UI_SCALE;
        let barH = 10 * UI_SCALE;
        let bx = 20 * UI_SCALE;
        let by = 50 * UI_SCALE;

        // Background
        fill(50, 100);
        noStroke();
        rect(bx, by, barW, barH, 5);

        // Progress
        if (player.dashCooldown > 0) {
            let w = map(player.dashCooldown, 300, 0, 0, barW);
            fill(255, 100, 0);
            rect(bx, by, w, barH, 5);
        } else {
            fill(0, 255, 255);
            rect(bx, by, barW, barH, 5);
            // Glow effect when ready
            if (frameCount % 60 < 30) {
                fill(255, 255, 255, 100);
                rect(bx, by, barW, barH, 5);
            }
        }

        fill(255);
        textSize(10 * UI_SCALE);
        textAlign(LEFT, CENTER);
        text("DASH READY", bx + barW + 10 * UI_SCALE, by + barH/2);
        pop();
    }

    showEndScreenStats(stats) {
        push();
        resetMatrix();
        
        // Full screen subtle dim
        fill(0, 0, 0, 180);
        rect(0, 0, width, height);

        // Responsive Card Dimensions
        let cardW = min(width * 0.9, 400 * UI_SCALE);
        let cardH = (isPortrait ? 380 : 350) * UI_SCALE;
        let cardX = width / 2;
        let cardY = height / 2;

        // Card Shadow/Glow
        rectMode(CENTER);
        noStroke();
        fill(100, 200, 255, 30);
        rect(cardX, cardY + 5, cardW, cardH, 20); // Subtle glow offset

        // Glassmorphism Card
        fill(20, 30, 50, 230);
        stroke(100, 200, 255, 150);
        strokeWeight(2);
        rect(cardX, cardY, cardW, cardH, 20);

        // Title
        textAlign(CENTER);
        noStroke();
        fill(255, 215, 0); // Gold
        textStyle(BOLD);
        textSize(28 * UI_SCALE);
        text("PARTIE TERMINÉE", cardX, cardY - cardH/2 + 60 * UI_SCALE);

        // Divider
        stroke(255, 255, 255, 40);
        strokeWeight(1);
        line(cardX - cardW/2 + 20, cardY - cardH/2 + 90 * UI_SCALE, 
             cardX + cardW/2 - 20, cardY - cardH/2 + 90 * UI_SCALE);

        // Stats Config
        let sy = cardY - cardH/2 + 130 * UI_SCALE;
        let spacing = (isPortrait ? 42 : 40) * UI_SCALE;
        let labelX = cardX - cardW/2 + 40 * UI_SCALE;
        let valueX = cardX + cardW/2 - 40 * UI_SCALE;

        const drawStatLine = (icon, label, value, y, valueColor) => {
            noStroke();
            textStyle(NORMAL);
            textSize(16 * UI_SCALE);
            
            // Label
            textAlign(LEFT);
            fill(200);
            text(`${icon} ${label}`, labelX, y);
            
            // Value
            textAlign(RIGHT);
            fill(valueColor || 255);
            textStyle(BOLD);
            text(value, valueX, y);
        };
        
        drawStatLine("💣", "KILLS", stats.kills, sy, color(255, 100, 100));
        drawStatLine("💥", "DÉGÂTS", Math.floor(stats.damageDealt), sy + spacing, color(255, 150, 50));
        drawStatLine("⏱", "TEMPS", `${Math.floor(stats.timeAlive)}s`, sy + spacing * 2, color(100, 200, 255));
        drawStatLine("⚖", "MASSE MAX", Math.floor(stats.maxMass), sy + spacing * 3, color(150, 255, 150));
        
        // Final Score Highlight
        let scoreY = sy + spacing * 4.5;
        fill(255, 255, 255, 20);
        rect(cardX, scoreY, cardW - 40 * UI_SCALE, 50 * UI_SCALE, 10);
        
        drawStatLine("⭐", "SCORE FINAL", stats.score, scoreY + 6 * UI_SCALE, color(255, 215, 0));

        pop();
    }
}
