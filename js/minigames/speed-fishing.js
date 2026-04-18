// ============================================================
// Speed Fishing Minigame
// Catch as many fish as possible in 30 seconds!
// ============================================================

import { BaseMinigame } from './base.js';
import { getRandomFish, calculatePoints, updateScore, updateRoundScore } from '../scoring.js';
import { shouldTriggerCastastrophe, getRandomCastastrophe, applyCastastrophe } from '../castastrophes.js';
import { showCatchDisplay, showGameMessage } from '../ui.js';

export class SpeedFishing extends BaseMinigame {
  static get id() { return 'speed_fishing'; }
  static get name() { return 'Speed Fishing'; }
  static get description() { return 'Catch as many fish as possible!'; }

  setup() {
    this.localState = {
      phase: 'idle',       // idle | casting | waiting | bite | reeling
      power: 0,
      powerDir: 1,
      currentCatch: null,
      reelProgress: 0,
      roundScore: 0,
      catches: 0,
      streak: 0,
      castDisrupted: false,
      controlsReversed: false,
      fogActive: false,
      explosiveBite: false,
      pointMultiplier: 1,
      biteSpeedMultiplier: 1,
      escapeSpeedMultiplier: 1,
      biteTimer: null,
      escapeTimer: null,
    };

    // Set up game area
    const canvas = document.getElementById('game-canvas');
    canvas.innerHTML = `
      <div class="ambient-fish-layer">
        <img class="ambient-fish swim-1" src="pixel ocean/peixinhos1.png" alt="">
        <img class="ambient-fish swim-2" src="pixel ocean/peixinhos3.png" alt="">
        <img class="ambient-fish swim-3" src="pixel ocean/peixinhos5.png" alt="">
        <img class="ambient-fish swim-4" src="pixel ocean/peixinhos6.png" alt="">
      </div>
      <div class="escape-timer"><div class="escape-timer-fill" id="escape-timer-fill"></div></div>
      <div id="bite-flash" class="bite-flash"></div>
      <img id="rod-anim" class="rod-anim" src="assets/rod/idle-out/frame-0.png" alt="">
      <img id="bobber-sprite" class="bobber-sprite" src="assets/ui/bobber.png" alt="" style="display:none">
      <img id="exclamation-sprite" class="exclamation-sprite" src="assets/ui/exclamation.png" alt="" style="display:none">
      <div id="game-message" class="game-message"></div>
      <div id="castastrophe-banner" class="castastrophe-banner" style="display: none;"></div>
    `;

    // Preload all individual rod frames into cache
    const ROD_CONFIG = {
      'antic':    { frames:  7, delay: 100, loop: true  },
      'cast':     { frames: 12, delay:  70, loop: false },
      'idle-out': { frames:  4, delay: 180, loop: true  },
      'idle-in':  { frames:  2, delay: 220, loop: true  },
      'set-hook': { frames:  6, delay:  70, loop: true  },
      'reel':     { frames:  5, delay: 110, loop: true  },
      'catch':    { frames:  3, delay: 140, loop: false },
    };
    this._ROD_CONFIG = ROD_CONFIG;
    this._rodFrameImgs = {};
    Object.entries(ROD_CONFIG).forEach(([key, cfg]) => {
      this._rodFrameImgs[key] = Array.from({ length: cfg.frames }, (_, i) => {
        const img = new Image();
        img.src = `assets/rod/${key}/frame-${i}.png`;
        return img;
      });
    });
    this._rodFrameTimer = null;
    this._rodFrameIdx   = 0;

    // Show controls
    const btnCast = document.getElementById('btn-cast');
    const btnReel = document.getElementById('btn-reel');
    btnCast.style.display = 'block';
    btnReel.style.display = 'none';

    // Bind inputs with small debounce buffers to prevent accidental double-fires
    this._lastCastDown   = 0;
    this._lastCastUp     = 0;
    this._lastReel       = 0;
    this._onCastDown = () => {
      const now = Date.now();
      if (now - this._lastCastDown < 200) return;
      this._lastCastDown = now;
      this.onInput('castStart');
    };
    this._onCastUp = () => {
      const now = Date.now();
      if (now - this._lastCastUp < 200) return;
      this._lastCastUp = now;
      this.onInput('castRelease');
    };
    this._onReel = () => {
      const now = Date.now();
      if (now - this._lastReel < 150) return;
      this._lastReel = now;
      this.onInput('reel');
    };

    btnCast.addEventListener('touchstart', this._onCastDown, { passive: true });
    btnCast.addEventListener('mousedown', this._onCastDown);
    btnCast.addEventListener('touchend', this._onCastUp, { passive: true });
    btnCast.addEventListener('mouseup', this._onCastUp);

    btnReel.addEventListener('touchstart', this._onReel, { passive: true });
    btnReel.addEventListener('click', this._onReel);

    // Power bar animation
    this._powerInterval = null;

    showGameMessage(SpeedFishing.description, 0);
  }

