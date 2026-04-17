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
      <img id="rod-anim" class="rod-anim" src="assets/rod/idle-out.gif" alt="">
      <img id="bobber-sprite" class="bobber-sprite" src="assets/ui/bobber.png" alt="" style="display:none">
      <img id="exclamation-sprite" class="exclamation-sprite" src="assets/ui/exclamation.png" alt="" style="display:none">
      <div id="game-message" class="game-message"></div>
      <div id="castastrophe-banner" class="castastrophe-banner" style="display: none;"></div>
    `;

    // Show controls
    const btnCast = document.getElementById('btn-cast');
    const btnReel = document.getElementById('btn-reel');
    btnCast.style.display = 'block';
    btnReel.style.display = 'none';

    // Bind inputs
    this._onCastDown = () => this.onInput('castStart');
    this._onCastUp = () => this.onInput('castRelease');
    this._onReel = () => this.onInput('reel');

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

        // Show power bar
        this._setRodState('preparing');
        this._showPowerBar();
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

          this._showBite();

          // Escape timer — react fast or lose it
          const escapeTime = (2000 + Math.random() * 1500) * state.escapeSpeedMultiplier;
          state.escapeTimer = setTimeout(() => {
            if (state.phase === 'bite') {
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
          state.phase = 'reeling';
          state.reelProgress = 0;
          this._setRodState('reeling');
          this._showReelProgress();

          document.getElementById('btn-cast').style.display = 'none';
          document.getElementById('btn-reel').style.display = 'block';
          document.getElementById('btn-reel').classList.add('active');
        }

        if (state.phase === 'reeling') {
          // Each tap/click adds reel progress
          state.reelProgress += state.controlsReversed ? -8 : 15 + Math.random() * 10;
          state.reelProgress = Math.max(0, Math.min(100, state.reelProgress));
          this._updateReelProgress(state.reelProgress);

          // Fish fights back slightly
          setTimeout(() => {
            if (state.phase === 'reeling') {
              state.reelProgress -= 3 + Math.random() * 5;
              state.reelProgress = Math.max(0, state.reelProgress);
              this._updateReelProgress(state.reelProgress);
            }
          }, 300);

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

    // Update Firebase
    await updateScore(this.roomCode, this.playerId, points);
    await updateRoundScore(this.roomCode, this.playerId, 'current', {
      catches: state.catches,
      roundScore: state.roundScore,
      lastCatch: fish.name
    });

    // Update HUD
    document.getElementById('hud-score').textContent = `${state.roundScore} pts`;

    setTimeout(() => this._resetToIdle(), 500);
  }

  _resetToIdle() {
    const state = this.localState;
    state.phase = 'idle';
    state.currentCatch = null;
    state.reelProgress = 0;
    state.explosiveBite = false;

    document.getElementById('btn-cast').style.display = 'block';
    document.getElementById('btn-reel').style.display = 'none';
    document.getElementById('btn-reel').classList.remove('active');

    this._hideReelProgress();
    this._setRodState('idle');
    this._hideBobber();
  }

  // ---- Visual helpers ----

  /** Swap the rod GIF to a named state */
  _setRodState(stateName) {
    const rodMap = {
      idle:      'assets/rod/idle-out.gif',
      preparing: 'assets/rod/antic.gif',
      cast:      'assets/rod/cast.gif',
      waiting:   'assets/rod/idle-in.gif',
      bite:      'assets/rod/set-hook.gif',
      reeling:   'assets/rod/reel.gif',
      catch:     'assets/rod/catch.gif',
    };
    const rod = document.getElementById('rod-anim');
    if (rod) {
      const src = rodMap[stateName] || rodMap.idle;
      rod.src = '';
      rod.src = src;
    }
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
      bobber.style.top = `${50 + quality * 10}%`;
      bobber.style.left = `${45 + quality * 10}%`;
    }
    // Transition to idle-in once cast animation plays (~600ms)
    setTimeout(() => this._setRodState('waiting'), 600);
  }

  _showBite() {
    const bobber = document.getElementById('bobber-sprite');
    if (bobber) bobber.classList.add('bite');

    const exclaim = document.getElementById('exclamation-sprite');
    if (exclaim) {
      exclaim.style.display = 'block';
      exclaim.classList.remove('show');
      requestAnimationFrame(() => exclaim.classList.add('show'));
    }

    this._setRodState('bite');
    showGameMessage('Bite! Tap Reel!', 0);

    // Switch buttons
    document.getElementById('btn-cast').style.display = 'none';
    document.getElementById('btn-reel').style.display = 'block';
  }

  _hideBobber() {
    const bobber = document.getElementById('bobber-sprite');
    if (bobber) {
      bobber.classList.remove('bite');
      bobber.style.display = 'none';
    }
    const exclaim = document.getElementById('exclamation-sprite');
    if (exclaim) {
      exclaim.style.display = 'none';
      exclaim.classList.remove('show');
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

  cleanup() {
    super.cleanup();

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
