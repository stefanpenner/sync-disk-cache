'use strict';

var path = require('path');
var Cache = require('./');
var fs = require('fs');
var should = require('should');
var crypto = require('crypto');
var heimdall = require('heimdalljs');

describe('cache', function() {
  var cache;
  var key = 'path/to/file.js';
  var value = 'Some test value';
  var longKey = 'GET|https://api.example.com/lorem/ipsum/dolor/sit/amet/consectetur/adipiscing/elit?donec=in&consequat=nibh&mauris=condimentum&turpis=at&lacus=finibus&ut=rutrum&lorem=dictum&morbi=dictum&ac=lectus&et=porttitor&donec=vel&dolor=ex&cras=aliquam&risus=in&tellus=mollis&elementum=pellentesque&lobortis=a&ex=nec&egestas=nunc&nec=feugiat&ante=integer&sit=amet&nibh=id&nisi=vulputate&condimentum=aliquam&lacinia=dignissim';
  var keyHash = crypto.createHash('sha1').update(key).digest('hex');
  var longKeyHash = crypto.createHash('sha1').update(longKey).digest('hex');

  beforeEach(function() {
    cache = new Cache();
  });

  afterEach(function() {
    return cache.clear();
  });

  it('has expected default root', function() {
    var os = require('os');
    var tmpdir = os.tmpdir();

    var descriptiveName = 'if-you-need-to-delete-this-open-an-issue-sync-disk-cache';
    var defaultKey = 'default-disk-cache';
    var username = require('child_process').execSync('whoami').toString().trim();

    should(cache.root).equal(path.join(tmpdir, username, descriptiveName, defaultKey));
  });

  it('pathFor', function() {
    var expect = path.join(cache.root, keyHash);

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

  it('has (does exist) (long key)', function() {
    cache.set(longKey, value);
    should(cache.has(longKey)).be.true;
  });

  it('properly stops metrics when an error occurs', function() {
    should(function() { cache.pathFor(); }).throw();
    should(heimdall.statsFor('sync-disk-cache').pathFor.startTime).be.undefined;
  });
});

var zlib = require('zlib');

if (/^v0\.10\.\d+$/.test(process.version)) {
  describe('disabled compression in node v0.10.x', function(){
    it('deflate should throw', function() {
      should(function(){
        new Cache('foo', {
          compression: 'deflate'
        })
      }).throwError(/does not support synchronous zlib compression APIs/);
    });

    it('deflateRaw', function(){
      should(function(){
        new Cache('foo', {
          compression: 'deflateRaw'
        })
      }).throwError(/does not support synchronous zlib compression APIs/);
    });

    it('gzip', function(){
      should(function(){
        new Cache('foo', {
          compression: 'gunzip'
        })
      }).throwError(/does not support synchronous zlib compression APIs/);
    });
  });
} else {
  describe('cache compress: [ deflate ]', function() {
    var cache;
    var key = 'path/to/file.js';
    var value = 'Some test value';

    beforeEach(function() {
      cache = new Cache('my-testing-cache', {
        compression: 'deflate'
      });
    });

    afterEach(function() {
      cache.clear();
    });

    it('set', function() {
      var filePath = cache.set(key, value);
      var stats = fs.statSync(filePath);
      var mode = '0' + (stats.mode & parseInt('777', 8)).toString(8);

      should(mode).equal(process.platform === 'win32' ? '0666' : '0777');

      should(zlib.inflateSync(fs.readFileSync(filePath)).toString()).equal(value);
      should(cache.get(key).value).equal(value);
    });
  });

  describe('cache compress: [ gzip ]', function() {
    var cache;
    var key = 'path/to/file.js';
    var value = 'Some test value';

    beforeEach(function() {
      cache = new Cache('my-testing-cache', {
        compression: 'gzip'
      });
    });

    afterEach(function() {
      return cache.clear();
    });

    it('set', function() {
      var filePath = cache.set(key, value);
      var stats = fs.statSync(filePath);
      var mode = '0' + (stats.mode & parseInt('777', 8)).toString(8);

      should(mode).equal(process.platform === 'win32' ? '0666' : '0777');

      should(zlib.gunzipSync(fs.readFileSync(filePath)).toString()).equal(value);
      should(cache.get(key).value).equal(value);
    });
  });

  describe('cache compress: [ deflateRaw ]', function() {
    var cache;
    var key = 'path/to/file.js';
    var value = 'Some test value';

    beforeEach(function() {
      cache = new Cache('my-testing-cache', {
        compression: 'deflateRaw'
      });
    });

    afterEach(function() {
      return cache.clear();
    });

    it('set', function() {
      var filePath = cache.set(key, value);
      var stats = fs.statSync(filePath);
      var mode = '0' + (stats.mode & parseInt('777', 8)).toString(8);

      should(mode).equal(process.platform === 'win32' ? '0666' : '0777');

      should(zlib.inflateRawSync(fs.readFileSync(filePath)).toString()).equal(value);
      should(cache.get(key).value).equal(value);
    });
  });
}
