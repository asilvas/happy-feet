'use strict';

const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const Happy = require('../lib/core/Happy');
const lib = require('../lib/connect');
const rootLib = require('../connect');

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
      writeHead: sinon.stub(),
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
    expect(res.writeHead).to.be.calledWith(200, {
      'Content-Type': 'text/plain',
      'x-happy': instance.happy.STATE.HAPPY
    });
    expect(res.end).to.have.been.calledOnce;
  });

  it('UNHAPPY state', () => {
    instance = lib(opts, happyOpts);
    expect(instance.happy.state).to.be.equal(instance.happy.STATE.HAPPY);
    instance.happy.state = instance.happy.STATE.UNHAPPY;
    instance(req, res, next);
    expect(res.writeHead).to.calledWith(500, {
      'Content-Type': 'text/plain',
      'x-happy': instance.happy.STATE.UNHAPPY
    });
    expect(res.end).to.have.been.calledOnce;
  });

  it('404 method', () => {    
    instance = lib(opts, happyOpts);
    req.method = 'PUT';
    instance(req, res, next);
    expect(res.end).to.have.not.been.called;
    expect(next).to.have.been.calledOnce;
  });

  it('404 url', () => {    
    instance = lib(opts, happyOpts);
    req.url = '/some/invalid/path';
    instance(req, res, next);
    expect(res.end).to.have.not.been.called;
    expect(next).to.have.been.calledOnce;
  });

  it('Root instance matches lib', () => {
    expect(lib).to.be.equal(rootLib);
  });

});