  onTick(_deltaTime) {
    // Castastrophe check every few seconds
    if (this.timeRemaining % 7 === 0 && this.timeRemaining > 0) {
      if (shouldTriggerCastastrophe(0.3)) {
        const event = getRandomCastastrophe();
        this.localState = applyCastastrophe(event, this.localState);
      }
    }
  }

  onInput(inputType) {
    if (!this.isRunning) return;
    const state = this.localState;

    switch (inputType) {
      case 'castStart':
        if (state.phase !== 'idle') return;
        if (state.castDisrupted) {
          showGameMessage('Cast disrupted!', 1500);
          return;
        }
        state.phase = 'casting';
        state.power = 0;
        state.powerDir = 1;

        this._setRodState('preparing');
        this._showPowerBar();
        showGameMessage('Release to cast!', 0);
        this._setCastLabel('Casting...');
        this._powerInterval = setInterval(() => {
          state.power += state.powerDir * 3;
          if (state.power >= 100 || state.power <= 0) state.powerDir *= -1;
          state.power = Math.max(0, Math.min(100, state.power));
          this._updatePowerBar(state.power);
        }, 30);
        break;

      case 'castRelease':
        if (state.phase !== 'casting') return;
        clearInterval(this._powerInterval);
        this._hidePowerBar();

        state.phase = 'waiting';
        const castQuality = state.power / 100; // 0-1

        // Grey out cast button while waiting for a bite
        document.getElementById('btn-cast').classList.add('waiting');
        this._setCastLabel('Waiting...');
        showGameMessage('Waiting for a bite...', 0);

        // Show cast animation
        this._animateCast(castQuality);

        // Schedule a bite
        const biteDelay = (1500 + Math.random() * 3000) * state.biteSpeedMultiplier;
        state.biteTimer = setTimeout(() => {
          if (!this.isRunning || state.phase !== 'waiting') return;
          state.phase = 'bite';
          state.currentCatch = getRandomFish();

          // Better cast = better fish chance
          if (castQuality > 0.8 && Math.random() > 0.5) {
            state.currentCatch = getRandomFish('uncommon');
          }

          // Escape timer — react fast or lose it
          const escapeTime = (2000 + Math.random() * 1500) * state.escapeSpeedMultiplier;
          this._showEscapeTimer(escapeTime);
          this._showBite();

          state.escapeTimer = setTimeout(() => {
            if (state.phase === 'bite') {
              this._hideEscapeTimer();
              showGameMessage('Too slow! Fish escaped!', 1500);
              state.streak = 0;
              this._resetToIdle();
            }
          }, escapeTime);
        }, biteDelay);
        break;

      case 'reel':
        if (state.phase === 'bite') {
          // Start reeling
          clearTimeout(state.escapeTimer);
          this._hideEscapeTimer();
          state.phase = 'reeling';
          state.reelProgress = 0;
          this._setRodState('reeling');
          this._showReelProgress();
          showGameMessage('Keep reeling!', 0);

          const reelBtn = document.getElementById('btn-reel');
          document.getElementById('btn-cast').style.display = 'none';
          reelBtn.style.display = 'block';
          reelBtn.classList.add('active');
          reelBtn.classList.remove('urgent');
        }

        if (state.phase === 'reeling') {
          // Each tap/click adds reel progress
          state.reelProgress += state.controlsReversed ? -8 : 15 + Math.random() * 10;
          state.reelProgress = Math.max(0, Math.min(100, state.reelProgress));
          this._updateReelProgress(state.reelProgress);

          // Fish fights back slightly — immediate to feel snappy
          setTimeout(() => {
            if (state.phase === 'reeling') {
              state.reelProgress -= 3 + Math.random() * 5;
              state.reelProgress = Math.max(0, state.reelProgress);
              this._updateReelProgress(state.reelProgress);
              this._flashReelFight();
            }
          }, 150);

          if (state.reelProgress >= 100) {
            this._catchFish();
          }
        }
        break;
    }
  }

