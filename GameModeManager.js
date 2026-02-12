/**
 * GameModeManager.js - Orchestrates different game mode rules
 */

class GameModeManager {
    static MODES = {
        CLASSIC: 'Classic',
        ELIMINATION: 'Elimination',
        KING_OF_THE_HILL: 'King of the Hill',
        TDM: 'Team Deathmatch',
        INFECTION: 'Infection'
    };

    constructor() {
        this.currentMode = GameModeManager.MODES.CLASSIC;
        this.modeTimer = 0;
        
        // Elimination variables
        this.shrinkFactor = 1.0;
        
        // King of the Hill
        this.hillPos = createVector(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
        this.hillRadius = 400;
        this.hillOwner = null;
        
        // TDM
        this.teamScores = { team1: 0, team2: 0 };
    }

    setMode(mode) {
        this.currentMode = mode;
        this.reset();
    }

    reset() {
        this.modeTimer = 0;
        this.shrinkFactor = 1.0;
        this.teamScores = { team1: 0, team2: 0 };
    }

    update(player, aiVehicles) {
        this.modeTimer++;

        switch (this.currentMode) {
            case GameModeManager.MODES.ELIMINATION:
                this.updateElimination();
                break;
            case GameModeManager.MODES.KING_OF_THE_HILL:
                this.updateKOTH(player, aiVehicles);
                break;
            case GameModeManager.MODES.TDM:
                this.updateTDM(player, aiVehicles);
                break;
        }
    }

    /**
     * ELIMINATION: Shrink world boundaries every 30s
     */
    updateElimination() {
        if (this.modeTimer % 1800 === 0) { // Every 30s
            this.shrinkFactor *= 0.8;
            console.log("Boundary Shrinking!");
        }
    }

    getCurrentBounds() {
        let w = WORLD_WIDTH * this.shrinkFactor;
        let h = WORLD_HEIGHT * this.shrinkFactor;
        let offsetX = (WORLD_WIDTH - w) / 2;
        let offsetY = (WORLD_HEIGHT - h) / 2;
        return { x: offsetX, y: offsetY, w, h };
    }

    /**
     * KOTH: Check who is in the center
     */
    updateKOTH(player, aiVehicles) {
        let inside = [];
        if (p5.Vector.dist(player.pos, this.hillPos) < this.hillRadius) inside.push(player);
        for (let ai of aiVehicles) {
            if (p5.Vector.dist(ai.pos, this.hillPos) < this.hillRadius) inside.push(ai);
        }

        if (inside.length === 1) {
            let owner = inside[0];
            if (owner === player) {
                totalScore += 2; // Extra points for holding the hill
                if (frameCount % 60 === 0) player.addPopup("📍 HOLDING HILL", color(255, 215, 0));
            } else {
                owner.score = (owner.score || 0) + 2;
            }
        }
    }
    
    updateTDM(player, aiVehicles) {
        this.teamScores = { team1: 0, team2: 0 };
        if (player.team === 1) this.teamScores.team1 += totalScore;
        for (let ai of aiVehicles) {
            if (ai.team === 1) this.teamScores.team1 += (ai.score || 0);
            if (ai.team === 2) this.teamScores.team2 += (ai.score || 0);
        }
    }

    showOverlay() {
        // Mode Title in HUD
        push();
        resetMatrix();
        textAlign(CENTER, TOP);
        textSize(18 * UI_SCALE); // Scaled
        fill(255, 150);
        text(this.currentMode.toUpperCase(), width / 2, 80 * UI_SCALE);
        
        if (this.currentMode === GameModeManager.MODES.TDM) {
            textSize(14 * UI_SCALE); // Scaled
            fill(0, 255, 255);
            text(`TEAM CYAN: ${floor(this.teamScores.team1)}`, width / 2 - 100 * UI_SCALE, 110 * UI_SCALE);
            fill(255, 100, 0);
            text(`TEAM ORANGE: ${floor(this.teamScores.team2)}`, width / 2 + 100 * UI_SCALE, 110 * UI_SCALE);
        }
        pop();

        if (this.currentMode === GameModeManager.MODES.ELIMINATION) {
            let bounds = this.getCurrentBounds();
            push();
            noFill();
            stroke(255, 0, 0, 100 + sin(frameCount * 0.1) * 50);
            strokeWeight(10);
            rect(bounds.x, bounds.y, bounds.w, bounds.h);
            pop();
        } else if (this.currentMode === GameModeManager.MODES.KING_OF_THE_HILL) {
            push();
            noStroke();
            fill(255, 215, 0, 50 + sin(frameCount * 0.05) * 20);
            circle(this.hillPos.x, this.hillPos.y, this.hillRadius * 2);
            stroke(255, 215, 0);
            strokeWeight(2);
            noFill();
            circle(this.hillPos.x, this.hillPos.y, this.hillRadius * 2 + sin(frameCount * 0.1) * 10);
            pop();
        }
    }
}
