'use strict';

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
      gracePeriod: 0
    };

    processMemoryUsage = process.memoryUsage;
    process.memoryUsage = sinon.stub().returns({ rss: 1000, heapTotal: 1000 });
  });

  afterEach(() => {
    process.memoryUsage = processMemoryUsage; // restore
    instance.destroy();
  })

  it('Default options', () => {
    instance = new lib(opts);
    expect(instance.options).to.be.deep.equal({
      escalationSoftLimitMin: 60,
      escalationSoftLimitMax: 600,
      uncaughtExceptionSoftLimit: 1,
      logger: console,
      gracePeriod: 0,
      logOnUnhappy: true
    });
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
    instance.updateState(instance.STATE.WARN, 'because', 'why');
    expect(opts.logger.warn).to.be.calledOnce;
    expect(opts.logger.warn).to.be.calledWith("[happy-feet] state changed from 'HAPPY' to 'WARN', reason: 'because', code: why");
  });

  it('updateState logs error on UNHAPPY state change', () => {
    opts.logger = { warn: sinon.stub(), error: sinon.stub() };
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.updateState(instance.STATE.UNHAPPY, 'because', 'why');
    expect(opts.logger.error).to.be.calledOnce;
    expect(opts.logger.error).to.be.calledWith("[happy-feet] state changed from 'HAPPY' to 'UNHAPPY', reason: 'because', code: why");
  });

  it('updateState logs warning on CUSTOM state change', () => {
    opts.logger = { warn: sinon.stub(), error: sinon.stub() };
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.updateState('CUSTOM', 'because', 'why');
    expect(opts.logger.warn).to.be.calledOnce;
    expect(opts.logger.warn).to.be.calledWith("[happy-feet] state changed from 'HAPPY' to 'CUSTOM', reason: 'because', code: why");
  });

  it('updateState does not log if state did not change', () => {
    opts.logger = { warn: sinon.stub(), error: sinon.stub() };
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.updateState(instance.STATE.WARN, 'because', 'why');
    instance.updateState(instance.STATE.WARN, 'because', 'why');
    expect(opts.logger.warn).to.be.calledOnce;
    expect(opts.logger.warn).to.be.calledWith("[happy-feet] state changed from 'HAPPY' to 'WARN', reason: 'because', code: why");
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
    const eventListener = sinon.spy();
    opts.uncaughtExceptionSoftLimit = 2;
    instance = new lib(opts);
    instance.once('change', eventListener);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    
    instance.onUncaughtException(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    expect(eventListener).not.to.be.called;

    instance.onUncaughtException(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.WARN);
    expect(eventListener).to.be.calledWithMatch(
      instance.STATE.WARN,
      sinon.match.string,
      'uncaughtExceptions');
  });

  it('uncaughtExceptionHardLimit', () => {
    const eventListener = sinon.spy();
    opts.uncaughtExceptionSoftLimit = false;
    opts.uncaughtExceptionHardLimit = 2;
    instance = new lib(opts);
    instance.once('change', eventListener);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);

    instance.onUncaughtException(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    expect(eventListener).not.to.be.called;

    instance.onUncaughtException(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
    expect(eventListener).to.be.calledWithMatch(instance.STATE.UNHAPPY, sinon.match.string, 'uncaughtExceptions');
  });

  it('unhandledRejectionSoftLimit', () => {
    const eventListener = sinon.spy();
    opts.unhandledRejectionSoftLimit = 2;
    instance = new lib(opts);
    instance.once('change', eventListener);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);

    instance.onUnhandledRejection(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    expect(eventListener).not.to.be.called;
    
    instance.onUnhandledRejection(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.WARN);
    expect(eventListener).to.be.calledWithMatch(instance.STATE.WARN, sinon.match.string, 'unhandledRejections');
  });

  it('unhandledRejectionHardLimit', () => {
    const eventListener = sinon.spy();
    opts.unhandledRejectionSoftLimit = false;
    opts.unhandledRejectionHardLimit = 2;
    instance = new lib(opts);
    instance.once('change', eventListener);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);

    instance.onUnhandledRejection(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    expect(eventListener).not.to.be.called;

    instance.onUnhandledRejection(new Error('error')); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
    expect(eventListener).to.be.calledWithMatch(instance.STATE.UNHAPPY, sinon.match.string, 'unhandledRejections');
  });

  it('rssSoftLimit', () => {
    const eventListener = sinon.spy();
    opts.rssSoftLimit = 2000;
    instance = new lib(opts);
    instance.once('change', eventListener);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);

    process.memoryUsage = sinon.stub().returns({ rss: 3000 });
    expect(instance.state).to.be.equal(instance.STATE.WARN);
    expect(eventListener).to.be.calledWithMatch(instance.STATE.WARN, sinon.match.string, 'memory');
  });

  it('rssHardLimit', () => {
    const eventListener = sinon.spy();
    opts.rssHardLimit = 2000;
    instance = new lib(opts);
    instance.once('change', eventListener);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);

    process.memoryUsage = sinon.stub().returns({ rss: 3000 });
    expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
    expect(eventListener).to.be.calledWithMatch(instance.STATE.UNHAPPY, sinon.match.string, 'memory');
  });

  it('heapSoftLimit', () => {
    const eventListener = sinon.spy();
    opts.heapSoftLimit = 2000;
    instance = new lib(opts);
    instance.once('change', eventListener);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);

    process.memoryUsage = sinon.stub().returns({ heapTotal: 3000 });
    expect(instance.state).to.be.equal(instance.STATE.WARN);
    expect(eventListener).to.be.calledWithMatch(instance.STATE.WARN, sinon.match.string, 'memory');
  });

  it('heapHardLimit', () => {
    const eventListener = sinon.spy();
    opts.heapHardLimit = 2000;
    instance = new lib(opts);
    instance.once('change', eventListener);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);

    process.memoryUsage = sinon.stub().returns({ heapTotal: 3000 });
    expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
    expect(eventListener).to.be.calledWithMatch(instance.STATE.UNHAPPY, sinon.match.string, 'memory');
  });

  it('eventLoopSoftLimit', async () => {
    const eventListener = sinon.spy();
    opts.eventLoopSoftLimit = 100;
    instance = new lib(opts);
    instance.once('change', eventListener);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);

    sleepSync(500);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    expect(eventListener).not.to.be.called;

    await sleep(0);
    expect(instance.state).to.be.equal(instance.STATE.WARN);
    expect(eventListener).to.be.calledWithMatch(instance.STATE.WARN, sinon.match.string, 'eventLoop');
  });

  it('eventLoopHardLimit', async () => {
    const eventListener = sinon.spy();
    opts.eventLoopHardLimit = 100;
    instance = new lib(opts);
    instance.once('change', eventListener);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);

    sleepSync(500);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    expect(eventListener).not.to.be.called;

    await sleep(0);
    expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
    expect(eventListener).to.be.calledWithMatch(instance.STATE.UNHAPPY, sinon.match.string, 'eventLoop');
  });

  it('timeLimitMin/Max', async () => {
    const eventListener = sinon.spy();
    opts.timeLimitMin = 1;
    opts.timeLimitMax = 1;
    instance = new lib(opts);
    instance.once('change', eventListener);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);

    sleepSync(500);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    expect(eventListener).not.to.be.called;

    await sleep(600);
    expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
    expect(eventListener).to.be.calledWithMatch(instance.STATE.UNHAPPY, sinon.match.string, 'timeLimit');

  });

  it('emits state change events upon assignment', done => {
    const happy = new lib(opts);
    happy.once('change', verify);

    happy.state = 'CUSTOM';

    function verify(state, reason, code) {
      expect(state).to.equal('CUSTOM');
      expect(code).to.equal('manual');
      done();
    }
  });

  it('emits state change events upon calls to updateState', done => {
    const happy = new lib(opts);
    happy.once('change', verify);

    happy.updateState('WARN', 'memory limit exceeded', 'mem');

    function verify(state, reason, code) {
      expect(state).to.equal('WARN');
      expect(reason).to.equal('memory limit exceeded');
      expect(code).to.equal('mem');
      done();
    }
  });

  it('does NOT emit state change if state is unchanged', done => {
    const happy = new lib(opts);
    let count = 0;
    happy.on('change', verify);

    happy.updateState('WARN', 'memory limit exceeded', 'mem');
    happy.updateState('WARN', 'memory limit exceeded', 'mem');

    function verify(state, reason, code) {
      expect(count).to.equal(0);
      expect(state).to.equal('WARN');
      expect(reason).to.equal('memory limit exceeded');
      expect(code).to.equal('mem');
      count++;
      done();
    }
  });
});
