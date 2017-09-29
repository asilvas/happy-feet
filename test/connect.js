'use strict';

const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const Happy = require('../lib/core/Happy');
const lib = require('../lib/connect');

describe('#connect', () => {

  let instance, opts, happyOpts, req, res, next;

  beforeEach(() => {
    opts = {
    };

    happyOpts = {
    };

    req = {
      method: 'GET',
      url: '/_health'
    };

    res = {
      end: sinon.stub()
    };

    next = sinon.stub();
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
    instance(req, res, next);
    expect(res.statusCode).to.be.equal(200);
    expect(res.statusMessage).to.be.equal(instance.happy.STATE.HAPPY);
    expect(res.end).to.have.been.calledOnce;
  });

  it('UNHAPPY state', () => {
    instance = lib(opts, happyOpts);
    expect(instance.happy.state).to.be.equal(instance.happy.STATE.HAPPY);
    instance.happy.state = instance.happy.STATE.UNHAPPY;
    instance(req, res, next);
    expect(res.statusCode).to.be.equal(500);
    expect(res.statusMessage).to.be.equal(instance.happy.STATE.UNHAPPY);
    expect(res.end).to.have.been.calledOnce;
  });

  it('404 method', () => {    
    instance = lib(opts, happyOpts);
    req.method = 'PUT';
    instance(req, res, next);
    expect(res.statusCode).to.be.equal(undefined);
    expect(res.statusMessage).to.be.equal(undefined);
    expect(res.end).to.have.not.been.called;
    expect(next).to.have.been.calledOnce;
  });

  it('404 url', () => {    
    instance = lib(opts, happyOpts);
    req.url = '/some/invalid/path';
    instance(req, res, next);
    expect(res.statusCode).to.be.equal(undefined);
    expect(res.statusMessage).to.be.equal(undefined);
    expect(res.end).to.have.not.been.called;
    expect(next).to.have.been.calledOnce;
  });

});
