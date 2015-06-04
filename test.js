'use strict';

var path = require('path');
var Cache = require('./');
var fs = require('fs');
var should = require('should');

describe('cache', function() {
  var cache;
  var key = 'path/to/file.js';
  var value = 'Some test value';

  beforeEach(function() {
    cache = new Cache();
  });

  afterEach(function() {
    return cache.clear();
  });

  it('pathFor', function() {
    var expect = path.join(cache.root, key);

    cache.pathFor(key).should.equal(expect);
  });

  it('set', function() {
    var filePath = cache.set(key, value);
    var stats = fs.statSync(filePath);
    var mode = '0' + (stats.mode & parseInt('777', 8)).toString(8);

    should(mode).equal(process.platform === 'win32' ? '0666' : '0777');

    should(fs.readFileSync(filePath).toString()).equal(value);
  });

  it('get (doesn\'t exist)', function() {
    should(cache.get(key).isCached).be.false;
  });

  it('get (does exist)', function() {
    var filePath = cache.set(key, value);
    var details = cache.get(key);
    should(details.isCached).be.true;
    should(details.value).equal(value);
    should(details.key).equal(filePath);
  });

  it('has (doesn\'t exist)', function() {
    should(cache.has(key)).be.false;
  });

  it('has (does exist)', function() {
    cache.set(key, value)
    should(cache.has(key)).be.true;
  });

  it('remove', function() {
    cache.set(key, value);
    should(cache.has(key)).be.true;

    cache.remove(key);
    should(cache.has(key)).be.false;
  });
});
