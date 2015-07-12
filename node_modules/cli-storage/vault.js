'use strict';

/**
 * @last-commit: 6f020bf41ec0fa6c1efbd829b3c7a344d57c792f
 *
 * This code copy of the https://github.com/jcoglan/vault-cipher library but has
 * been transformed from a async to a sync interface. The original MIT license
 * from the project:
 *
 * (The MIT License)
 *
 * Copyright (c) 2011-2013 James Coglan
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

var crypto = require('crypto');

function pbkdf2(password, salt, keylen, iterations) {
  var key = crypto.pbkdf2Sync(password, salt, iterations, keylen);

  if (typeof key === 'string') return new Buffer(key, 'binary');

  return key;
}

function Cipher(key, options) {
  options = options || {};

  if ('object' === typeof key) this._keyPair = key;
  else this._key = key;

  this._format  = (options.format === undefined) ? Cipher.DEFAULT_FORMAT : options.format;
  this._input   = (options.input  === undefined) ? Cipher.DEFAULT_INPUT  : options.input;
  this._salt    = (options.salt   === undefined) ? Cipher.UUID           : options.salt;
  this._work    = (options.work   === undefined) ? Cipher.DEFAULT_WORK   : options.work;

  this._mode    = Cipher.DEFAULT_MODE;
  this._mac     = Cipher.DEFAULT_MAC;
  this._keySize = Cipher.KEY_SIZE;
  this._ivSize  = Cipher.BLOCK_SIZE;
  this._macSize = Cipher.MAC_SIZE;
}

Cipher.DEFAULT_WORK   = 1000;
Cipher.DEFAULT_MODE   = 'aes-256-cbc';
Cipher.DEFAULT_MAC    = 'sha256';
Cipher.DEFAULT_FORMAT = 'base64';
Cipher.DEFAULT_INPUT  = 'utf8';
Cipher.UUID           = '73e69e8a-cb05-4b50-9f42-59d76a511299';
Cipher.KEY_SIZE       = 32;
Cipher.BLOCK_SIZE     = 16;
Cipher.MAC_SIZE       = 32;

Cipher.randomKeys = function randomKeys() {
  var buffer     = crypto.randomBytes(2 * Cipher.KEY_SIZE),
      encryptKey = buffer.slice(0, Cipher.KEY_SIZE),
      signKey    = buffer.slice(Cipher.KEY_SIZE, buffer.length);

  return { encrypt: encryptKey, sign: signKey };
};

Cipher.prototype.deriveKeys = function deriveKeys() {
  if (this._keyPair) return this._keyPair;

  var key = pbkdf2(this._key, this._salt, 2 * this._keySize, this._work)
    , encryptKey = key.slice(0, this._keySize)
    , signKey    = key.slice(this._keySize, key.length);

  return (this._keyPair = { encrypt: encryptKey, sign: signKey });
};

Cipher.prototype.encrypt = function encrypt(plaintext) {
  var keys = this.deriveKeys()
    , encryptKey = keys.encrypt
    , signKey    = keys.sign;

  var iv         = crypto.randomBytes(this._ivSize),
      cipher     = crypto.createCipheriv(this._mode, encryptKey.toString('binary'), iv.toString('binary')),
      ciphertext = cipher.update(plaintext, this._input, 'binary') + cipher.final('binary');

  ciphertext = new Buffer(ciphertext, 'binary');

  var result = new Buffer(iv.length + ciphertext.length);
  iv.copy(result);
  ciphertext.copy(result, iv.length);

  var hmac = crypto.createHmac(this._mac, signKey.toString('binary'));
  hmac.update(result);
  hmac = new Buffer(hmac.digest('binary'), 'binary');

  var out = new Buffer(result.length + hmac.length);

  result.copy(out);
  hmac.copy(out, result.length);

  if (this._format) out = out.toString(this._format);
  return out;
};

Cipher.prototype.decrypt = function decrypt(ciphertext) {
  var keys = this.deriveKeys()
    , encryptKey = keys.encrypt
    , signKey    = keys.sign;

  var buffer    = new Buffer(ciphertext, this._format),
      message   = buffer.slice(0, Math.max(buffer.length - this._macSize, 0)),
      iv        = message.slice(0, Math.min(this._ivSize, message.length)),
      payload   = message.slice(Math.min(this._ivSize, message.length)),
      mac       = buffer.slice(Math.max(buffer.length - this._macSize, 0)),
      cipher    = crypto.createDecipheriv(this._mode, encryptKey.toString('binary'), iv.toString('binary')),
      plaintext = cipher.update(payload, 'binary', this._input) + cipher.final(this._input);

  var hmac = crypto.createHmac(this._mac, signKey.toString('binary'));
  hmac.update(message);
  hmac = new Buffer(hmac.digest('binary'), 'binary');

  var expected = crypto.createHmac(this._mac, this._salt).update(hmac).digest('hex'),
      actual   = crypto.createHmac(this._mac, this._salt).update(mac).digest('hex');

  if (expected !== actual) throw new Error('DecryptError');
  else if (plaintext === null) throw new Error('DecryptError');

  return plaintext;
};

var c = new Cipher(Cipher.randomKeys(), { format: 'binary', input: 'binary' });

Cipher.ENCRYPTED_KEYPAIR_SIZE = c.encrypt(new Buffer(2 * Cipher.KEY_SIZE)).length;

module.exports = Cipher;
