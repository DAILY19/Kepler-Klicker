// ============================================================
// Biggest Catch Minigame
// One cast — highest weight wins!
// ============================================================

import { BaseMinigame } from './base.js';
import { getRandomFish, updateScore, updateRoundScore } from '../scoring.js';
import { shouldTriggerCastastrophe, getRandomCastastrophe, applyCastastrophe } from '../castastrophes.js';
import { showCatchDisplay, showGameMessage } from '../ui.js';

export class BiggestCatch extends BaseMinigame {
  static get id() { return 'biggest_catch'; }
  static get name() { return 'Biggest Catch'; }
  static get description() { return 'One cast — biggest fish wins!'; }

  setup() {
    this.duration = 20;
    this.timeRemaining = this.duration;

    this.localState = {
      phase: 'idle',
      power: 0,
      powerDir: 1,
      currentCatch: null,
      reelProgress: 0,
      finalCatch: null,
      castDisrupted: false,
      controlsReversed: false,
      fogActive: false,
      pointMultiplier: 1,
      biteSpeedMultiplier: 1,
      escapeSpeedMultiplier: 1,
    };

    const canvas = document.getElementById('game-canvas');
    canvas.innerHTML = `
      <img id="rod-anim" class="rod-anim" src="assets/rod/idle-out.gif" alt="">
      <img id="bobber-sprite" class="bobber-sprite" src="assets/ui/bobber.png" alt="" style="display:none">
      <img id="exclamation-sprite" class="exclamation-sprite" src="assets/ui/exclamation.png" alt="" style="display:none">
      <div id="game-message" class="game-message"></div>
      <div id="castastrophe-banner" class="castastrophe-banner" style="display: none;"></div>
    `;

    const btnCast = document.getElementById('btn-cast');
    const btnReel = document.getElementById('btn-reel');
    btnCast.style.display = 'block';
    btnReel.style.display = 'none';

    this._onCastDown = () => this.onInput('castStart');
    this._onCastUp = () => this.onInput('castRelease');
    this._onReel = () => this.onInput('reel');

    btnCast.addEventListener('touchstart', this._onCastDown, { passive: true });
    btnCast.addEventListener('mousedown', this._onCastDown);
    btnCast.addEventListener('touchend', this._onCastUp, { passive: true });
    btnCast.addEventListener('mouseup', this._onCastUp);
    btnReel.addEventListener('touchstart', this._onReel, { passive: true });
    btnReel.addEventListener('click', this._onReel);

    this._powerInterval = null;

    showGameMessage(BiggestCatch.description, 0);
  }

  onTick() {
    if (this.timeRemaining === 10 && shouldTriggerCastastrophe(0.5)) {
      const event = getRandomCastastrophe();
      this.localState = applyCastastrophe(event, this.localState);
    }
  }

  onInput(inputType) {
    if (!this.isRunning) return;
    const state = this.localState;

    // Only allow one cast in this minigame
    if (state.finalCatch) return;

    switch (inputType) {
      case 'castStart':
        if (state.phase !== 'idle') return;
        state.phase = 'casting';
        state.power = 0;
        state.powerDir = 1;

        this._showPowerBar();
        this._setRodState('preparing');
        this._powerInterval = setInterval(() => {
          state.power += state.powerDir * 2;
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

        const castQuality = state.power / 100;
        this._animateCast(castQuality);

        // Better cast = better fish
        const biteDelay = (2000 + Math.random() * 3000) * state.biteSpeedMultiplier;
        setTimeout(() => {
          if (!this.isRunning || state.phase !== 'waiting') return;

          // Determine fish rarity based on cast quality
          let rarity = null;
          if (castQuality > 0.9) rarity = 'rare';
          else if (castQuality > 0.7) rarity = 'uncommon';

          state.currentCatch = getRandomFish(rarity);
          state.phase = 'bite';

          this._showBite();

          // Escape timer
          setTimeout(() => {
            if (state.phase === 'bite') {
              showGameMessage('Too slow! It got away!', 1500);
              state.phase = 'done';
              // No catch — auto end after a moment
              setTimeout(() => this.end(), 2000);
            }
          }, 2500 * state.escapeSpeedMultiplier);
        }, biteDelay);
        break;

      case 'reel':
        if (state.phase === 'bite') {
          state.phase = 'reeling';
          state.reelProgress = 0;
          this._setRodState('reeling');
          this._showReelProgress();
          document.getElementById('btn-cast').style.display = 'none';
          document.getElementById('btn-reel').style.display = 'block';
          document.getElementById('btn-reel').classList.add('active');
        }
        if (state.phase === 'reeling') {
          state.reelProgress += state.controlsReversed ? -5 : 12 + Math.random() * 8;
          state.reelProgress = Math.max(0, Math.min(100, state.reelProgress));
          this._updateReelProgress(state.reelProgress);

          // Bigger fish fights harder
          const fishResist = state.currentCatch?.rarity === 'rare' ? 8 : 4;
          setTimeout(() => {
            if (state.phase === 'reeling') {
              state.reelProgress -= fishResist + Math.random() * 3;
              state.reelProgress = Math.max(0, state.reelProgress);
              this._updateReelProgress(state.reelProgress);
            }
          }, 300);

          if (state.reelProgress >= 100) {
            this._completeCatch();
          }
        }
        break;
    }
  }

  async _completeCatch() {
    const state = this.localState;
    const fish = state.currentCatch;
    if (!fish) return;

    state.finalCatch = fish;

    // Weight-based scoring for this mode
    const points = Math.round(fish.actualWeight * 10 * state.pointMultiplier);
    this._setRodState('catch');
    showCatchDisplay(fish.emoji, `${fish.name} (${fish.actualWeight} lbs)`, points, fish.image || null);

    await updateScore(this.roomCode, this.playerId, points);
    await updateRoundScore(this.roomCode, this.playerId, 'current', {
      fishName: fish.name,
      weight: fish.actualWeight,
      points
    });

    document.getElementById('hud-score').textContent = `${points} pts`;

    // End after showing catch
    setTimeout(() => this.end(), 3000);
  }

  // ---- Visual helpers ----

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
    showGameMessage('BIG BITE! Reel it in!', 0);
    document.getElementById('btn-cast').style.display = 'none';
    document.getElementById('btn-reel').style.display = 'block';
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

  _updateReelProgress(p) {
    const fill = document.querySelector('.reel-progress-fill');
    if (fill) fill.style.width = `${p}%`;
  }

  cleanup() {
    super.cleanup();
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
    const canvas = document.getElementById('game-canvas');
    if (canvas) canvas.style.filter = '';
  }

  getResults() {
    const fish = this.localState.finalCatch;
    return {
      fishName: fish?.name || 'Nothing',
      weight: fish?.actualWeight || 0,
      points: fish ? Math.round(fish.actualWeight * 10) : 0
    };
  }
}
