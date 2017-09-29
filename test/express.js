'use strict';

const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const Happy = require('../lib/core/Happy');
const lib = require('../lib/express');

describe('#express', () => {

  let instance, opts, happyOpts, res;

  beforeEach(() => {
    opts = {
    };

    happyOpts = {
    };

    res = {
      end: sinon.stub()
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
    expect(res.statusCode).to.be.equal(200);
    expect(res.statusMessage).to.be.equal(instance.happy.STATE.HAPPY);
    expect(res.end).to.have.been.calledOnce;
  });

  it('UNHAPPY state', () => {
    instance = lib(opts, happyOpts);
    expect(instance.happy.state).to.be.equal(instance.happy.STATE.HAPPY);
    instance.happy.state = instance.happy.STATE.UNHAPPY;
    instance({}, res);
    expect(res.statusCode).to.be.equal(500);
    expect(res.statusMessage).to.be.equal(instance.happy.STATE.UNHAPPY);
    expect(res.end).to.have.been.calledOnce;
  });

});
