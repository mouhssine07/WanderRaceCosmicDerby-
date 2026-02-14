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
        this.minShrinkFactor = 0.3;
        
        // King of the Hill
        this.hillPos = createVector(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
        this.hillRadius = 400;
        this.hillOwner = null;
        this.hillTimer = 0;
        this.hillScore = 0; // Current holder's accumulated score
        this.hillTargetScore = 1000; // Score needed to win
        this.hillMoveTimer = 0; // Timer to relocate hill
        
        // TDM
        this.teamScores = { team1: 0, team2: 0 };
        this.teamKills = { team1: 0, team2: 0 }; // Kill count for each team
        this.targetKills = 30; // First team to 30 kills wins
        this.teamAssigned = false; // Flag to assign teams once
        
        // Infection
        this.infectedVehicles = new Set();
        
        // Elimination
        this.eliminatedVehicles = new Set();
    }

    setMode(mode) {
        this.currentMode = mode;
        this.reset();
    }

    reset() {
        this.modeTimer = 0;
        this.shrinkFactor = 1.0;
        this.teamScores = { team1: 0, team2: 0 };
        this.hillPos = createVector(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
        this.hillRadius = 400;
        this.hillOwner = null;
        this.hillTimer = 0;
        this.hillScore = 0;
        this.hillMoveTimer = 0;
        this.teamKills = { team1: 0, team2: 0 };
        this.teamAssigned = false;
        this.infectedVehicles.clear();
        this.eliminatedVehicles.clear();
    }

    update(player, aiVehicles) {
        this.modeTimer++;

        switch (this.currentMode) {
            case GameModeManager.MODES.ELIMINATION:
                this.updateElimination(player, aiVehicles);
                break;
            case GameModeManager.MODES.KING_OF_THE_HILL:
                this.updateKOTH(player, aiVehicles);
                break;
            case GameModeManager.MODES.TDM:
                this.updateTDM(player, aiVehicles);
                break;
            case GameModeManager.MODES.INFECTION:
                this.updateInfection(player, aiVehicles);
                break;
        }
    }

    /**
     * ELIMINATION: Shrink world boundaries every 30s and damage vehicles outside
     * Dead vehicles are permanently eliminated (no respawn)
     */
    updateElimination(player, aiVehicles) {
        if (this.modeTimer % 1800 === 0 && this.shrinkFactor > this.minShrinkFactor) {
            this.shrinkFactor = Math.max(this.shrinkFactor * 0.8, this.minShrinkFactor);
            console.log("Boundary Shrinking! Factor: " + this.shrinkFactor.toFixed(2));
        }

        let bounds = this.getCurrentBounds();
        
        // Constrain and damage player if outside bounds
        if (!this.isInsideBounds(player.pos, bounds)) {
            // Push player back inside
            player.pos.x = constrain(player.pos.x, bounds.x, bounds.x + bounds.w);
            player.pos.y = constrain(player.pos.y, bounds.y, bounds.y + bounds.h);
            
            // Damage over time
            if (this.modeTimer % 30 === 0) {
                player.takeDamage(5);
                if (this.modeTimer % 60 === 0) {
                    player.addPopup("⚠️ OUT OF ZONE!", color(255, 0, 0));
                }
            }
        }

        // Constrain and damage AI vehicles outside bounds
        for (let ai of aiVehicles) {
            if (!this.isInsideBounds(ai.pos, bounds)) {
                // Push AI back inside
                ai.pos.x = constrain(ai.pos.x, bounds.x, bounds.x + bounds.w);
                ai.pos.y = constrain(ai.pos.y, bounds.y, bounds.y + bounds.h);
                
                if (this.modeTimer % 30 === 0) {
                    ai.takeDamage(5);
                }
            }
        }
    }
    
    /**
     * Check if a vehicle should be eliminated (dead in Elimination mode)
     */
    shouldEliminate(vehicle) {
        if (this.currentMode !== GameModeManager.MODES.ELIMINATION) return false;
        return vehicle.isDead && !this.eliminatedVehicles.has(vehicle);
    }
    
    /**
     * Mark a vehicle as eliminated
     */
    eliminateVehicle(vehicle) {
        this.eliminatedVehicles.add(vehicle);
    }

    isInsideBounds(pos, bounds) {
        return pos.x >= bounds.x && pos.x <= bounds.x + bounds.w &&
               pos.y >= bounds.y && pos.y <= bounds.y + bounds.h;
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
        // Move hill periodically
        this.hillMoveTimer++;
        if (this.hillMoveTimer % 3600 === 0) { // Every 60 seconds
            this.relocateHill();
        }
        
        let inside = [];
        if (p5.Vector.dist(player.pos, this.hillPos) < this.hillRadius) inside.push(player);
        for (let ai of aiVehicles) {
            if (p5.Vector.dist(ai.pos, this.hillPos) < this.hillRadius) inside.push(ai);
        }

        if (inside.length === 1) {
            // Single owner - award points
            let owner = inside[0];
            this.hillOwner = owner;
            this.hillTimer++;
            
            // Award 2 points per second (60 fps = 2/60 per frame)
            if (owner === player) {
                let pointsToAdd = 2 / 60;
                player.score = (player.score || 0) + pointsToAdd;
                this.hillScore = player.score;
                
                if (frameCount % 60 === 0) {
                    player.addPopup("📍 HOLDING HILL", color(255, 215, 0));
                }
                
                // Check victory condition
                if (player.score >= this.hillTargetScore) {
                    return 'PLAYER_WIN';
                }
            } else {
                let pointsToAdd = 2 / 60;
                owner.score = (owner.score || 0) + pointsToAdd;
                this.hillScore = owner.score;
                
                // Check AI victory
                if (owner.score >= this.hillTargetScore) {
                    return 'AI_WIN';
                }
            }
        } else if (inside.length > 1) {
            // Contested - no points, apply damage
            this.hillOwner = null;
            this.hillTimer = 0;
            
            // Small damage to all inside when contested
            if (this.modeTimer % 30 === 0) {
                for (let v of inside) {
                    v.takeDamage(1);
                    if (frameCount % 60 === 0 && v === player) {
                        v.addPopup("⚔️ CONTESTED!", color(255, 100, 0));
                    }
                }
            }
        } else {
            // Empty hill
            this.hillOwner = null;
            this.hillTimer = 0;
        }
        
        return null;
    }
    
    relocateHill() {
        // Move hill to a random location (not too close to edges)
        let margin = 500;
        this.hillPos.x = random(margin, WORLD_WIDTH - margin);
        this.hillPos.y = random(margin, WORLD_HEIGHT - margin);
        console.log("Hill relocated to: " + this.hillPos.x + ", " + this.hillPos.y);
    }
    
    updateTDM(player, aiVehicles) {
        // Assign teams once at start
        if (!this.teamAssigned) {
            player.team = 1; // Player always team 1 (Cyan)
            
            // Balance AI teams 50/50
            for (let i = 0; i < aiVehicles.length; i++) {
                aiVehicles[i].team = (i % 2 === 0) ? 1 : 2;
            }
            this.teamAssigned = true;
        }
        
        // Update team scores (kept for display, but kills are what matter)
        this.teamScores = { team1: 0, team2: 0 };
        if (player.team === 1) this.teamScores.team1 += (player.score || 0);
        else if (player.team === 2) this.teamScores.team2 += (player.score || 0);
        
        for (let ai of aiVehicles) {
            if (ai.team === 1) this.teamScores.team1 += (ai.score || 0);
            if (ai.team === 2) this.teamScores.team2 += (ai.score || 0);
        }
        
        // Check victory condition
        if (this.teamKills.team1 >= this.targetKills) {
            return 'TEAM1_WIN';
        } else if (this.teamKills.team2 >= this.targetKills) {
            return 'TEAM2_WIN';
        }
        
        return null;
    }
    
    /**
     * Award kill to team
     */
    awardTeamKill(killerTeam) {
        if (killerTeam === 1) {
            this.teamKills.team1++;
        } else if (killerTeam === 2) {
            this.teamKills.team2++;
        }
    }
    
    /**
     * Check if two vehicles are on same team
     */
    areSameTeam(v1, v2) {
        if (this.currentMode !== GameModeManager.MODES.TDM) return false;
        return v1.team && v2.team && v1.team === v2.team;
    }

    /**
     * INFECTION: One infected vehicle tries to infect others on collision
     */
    updateInfection(player, aiVehicles) {
        // Initialize: infect one random vehicle at start
        if (this.modeTimer === 1) {
            let all = [player, ...aiVehicles];
            let infected = all[floor(random(all.length))];
            this.infectedVehicles.add(infected);
        }

        // Check collisions and spread infection
        let allVehicles = [player, ...aiVehicles];
        for (let infected of this.infectedVehicles) {
            for (let v of allVehicles) {
                if (!this.infectedVehicles.has(v)) {
                    let d = p5.Vector.dist(infected.pos, v.pos);
                    if (d < infected.r + v.r) {
                        this.infectedVehicles.add(v);
                        if (v === player) {
                            player.addPopup("🦠 INFECTED!", color(0, 255, 0));
                        }
                    }
                }
            }
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
            text(`TEAM CYAN: ${this.teamKills.team1}/${this.targetKills}`, width / 2 - 100 * UI_SCALE, 110 * UI_SCALE);
            fill(255, 100, 0);
            text(`TEAM ORANGE: ${this.teamKills.team2}/${this.targetKills}`, width / 2 + 100 * UI_SCALE, 110 * UI_SCALE);
        }
        
        if (this.currentMode === GameModeManager.MODES.KING_OF_THE_HILL) {
            textSize(14 * UI_SCALE);
            fill(255, 215, 0);
            let ownerName = this.hillOwner ? (this.hillOwner.name || "AI") : "NEUTRAL";
            text(`Hill: ${ownerName} | ${floor(this.hillScore)}/${this.hillTargetScore}`, width / 2, 110 * UI_SCALE);
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
        } else if (this.currentMode === GameModeManager.MODES.INFECTION) {
            // Show infected vehicles with green aura
            for (let v of this.infectedVehicles) {
                push();
                noFill();
                stroke(0, 255, 0, 150);
                strokeWeight(3);
                circle(v.pos.x, v.pos.y, v.r * 3 + sin(frameCount * 0.2) * 5);
                pop();
            }
        }
    }
}
