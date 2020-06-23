'use strict';

const path = require('path');
const Cache = require('./');
const fs = require('fs');
const should = require('should');
const crypto = require('crypto');
const heimdall = require('heimdalljs');

describe('cache', function() {
  let cache;
  const key = 'path/to/file.js';
  const value = 'Some test value';
  const longKey = 'GET|https://api.example.com/lorem/ipsum/dolor/sit/amet/consectetur/adipiscing/elit?donec=in&consequat=nibh&mauris=condimentum&turpis=at&lacus=finibus&ut=rutrum&lorem=dictum&morbi=dictum&ac=lectus&et=porttitor&donec=vel&dolor=ex&cras=aliquam&risus=in&tellus=mollis&elementum=pellentesque&lobortis=a&ex=nec&egestas=nunc&nec=feugiat&ante=integer&sit=amet&nibh=id&nisi=vulputate&condimentum=aliquam&lacinia=dignissim';
  const keyHash = crypto.createHash('sha1').update(key).digest('hex');
  const longKeyHash = crypto.createHash('sha1').update(longKey).digest('hex');

  beforeEach(function() {
    cache = new Cache();
  });

  afterEach(function() {
    return cache.clear();
  });

  it('has expected default root', function() {
    let os = require('os');
    let tmpdir = os.tmpdir();

    let descriptiveName = 'if-you-need-to-delete-this-open-an-issue-sync-disk-cache';
    let defaultKey = 'default-disk-cache';
    let username = require('username-sync')();

    should(cache.root).equal(path.join(tmpdir, username, descriptiveName, defaultKey));
  });

  it('pathFor', function() {
    let expect = path.join(cache.root, keyHash);

    cache.pathFor(key).should.equal(expect);
  });

  it('set', function() {
    let filePath = cache.set(key, value);
    let stats = fs.statSync(filePath);
    let mode = '0' + (stats.mode & parseInt('777', 8)).toString(8);

    should(mode).equal(process.platform === 'win32' ? '0666' : '0600');

    should(fs.readFileSync(filePath).toString()).equal(value);
  });

  it('get (doesn\'t exist)', function() {
    should(cache.get(key).isCached).be.false;
  });

  it('get (does exist)', function() {
    let filePath = cache.set(key, value);
    let details = cache.get(key);

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

  it('has (does exist) (long key)', function() {
    cache.set(longKey, value);
    should(cache.has(longKey)).be.true;
  });

  it('properly stops metrics when an error occurs', function() {
    should(function() { cache.pathFor(); }).throw();
    should(heimdall.statsFor('sync-disk-cache').pathFor.startTime).be.undefined;
  });
});

const zlib = require('zlib');

describe('cache compress: [ deflate ]', function() {
  let cache;
  const key = 'path/to/file.js';
  const value = 'Some test value';

  beforeEach(function() {
    cache = new Cache('my-testing-cache', {
      compression: 'deflate'
    });
  });

  afterEach(function() {
    cache.clear();
  });

  it('set', function() {
    let filePath = cache.set(key, value);
    let stats = fs.statSync(filePath);
    let mode = '0' + (stats.mode & parseInt('777', 8)).toString(8);

    should(mode).equal(process.platform === 'win32' ? '0666' : '0600');

    should(zlib.inflateSync(fs.readFileSync(filePath)).toString()).equal(value);
    should(cache.get(key).value).equal(value);
  });
});

describe('cache compress: [ gzip ]', function() {
  let cache;
  const key = 'path/to/file.js';
  const value = 'Some test value';

  beforeEach(function() {
    cache = new Cache('my-testing-cache', {
      compression: 'gzip'
    });
  });

  afterEach(function() {
    return cache.clear();
  });

  it('set', function() {
    let filePath = cache.set(key, value);
    let stats = fs.statSync(filePath);
    let mode = '0' + (stats.mode & parseInt('777', 8)).toString(8);

    should(mode).equal(process.platform === 'win32' ? '0666' : '0600');

    should(zlib.gunzipSync(fs.readFileSync(filePath)).toString()).equal(value);
    should(cache.get(key).value).equal(value);
  });
});

describe('cache compress: [ deflateRaw ]', function() {
  let cache;
  const key = 'path/to/file.js';
  const value = 'Some test value';

  beforeEach(function() {
    cache = new Cache('my-testing-cache', {
      compression: 'deflateRaw'
    });
  });

  afterEach(function() {
    return cache.clear();
  });

  it('set', function() {
    let filePath = cache.set(key, value);
    let stats = fs.statSync(filePath);
    let mode = '0' + (stats.mode & parseInt('777', 8)).toString(8);

    should(mode).equal(process.platform === 'win32' ? '0666' : '0600');

    should(zlib.inflateRawSync(fs.readFileSync(filePath)).toString()).equal(value);
    should(cache.get(key).value).equal(value);
  });
});
