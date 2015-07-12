'use strict';

var Cipher = require('./vault')
  , fuse = require('fusing')
  , path = require('path')
  , fs = require('fs')
  , os = require('os');

/**
 * Simple local storage for the configuration.
 *
 * Options:
 *
 * - password: The password that we used to encrypt the passwords.
 * - prefix: Key prefix to prevent potential dictionary attacks.
 * - home: The location of the user's home directory.
 * - filename: Configuration file name.
 * - algorithm: Cipher algorithm to secure the config.
 *
 * @constructor
 * @param {String} name The name of the local cache.
 * @param {Object} options Additional configuration.
 * @api public
 */
function Storage(name, options) {
  if (!(this instanceof Storage)) return new Storage(name, options);

  this.home = options.home || process.env.HOME || process.env.USERPROFILE;
  this.passphrase = options.password || this.ssh() || os.hostname();
  this.filename = options.filename || '.'+ name;
  this.cipher = new Cipher(this.passphrase);
  this.defaults = options.defaults || {};
  this.prefix = options.prefix || '$';

  this.allowed = [];

  //
  // Inherit our default parsers.
  //
  this.parsers = Object.create(null);
  for (var key in Storage.parsers) {
    this.parsers[key] = Storage.parsers[key];
  }

  this.load();
}

fuse(Storage);

/**
 * Prefix the key to prevent properties from overriding build-in methods and
 * properties.
 *
 * @param {String} name Key that needs to be prefixed.
 * @returns {String} Prefixed key.
 * @api private
 */
Storage.readable('key', function key(name) {
  return this.prefix + name;
});

/**
 * White list the properties that.
 *
 * @returns {Storage}
 * @api public
 */
Storage.readable('allow', function whitelist(arg) {
  var args;

  if (Array.isArray(arg)) args = arg;
  else args = Array.prototype.slice.call(arguments, 0);

  Array.prototype.push.apply(this.allowed, args.map(function allow(key) {
    return this.key(key);
  }, this));

  return this;
});

/**
 * Get the private ssh key which we can use the hash passwords in a way that
 * nobody read the passwords from the configuration file.
 *
 * @returns {String} Private ssh key.
 * @api private
 */
Storage.readable('ssh', function ssh() {
  var key = path.join(this.home, '.ssh', 'id_rsa');

  if (!fs.existsSync(key)) return '';
  return fs.readFileSync(key, 'utf-8');
});

/**
 * Get the location of the configuration file/directory on which we need to
 * write.
 *
 * @returns {String} Location of the file.
 * @api private
 */
Storage.readable('file', function file() {
  var dir = process.cwd()
    , location;

  while (dir) {
    location = path.join(dir, this.filename);
    if (fs.existsSync(location)) return location;

    dir = path.resolve(dir, '..');
    if (dir === path.sep) break;
  }

  return path.join(this.home, this.filename);
});

/**
 * Add a new item to the storage file.
 *
 * @param {String} key The key we store the value on.
 * @param {Mixed} data The value that is stored.
 * @returns {Storage}
 * @api public
 */
Storage.readable('set', function set(key, data) {
  if (key in this.parsers && data) {
    data = this.parsers[key].call(this, 'set', data);
  }

  this.data[this.key(key)] = data;
  return this.save();
});

/**
 * Get a value out of our configuration set.
 *
 * @param {String} key The key we search for.
 * @returns {Mixed} Stored data.
 * @api public
 */
Storage.readable('get', function get(key) {
  var data = this.data[this.key(key)];

  if (key in this.parsers && data) {
    data = this.parsers[key].call(this, 'get', data);
  }

  return data;
});

/**
 * Remove an item from the storage.
 *
 * @param {String} key The key we want to destroy.
 * @returns {Storage}
 * @api public
 */
Storage.readable('del', function del(key) {
  delete this.data[this.key(key)];

  return this.save();
});

/**
 * Save the data to disk, if we have any.
 *
 * @returns {Storage}
 * @api private
 */
Storage.readable('save', function save() {
  var allowed = this.allowed
    , data = this.data;

  if (!allowed.length) allowed = Object.keys(data);

  //
  // Make sure that we only store the keys that we're allowed to store as we're
  // merging in the CLI argv.
  //
  data = JSON.stringify(allowed.reduce(function reduce(memo, key) {
    if (key in data) {
      memo[key] = data[key];
    }

    return memo;
  }, {}), 2);

  fs.writeFileSync(this.file(), this.cipher.encrypt(data), 'utf-8');

  return this;
});

/**
 * Load the configuration file that was stored on our disk.
 *
 * @returns {Storage}
 * @api public
 */
Storage.readable('load', function load() {
  var defaults = this.defaults
    , store = this
    , data = {};

  try { data = this.read(this.file()); }
  catch (e) {}

  this.data = this.merge(Object.keys(defaults).reduce(function pre(memo, key) {
    memo[store.key(key)] = defaults[key];
    return memo;
  }, {}), data || {});

  return this;
});

/**
 * Read and parse a JSON document from disk.
 *
 * @param {String} file The file that need to be loaded.
 * @returns {Object} The parsed JSON.
 * @api public
 */
Storage.readable('read', function read(file) {
  var cipher, data;

  try { data = fs.readFileSync(file, 'utf-8'); }
  catch (e) { return {}; }

  try { return JSON.parse(data); }
  catch (e) {}

  try { return JSON.parse(this.cipher.decrypt(data)); }
  catch (e) {}

  return {};
});

/**
 * Completely remove our cache and nuke the file on disk.
 *
 * @returns {Storage}
 * @api public
 */
Storage.readable('remove', function remove() {
  if (!this.data) return this;

  try { fs.unlinkSync(this.file()); }
  catch (e) {}

  this.load();

  return this;
});

/**
 * Destroy the instance release all of it's references and gathered data.
 *
 * @returns {Boolean}
 * @api public
 */
Storage.readable('destroy', function destroy() {
  if (!this.data) return false;

  'data defaults cipher home passphrase prefix allowed parsers'.split(' ')
  .forEach(function nuke(key) {
    this[key] = null;
  }, this);

  return true;
});

/**
 * Default value parsers.
 *
 * @type {Object}
 * @public
 */
Storage.parsers = {};

//
// Expose the module.
//
module.exports = Storage;
