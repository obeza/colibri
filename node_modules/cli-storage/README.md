# cli-storage

[![Version npm][version]](http://browsenpm.org/package/cli-storage)[![Build Status][build]](https://travis-ci.org/observing/cli-storage)[![Dependencies][david]](https://david-dm.org/observing/cli-storage)[![Coverage Status][cover]](https://coveralls.io/r/observing/cli-storage?branch=master)

[version]: http://img.shields.io/npm/v/cli-storage.svg?style=flat-square
[build]: http://img.shields.io/travis/observing/cli-storage/master.svg?style=flat-square
[david]: https://img.shields.io/david/observing/cli-storage.svg?style=flat-square
[cover]: http://img.shields.io/coveralls/observing/cli-storage/master.svg?style=flat-square

`cli-storage` is command-line configuration storage system which allows you to
safely store data on disk. If these files get stolen or shared they will be
completely useless unless they got your password to decipher it.

## Installation

This is Node.js only module and is distributed through the public npm registry.
It can be installed by simply running the following command in your CLI:

```
npm install --save cli-storage
```

## Usage

In all examples we assume you've already required the library and constructed a
valid instance as following:

```js
'use strict';

var Storage = require('cli-storage')
  , storage = new Storage('bar', {});
```

The `Storage` constructor accepts 2 arguments:

1. `name`, The name of the dot file (`.<name>`) that we should load and store
   our configuration in.
2. `options`, Optional object which further configures the `Storage` instance.
   The following properties can be configured:
   - `password`, The password for the file, if none is provided we will use your
     `~/.ssh/id_rsa` key or fallback to your hostname.
   - `home`, The location of your home folder, this is also the location where we
     we will store the configuration file in. If nothing is provided we will
     default to the env variables `HOME` or `USERPROFILE` to supply us with a
     directory;
   - `filename`, Filename of the configuration file, this can be useful if you
     don't want to store a dot file but just a regular filename instead. We
     default to `.` with the supplied `name` argument.
   - `defaults`, An object with default values for the store. If nothing is
     provided we will default to `{}`.
   - `prefix`, The prefix that we add for each key before we store them. We
     default to `$`. This is also really useful if you want to store different
     data in same file for example when building a configuration file that
     allows multiple profiles to be used.

```js
storage = new Storage('example', {
  password: 'hello world im a password'
});
```

The created `storage` variable now contains a bunch of methods that you can use
to get/set and manipulate the config:

### Storage.allow

Only allow these keys to be stored to disk. This allows you to merge in
additional defaults or overrides without getting them stored.

```js
storage.allow('foo')
       .allow('bar');
```

Now only the keys `foo` and `bar` will be stored. The method also accepts
multiple arguments or an array for setting the keys that you allow. We will also
process them automatically so they are prefixed.

```js
storage.allow(['foo', 'bar']);
storage.allow('foo', 'bar');
```

### Storage.set

Add a new value to the configuration. We require 2 arguments a key and a value
pair. When adding new values please make sure that it can be transformed to a
JSON object. So no circular references etc.

```js
storage.set('foo', bar)
       .set('bar', 13131);
```

As seen in the example above, it returns it self so you can use it as chaining
API. Every time you set a new value we will also automatically save the whole
data set to disk.

### Storage.get

Retrieve a stored value. The method accepts one argument which is the key under
which you've stored the value. If nothing can be retrieved, it will return
`undefined`.

```js
storage.set('foo', 'bar');
console.log(storage.get('foo'), storage.get('afdafasf')); // 'bar', undefined
```

### Storage.del

Remove a key and value pair from the dataset.

```js
storage.del('foo').del('bar');
```

As seen in the example above, it returns it self so you can use it as chaining
API. Every time you set a new value we will also automatically save the whole
data set to disk.

### Storage.save

Save the internal dataset to disk. You don't really need to call this method
manually as it's called every single time you set a new value. The only reason
why you might want to call this is to save your supplied `defaults` to disk.

```js
storage.save();
```

If the operation fails, it will throw as we're using sync API's. This method
also returns it self so it can be used to chain with other API calls.

### Storage.load

Load the data from disk. You don't need to call this manually as it's called
when you construct a new `Storage` instance. But you might want to re-load the
configuration when an external process made changes to the config.

```js
storage.load();
```

If the operation fails, it will throw as we're using sync API's. This method
also returns it self so it can be used to chain with other API calls.

### Storage.remove

Remove the saved configuration file. And it will reset it's internal data
structure to it's supplied defaults.

```js
storage.remove();
```

### Storage.destroy

Destroy the instance, removes the internals to release references. You should
never call any more methods after destroying it.

```js
storage.destroy();
```

It returns a boolean indicating if it's already been destroyed before.

### Storage.read

**Please note: This is a private method.**

Read a JSON document for the given path. If we cannot read the document we
assume that file has been encrypted and that we need to decrypt it before
parsing. If we still fail to parse we will return an empty object.

```js
storage.read('/non/existing/path'); //  {}
storage.read(storage.file()); // { .. your config - decrypted .. }
```

### Storage.file

**Please note: This is a private method.**

Return the location of our configuration file. It starts to resolve at the
current working directory and resolves it back to the home directory so it will
allow project based configurations.

```js
var file = storage.file();
```

### Storage.key

**Please note: This is a private method.**

Prefix the key so save to be used in `Objects` for storage and not vulnerable to
potential dictionary attacks. It prefixes the key with the specified prefix
option.

```js
var prefix = storage.key('afdfa');
```

### Storage.ssh

**Please note: This is a private method.**

It gets your private ssh key so we can use that for as password fallback. It
will search the provided `home` directory for an `.ssh` folder which should have
an `id_rsa` file which contains the private key.

```js
var ssh = storage.ssh(); // key or empty string.
```

## License

MIT
