const { EventEmitter } = require('events');
const states = require('./states');

const codes = {
  uncaughtExceptions: 'uncaughtExceptions',
  unhandledRejections: 'unhandledRejections',
  memory: 'memory',
  eventLoop: 'eventLoop',
  escalation: 'escalation',
  manual: 'manual'
};

module.exports = class Happy extends EventEmitter {
  constructor(opts) {
    super();
    this.options = Object.assign({
      escalationSoftLimitMin: 20, // 20sec
      escalationSoftLimitMax: 300, // 5min
      uncaughtExceptionSoftLimit: 1,
      logger: console
    }, opts);
    this._state = states.HAPPY;
    this.uncaughtExceptions = 0;
    this.unhandledRejections = 0;
    this.eventLoop = 0;
    // determine escalation limit up front
    this.escalationSoftLimit = Math.round(Math.random() * (this.options.escalationSoftLimitMax - this.options.escalationSoftLimitMin) + this.options.escalationSoftLimitMin) * 1000;

    if (this.options.uncaughtExceptionSoftLimit || this.options.uncaughtExceptionHardLimit) {
      this.onUncaughtException = ex => {
        this.uncaughtExceptions++;
        this.options.logger && this.options.logger.error('onUncaughtException:', ex.stack);
      };
      process.on('uncaughtException', this.onUncaughtException);
    }

    if (this.options.unhandledRejectionSoftLimit || this.options.unhandledRejectionHardLimit) {
      this.onUnhandledRejection = ex => {
        this.unhandledRejections++;
        this.options.logger && this.options.logger.error('onUnhandledRejection:', ex.stack);
      };
      process.on('unhandledRejection', this.onUnhandledRejection);
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
        this.eventLoop = (smoothingFactor * lag) + ((1 - smoothingFactor) * this.eventLoop);
        lastTime = now;
      }, interval).unref();
    }
  }

  destroy() {
    if (this.eventLoopTimer) {
      clearInterval(this.eventLoopTimer);
      this.eventLoopTimer = undefined;
    }

    if (this.onUncaughtException) {
      process.removeListener('uncaughtException', this.onUncaughtException);
      this.onUncaughtException = undefined;
    }

    if (this.onUnhandledRejection) {
      process.removeListener('unhandledRejection', this.onUnhandledRejection);
      delete this.onUnhandledRejection;
    }
  }

  get state() {
    this.checkState();

    return this._state;
  }

  set state(newState) {
    this.updateState(newState, 'State was manually changed', codes.manual);
  }

  get STATE() {
    return states;
  }

  updateState(newState, reason, code) {
    if (this._state === states.UNHAPPY) return; // cannot override once in UNHAPPY state

    if (this.options.logger && this._state !== newState && this._state !== states.UNHAPPY) {
      // do not trigger if:
      // 1. logger is disabled
      // 2. state did not change
      // 3. state was previously UNHAPPY, which cannot change after set
      this.options.logger[newState === states.UNHAPPY ? 'error' : 'warn'].call(this.options.logger, `[happy-feet] state changed from ${this._state} to ${newState}, reason: ${reason}, code: ${code}`);
    }

    this._state = newState;

    this.emit('change', newState, reason, code);
  }

  checkState() {
    if (this.options.uncaughtExceptionHardLimit && this.uncaughtExceptions >= this.options.uncaughtExceptionHardLimit) {
      this.updateState(states.UNHAPPY, `uncaughtExceptionHardLimit of ${this.options.uncaughtExceptionHardLimit} exceeded to ${this.uncaughtExceptions}`, codes.uncaughtExceptions);
    } else if (this.options.uncaughtExceptionSoftLimit && this.uncaughtExceptions >= this.options.uncaughtExceptionSoftLimit) {
      this.updateState(states.WARN, `uncaughtExceptionSoftLimit of ${this.options.uncaughtExceptionSoftLimit} exceeded to ${this.uncaughtExceptions}`, codes.uncaughtExceptions);
    }

    if (this.options.unhandledRejectionHardLimit && this.unhandledRejections >= this.options.unhandledRejectionHardLimit) {
      this.updateState(states.UNHAPPY, `unhandledRejectionHardLimit of ${this.options.unhandledRejectionHardLimit} exceeded to ${this.unhandledRejections}`, codes.unhandledRejections);
    } else if (this.options.unhandledRejectionSoftLimit && this.unhandledRejections >= this.options.unhandledRejectionSoftLimit) {
      this.updateState(states.WARN, `unhandledRejectionSoftLimit of ${this.options.unhandledRejectionSoftLimit} exceeded to ${this.unhandledRejections}`, codes.unhandledRejections);
    }

    if (this.options.rssHardLimit || this.options.rssSoftLimit) {
      const memUsage = process.memoryUsage();
      if (this.options.rssHardLimit && memUsage.rss >= this.options.rssHardLimit) {
        this.updateState(states.UNHAPPY, `rssHardLimit of ${this.options.rssHardLimit} exceeded to ${memUsage.rss}`, codes.memory);
      } else if (this.options.rssSoftLimit && memUsage.rss >= this.options.rssSoftLimit) {
        this.updateState(states.WARN, `rssSoftLimit of ${this.options.rssSoftLimit} exceeded to ${memUsage.rss}`, codes.memory);
      }
    }

    if (this.options.eventLoopHardLimit && this.eventLoop >= this.options.eventLoopHardLimit) {
      this.updateState(states.UNHAPPY, `eventLoopHardLimit of ${this.options.eventLoopHardLimit} exceeded to ${this.eventLoop}`, codes.eventLoop);
    } else if (this.options.eventLoopSoftLimit && this.eventLoop >= this.options.eventLoopSoftLimit) {
      this.updateState(states.WARN, `eventLoopSoftLimit of ${this.options.eventLoopSoftLimit} exceeded to ${this.eventLoop}`, codes.eventLoop);
    }

    // if an escalation has already been triggered
    if (this.escalationTime && (Date.now() - this.escalationTime) >= this.escalationSoftLimit) {
      // time to escalate and bail out
      this.updateState(states.UNHAPPY, `escalationSoftLimit of ${this.escalationSoftLimit} has been reached!`, codes.escalation);
      return;
    } else if (this.escalationSoftLimit && this._state === states.WARN && !this.escalationTime) {
      // begin countdown if WARN was just triggered and escalations are enabled
      this.escalationTime = Date.now();
    }
  }
}
