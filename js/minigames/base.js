// ============================================================
// Base Minigame Class
// ============================================================

/**
 * Abstract base class for all minigames.
 * Subclasses must implement: setup(), onTick(), onInput(), cleanup(), getResults()
 */
export class BaseMinigame {
  constructor(roomCode, playerId, players, settings) {
    this.roomCode = roomCode;
    this.playerId = playerId;
    this.players = players;
    this.settings = settings;

    this.duration = settings.minigameTime || 30; // seconds
    this.timeRemaining = this.duration;
    this.isRunning = false;
    this.localState = {};
    this.timerInterval = null;
  }

  /** Unique minigame identifier */
  static get id() { return 'base'; }
  static get name() { return 'Base Minigame'; }
  static get description() { return ''; }

  /** Called to set up game visuals and initial state */
  setup() {
    throw new Error('Subclass must implement setup()');
  }

  /** Called every tick while the game is running */
  onTick(deltaTime) {
    throw new Error('Subclass must implement onTick()');
  }

  /** Handle player input */
  onInput(inputType, data) {
    throw new Error('Subclass must implement onInput()');
  }

  /** Clean up timers, listeners, DOM elements */
  cleanup() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /** Return results for this round */
  getResults() {
    return this.localState;
  }

  /** Start the minigame timer */
  start() {
    this.isRunning = true;
    this.timeRemaining = this.duration;
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      this.updateTimerDisplay();

      if (this.timeRemaining <= 0) {
        this.end();
      } else {
        this.onTick(1);
      }
    }, 1000);
  }

  /** End the minigame */
  end() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.onEnd) this.onEnd(this.getResults());
  }

  /** Update the HUD timer */
  updateTimerDisplay() {
    const el = document.getElementById('hud-timer');
    if (el) {
      el.textContent = Math.max(0, this.timeRemaining);
      el.classList.toggle('danger', this.timeRemaining <= 5);
    }
  }

  /** Register an end callback */
  onEndCallback(fn) {
    this.onEnd = fn;
  }
}
