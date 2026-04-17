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
      <div class="ambient-fish-layer">
        <img class="ambient-fish swim-1" src="pixel ocean/peixinhos2.png" alt="">
        <img class="ambient-fish swim-2" src="pixel ocean/peixinhos4.png" alt="">
        <img class="ambient-fish swim-3" src="pixel ocean/peixinhos7.png" alt="">
        <img class="ambient-fish swim-4" src="pixel ocean/peixinhos8.png" alt="">
      </div>
      <div class="escape-timer"><div class="escape-timer-fill" id="escape-timer-fill"></div></div>
      <div id="bite-flash" class="bite-flash"></div>
      <div class="rod-clip" id="rod-clip">
        <img id="rod-anim" class="rod-anim" src="assets/rod/idle-out.png" alt="">
      </div>
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

    // Preload all rod strips
    ['antic','cast','idle-out','idle-in','set-hook','reel','catch'].forEach(n => {
      const img = new Image(); img.src = `assets/rod/${n}.png`;
    });
    this._rodFrameTimer = null;
    this._rodFrameIdx   = 0;

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
        showGameMessage('Release to cast!', 0);
        this._setCastLabel('Casting...');
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

        // Grey out cast button while waiting
        document.getElementById('btn-cast').classList.add('waiting');
        this._setCastLabel('Waiting...');
        showGameMessage('Waiting for a bite...', 0);

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

          const escapeTime = 2500 * state.escapeSpeedMultiplier;
          this._showEscapeTimer(escapeTime);
          this._showBite();

          // Escape timer
          setTimeout(() => {
            if (state.phase === 'bite') {
              this._hideEscapeTimer();
              showGameMessage('Too slow! It got away!', 1500);
              state.phase = 'done';
              // No catch — auto end after a moment
              setTimeout(() => this.end(), 2000);
            }
          }, escapeTime);
        }, biteDelay);
        break;

      case 'reel':
        if (state.phase === 'bite') {
          state.phase = 'reeling';
          state.reelProgress = 0;
          this._setRodState('reeling');
          this._showReelProgress();
          this._hideEscapeTimer();
          showGameMessage('Keep reeling!', 0);
          document.getElementById('btn-cast').style.display = 'none';
          const reelBtn = document.getElementById('btn-reel');
          reelBtn.style.display = 'block';
          reelBtn.classList.add('active');
          reelBtn.classList.remove('urgent');
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
              this._flashReelFight();
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

  /** Swap the rod PNG strip and start the frame animator */
  _setRodState(stateName) {
    const config = {
      idle:      { src: 'assets/rod/idle-out.png', frames: 12, delay: 180, loop: true  },
      preparing: { src: 'assets/rod/antic.png',    frames: 12, delay: 100, loop: true  },
      cast:      { src: 'assets/rod/cast.png',     frames: 12, delay:  70, loop: false },
      waiting:   { src: 'assets/rod/idle-in.png',  frames: 12, delay: 220, loop: true  },
      bite:      { src: 'assets/rod/set-hook.png', frames: 12, delay:  70, loop: true  },
      reeling:   { src: 'assets/rod/reel.png',     frames: 12, delay: 110, loop: true  },
      catch:     { src: 'assets/rod/catch.png',    frames: 12, delay: 140, loop: false },
    };
    const c = config[stateName] || config.idle;
    clearInterval(this._rodFrameTimer);
    this._rodFrameIdx = 0;

    const strip = document.getElementById('rod-anim');
    const clip  = document.getElementById('rod-clip');
    if (!strip || !clip) return;
    if (!strip.src.endsWith(c.src.split('/').pop())) {
      strip.src = c.src;
    }

    const advance = () => {
      const fw = clip.offsetWidth;
      strip.style.transform = `translateX(${-this._rodFrameIdx * fw}px)`;
      if (this._rodFrameIdx < c.frames - 1) {
        this._rodFrameIdx++;
      } else if (c.loop) {
        this._rodFrameIdx = 0;
      } else {
        clearInterval(this._rodFrameTimer);
        this._rodFrameTimer = null;
        return;
      }
    };
    advance();
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
      bobber.style.top = `${50 + quality * 10}%`;
      bobber.style.left = `${45 + quality * 10}%`;
    }
    setTimeout(() => {
      this._setRodState('waiting');
      const b = document.getElementById('bobber-sprite');
      if (b) b.classList.add('floating');
    }, 600);
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
      void exclaim.offsetWidth;
      exclaim.classList.add('show');
    }

    this._flashBite();
    this._setRodState('bite');
    showGameMessage('HUGE BITE! Reel it in!', 0);
    document.getElementById('btn-cast').classList.remove('waiting');
    document.getElementById('btn-cast').style.display = 'none';
    const reelBtn = document.getElementById('btn-reel');
    reelBtn.style.display = 'block';
    reelBtn.classList.add('urgent');
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
    void fill.offsetWidth;
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
    clearInterval(this._powerInterval);

    const btnCast = document.getElementById('btn-cast');
    const btnReel = document.getElementById('btn-reel');
    if (btnCast) {
      btnCast.classList.remove('waiting');
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
