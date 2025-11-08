/**
 * Simple logging utility for the AI code reviewer
 */

class Logger {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    this.currentLevel = process.env.LOG_LEVEL || 'info';
    this.currentLevelValue = this.levels[this.currentLevel] || 2;
  }

  error(message, ...args) {
    if (this.currentLevelValue >= this.levels.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this.currentLevelValue >= this.levels.warn) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message, ...args) {
    if (this.currentLevelValue >= this.levels.info) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  debug(message, ...args) {
    if (this.currentLevelValue >= this.levels.debug) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
}

module.exports = new Logger();