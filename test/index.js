'use strict';

const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire');
const getHappyMock = require('./mocks/Happy');

describe('#Happy Raw', () => {

  let lib, instance, opts, happyMock;

  beforeEach(() => {
    happyMock = getHappyMock();
    lib = proxyquire('../lib', {
      './core/Happy': happyMock
    });

    opts = {
    };
  });

  it('Create instance of happy mock', () => {
    instance = lib(opts);
    expect(instance instanceof happyMock).to.be.true;
    expect(instance.options).to.deep.equal(opts);
  });

});
