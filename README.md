# sync-disk-cache [![Build status](https://ci.appveyor.com/api/projects/status/lfliompah66m611x?svg=true)](https://ci.appveyor.com/project/embercli/sync-disk-cache)


A sync disk cache. inspired by [jgable/cache-swap](https://github.com/jgable/cache-swap)

## Example

```js
var Cache = require('sync-disk-cache');
var cache = new Cache('my-cache');
// 'my-cache' also serves as the global key for the cache.
// if you have multiple programs with this same `cache-key` they will share the
// same backing store. This by design.

// checking
cache.has('foo') === wasFooFound;

// retrieving (cache hit)
cache.get('foo') === {
  isCached: true,
  path: 'foo',
  content: 'content of foo'
}

// retrieving (cache miss)
cache.get('foo') === {
  isCached: false,
  path: 'foo',
  content: undefined
}

// retrieving (cache miss)
cache.set('foo', 'content of foo'); // was set

// clearing the cache

cache.clear(); // cache was cleared
```


Enable compression:

```js
var Cache = require('sync-disk-cache');
var cache = new Cache('my-cache', {
  compression: 'gzip' | 'deflate' | 'deflateRaw' // basically just what nodes zlib's ships with
})
```

## License

Licensed under the MIT License, Copyright 2015 Stefan Penner