  async _catchFish() {
    const state = this.localState;
    const fish = state.currentCatch;
    if (!fish) return;

    state.catches++;
    state.streak++;

    const points = calculatePoints(fish, {
      perfectTiming: state.power > 85 && state.power < 95,
      streak: state.streak,
      castastropheBonus: state.pointMultiplier !== 1 ? state.pointMultiplier : undefined
    });

    state.roundScore += points;

    this._setRodState('catch');
    showCatchDisplay(fish.emoji, fish.name, points, fish.image || null);

    // Update HUD immediately
    document.getElementById('hud-score').textContent = `${state.roundScore} pts`;

    // Reset UI after showing the catch — don't wait on Firebase
    setTimeout(() => this._resetToIdle(), 1800);

    // Fire-and-forget Firebase update
    updateScore(this.roomCode, this.playerId, points);
    updateRoundScore(this.roomCode, this.playerId, 'current', {
      catches: state.catches,
      roundScore: state.roundScore,
      lastCatch: fish.name
    });
  }

  _resetToIdle() {
    const state = this.localState;
    state.phase = 'idle';
    state.currentCatch = null;
    state.reelProgress = 0;
    state.explosiveBite = false;

    const castBtn = document.getElementById('btn-cast');
    if (castBtn) castBtn.classList.remove('waiting');
    this._hideEscapeTimer();
    this._setCastLabel('Cast!');
    showGameMessage('Cast again!', 1500);
    document.getElementById('btn-cast').style.display = 'block';
    document.getElementById('btn-reel').style.display = 'none';
    document.getElementById('btn-reel').classList.remove('active', 'urgent');

    this._hideReelProgress();
    this._setRodState('idle');
    this._hideBobber();
  }

  // ---- Visual helpers ----

  /** Animate the rod by swapping <img src> each frame — plain img, no canvas */
  _setRodState(stateName) {
    const stateMap = {
      idle:      'idle-out',
      preparing: 'antic',
      cast:      'cast',
      waiting:   'idle-in',
      bite:      'set-hook',
      reeling:   'reel',
      catch:     'catch',
    };
    const key = stateMap[stateName] || 'idle-out';
    const c   = this._ROD_CONFIG[key];
    clearInterval(this._rodFrameTimer);
    this._rodFrameTimer = null;
    this._rodFrameIdx = 0;

    const rodImg = document.getElementById('rod-anim');
    if (!rodImg || !c) return;
    const frameImgs = this._rodFrameImgs[key];
    rodImg.src = frameImgs[0].src;

    const advance = () => {
      this._rodFrameIdx++;
      if (this._rodFrameIdx >= c.frames) {
        if (c.loop) {
          this._rodFrameIdx = 0;
        } else {
          clearInterval(this._rodFrameTimer);
          this._rodFrameTimer = null;
          return;
        }
      }
      rodImg.src = frameImgs[this._rodFrameIdx].src;
    };
    this._rodFrameTimer = setInterval(advance, c.delay);
  }

