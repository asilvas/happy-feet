'use strict';

const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const Happy = require('../lib/core/Happy');
const lib = require('../lib/express');
const rootLib = require('../express');

describe('#express', () => {

  let instance, opts, happyOpts, res;

  beforeEach(() => {
    opts = {
    };

    happyOpts = {
    };

    res = {
      status: sinon.stub(),
      set: sinon.stub(),
      send: sinon.stub()
    };
  });

  afterEach(() => {
    instance.happy.destroy();
  })

  it('Create instance', () => {
    instance = lib(opts, happyOpts);
    expect(typeof instance).to.be.equal('function');
    expect(instance.happy instanceof Happy).to.be.true;
  });

  it('Create instance with happyOpts', () => {
    happyOpts.escalationSoftLimitMin = 999;
    instance = lib(opts, happyOpts);
    expect(instance.happy.options.escalationSoftLimitMin).to.be.equal(999);
  });
  
  it('HAPPY state', () => {
    instance = lib(opts, happyOpts);
    expect(instance.happy.state).to.be.equal(instance.happy.STATE.HAPPY);
    instance({}, res);
    expect(res.status).to.be.calledWith(200);
    expect(res.set).to.be.calledWith({
      'Content-Type': 'text/plain',
      'x-happy': instance.happy.STATE.HAPPY
    });
    expect(res.send).to.have.been.calledOnce;
  });

  it('UNHAPPY state', () => {
    instance = lib(opts, happyOpts);
    expect(instance.happy.state).to.be.equal(instance.happy.STATE.HAPPY);
    instance.happy.state = instance.happy.STATE.UNHAPPY;
    instance({}, res);
    expect(res.status).to.be.calledWith(500);
    expect(res.set).to.be.calledWith({
      'Content-Type': 'text/plain',
      'x-happy': instance.happy.STATE.UNHAPPY
    });
    expect(res.send).to.have.been.calledOnce;
  });

  it('Root instance matches lib', () => {
    expect(lib).to.be.equal(rootLib);
  });

});
