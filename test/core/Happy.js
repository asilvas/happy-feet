'use strict';

const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const lib = require('../../lib/core/Happy');
const sleepSync = require('sleep-sync');

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
    expect(instance.options).to.be.deep.equal({ escalationSoftLimitMin: 20, escalationSoftLimitMax: 300, uncaughtExceptionSoftLimit: 1 });
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
    instance.onUncaughtException(); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.onUncaughtException(); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.WARN);
  });

  it('uncaughtExceptionHardLimit', () => {
    opts.uncaughtExceptionSoftLimit = false;
    opts.uncaughtExceptionHardLimit = 2;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.onUncaughtException(); // emulate trigger since mocha will abort if uncaught exception
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    instance.onUncaughtException(); // emulate trigger since mocha will abort if uncaught exception
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
  
  it('eventLoopSoftLimit', done => {
    opts.eventLoopSoftLimit = 100;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    sleepSync(500);
    setTimeout(() => { // need to release execution back to V8 before the new state is set
      expect(instance.state).to.be.equal(instance.STATE.WARN);
      done();
    }, 0);
  });

  it('eventLoopHardLimit', done => {
    opts.eventLoopHardLimit = 100;
    instance = new lib(opts);
    expect(instance.state).to.be.equal(instance.STATE.HAPPY);
    sleepSync(500);
    setTimeout(() => { // need to release execution back to V8 before the new state is set
      expect(instance.state).to.be.equal(instance.STATE.UNHAPPY);
      done();
    }, 0);
  });

});
