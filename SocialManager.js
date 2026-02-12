/**
 * SocialManager.js - Handles social virality and moment sharing
 */

class SocialManager {
    constructor() {
        this.activePopup = null;
        this.popupTimer = 0;
        this.kills = 0;
        this.maxMass = 0;
    }

    /**
     * Record a kill and potentially trigger an epic moment
     */
    recordKill() {
        this.kills++;
        // Trigger every 5 kills
        if (this.kills % 5 === 0) {
            this.triggerEpicMoment('killstreak', this.kills);
        }
    }

    /**
     * Record current mass and potentially trigger an epic moment
     */
    recordMass(m) {
        if (m > this.maxMass) {
            this.maxMass = m;
            // The 500 threshold is handled in sketch.js, but we could add more here
            if (this.maxMass >= 1000 && !this.mass1000Triggered) {
                this.triggerEpicMoment('mass', 1000);
                this.mass1000Triggered = true;
            }
        }
    }

    /**
     * Trigger a sharing popup for an epic achievement
     */
    triggerEpicMoment(type, value) {
        this.activePopup = {
            title: "EPIC MOMENT CAPTURED!",
            desc: this.getDesc(type, value),
            type: type
        };
        this.popupTimer = 300; // 5 seconds
        console.log(`Social: ${this.activePopup.desc}`);
    }

    getDesc(type, value) {
        if (type === 'killstreak') return `${value} KILLS STREAK!`;
        if (type === 'mass') return `NEW MASS RECORD: ${Math.floor(value)}!`;
        return "AMAZING PERFORMANCE!";
    }

    update() {
        if (this.popupTimer > 0) {
            this.popupTimer--;
            if (this.popupTimer === 0) this.activePopup = null;
        }
    }

    show() {
        if (!this.activePopup) return;

        push();
        resetMatrix();
        
        let popupW = min(width - 40, 400 * UI_SCALE);
        let popupH = 200 * UI_SCALE;
        let px = width / 2;
        let py = 150 * UI_SCALE;
        
        // Background
        rectMode(CENTER);
        fill(20, 20, 40, 230);
        stroke(100, 200, 255);
        strokeWeight(3);
        rect(px, py, popupW, popupH, 15 * UI_SCALE);

        // Title
        fill(255, 215, 0);
        textSize(18 * UI_SCALE); // Scaled from 24
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        text(this.activePopup.title, px, py - 60 * UI_SCALE);

        // Desc
        fill(255);
        textSize(16 * UI_SCALE); // Scaled from 20
        text(this.activePopup.desc, px, py - 20 * UI_SCALE);

        // Buttons
        let btnSpacing = 90 * UI_SCALE;
        this.drawShareButton("Twitter", px - btnSpacing, py + 40 * UI_SCALE, color(29, 161, 242));
        this.drawShareButton("TikTok", px, py + 40 * UI_SCALE, color(0, 0, 0));
        this.drawShareButton("Discord", px + btnSpacing, py + 40 * UI_SCALE, color(88, 101, 242));

        fill(150);
        textSize(10 * UI_SCALE); // Scaled from 12
        text("Click to share and earn XP bonus!", px, py + 80 * UI_SCALE);
        
        pop();
    }

    drawShareButton(label, x, y, col) {
        let bw = 70 * UI_SCALE, bh = 30 * UI_SCALE;
        let isHovering = mouseX > x - bw/2 && mouseX < x + bw/2 && mouseY > y - bh/2 && mouseY < y + bh/2;
        
        push();
        rectMode(CENTER);
        fill(isHovering ? lerpColor(col, color(255), 0.2) : col);
        stroke(255, 100);
        rect(x, y, bw, bh, 5 * UI_SCALE);
        
        fill(255);
        noStroke();
        textSize(10 * UI_SCALE);
        text(label, x, y);
        pop();
    }

    handleMouseClick() {
        if (!this.activePopup) return false;
        
        let px = width / 2, py = 150 * UI_SCALE;
        let bw = 70 * UI_SCALE, bh = 30 * UI_SCALE;
        let btnSpacing = 90 * UI_SCALE;
        
        // Check buttons
        let btnOffsets = [-btnSpacing, 0, btnSpacing];
        for (let bx of btnOffsets) {
            if (mouseX > px + bx - bw/2 && mouseX < px + bx + bw/2 && mouseY > py + 40 * UI_SCALE - bh/2 && mouseY < py + 40 * UI_SCALE + bh/2) {
                console.log("Sharing to social media...");
                // Reward player
                if (profile) profile.addXP(500);
                this.activePopup = null;
                this.popupTimer = 0;
                return true;
            }
        }
        return false;
    }
}
