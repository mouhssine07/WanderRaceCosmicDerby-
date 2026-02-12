/**
 * SoundManager.js - Synthesized Audio System
 * Uses p5.sound oscillators to generate retro arcade sounds without external files.
 */
class SoundManager {
  constructor() {
    this.ready = false;
    // Rate limiting for collision sounds (prevent audio spam)
    this.lastCollisionTime = 0;
    this.collisionCooldown = 100; // ms between collision sounds
  }

  /**
   * Checks if AudioContext is ready.
   * Returns true if running.
   */
  ensureAudioContext() {
    if (typeof getAudioContext !== 'function') return false;
    return getAudioContext().state === 'running';
  }

  /**
   * Explicitly resume AudioContext - should be called from a user gesture
   */
  async resume() {
    if (typeof getAudioContext !== 'function') return;
    let ctx = getAudioContext();
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
        console.log("AudioContext Resumed Successfully");
      } catch (e) {
        console.warn("AudioContext Resume Failed:", e);
      }
    }
  }

  /**
   * Play a high pitched 'ping' for star collection
   */
  playStarCollect() {
    if (!this.ensureAudioContext()) return;
    
    let osc = new p5.Oscillator('sine');
    let env = new p5.Envelope();
    
    // Smooth ping
    env.setADSR(0.01, 0.1, 0.1, 0.3);
    env.setRange(0.3, 0); // Volume
    
    osc.start();
    osc.freq(880); // A5
    osc.freq(1760, 0.1); // Slide up to A6
    env.play(osc, 0, 0.1);
    
    setTimeout(() => osc.stop(), 500);
  }

  /**
   * Play HEAL Sound (Green) - Harmonious
   */
  playBonusHeal() {
    if (!this.ensureAudioContext()) return;

    let osc = new p5.Oscillator('sine');
    let env = new p5.Envelope();
    env.setADSR(0.1, 0.2, 0.1, 0.5);
    env.setRange(0.3, 0);
    
    osc.start();
    osc.freq(440); // A4
    osc.freq(554, 0.1); // C#5 (Major chord feel)
    env.play(osc);
    setTimeout(() => osc.stop(), 600);
  }

  /**
   * Play SHIELD Sound (Blue) - Sci-fi wobble
   */
  playBonusShield() {
    if (!this.ensureAudioContext()) return;

    let osc = new p5.Oscillator('sine');
    let env = new p5.Envelope();
    env.setADSR(0.1, 0.1, 0.5, 0.3);
    env.setRange(0.3, 0);
    
    osc.start();
    osc.freq(200);
    osc.amp(env);
    
    osc.freq(600, 0.2); 
    env.play(osc);
    setTimeout(() => osc.stop(), 600);
  }

  /**
   * Play SPEED Sound (Yellow) - Rapid Rise
   */
  playBonusSpeed() {
    if (!this.ensureAudioContext()) return;

    let osc = new p5.Oscillator('sawtooth');
    let env = new p5.Envelope();
    env.setADSR(0.01, 0.1, 0.1, 0.1);
    env.setRange(0.2, 0);
    
    osc.start();
    osc.freq(300);
    osc.freq(1200, 0.2); // Fast zip
    env.play(osc);
    setTimeout(() => osc.stop(), 500);
  }

  /**
   * Play POWER Sound (Red) - Aggressive
   */
  playBonusPower() {
    if (!this.ensureAudioContext()) return;

    let osc = new p5.Oscillator('square');
    let env = new p5.Envelope();
    env.setADSR(0.01, 0.3, 0.1, 0.3);
    env.setRange(0.2, 0);
    
    osc.start();
    osc.freq(110); // Low A2
    osc.freq(220, 0.1); // Octave jump
    env.play(osc);
    setTimeout(() => osc.stop(), 600);
  }

  /**
   * Play Crash / Vehicle Collision (Rate limited to prevent audio spam)
   */
  playCrash() {
    if (!this.ensureAudioContext()) return;
    
    // Rate limit collision sounds
    let now = millis();
    if (now - this.lastCollisionTime < this.collisionCooldown) {
      return; // Skip this sound
    }
    this.lastCollisionTime = now;

    let noise = new p5.Noise('brown'); // Low rumble
    let env = new p5.Envelope();
    env.setADSR(0.01, 0.1, 0.1, 0.2);
    env.setRange(0.6, 0);
    
    noise.start();
    noise.amp(env);
    env.play(noise);
    setTimeout(() => noise.stop(), 600);
  }

  /**
   * Play an explosion (noise)
   */
  playExplosion() {
    if (!this.ensureAudioContext()) return;

    let noise = new p5.Noise('white');
    let env = new p5.Envelope();
    
    env.setADSR(0.01, 0.2, 0.1, 0.5);
    env.setRange(0.8, 0);
    
    noise.start();
    noise.amp(env);
    env.play(noise);
    
    setTimeout(() => noise.stop(), 1000);
  }

  /**
   * Play a dash swoosh (low freq)
   */
  playDash() {
    if (!this.ensureAudioContext()) return;

    let osc = new p5.Oscillator('sawtooth');
    let env = new p5.Envelope();
    
    env.setADSR(0.1, 0.2, 0.1, 0.3);
    env.setRange(0.2, 0);
    
    osc.start();
    osc.freq(200);
    osc.freq(50, 0.3); // Pitch drop
    env.play(osc);
    
    setTimeout(() => osc.stop(), 500);
  }

  /**
   * Play a hit/damage sound
   */
  playHit() {
    if (!this.ensureAudioContext()) return;

    let osc = new p5.Oscillator('square');
    let env = new p5.Envelope();
    
    env.setADSR(0.01, 0.1, 0.1, 0.1);
    env.setRange(0.3, 0);
    
    osc.start();
    osc.freq(150);
    osc.freq(100, 0.1);
    env.play(osc);
    
    setTimeout(() => osc.stop(), 300);
  }

  /**
   * Play Chase Alert (SCARIER VERSION)
   */
  playAlert() {
    if (!this.ensureAudioContext()) return;

    let osc = new p5.Oscillator('sawtooth');
    let env = new p5.Envelope();
    
    // Staccato alarm
    env.setADSR(0.01, 0.05, 0.0, 0.0);
    env.setRange(0.3, 0);
    
    osc.start();
    osc.freq(300); // Lower pitch
    osc.freq(150, 0.1); // Drop
    env.play(osc);
    
    setTimeout(() => osc.stop(), 150);
  }

  /**
   * Play Game Over (Descending gloomy)
   */
  playGameOver() {
    if (!this.ensureAudioContext()) return;

    let osc = new p5.Oscillator('sine');
    
    osc.start();
    osc.amp(0.5);
    osc.freq(200);
    osc.freq(50, 2.0); // Slow slide down
    osc.amp(0, 2.0);
    
    setTimeout(() => osc.stop(), 2000);
  }
}

// Global instance initialization moved to sketch.js setup()
