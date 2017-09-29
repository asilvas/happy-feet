const states = require('./states');

module.exports = class Happy {
  constructor(opts) {
    this.options = Object.assign({
      escalationSoftLimitMin: 20, // 20sec
      escalationSoftLimitMax: 300, // 5min
      uncaughtExceptionSoftLimit: 1
    }, opts);
    this._state = states.HAPPY;
    this.uncaughtExceptions = 0;
    this.eventLoop = 0;
    // determine escalation limit up front
    this.escalationSoftLimit = Math.round(Math.random() * (this.options.escalationSoftLimitMax - this.options.escalationSoftLimitMin) + this.options.escalationSoftLimitMin) * 1000;

    if (this.options.uncaughtExceptionSoftLimit || this.options.uncaughtExceptionHardLimit) {
      process.on('uncaughtException', this.onUncaughtException);
    }

    if (this.options.eventLoopSoftLimit || this.options.eventLoopHardLimit) {
      // based on https://github.com/STRML/node-toobusy/blob/master/toobusy.js
      const interval = 250;
      const smoothingFactor = 1 / 2;
      let lastTime = Date.now();
      this.eventLoopTimer = setInterval(() => {
        const now = Date.now();
        let lag = now - lastTime;
        lag = Math.max(0, lag - interval);
        this.eventLoop = smoothingFactor * lag + (1 - smoothingFactor) * this.eventLoop;
        lastTime = now;
      }, interval).unref();
    }
  }

  destroy() {
    if (this.eventLoopTimer) {
      clearInterval(this.eventLoopTimer);
      this.eventLoopTimer = undefined;
    }

    process.removeListener('uncaughtException', this.onUncaughtException);
  }

  onUncaughtException(err) {
    this.uncaughtExceptions++;
  }

  get state() {
    this.checkState();

    return this._state;
  }

  set state(newState) {
    if (this._state === states.UNHAPPY) return; // cannot override once in UNHAPPY state

    this._state = newState;
  }

  get STATE() {
    return states;
  }

  checkState() {
    if (this.options.uncaughtExceptionHardLimit && this.uncaughtExceptions >= this.options.uncaughtExceptionHardLimit) {
      this.state = states.UNHAPPY;
    } else if (this.options.uncaughtExceptionSoftLimit && this.uncaughtExceptions >= this.options.uncaughtExceptionSoftLimit) {
      this.state = states.WARN;
    }

    if (this.options.rssHardLimit || this.options.rssSoftLimit) {
      const memUsage = process.memoryUsage();
      if (this.options.rssHardLimit && memUsage.rss >= this.options.rssHardLimit) {
        this.state = states.UNHAPPY;
      } else if (this.options.rssSoftLimit && memUsage.rss >= this.options.rssSoftLimit) {
        this.state = states.WARN;
      }
    }

    if (this.options.eventLoopHardLimit && this.eventLoop >= this.options.eventLoopHardLimit) {
      this.state = states.UNHAPPY;
    } else if (this.options.eventLoopSoftLimit && this.eventLoop >= this.options.eventLoopSoftLimit) {
      this.state = states.WARN;
    }

    // if an escalation has already been triggered
    if (this.escalationTime && (Date.now() - this.escalationTime) >= this.escalationSoftLimit) {
      // time to escalate and bail out
      this.state = states.UNHAPPY;
      return;
    } else if (this.escalationSoftLimit && this._state === states.WARN && !this.escalationTime) {
      // begin countdown if WARN was just triggered and escalations are enabled
      this.escalationTime = Date.now();
    }
  }
}
