/**
 * PlayerProfile.js - Handles persistent player statistics and leveling
 */

class PlayerProfile {
    static SKINS = {
        FREE: [
            { id: 'default', name: 'Classic Racer', requirement: 'Free' },
            { id: 'neon', name: 'Neon Ghost', requirement: '100 Kills', killsNeeded: 100 },
            { id: 'phoenix', name: 'Cosmic Phoenix', requirement: 'Level 10', levelNeeded: 10 }
        ],
        PREMIUM: [
            { id: 'galaxy', name: 'Galaxy Vortex', price: '$2.99' },
            { id: 'deathstar', name: 'Death Star Tribute', price: '$4.99' }
        ]
    };

    constructor() {
        this.data = {
            level: 1,
            xp: 0,
            totalKills: 0,
            highestMass: 0,
            unlockedSkins: ['default'],
            currentSkin: 'default',
            leaderboard: [] // List of {name, score, date, mode}
        };
        this.load();
    }

    addLeaderboardEntry(name, score, mode) {
        const entry = {
            name: name,
            score: Math.floor(score),
            mode: mode,
            date: new Date().toLocaleDateString()
        };
        this.data.leaderboard.push(entry);
        
        // Sort and keep top 10
        this.data.leaderboard.sort((a, b) => b.score - a.score);
        this.data.leaderboard = this.data.leaderboard.slice(0, 10);
        
        this.save();
    }

    /**
     * Load from localStorage
     */
    load() {
        const saved = localStorage.getItem('wanderRaceProfile');
        if (saved) {
            try {
                this.data = { ...this.data, ...JSON.parse(saved) };
            } catch (e) {
                console.error("Failed to load profile:", e);
            }
        }
    }

    /**
     * Save to localStorage
     */
    save() {
        localStorage.setItem('wanderRaceProfile', JSON.stringify(this.data));
    }

    /**
     * Add XP and handle leveling
     */
    addXP(amount) {
        this.data.xp += amount;
        let nextLevelXP = this.getXPForLevel(this.data.level + 1);
        
        while (this.data.xp >= nextLevelXP) {
            this.data.level++;
            console.log(`Leveled Up! Current Level: ${this.data.level}`);
            // TODO: Trigger UI effect for permanent level up
            nextLevelXP = this.getXPForLevel(this.data.level + 1);
        }
        this.checkUnlockables();
        this.save();
    }

    getXPForLevel(lvl) {
        // Simple progression: 1000, 2500, 4500, etc.
        return (lvl - 1) * 1000 + pow(lvl - 1, 1.5) * 500;
    }

    addKill() {
        this.data.totalKills++;
        this.checkUnlockables();
        this.save();
    }

    updateHighscore(mass) {
        if (mass > this.data.highestMass) {
            this.data.highestMass = mass;
            this.save();
        }
    }

    checkUnlockables() {
        PlayerProfile.SKINS.FREE.forEach(skin => {
            if (this.data.unlockedSkins.includes(skin.id)) return;

            if (skin.levelNeeded && this.data.level >= skin.levelNeeded) {
                this.unlockSkin(skin.id);
            }
            if (skin.killsNeeded && this.data.totalKills >= skin.killsNeeded) {
                this.unlockSkin(skin.id);
            }
        });
    }

    unlockSkin(skinID) {
        if (!this.data.unlockedSkins.includes(skinID)) {
            this.data.unlockedSkins.push(skinID);
            console.log(`NEW SKIN UNLOCKED: ${skinID}`);
            this.save();
        }
    }

    setSkin(skinID) {
        if (this.data.unlockedSkins.includes(skinID)) {
            this.data.currentSkin = skinID;
            this.save();
        }
    }
}
