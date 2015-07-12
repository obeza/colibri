describe('Storage', function () {
  'use strict';

  var assume = require('assume')
    , Storage = require('./')
    , path = require('path')
    , fs = require('fs')
    , storage;

  beforeEach(function () {
    storage = new Storage('test-storage', {
      home: __dirname // Do not pollute the users home directory for testing.
    });
  });

  afterEach(function () {
    storage.remove().destroy();
  });

  it('can be initialized without new keyword', function () {
    assume(Storage('test-storage', { home: __dirname })).is.instanceOf(Storage);
  });

  describe('#key', function () {
    it('prefixes the key with the specified prefix', function () {
      var key = 'fadfadfasdfadsafsdfadsfa'
        , prefixed = storage.key(key);

      assume(key).does.not.equal(prefixed);
      assume(prefixed.replace(key, '')).equals(storage.prefix);
    });

    it('applies a custom specified prefix', function () {
      storage.remove().destroy();
      storage = new Storage('test-storage', { prefix: 'adfadf' });

      var key = 'fadfadfasdfadsafsdfadsfa'
        , prefixed = storage.key(key);

      assume(key).does.not.equal(prefixed);
      assume(prefixed.replace(key, '')).equals('adfadf');
    });
  });

  describe('#ssh', function () {
    it('returns an empty string as we have no .ssh folder', function () {
      assume(storage.ssh()).equals('');
    });

    it('returns the stored `id_rsa`', function () {
      fs.mkdirSync(path.join(__dirname, '.ssh'), '0777');
      fs.writeFileSync(path.join(__dirname, '.ssh', 'id_rsa'), 'ebolalala');

      assume(storage.ssh()).equals('ebolalala');

      fs.unlinkSync(path.join(__dirname, '.ssh', 'id_rsa'));
      fs.rmdirSync(path.join(__dirname, '.ssh'));
    });
  });

  describe('#set, #get and #del', function () {
    it('sets the data', function () {
      assume(storage.get('foo')).equals(undefined);
      assume(storage.set('foo', 'bar')).equals(storage);
      assume(storage.get('foo')).equals('bar');
    });

    it('reads from previously saved file', function () {
      assume(storage.get('foo')).equals(undefined);
      assume(storage.set('foo', 'bar')).equals(storage);
      assume(storage.get('foo')).equals('bar');

      var another = new Storage('test-storage', { home: __dirname });
      assume(another.get('foo')).equals('bar');
    });

    it('removes the data', function () {
      assume(storage.get('foo')).equals(undefined);
      assume(storage.set('foo', 'bar')).equals(storage);
      assume(storage.get('foo')).equals('bar');
      assume(storage.del('foo')).equals(storage);
      assume(storage.get('foo')).equals(undefined);

      var another = new Storage('test-storage', { home: __dirname });
      assume(another.get('foo')).equals(undefined);
    });
  });

  describe('#read', function () {
    it('returns an empty object if it cannot parse it', function () {
      assume(storage.read(path.join(__dirname, 'test.js'))).deep.equals({});
    });

    it('can read plain ol JSON files', function () {
      assume(storage.read(path.join(__dirname, 'package.json'))).deep.equals(require('./package.json'));
    });

    it('can read our encoded file', function () {
      assume(storage.read(storage.file())).is.a('object');
    });
  });

  describe('#allow', function () {
    it('adds has multiple interfaces', function () {
      assume(storage.allowed.length).equals(0);
      assume(storage.allow('foo')).equals(storage);

      assume(storage.allowed.length).equals(1);
      assume(storage.allowed[0]).equals(storage.prefix +'foo');

      storage.allow(['bar', 'baz']);
      assume(storage.allowed.length).equals(3);
      assume(storage.allowed[1]).equals(storage.prefix +'bar');
      assume(storage.allowed[2]).equals(storage.prefix +'baz');

      storage.allow('another', 'arg');
      assume(storage.allowed.length).equals(5);
      assume(storage.allowed[3]).equals(storage.prefix +'another');
      assume(storage.allowed[4]).equals(storage.prefix +'arg');
    });
  });

  describe('#destroy', function () {
    it('return true on the first execution', function () {
      assume(storage.destroy()).equals(true);
    });

    it('return true on the second execution', function () {
      assume(storage.destroy()).equals(true);
      assume(storage.destroy()).equals(false);
    });
  });
});
