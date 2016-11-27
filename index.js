'use strict';

var path = require('path');
var fs = require('fs');
var readFile = fs.readFileSync;
var writeFile = fs.writeFileSync;
var mkdirp = require('mkdirp').sync;
var rimraf = require('rimraf').sync;
var unlink = fs.unlinkSync;
var chmod = fs.chmodSync;
var tmpDir = require('os').tmpdir();
var debug = require('debug')('sync-disk-cache');
var zlib = require('zlib');

var mode = {
  mode: parseInt('0777', 8)
};

var CacheEntry = require('./lib/cache-entry');
/*
 * @private
 * @method processFile
 * @param String filePath the path of the cached file
 * @returns CacheEntry an object representing that cache entry
 */
function processFile(filePath, fileStream) {
  return new CacheEntry(true, filePath, fileStream.toString());
}

/*
 * @private
 *
 * When we encounter a rejection with reason of ENOENT, we actually know this
 * should be a cache miss, so the rejection is handled as the CacheEntry.MISS
 * singleton is the result.
 *
 * But if we encounter anything else, we must assume a legitimate failure an
 * re-throw
 *
 * @method handleENOENT
 * @param Error reason
 * @returns CacheEntry returns the CacheEntry miss singleton
 */
function handleENOENT(reason) {
  if (reason && reason.code === 'ENOENT') {
    return CacheEntry.MISS;
  }
  throw reason;
}

var COMPRESSIONS = {
  deflate: {
    in: zlib.deflateSync,
    out: zlib.inflateSync,
  },

  deflateRaw: {
    in: zlib.deflateRawSync,
    out: zlib.inflateRawSync,
  },

  gzip: {
    in: zlib.gzipSync,
    out: zlib.gunzipSync,
  },
};

function hasCompression(compression) {
  if (/^v0\.10\.\d+/.test(process.version) && compression) {
    throw new Error('node: [version:' +
                    process.version +
                    '] does not support synchronous zlib compression APIs');
  }
}
/*
 *
 * @class Cache
 * @param {String} key the global key that represents this cache in its final location
 * @param {String} options optional string path to the location for the
 *                          cache. If omitted the system tmpdir is used
 */
function Cache(key, _) {
  var options = _ || {};
  this.tmpDir = options.location|| tmpDir;

  if (options.compression) {
    hasCompression(options.compression)
  }
  this.compression = options.compression;


  this.key = key || 'default-disk-cache';
  this.root = path.join(this.tmpDir, 'if-you-need-to-delete-this-open-an-issue-sync-disk-cache', this.key);

  debug('new Cache { root: %s, compression: %s }', this.root, this.compression);
}

/*
 * @public
 *
 * @method clear
 * @returns {Promise} - fulfills when the cache has been cleared
 *                    - rejects when a failured occured during cache clear
 */
Cache.prototype.clear = function() {
  debug('clear: %s', this.root);

  return rimraf(
    path.join(this.root)
  );
};

/*
 * @public
 *
 * @method has
 * @param {String} key the key to check existence of
 * @return {Promise} - fulfills with either true | false depending if the key was found or not
 *                   - rejects when a failured occured when checking existence of the key
 */
Cache.prototype.has = function(key) {
  var filePath = this.pathFor(key);
  debug('has: %s', filePath);

  return fs.existsSync(filePath);
};

/*
 * @public
 *
 * @method set
 * @param {String} key they key to retrieve
 * @return {Promise} - fulfills with either the cache entry, or a cache miss entry
 *                   - rejects when a failure occured looking retrieving the key
 */
Cache.prototype.get = function(key) {
  var filePath = this.pathFor(key);
  debug('get: %s', filePath);

  try {
    return processFile(filePath, this.decompress(readFile(filePath)));
  } catch(e) {
    return handleENOENT(e);
  }
};

/*
 * @public
 *
 * @method set
 * @param {String} key the key we wish to store
 * @param {String} value the value we wish the key to be stored with
 * @returns {Promise#fulfilled} if the value was coõstored as the key
 * @returns {Promise#rejected} when a failure occured persisting the key
 */
Cache.prototype.set = function(key, value) {
  var filePath = this.pathFor(key);
  debug('set : %s', filePath);

  mkdirp(path.dirname(filePath), mode);
  writeFile(filePath, this.compress(value), mode);
  chmod(filePath, mode.mode);

  return filePath;
};

/*
 * @public
 *
 * @method remove
 * @param {String} key the key to remove from the cache
 * @returns {Promise#fulfilled} if the removal was successful
 * @returns {Promise#rejection} if something went wrong while removing the key
 */
Cache.prototype.remove = function(key) {
  var filePath = this.pathFor(key);
  debug('remove : %s', filePath);

  try {
    return unlink(filePath);
  } catch(e) {
    handleENOENT(e);
  }
};

/*
 * @public
 *
 * @method pathFor
 * @param {String} key the key to generate the final path for
 * @returns the path where the key's value may reside
 */
Cache.prototype.pathFor = function(key) {
  return path.join(this.root, key);
};

/*
 * @public
 *
 * @method decompress
 * @param {String} compressedValue
 * @returns decompressedValue
 */
Cache.prototype.decompress = function(value) {
  if (!this.compression) { return value; }
  return COMPRESSIONS[this.compression].out(value);
};

/*
 * @public
 *
 * @method compress
 * @param {String} value
 * @returns compressedValue
 */
Cache.prototype.compress = function(value) {
  if (!this.compression) { return value; }
  return COMPRESSIONS[this.compression].in(value);
};

module.exports = Cache;
