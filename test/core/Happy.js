'use strict';

const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const lib = require('../../lib/core/Happy');

function sleepSync(ms) {
  const endTime = Date.now() + ms;
  do {
    ; // uggliest sync loop eva
  } while (Date.now() < endTime);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

describe('#Happy', () => {

  let instance, opts, processMemoryUsage;

  beforeEach(() => {
    opts = {
    };

    processMemoryUsage = process.memoryUsage;
    process.memoryUsage = sinon.stub().returns({ rss: 1000 });
  });

  afterEach(() => {
    process.memoryUsage = processMemoryUsage; // restore
    instance.destroy();
  })

  it('Default options', () => {
    instance = new lib(opts);
    expect(instance.options).to.be.deep.equal({ escalationSoftLimitMin: 20, escalationSoftLimitMax: 300, uncaughtExceptionSoftLimit: 1, logger: console });
  });

  it('Cannot override UNHAPPY state', () => {
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.state = instance.STATE.UNHAPPY;
    expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
    instance.state = instance.STATE.WARN; // nope, this should be ignored
    expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
  });

  it('Custom states OK too', () => {
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.state = 'CUSTOM';
    expect(instance.state).to.be.equal('CUSTOM');
  });

  it('updateState logs warning on WARN state change', () => {
    opts.logger = { warn: sinon.stub(), error: sinon.stub() };
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.updateState(instance.STATE.WARN, 'because');
    expect(opts.logger.warn).to.be.calledOnce;
    expect(opts.logger.warn).to.be.calledWith('[happy-feet] state changed from HAPPY to WARN, reason: because');
  });

  it('updateState logs error on UNHAPPY state change', () => {
    opts.logger = { warn: sinon.stub(), error: sinon.stub() };
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.updateState(instance.STATE.UNHAPPY, 'because');
    expect(opts.logger.error).to.be.calledOnce;
    expect(opts.logger.error).to.be.calledWith('[happy-feet] state changed from HAPPY to UNHAPPY, reason: because');
  });

  it('updateState logs warning on CUSTOM state change', () => {
    opts.logger = { warn: sinon.stub(), error: sinon.stub() };
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.updateState('CUSTOM', 'because');
    expect(opts.logger.warn).to.be.calledOnce;
    expect(opts.logger.warn).to.be.calledWith('[happy-feet] state changed from HAPPY to CUSTOM, reason: because');
  });

  it('updateState does not log if state did not change', () => {
    opts.logger = { warn: sinon.stub(), error: sinon.stub() };
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.updateState(instance.STATE.WARN, 'because');
    instance.updateState(instance.STATE.WARN, 'because');
    expect(opts.logger.warn).to.be.calledOnce;
    expect(opts.logger.warn).to.be.calledWith('[happy-feet] state changed from HAPPY to WARN, reason: because');
  });

  it('escalationSoftLimit\'s', done => {
    opts.escalationSoftLimitMin = 1;
    opts.escalationSoftLimitMax = 1;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.state = instance.STATE.WARN;
    expect(instance.state).to.be.equal(instance.STATE.WARN);
    setTimeout(() => { // after escalation timeout we should be in unhappy state
      expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
      done();
    }, 1100);
  });

  it('uncaughtExceptionSoftLimit disabled', () => {
    opts.uncaughtExceptionSoftLimit = false;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.uncaughtExceptions++; // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.uncaughtExceptions++; // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
  });

  it('uncaughtExceptionSoftLimit', () => {
    opts.uncaughtExceptionSoftLimit = 2;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.onUncaughtException(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.onUncaughtException(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.WARN);
  });

  it('uncaughtExceptionHardLimit', () => {
    opts.uncaughtExceptionSoftLimit = false;
    opts.uncaughtExceptionHardLimit = 2;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.onUncaughtException(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.onUncaughtException(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
  });

  it('unhandledRejectionSoftLimit', () => {
    opts.unhandledRejectionSoftLimit = 2;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.onUnhandledRejection(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.onUnhandledRejection(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.WARN);
  });

  it('unhandledRejectionHardLimit', () => {
    opts.unhandledRejectionSoftLimit = false;
    opts.unhandledRejectionHardLimit = 2;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.onUnhandledRejection(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.onUnhandledRejection(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
  });

  it('rssSoftLimit', () => {
    opts.rssSoftLimit = 2000;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    process.memoryUsage = sinon.stub().returns({ rss: 3000 });
    expect(instance.state).to.be.equal(instance.STATE.WARN);
  });

  it('rssHardLimit', () => {
    opts.rssHardLimit = 2000;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    process.memoryUsage = sinon.stub().returns({ rss: 3000 });
    expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
  });

  it('eventLoopSoftLimit', async () => {
    opts.eventLoopSoftLimit = 100;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    sleepSync(500);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    await sleep(0);
    expect(instance.state).to.be.equal(instance.STATE.WARN);
  });

  it('eventLoopHardLimit', async () => {
    opts.eventLoopHardLimit = 100;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    sleepSync(500);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    await sleep(0);
    expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
  });

});
