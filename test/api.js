'use strict';

const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const Happy = require('../lib/core/Happy');
const lib = require('../lib/api');
const http = require('http');

describe('#api', () => {

  let instance, opts, happyOpts, req, res, next;

  beforeEach(() => {
    opts = {
      port: 9991
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

  afterEach(done => {
    instance.happy.destroy();
    instance.server.close(done);
  });

  it('Create instance', () => {
    instance = lib(opts, happyOpts);
    expect(typeof instance).to.be.equal('object');
    expect(instance.happy instanceof Happy).to.be.true;
  });

  it('Create instance with happyOpts', () => {
    happyOpts.escalationSoftLimitMin = 999;
    instance = lib(opts, happyOpts);
    expect(instance.happy.options.escalationSoftLimitMin).to.be.equal(999);
  });

  it('HAPPY state', done => {
    instance = lib(opts, happyOpts);
    expect(instance.happy.state).to.be.equal(instance.happy.STATE.HAPPY);
    http.request(`http://localhost:${opts.port}/_health`, res => {
      expect(res.statusCode).to.be.equal(200);
      expect(res.statusMessage).to.be.equal(instance.happy.STATE.HAPPY);
      done();
    }).end();
  });

  it('UNHAPPY state', done => {
    instance = lib(opts, happyOpts);
    expect(instance.happy.state).to.be.equal(instance.happy.STATE.HAPPY);
    instance.happy.state = instance.happy.STATE.UNHAPPY;
    http.request(`http://localhost:${opts.port}/_health`, res => {
      expect(res.statusCode).to.be.equal(500);
      expect(res.statusMessage).to.be.equal(instance.happy.STATE.UNHAPPY);
      done();
    }).end();
  });

  it('404 method', done => {
    instance = lib(opts, happyOpts);
    http.request({ method: 'PUT', hostname: 'localhost', port: opts.port, path: '/_health' }, res => {
      expect(res.statusCode).to.be.equal(404);
      done();
    }).end();
  });

  it('404 url', done => {
    instance = lib(opts, happyOpts);
    http.request({ method: 'GET', hostname: 'localhost', port: opts.port, path: '/wrong/path' }, res => {
      expect(res.statusCode).to.be.equal(404);
      done();
    }).end();
  });

});