  _showPowerBar() {
    let bar = document.querySelector('.power-bar-container');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'power-bar-container';
      bar.innerHTML = '<div class="power-bar-fill"></div>';
      document.getElementById('game-canvas').appendChild(bar);
    }
    bar.style.display = 'block';
  }

  _updatePowerBar(power) {
    const fill = document.querySelector('.power-bar-fill');
    if (fill) fill.style.width = `${power}%`;
  }

  _hidePowerBar() {
    const bar = document.querySelector('.power-bar-container');
    if (bar) bar.style.display = 'none';
  }

  _animateCast(quality) {
    this._setRodState('cast');
    const bobber = document.getElementById('bobber-sprite');
    if (bobber) {
      bobber.style.display = 'block';
      // Always centered horizontally; quality only affects vertical depth
      bobber.style.top  = `${52 + quality * 8}%`;
      bobber.style.left = '50%';
    }
    // Transition to idle-in once cast animation plays (~500ms), then start bobber float
    setTimeout(() => {
      this._setRodState('waiting');
      const b = document.getElementById('bobber-sprite');
      if (b) b.classList.add('floating');
    }, 500);
  }

  _showBite() {
    const rarity = this.localState.currentCatch?.rarity || 'common';

    const bobber = document.getElementById('bobber-sprite');
    if (bobber) {
      bobber.classList.remove('floating');
      bobber.classList.add('bite');
    }

    const exclaim = document.getElementById('exclamation-sprite');
    if (exclaim) {
      exclaim.style.display = 'block';
      exclaim.className = `exclamation-sprite rarity-${rarity}`;
      void exclaim.offsetWidth; // reflow to restart animation
      exclaim.classList.add('show');
    }

    this._flashBite();
    this._setRodState('bite');
    showGameMessage('BITE! Tap Reel!', 0);

    // Switch to reel button with urgent pulse
    document.getElementById('btn-cast').classList.remove('waiting');
    document.getElementById('btn-cast').style.display = 'none';
    const reelBtn = document.getElementById('btn-reel');
    reelBtn.style.display = 'block';
    reelBtn.classList.add('urgent');
  }

  _hideBobber() {
    const bobber = document.getElementById('bobber-sprite');
    if (bobber) {
      bobber.classList.remove('bite', 'floating');
      bobber.style.display = 'none';
    }
    const exclaim = document.getElementById('exclamation-sprite');
    if (exclaim) {
      exclaim.style.display = 'none';
      exclaim.className = 'exclamation-sprite';
    }
    const msg = document.getElementById('game-message');
    if (msg) msg.classList.remove('visible');
  }

  _showReelProgress() {
    let bar = document.querySelector('.reel-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'reel-progress';
      bar.innerHTML = '<div class="reel-progress-fill"></div>';
      document.getElementById('game-canvas').appendChild(bar);
    }
    bar.style.display = 'block';
  }

  _updateReelProgress(progress) {
    const fill = document.querySelector('.reel-progress-fill');
    if (fill) fill.style.width = `${progress}%`;
  }

  _hideReelProgress() {
    const bar = document.querySelector('.reel-progress');
    if (bar) bar.style.display = 'none';
  }

  // ---- Feedback helpers ----

  _setCastLabel(text) {
    const lbl = document.getElementById('cast-btn-label');
    if (lbl) lbl.textContent = text;
  }

  _showEscapeTimer(durationMs) {
    const timer = document.querySelector('.escape-timer');
    const fill  = document.getElementById('escape-timer-fill');
    if (!timer || !fill) return;
    fill.style.transition = 'none';
    fill.style.width = '100%';
    timer.style.display = 'block';
    void fill.offsetWidth; // force reflow before starting transition
    fill.style.transition = `width ${durationMs}ms linear`;
    fill.style.width = '0%';
  }

  _hideEscapeTimer() {
    const timer = document.querySelector('.escape-timer');
    if (timer) timer.style.display = 'none';
  }

  _flashBite() {
    const flash = document.getElementById('bite-flash');
    if (!flash) return;
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
  }

  _flashReelFight() {
    const fill = document.querySelector('.reel-progress-fill');
    if (!fill) return;
    fill.classList.add('fight');
    setTimeout(() => fill.classList.remove('fight'), 300);
  }

  cleanup() {
    super.cleanup();

    clearInterval(this._rodFrameTimer);
    const state = this.localState;
    clearTimeout(state.biteTimer);
    clearTimeout(state.escapeTimer);
    clearInterval(this._powerInterval);

    const btnCast = document.getElementById('btn-cast');
    const btnReel = document.getElementById('btn-reel');

    if (btnCast) {
      btnCast.removeEventListener('touchstart', this._onCastDown);
      btnCast.removeEventListener('mousedown', this._onCastDown);
      btnCast.removeEventListener('touchend', this._onCastUp);
      btnCast.removeEventListener('mouseup', this._onCastUp);
    }
    if (btnReel) {
      btnReel.removeEventListener('touchstart', this._onReel);
      btnReel.removeEventListener('click', this._onReel);
    }

    // Clear fog
    const canvas = document.getElementById('game-canvas');
    if (canvas) canvas.style.filter = '';
  }

  getResults() {
    return {
      catches: this.localState.catches,
      roundScore: this.localState.roundScore,
      streak: this.localState.streak
    };
  }
}
