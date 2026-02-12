/**
 * TutorialManager.js - Handles the progressive onboarding of new players
 */

class TutorialManager {
    constructor() {
        this.active = true;
        this.stepIndex = 0;
        this.steps = [
            {
                text: "Utilisez la SOURIS pour vous diriger et WASD pour plus de contrôle",
                condition: (game) => game.collectedStars >= 3,
                highlight: "stars"
            },
            {
                text: "Plus gros = Plus fort, mais plus lent (Masse > 150)",
                condition: (game) => game.player.mass > 150,
                showMassBar: true
            },
            {
                text: "ESPACE ou CLIC pour Dash (Esquive / Boost)",
                condition: (game) => game.player.dashUsedCount > 0
            },
            {
                text: "Percutez des joueurs plus petits pour les éliminer !",
                condition: (game) => game.player.killStreak > 0,
                highlight: "enemies"
            }
        ];
        this.completed = false;
        this.displayTimer = 0;
    }

    update(game) {
        if (!this.active || this.completed) return;

        let currentStep = this.steps[this.stepIndex];
        if (currentStep && currentStep.condition(game)) {
            this.stepIndex++;
            this.displayTimer = 180; // Show "Step Complete" for 3s
            if (this.stepIndex >= this.steps.length) {
                this.completed = true;
                this.saveTutorialCompletion();
            }
        }
    }

    show() {
        if (!this.active || this.completed) return;

        let currentStep = this.steps[this.stepIndex];
        if (!currentStep) return;

        push();
        resetMatrix();
        
        // Darkened background for text - Responsive width
        let boxW = min(width - 40, 500 * UI_SCALE);
        let boxH = 60 * UI_SCALE;
        let boxY = 100 * UI_SCALE;
        
        fill(0, 0, 0, 150);
        noStroke();
        rectMode(CENTER);
        rect(width / 2, boxY, boxW, boxH, 10 * UI_SCALE);

        // Tutorial text
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16 * UI_SCALE); // Scaled
        textStyle(BOLD);
        text(currentStep.text, width / 2, boxY);

        // Progress indicator
        textSize(10 * UI_SCALE); // Scaled
        fill(200);
        text(`Étape ${this.stepIndex + 1} / ${this.steps.length}`, width / 2, boxY + 25 * UI_SCALE);

        pop();
    }

    saveTutorialCompletion() {
        localStorage.setItem('wanderRaceTutorialDone', 'true');
    }

    loadTutorialCompletion() {
        if (localStorage.getItem('wanderRaceTutorialDone') === 'true') {
            this.active = false;
            this.completed = true;
        }
    }
}
