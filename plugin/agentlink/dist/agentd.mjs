import { createRequire as __agentlinkCreateRequire } from 'node:module'; const require = __agentlinkCreateRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: /* @__PURE__ */ Symbol("kIsForOnEventAttribute"),
      kListener: /* @__PURE__ */ Symbol("kListener"),
      kStatusCode: /* @__PURE__ */ Symbol("status-code"),
      kWebSocket: /* @__PURE__ */ Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = /* @__PURE__ */ Symbol("kDone");
    var kRun = /* @__PURE__ */ Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = /* @__PURE__ */ Symbol("permessage-deflate");
    var kTotalLength = /* @__PURE__ */ Symbol("total-length");
    var kCallback = /* @__PURE__ */ Symbol("callback");
    var kBuffers = /* @__PURE__ */ Symbol("buffers");
    var kError = /* @__PURE__ */ Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num2 = +value;
                if (!Number.isInteger(num2) || num2 < 8 || num2 > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num2;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num2 = +value;
              if (!Number.isInteger(num2) || num2 < 8 || num2 > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num2;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num2 = buf.readUInt32BE(0);
        if (num2 > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num2 * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module.exports = Receiver2;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var {
      types: { isUint8Array }
    } = __require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = /* @__PURE__ */ Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = /* @__PURE__ */ Symbol("kCode");
    var kData = /* @__PURE__ */ Symbol("kData");
    var kError = /* @__PURE__ */ Symbol("kError");
    var kMessage = /* @__PURE__ */ Symbol("kMessage");
    var kReason = /* @__PURE__ */ Symbol("kReason");
    var kTarget = /* @__PURE__ */ Symbol("kTarget");
    var kType = /* @__PURE__ */ Symbol("kType");
    var kWasClean = /* @__PURE__ */ Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token2 = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token2, params);
      } else {
        if (paramName === void 0) {
          push(params, token2, true);
        } else if (mustUnescape) {
          push(params, paramName, token2.replace(/\\/g, ""));
        } else {
          push(params, paramName, token2);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter3 = __require("events");
    var https2 = __require("https");
    var http = __require("http");
    var net2 = __require("net");
    var tls = __require("tls");
    var { randomBytes: randomBytes4, createHash } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = /* @__PURE__ */ Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter3 {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            if (!options || options.protocols === void 0) {
              protocols = [];
            } else if (Array.isArray(options.protocols)) {
              protocols = options.protocols;
            } else {
              protocols = [options.protocols];
            }
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              if (options.protocols === void 0) {
                protocols = [];
              } else if (Array.isArray(options.protocols)) {
                protocols = options.protocols;
              } else {
                protocols = [options.protocols];
              }
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        this._readyState = _WebSocket.CLOSING;
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        protocols: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes4(16).toString("base64");
      const request = isSecure ? https2.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net2.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net2.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream2;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter3 = __require("events");
    var http = __require("http");
    var { Duplex } = __require("stream");
    var { createHash } = __require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter3 {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server2 = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server2.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer2;
    function addListeners(server2, map) {
      for (const event of Object.keys(map)) server2.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server2.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server2) {
      server2._state = CLOSED;
      server2.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server2, req, socket, code, message, headers) {
      if (server2.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server2.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// node_modules/reflect-metadata/Reflect.js
var require_Reflect = __commonJS({
  "node_modules/reflect-metadata/Reflect.js"() {
    var Reflect2;
    (function(Reflect3) {
      (function(factory) {
        var root = typeof globalThis === "object" ? globalThis : typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : sloppyModeThis();
        var exporter = makeExporter(Reflect3);
        if (typeof root.Reflect !== "undefined") {
          exporter = makeExporter(root.Reflect, exporter);
        }
        factory(exporter, root);
        if (typeof root.Reflect === "undefined") {
          root.Reflect = Reflect3;
        }
        function makeExporter(target, previous) {
          return function(key, value) {
            Object.defineProperty(target, key, { configurable: true, writable: true, value });
            if (previous)
              previous(key, value);
          };
        }
        function functionThis() {
          try {
            return Function("return this;")();
          } catch (_) {
          }
        }
        function indirectEvalThis() {
          try {
            return (void 0, eval)("(function() { return this; })()");
          } catch (_) {
          }
        }
        function sloppyModeThis() {
          return functionThis() || indirectEvalThis();
        }
      })(function(exporter, root) {
        var hasOwn = Object.prototype.hasOwnProperty;
        var supportsSymbol = typeof Symbol === "function";
        var toPrimitiveSymbol = supportsSymbol && typeof Symbol.toPrimitive !== "undefined" ? Symbol.toPrimitive : "@@toPrimitive";
        var iteratorSymbol = supportsSymbol && typeof Symbol.iterator !== "undefined" ? Symbol.iterator : "@@iterator";
        var supportsCreate = typeof Object.create === "function";
        var supportsProto = { __proto__: [] } instanceof Array;
        var downLevel = !supportsCreate && !supportsProto;
        var HashMap = {
          // create an object in dictionary mode (a.k.a. "slow" mode in v8)
          create: supportsCreate ? function() {
            return MakeDictionary(/* @__PURE__ */ Object.create(null));
          } : supportsProto ? function() {
            return MakeDictionary({ __proto__: null });
          } : function() {
            return MakeDictionary({});
          },
          has: downLevel ? function(map, key) {
            return hasOwn.call(map, key);
          } : function(map, key) {
            return key in map;
          },
          get: downLevel ? function(map, key) {
            return hasOwn.call(map, key) ? map[key] : void 0;
          } : function(map, key) {
            return map[key];
          }
        };
        var functionPrototype = Object.getPrototypeOf(Function);
        var _Map = typeof Map === "function" && typeof Map.prototype.entries === "function" ? Map : CreateMapPolyfill();
        var _Set = typeof Set === "function" && typeof Set.prototype.entries === "function" ? Set : CreateSetPolyfill();
        var _WeakMap = typeof WeakMap === "function" ? WeakMap : CreateWeakMapPolyfill();
        var registrySymbol = supportsSymbol ? /* @__PURE__ */ Symbol.for("@reflect-metadata:registry") : void 0;
        var metadataRegistry = GetOrCreateMetadataRegistry();
        var metadataProvider = CreateMetadataProvider(metadataRegistry);
        function decorate(decorators, target, propertyKey, attributes) {
          if (!IsUndefined(propertyKey)) {
            if (!IsArray(decorators))
              throw new TypeError();
            if (!IsObject(target))
              throw new TypeError();
            if (!IsObject(attributes) && !IsUndefined(attributes) && !IsNull(attributes))
              throw new TypeError();
            if (IsNull(attributes))
              attributes = void 0;
            propertyKey = ToPropertyKey(propertyKey);
            return DecorateProperty(decorators, target, propertyKey, attributes);
          } else {
            if (!IsArray(decorators))
              throw new TypeError();
            if (!IsConstructor(target))
              throw new TypeError();
            return DecorateConstructor(decorators, target);
          }
        }
        exporter("decorate", decorate);
        function metadata(metadataKey, metadataValue) {
          function decorator(target, propertyKey) {
            if (!IsObject(target))
              throw new TypeError();
            if (!IsUndefined(propertyKey) && !IsPropertyKey(propertyKey))
              throw new TypeError();
            OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
          }
          return decorator;
        }
        exporter("metadata", metadata);
        function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
        }
        exporter("defineMetadata", defineMetadata);
        function hasMetadata(metadataKey, target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryHasMetadata(metadataKey, target, propertyKey);
        }
        exporter("hasMetadata", hasMetadata);
        function hasOwnMetadata(metadataKey, target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryHasOwnMetadata(metadataKey, target, propertyKey);
        }
        exporter("hasOwnMetadata", hasOwnMetadata);
        function getMetadata(metadataKey, target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryGetMetadata(metadataKey, target, propertyKey);
        }
        exporter("getMetadata", getMetadata);
        function getOwnMetadata(metadataKey, target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryGetOwnMetadata(metadataKey, target, propertyKey);
        }
        exporter("getOwnMetadata", getOwnMetadata);
        function getMetadataKeys(target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryMetadataKeys(target, propertyKey);
        }
        exporter("getMetadataKeys", getMetadataKeys);
        function getOwnMetadataKeys(target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          return OrdinaryOwnMetadataKeys(target, propertyKey);
        }
        exporter("getOwnMetadataKeys", getOwnMetadataKeys);
        function deleteMetadata(metadataKey, target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey))
            propertyKey = ToPropertyKey(propertyKey);
          var provider = GetMetadataProvider(
            target,
            propertyKey,
            /*Create*/
            false
          );
          if (IsUndefined(provider))
            return false;
          return provider.OrdinaryDeleteMetadata(metadataKey, target, propertyKey);
        }
        exporter("deleteMetadata", deleteMetadata);
        function DecorateConstructor(decorators, target) {
          for (var i = decorators.length - 1; i >= 0; --i) {
            var decorator = decorators[i];
            var decorated = decorator(target);
            if (!IsUndefined(decorated) && !IsNull(decorated)) {
              if (!IsConstructor(decorated))
                throw new TypeError();
              target = decorated;
            }
          }
          return target;
        }
        function DecorateProperty(decorators, target, propertyKey, descriptor) {
          for (var i = decorators.length - 1; i >= 0; --i) {
            var decorator = decorators[i];
            var decorated = decorator(target, propertyKey, descriptor);
            if (!IsUndefined(decorated) && !IsNull(decorated)) {
              if (!IsObject(decorated))
                throw new TypeError();
              descriptor = decorated;
            }
          }
          return descriptor;
        }
        function OrdinaryHasMetadata(MetadataKey, O, P) {
          var hasOwn2 = OrdinaryHasOwnMetadata(MetadataKey, O, P);
          if (hasOwn2)
            return true;
          var parent = OrdinaryGetPrototypeOf(O);
          if (!IsNull(parent))
            return OrdinaryHasMetadata(MetadataKey, parent, P);
          return false;
        }
        function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
          var provider = GetMetadataProvider(
            O,
            P,
            /*Create*/
            false
          );
          if (IsUndefined(provider))
            return false;
          return ToBoolean(provider.OrdinaryHasOwnMetadata(MetadataKey, O, P));
        }
        function OrdinaryGetMetadata(MetadataKey, O, P) {
          var hasOwn2 = OrdinaryHasOwnMetadata(MetadataKey, O, P);
          if (hasOwn2)
            return OrdinaryGetOwnMetadata(MetadataKey, O, P);
          var parent = OrdinaryGetPrototypeOf(O);
          if (!IsNull(parent))
            return OrdinaryGetMetadata(MetadataKey, parent, P);
          return void 0;
        }
        function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
          var provider = GetMetadataProvider(
            O,
            P,
            /*Create*/
            false
          );
          if (IsUndefined(provider))
            return;
          return provider.OrdinaryGetOwnMetadata(MetadataKey, O, P);
        }
        function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
          var provider = GetMetadataProvider(
            O,
            P,
            /*Create*/
            true
          );
          provider.OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P);
        }
        function OrdinaryMetadataKeys(O, P) {
          var ownKeys2 = OrdinaryOwnMetadataKeys(O, P);
          var parent = OrdinaryGetPrototypeOf(O);
          if (parent === null)
            return ownKeys2;
          var parentKeys = OrdinaryMetadataKeys(parent, P);
          if (parentKeys.length <= 0)
            return ownKeys2;
          if (ownKeys2.length <= 0)
            return parentKeys;
          var set = new _Set();
          var keys = [];
          for (var _i = 0, ownKeys_1 = ownKeys2; _i < ownKeys_1.length; _i++) {
            var key = ownKeys_1[_i];
            var hasKey = set.has(key);
            if (!hasKey) {
              set.add(key);
              keys.push(key);
            }
          }
          for (var _a = 0, parentKeys_1 = parentKeys; _a < parentKeys_1.length; _a++) {
            var key = parentKeys_1[_a];
            var hasKey = set.has(key);
            if (!hasKey) {
              set.add(key);
              keys.push(key);
            }
          }
          return keys;
        }
        function OrdinaryOwnMetadataKeys(O, P) {
          var provider = GetMetadataProvider(
            O,
            P,
            /*create*/
            false
          );
          if (!provider) {
            return [];
          }
          return provider.OrdinaryOwnMetadataKeys(O, P);
        }
        function Type(x) {
          if (x === null)
            return 1;
          switch (typeof x) {
            case "undefined":
              return 0;
            case "boolean":
              return 2;
            case "string":
              return 3;
            case "symbol":
              return 4;
            case "number":
              return 5;
            case "object":
              return x === null ? 1 : 6;
            default:
              return 6;
          }
        }
        function IsUndefined(x) {
          return x === void 0;
        }
        function IsNull(x) {
          return x === null;
        }
        function IsSymbol(x) {
          return typeof x === "symbol";
        }
        function IsObject(x) {
          return typeof x === "object" ? x !== null : typeof x === "function";
        }
        function ToPrimitive(input, PreferredType) {
          switch (Type(input)) {
            case 0:
              return input;
            case 1:
              return input;
            case 2:
              return input;
            case 3:
              return input;
            case 4:
              return input;
            case 5:
              return input;
          }
          var hint = PreferredType === 3 ? "string" : PreferredType === 5 ? "number" : "default";
          var exoticToPrim = GetMethod(input, toPrimitiveSymbol);
          if (exoticToPrim !== void 0) {
            var result = exoticToPrim.call(input, hint);
            if (IsObject(result))
              throw new TypeError();
            return result;
          }
          return OrdinaryToPrimitive(input, hint === "default" ? "number" : hint);
        }
        function OrdinaryToPrimitive(O, hint) {
          if (hint === "string") {
            var toString_1 = O.toString;
            if (IsCallable(toString_1)) {
              var result = toString_1.call(O);
              if (!IsObject(result))
                return result;
            }
            var valueOf = O.valueOf;
            if (IsCallable(valueOf)) {
              var result = valueOf.call(O);
              if (!IsObject(result))
                return result;
            }
          } else {
            var valueOf = O.valueOf;
            if (IsCallable(valueOf)) {
              var result = valueOf.call(O);
              if (!IsObject(result))
                return result;
            }
            var toString_2 = O.toString;
            if (IsCallable(toString_2)) {
              var result = toString_2.call(O);
              if (!IsObject(result))
                return result;
            }
          }
          throw new TypeError();
        }
        function ToBoolean(argument) {
          return !!argument;
        }
        function ToString(argument) {
          return "" + argument;
        }
        function ToPropertyKey(argument) {
          var key = ToPrimitive(
            argument,
            3
            /* String */
          );
          if (IsSymbol(key))
            return key;
          return ToString(key);
        }
        function IsArray(argument) {
          return Array.isArray ? Array.isArray(argument) : argument instanceof Object ? argument instanceof Array : Object.prototype.toString.call(argument) === "[object Array]";
        }
        function IsCallable(argument) {
          return typeof argument === "function";
        }
        function IsConstructor(argument) {
          return typeof argument === "function";
        }
        function IsPropertyKey(argument) {
          switch (Type(argument)) {
            case 3:
              return true;
            case 4:
              return true;
            default:
              return false;
          }
        }
        function SameValueZero(x, y) {
          return x === y || x !== x && y !== y;
        }
        function GetMethod(V, P) {
          var func = V[P];
          if (func === void 0 || func === null)
            return void 0;
          if (!IsCallable(func))
            throw new TypeError();
          return func;
        }
        function GetIterator(obj) {
          var method = GetMethod(obj, iteratorSymbol);
          if (!IsCallable(method))
            throw new TypeError();
          var iterator = method.call(obj);
          if (!IsObject(iterator))
            throw new TypeError();
          return iterator;
        }
        function IteratorValue(iterResult) {
          return iterResult.value;
        }
        function IteratorStep(iterator) {
          var result = iterator.next();
          return result.done ? false : result;
        }
        function IteratorClose(iterator) {
          var f = iterator["return"];
          if (f)
            f.call(iterator);
        }
        function OrdinaryGetPrototypeOf(O) {
          var proto = Object.getPrototypeOf(O);
          if (typeof O !== "function" || O === functionPrototype)
            return proto;
          if (proto !== functionPrototype)
            return proto;
          var prototype = O.prototype;
          var prototypeProto = prototype && Object.getPrototypeOf(prototype);
          if (prototypeProto == null || prototypeProto === Object.prototype)
            return proto;
          var constructor = prototypeProto.constructor;
          if (typeof constructor !== "function")
            return proto;
          if (constructor === O)
            return proto;
          return constructor;
        }
        function CreateMetadataRegistry() {
          var fallback;
          if (!IsUndefined(registrySymbol) && typeof root.Reflect !== "undefined" && !(registrySymbol in root.Reflect) && typeof root.Reflect.defineMetadata === "function") {
            fallback = CreateFallbackProvider(root.Reflect);
          }
          var first;
          var second;
          var rest;
          var targetProviderMap = new _WeakMap();
          var registry = {
            registerProvider,
            getProvider,
            setProvider
          };
          return registry;
          function registerProvider(provider) {
            if (!Object.isExtensible(registry)) {
              throw new Error("Cannot add provider to a frozen registry.");
            }
            switch (true) {
              case fallback === provider:
                break;
              case IsUndefined(first):
                first = provider;
                break;
              case first === provider:
                break;
              case IsUndefined(second):
                second = provider;
                break;
              case second === provider:
                break;
              default:
                if (rest === void 0)
                  rest = new _Set();
                rest.add(provider);
                break;
            }
          }
          function getProviderNoCache(O, P) {
            if (!IsUndefined(first)) {
              if (first.isProviderFor(O, P))
                return first;
              if (!IsUndefined(second)) {
                if (second.isProviderFor(O, P))
                  return first;
                if (!IsUndefined(rest)) {
                  var iterator = GetIterator(rest);
                  while (true) {
                    var next = IteratorStep(iterator);
                    if (!next) {
                      return void 0;
                    }
                    var provider = IteratorValue(next);
                    if (provider.isProviderFor(O, P)) {
                      IteratorClose(iterator);
                      return provider;
                    }
                  }
                }
              }
            }
            if (!IsUndefined(fallback) && fallback.isProviderFor(O, P)) {
              return fallback;
            }
            return void 0;
          }
          function getProvider(O, P) {
            var providerMap = targetProviderMap.get(O);
            var provider;
            if (!IsUndefined(providerMap)) {
              provider = providerMap.get(P);
            }
            if (!IsUndefined(provider)) {
              return provider;
            }
            provider = getProviderNoCache(O, P);
            if (!IsUndefined(provider)) {
              if (IsUndefined(providerMap)) {
                providerMap = new _Map();
                targetProviderMap.set(O, providerMap);
              }
              providerMap.set(P, provider);
            }
            return provider;
          }
          function hasProvider(provider) {
            if (IsUndefined(provider))
              throw new TypeError();
            return first === provider || second === provider || !IsUndefined(rest) && rest.has(provider);
          }
          function setProvider(O, P, provider) {
            if (!hasProvider(provider)) {
              throw new Error("Metadata provider not registered.");
            }
            var existingProvider = getProvider(O, P);
            if (existingProvider !== provider) {
              if (!IsUndefined(existingProvider)) {
                return false;
              }
              var providerMap = targetProviderMap.get(O);
              if (IsUndefined(providerMap)) {
                providerMap = new _Map();
                targetProviderMap.set(O, providerMap);
              }
              providerMap.set(P, provider);
            }
            return true;
          }
        }
        function GetOrCreateMetadataRegistry() {
          var metadataRegistry2;
          if (!IsUndefined(registrySymbol) && IsObject(root.Reflect) && Object.isExtensible(root.Reflect)) {
            metadataRegistry2 = root.Reflect[registrySymbol];
          }
          if (IsUndefined(metadataRegistry2)) {
            metadataRegistry2 = CreateMetadataRegistry();
          }
          if (!IsUndefined(registrySymbol) && IsObject(root.Reflect) && Object.isExtensible(root.Reflect)) {
            Object.defineProperty(root.Reflect, registrySymbol, {
              enumerable: false,
              configurable: false,
              writable: false,
              value: metadataRegistry2
            });
          }
          return metadataRegistry2;
        }
        function CreateMetadataProvider(registry) {
          var metadata2 = new _WeakMap();
          var provider = {
            isProviderFor: function(O, P) {
              var targetMetadata = metadata2.get(O);
              if (IsUndefined(targetMetadata))
                return false;
              return targetMetadata.has(P);
            },
            OrdinaryDefineOwnMetadata: OrdinaryDefineOwnMetadata2,
            OrdinaryHasOwnMetadata: OrdinaryHasOwnMetadata2,
            OrdinaryGetOwnMetadata: OrdinaryGetOwnMetadata2,
            OrdinaryOwnMetadataKeys: OrdinaryOwnMetadataKeys2,
            OrdinaryDeleteMetadata
          };
          metadataRegistry.registerProvider(provider);
          return provider;
          function GetOrCreateMetadataMap(O, P, Create) {
            var targetMetadata = metadata2.get(O);
            var createdTargetMetadata = false;
            if (IsUndefined(targetMetadata)) {
              if (!Create)
                return void 0;
              targetMetadata = new _Map();
              metadata2.set(O, targetMetadata);
              createdTargetMetadata = true;
            }
            var metadataMap = targetMetadata.get(P);
            if (IsUndefined(metadataMap)) {
              if (!Create)
                return void 0;
              metadataMap = new _Map();
              targetMetadata.set(P, metadataMap);
              if (!registry.setProvider(O, P, provider)) {
                targetMetadata.delete(P);
                if (createdTargetMetadata) {
                  metadata2.delete(O);
                }
                throw new Error("Wrong provider for target.");
              }
            }
            return metadataMap;
          }
          function OrdinaryHasOwnMetadata2(MetadataKey, O, P) {
            var metadataMap = GetOrCreateMetadataMap(
              O,
              P,
              /*Create*/
              false
            );
            if (IsUndefined(metadataMap))
              return false;
            return ToBoolean(metadataMap.has(MetadataKey));
          }
          function OrdinaryGetOwnMetadata2(MetadataKey, O, P) {
            var metadataMap = GetOrCreateMetadataMap(
              O,
              P,
              /*Create*/
              false
            );
            if (IsUndefined(metadataMap))
              return void 0;
            return metadataMap.get(MetadataKey);
          }
          function OrdinaryDefineOwnMetadata2(MetadataKey, MetadataValue, O, P) {
            var metadataMap = GetOrCreateMetadataMap(
              O,
              P,
              /*Create*/
              true
            );
            metadataMap.set(MetadataKey, MetadataValue);
          }
          function OrdinaryOwnMetadataKeys2(O, P) {
            var keys = [];
            var metadataMap = GetOrCreateMetadataMap(
              O,
              P,
              /*Create*/
              false
            );
            if (IsUndefined(metadataMap))
              return keys;
            var keysObj = metadataMap.keys();
            var iterator = GetIterator(keysObj);
            var k = 0;
            while (true) {
              var next = IteratorStep(iterator);
              if (!next) {
                keys.length = k;
                return keys;
              }
              var nextValue = IteratorValue(next);
              try {
                keys[k] = nextValue;
              } catch (e) {
                try {
                  IteratorClose(iterator);
                } finally {
                  throw e;
                }
              }
              k++;
            }
          }
          function OrdinaryDeleteMetadata(MetadataKey, O, P) {
            var metadataMap = GetOrCreateMetadataMap(
              O,
              P,
              /*Create*/
              false
            );
            if (IsUndefined(metadataMap))
              return false;
            if (!metadataMap.delete(MetadataKey))
              return false;
            if (metadataMap.size === 0) {
              var targetMetadata = metadata2.get(O);
              if (!IsUndefined(targetMetadata)) {
                targetMetadata.delete(P);
                if (targetMetadata.size === 0) {
                  metadata2.delete(targetMetadata);
                }
              }
            }
            return true;
          }
        }
        function CreateFallbackProvider(reflect) {
          var defineMetadata2 = reflect.defineMetadata, hasOwnMetadata2 = reflect.hasOwnMetadata, getOwnMetadata2 = reflect.getOwnMetadata, getOwnMetadataKeys2 = reflect.getOwnMetadataKeys, deleteMetadata2 = reflect.deleteMetadata;
          var metadataOwner = new _WeakMap();
          var provider = {
            isProviderFor: function(O, P) {
              var metadataPropertySet = metadataOwner.get(O);
              if (!IsUndefined(metadataPropertySet) && metadataPropertySet.has(P)) {
                return true;
              }
              if (getOwnMetadataKeys2(O, P).length) {
                if (IsUndefined(metadataPropertySet)) {
                  metadataPropertySet = new _Set();
                  metadataOwner.set(O, metadataPropertySet);
                }
                metadataPropertySet.add(P);
                return true;
              }
              return false;
            },
            OrdinaryDefineOwnMetadata: defineMetadata2,
            OrdinaryHasOwnMetadata: hasOwnMetadata2,
            OrdinaryGetOwnMetadata: getOwnMetadata2,
            OrdinaryOwnMetadataKeys: getOwnMetadataKeys2,
            OrdinaryDeleteMetadata: deleteMetadata2
          };
          return provider;
        }
        function GetMetadataProvider(O, P, Create) {
          var registeredProvider = metadataRegistry.getProvider(O, P);
          if (!IsUndefined(registeredProvider)) {
            return registeredProvider;
          }
          if (Create) {
            if (metadataRegistry.setProvider(O, P, metadataProvider)) {
              return metadataProvider;
            }
            throw new Error("Illegal state.");
          }
          return void 0;
        }
        function CreateMapPolyfill() {
          var cacheSentinel = {};
          var arraySentinel = [];
          var MapIterator = (
            /** @class */
            (function() {
              function MapIterator2(keys, values, selector) {
                this._index = 0;
                this._keys = keys;
                this._values = values;
                this._selector = selector;
              }
              MapIterator2.prototype["@@iterator"] = function() {
                return this;
              };
              MapIterator2.prototype[iteratorSymbol] = function() {
                return this;
              };
              MapIterator2.prototype.next = function() {
                var index = this._index;
                if (index >= 0 && index < this._keys.length) {
                  var result = this._selector(this._keys[index], this._values[index]);
                  if (index + 1 >= this._keys.length) {
                    this._index = -1;
                    this._keys = arraySentinel;
                    this._values = arraySentinel;
                  } else {
                    this._index++;
                  }
                  return { value: result, done: false };
                }
                return { value: void 0, done: true };
              };
              MapIterator2.prototype.throw = function(error) {
                if (this._index >= 0) {
                  this._index = -1;
                  this._keys = arraySentinel;
                  this._values = arraySentinel;
                }
                throw error;
              };
              MapIterator2.prototype.return = function(value) {
                if (this._index >= 0) {
                  this._index = -1;
                  this._keys = arraySentinel;
                  this._values = arraySentinel;
                }
                return { value, done: true };
              };
              return MapIterator2;
            })()
          );
          var Map2 = (
            /** @class */
            (function() {
              function Map3() {
                this._keys = [];
                this._values = [];
                this._cacheKey = cacheSentinel;
                this._cacheIndex = -2;
              }
              Object.defineProperty(Map3.prototype, "size", {
                get: function() {
                  return this._keys.length;
                },
                enumerable: true,
                configurable: true
              });
              Map3.prototype.has = function(key) {
                return this._find(
                  key,
                  /*insert*/
                  false
                ) >= 0;
              };
              Map3.prototype.get = function(key) {
                var index = this._find(
                  key,
                  /*insert*/
                  false
                );
                return index >= 0 ? this._values[index] : void 0;
              };
              Map3.prototype.set = function(key, value) {
                var index = this._find(
                  key,
                  /*insert*/
                  true
                );
                this._values[index] = value;
                return this;
              };
              Map3.prototype.delete = function(key) {
                var index = this._find(
                  key,
                  /*insert*/
                  false
                );
                if (index >= 0) {
                  var size = this._keys.length;
                  for (var i = index + 1; i < size; i++) {
                    this._keys[i - 1] = this._keys[i];
                    this._values[i - 1] = this._values[i];
                  }
                  this._keys.length--;
                  this._values.length--;
                  if (SameValueZero(key, this._cacheKey)) {
                    this._cacheKey = cacheSentinel;
                    this._cacheIndex = -2;
                  }
                  return true;
                }
                return false;
              };
              Map3.prototype.clear = function() {
                this._keys.length = 0;
                this._values.length = 0;
                this._cacheKey = cacheSentinel;
                this._cacheIndex = -2;
              };
              Map3.prototype.keys = function() {
                return new MapIterator(this._keys, this._values, getKey);
              };
              Map3.prototype.values = function() {
                return new MapIterator(this._keys, this._values, getValue);
              };
              Map3.prototype.entries = function() {
                return new MapIterator(this._keys, this._values, getEntry);
              };
              Map3.prototype["@@iterator"] = function() {
                return this.entries();
              };
              Map3.prototype[iteratorSymbol] = function() {
                return this.entries();
              };
              Map3.prototype._find = function(key, insert) {
                if (!SameValueZero(this._cacheKey, key)) {
                  this._cacheIndex = -1;
                  for (var i = 0; i < this._keys.length; i++) {
                    if (SameValueZero(this._keys[i], key)) {
                      this._cacheIndex = i;
                      break;
                    }
                  }
                }
                if (this._cacheIndex < 0 && insert) {
                  this._cacheIndex = this._keys.length;
                  this._keys.push(key);
                  this._values.push(void 0);
                }
                return this._cacheIndex;
              };
              return Map3;
            })()
          );
          return Map2;
          function getKey(key, _) {
            return key;
          }
          function getValue(_, value) {
            return value;
          }
          function getEntry(key, value) {
            return [key, value];
          }
        }
        function CreateSetPolyfill() {
          var Set2 = (
            /** @class */
            (function() {
              function Set3() {
                this._map = new _Map();
              }
              Object.defineProperty(Set3.prototype, "size", {
                get: function() {
                  return this._map.size;
                },
                enumerable: true,
                configurable: true
              });
              Set3.prototype.has = function(value) {
                return this._map.has(value);
              };
              Set3.prototype.add = function(value) {
                return this._map.set(value, value), this;
              };
              Set3.prototype.delete = function(value) {
                return this._map.delete(value);
              };
              Set3.prototype.clear = function() {
                this._map.clear();
              };
              Set3.prototype.keys = function() {
                return this._map.keys();
              };
              Set3.prototype.values = function() {
                return this._map.keys();
              };
              Set3.prototype.entries = function() {
                return this._map.entries();
              };
              Set3.prototype["@@iterator"] = function() {
                return this.keys();
              };
              Set3.prototype[iteratorSymbol] = function() {
                return this.keys();
              };
              return Set3;
            })()
          );
          return Set2;
        }
        function CreateWeakMapPolyfill() {
          var UUID_SIZE = 16;
          var keys = HashMap.create();
          var rootKey = CreateUniqueKey();
          return (
            /** @class */
            (function() {
              function WeakMap2() {
                this._key = CreateUniqueKey();
              }
              WeakMap2.prototype.has = function(target) {
                var table = GetOrCreateWeakMapTable(
                  target,
                  /*create*/
                  false
                );
                return table !== void 0 ? HashMap.has(table, this._key) : false;
              };
              WeakMap2.prototype.get = function(target) {
                var table = GetOrCreateWeakMapTable(
                  target,
                  /*create*/
                  false
                );
                return table !== void 0 ? HashMap.get(table, this._key) : void 0;
              };
              WeakMap2.prototype.set = function(target, value) {
                var table = GetOrCreateWeakMapTable(
                  target,
                  /*create*/
                  true
                );
                table[this._key] = value;
                return this;
              };
              WeakMap2.prototype.delete = function(target) {
                var table = GetOrCreateWeakMapTable(
                  target,
                  /*create*/
                  false
                );
                return table !== void 0 ? delete table[this._key] : false;
              };
              WeakMap2.prototype.clear = function() {
                this._key = CreateUniqueKey();
              };
              return WeakMap2;
            })()
          );
          function CreateUniqueKey() {
            var key;
            do
              key = "@@WeakMap@@" + CreateUUID();
            while (HashMap.has(keys, key));
            keys[key] = true;
            return key;
          }
          function GetOrCreateWeakMapTable(target, create) {
            if (!hasOwn.call(target, rootKey)) {
              if (!create)
                return void 0;
              Object.defineProperty(target, rootKey, { value: HashMap.create() });
            }
            return target[rootKey];
          }
          function FillRandomBytes(buffer, size) {
            for (var i = 0; i < size; ++i)
              buffer[i] = Math.random() * 255 | 0;
            return buffer;
          }
          function GenRandomBytes(size) {
            if (typeof Uint8Array === "function") {
              var array = new Uint8Array(size);
              if (typeof crypto !== "undefined") {
                crypto.getRandomValues(array);
              } else if (typeof msCrypto !== "undefined") {
                msCrypto.getRandomValues(array);
              } else {
                FillRandomBytes(array, size);
              }
              return array;
            }
            return FillRandomBytes(new Array(size), size);
          }
          function CreateUUID() {
            var data = GenRandomBytes(UUID_SIZE);
            data[6] = data[6] & 79 | 64;
            data[8] = data[8] & 191 | 128;
            var result = "";
            for (var offset = 0; offset < UUID_SIZE; ++offset) {
              var byte = data[offset];
              if (offset === 4 || offset === 6 || offset === 8)
                result += "-";
              if (byte < 16)
                result += "0";
              result += byte.toString(16).toLowerCase();
            }
            return result;
          }
        }
        function MakeDictionary(obj) {
          obj.__ = void 0;
          delete obj.__;
          return obj;
        }
      });
    })(Reflect2 || (Reflect2 = {}));
  }
});

// node_modules/tslib/tslib.es6.mjs
var tslib_es6_exports = {};
__export(tslib_es6_exports, {
  __addDisposableResource: () => __addDisposableResource,
  __assign: () => __assign,
  __asyncDelegator: () => __asyncDelegator,
  __asyncGenerator: () => __asyncGenerator,
  __asyncValues: () => __asyncValues,
  __await: () => __await,
  __awaiter: () => __awaiter,
  __classPrivateFieldGet: () => __classPrivateFieldGet,
  __classPrivateFieldIn: () => __classPrivateFieldIn,
  __classPrivateFieldSet: () => __classPrivateFieldSet,
  __createBinding: () => __createBinding,
  __decorate: () => __decorate,
  __disposeResources: () => __disposeResources,
  __esDecorate: () => __esDecorate,
  __exportStar: () => __exportStar,
  __extends: () => __extends,
  __generator: () => __generator,
  __importDefault: () => __importDefault,
  __importStar: () => __importStar,
  __makeTemplateObject: () => __makeTemplateObject,
  __metadata: () => __metadata,
  __param: () => __param,
  __propKey: () => __propKey,
  __read: () => __read,
  __rest: () => __rest,
  __rewriteRelativeImportExtension: () => __rewriteRelativeImportExtension,
  __runInitializers: () => __runInitializers,
  __setFunctionName: () => __setFunctionName,
  __spread: () => __spread,
  __spreadArray: () => __spreadArray,
  __spreadArrays: () => __spreadArrays,
  __values: () => __values,
  default: () => tslib_es6_default
});
function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
    throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
    t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
        t[p[i]] = s[p[i]];
    }
  return t;
}
function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function __param(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) {
    if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
    return f;
  }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
    var context = {};
    for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
    for (var p in contextIn.access) context.access[p] = contextIn.access[p];
    context.addInitializer = function(f) {
      if (done) throw new TypeError("Cannot add initializers after decoration has completed");
      extraInitializers.push(accept(f || null));
    };
    var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
    if (kind === "accessor") {
      if (result === void 0) continue;
      if (result === null || typeof result !== "object") throw new TypeError("Object expected");
      if (_ = accept(result.get)) descriptor.get = _;
      if (_ = accept(result.set)) descriptor.set = _;
      if (_ = accept(result.init)) initializers.unshift(_);
    } else if (_ = accept(result)) {
      if (kind === "field") initializers.unshift(_);
      else descriptor[key] = _;
    }
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
}
function __runInitializers(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) {
    value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  }
  return useValue ? value : void 0;
}
function __propKey(x) {
  return typeof x === "symbol" ? x : "".concat(x);
}
function __setFunctionName(f, name, prefix) {
  if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
  return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
}
function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1) throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
  return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          _.label++;
          return { value: op[1], done: false };
        case 5:
          _.label++;
          y = op[1];
          op = [0];
          continue;
        case 7:
          op = _.ops.pop();
          _.trys.pop();
          continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }
          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1];
            t = op;
            break;
          }
          if (t && _.label < t[2]) {
            _.label = t[2];
            _.ops.push(op);
            break;
          }
          if (t[2]) _.ops.pop();
          _.trys.pop();
          continue;
      }
      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e];
      y = 0;
    } finally {
      f = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
}
function __exportStar(m, o) {
  for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function() {
      if (o && i >= o.length) o = void 0;
      return { value: o && o[i++], done: !o };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
}
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++)
    ar = ar.concat(__read(arguments[i]));
  return ar;
}
function __spreadArrays() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++)
    for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
      r[k] = a[j];
  return r;
}
function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}
function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
    return this;
  }, i;
  function awaitReturn(f) {
    return function(v) {
      return Promise.resolve(v).then(f, reject);
    };
  }
  function verb(n, f) {
    if (g[n]) {
      i[n] = function(v) {
        return new Promise(function(a, b) {
          q.push([n, v, a, b]) > 1 || resume(n, v);
        });
      };
      if (f) i[n] = f(i[n]);
    }
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
}
function __asyncDelegator(o) {
  var i, p;
  return i = {}, verb("next"), verb("throw", function(e) {
    throw e;
  }), verb("return"), i[Symbol.iterator] = function() {
    return this;
  }, i;
  function verb(n, f) {
    i[n] = o[n] ? function(v) {
      return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v;
    } : f;
  }
}
function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i);
  function verb(n) {
    i[n] = o[n] && function(v) {
      return new Promise(function(resolve, reject) {
        v = o[n](v), settle(resolve, reject, v.done, v.value);
      });
    };
  }
  function settle(resolve, reject, d, v) {
    Promise.resolve(v).then(function(v2) {
      resolve({ value: v2, done: d });
    }, reject);
  }
}
function __makeTemplateObject(cooked, raw) {
  if (Object.defineProperty) {
    Object.defineProperty(cooked, "raw", { value: raw });
  } else {
    cooked.raw = raw;
  }
  return cooked;
}
function __importStar(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) {
    for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
  }
  __setModuleDefault(result, mod);
  return result;
}
function __importDefault(mod) {
  return mod && mod.__esModule ? mod : { default: mod };
}
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldIn(state, receiver) {
  if (receiver === null || typeof receiver !== "object" && typeof receiver !== "function") throw new TypeError("Cannot use 'in' operator on non-object");
  return typeof state === "function" ? receiver === state : state.has(receiver);
}
function __addDisposableResource(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose, inner;
    if (async) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      dispose = value[Symbol.dispose];
      if (async) inner = dispose;
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    if (inner) dispose = function() {
      try {
        inner.call(this);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    env.stack.push({ value, dispose, async });
  } else if (async) {
    env.stack.push({ async: true });
  }
  return value;
}
function __disposeResources(env) {
  function fail(e) {
    env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
    env.hasError = true;
  }
  var r, s = 0;
  function next() {
    while (r = env.stack.pop()) {
      try {
        if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
        if (r.dispose) {
          var result = r.dispose.call(r.value);
          if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
            fail(e);
            return next();
          });
        } else s |= 1;
      } catch (e) {
        fail(e);
      }
    }
    if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
    if (env.hasError) throw env.error;
  }
  return next();
}
function __rewriteRelativeImportExtension(path6, preserveJsx) {
  if (typeof path6 === "string" && /^\.\.?\//.test(path6)) {
    return path6.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
      return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
    });
  }
  return path6;
}
var extendStatics, __assign, __createBinding, __setModuleDefault, ownKeys, _SuppressedError, tslib_es6_default;
var init_tslib_es6 = __esm({
  "node_modules/tslib/tslib.es6.mjs"() {
    extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
        d2.__proto__ = b2;
      } || function(d2, b2) {
        for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
      };
      return extendStatics(d, b);
    };
    __assign = function() {
      __assign = Object.assign || function __assign3(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    __createBinding = Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    __setModuleDefault = Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    };
    ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o2) {
        var ar = [];
        for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
      var e = new Error(message);
      return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };
    tslib_es6_default = {
      __extends,
      __assign,
      __rest,
      __decorate,
      __param,
      __esDecorate,
      __runInitializers,
      __propKey,
      __setFunctionName,
      __metadata,
      __awaiter,
      __generator,
      __createBinding,
      __exportStar,
      __values,
      __read,
      __spread,
      __spreadArrays,
      __spreadArray,
      __await,
      __asyncGenerator,
      __asyncDelegator,
      __asyncValues,
      __makeTemplateObject,
      __importStar,
      __importDefault,
      __classPrivateFieldGet,
      __classPrivateFieldSet,
      __classPrivateFieldIn,
      __addDisposableResource,
      __disposeResources,
      __rewriteRelativeImportExtension
    };
  }
});

// node_modules/pvtsutils/build/index.js
var require_build = __commonJS({
  "node_modules/pvtsutils/build/index.js"(exports) {
    "use strict";
    var ARRAY_BUFFER_NAME = "[object ArrayBuffer]";
    var BufferSourceConverter = class _BufferSourceConverter {
      static isArrayBuffer(data) {
        return Object.prototype.toString.call(data) === ARRAY_BUFFER_NAME;
      }
      static toArrayBuffer(data) {
        if (this.isArrayBuffer(data)) {
          return data;
        }
        if (data.byteLength === data.buffer.byteLength) {
          return data.buffer;
        }
        if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
          return data.buffer;
        }
        return this.toUint8Array(data.buffer).slice(data.byteOffset, data.byteOffset + data.byteLength).buffer;
      }
      static toUint8Array(data) {
        return this.toView(data, Uint8Array);
      }
      static toView(data, type) {
        if (data.constructor === type) {
          return data;
        }
        if (this.isArrayBuffer(data)) {
          return new type(data);
        }
        if (this.isArrayBufferView(data)) {
          return new type(data.buffer, data.byteOffset, data.byteLength);
        }
        throw new TypeError("The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
      }
      static isBufferSource(data) {
        return this.isArrayBufferView(data) || this.isArrayBuffer(data);
      }
      static isArrayBufferView(data) {
        return ArrayBuffer.isView(data) || data && this.isArrayBuffer(data.buffer);
      }
      static isEqual(a, b) {
        const aView = _BufferSourceConverter.toUint8Array(a);
        const bView = _BufferSourceConverter.toUint8Array(b);
        if (aView.length !== bView.byteLength) {
          return false;
        }
        for (let i = 0; i < aView.length; i++) {
          if (aView[i] !== bView[i]) {
            return false;
          }
        }
        return true;
      }
      static concat(...args) {
        let buffers;
        if (Array.isArray(args[0]) && !(args[1] instanceof Function)) {
          buffers = args[0];
        } else if (Array.isArray(args[0]) && args[1] instanceof Function) {
          buffers = args[0];
        } else {
          if (args[args.length - 1] instanceof Function) {
            buffers = args.slice(0, args.length - 1);
          } else {
            buffers = args;
          }
        }
        let size = 0;
        for (const buffer of buffers) {
          size += buffer.byteLength;
        }
        const res = new Uint8Array(size);
        let offset = 0;
        for (const buffer of buffers) {
          const view = this.toUint8Array(buffer);
          res.set(view, offset);
          offset += view.length;
        }
        if (args[args.length - 1] instanceof Function) {
          return this.toView(res, args[args.length - 1]);
        }
        return res.buffer;
      }
    };
    var STRING_TYPE = "string";
    var HEX_REGEX = /^[0-9a-f\s]+$/i;
    var BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    var BASE64URL_REGEX = /^[a-zA-Z0-9-_]+$/;
    var Utf8Converter = class {
      static fromString(text) {
        const s = unescape(encodeURIComponent(text));
        const uintArray = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) {
          uintArray[i] = s.charCodeAt(i);
        }
        return uintArray.buffer;
      }
      static toString(buffer) {
        const buf = BufferSourceConverter.toUint8Array(buffer);
        let encodedString = "";
        for (let i = 0; i < buf.length; i++) {
          encodedString += String.fromCharCode(buf[i]);
        }
        const decodedString = decodeURIComponent(escape(encodedString));
        return decodedString;
      }
    };
    var Utf16Converter = class {
      static toString(buffer, littleEndian = false) {
        const arrayBuffer = BufferSourceConverter.toArrayBuffer(buffer);
        const dataView = new DataView(arrayBuffer);
        let res = "";
        for (let i = 0; i < arrayBuffer.byteLength; i += 2) {
          const code = dataView.getUint16(i, littleEndian);
          res += String.fromCharCode(code);
        }
        return res;
      }
      static fromString(text, littleEndian = false) {
        const res = new ArrayBuffer(text.length * 2);
        const dataView = new DataView(res);
        for (let i = 0; i < text.length; i++) {
          dataView.setUint16(i * 2, text.charCodeAt(i), littleEndian);
        }
        return res;
      }
    };
    var Convert = class _Convert {
      static isHex(data) {
        return typeof data === STRING_TYPE && HEX_REGEX.test(data);
      }
      static isBase64(data) {
        return typeof data === STRING_TYPE && BASE64_REGEX.test(data);
      }
      static isBase64Url(data) {
        return typeof data === STRING_TYPE && BASE64URL_REGEX.test(data);
      }
      static ToString(buffer, enc = "utf8") {
        const buf = BufferSourceConverter.toUint8Array(buffer);
        switch (enc.toLowerCase()) {
          case "utf8":
            return this.ToUtf8String(buf);
          case "binary":
            return this.ToBinary(buf);
          case "hex":
            return this.ToHex(buf);
          case "base64":
            return this.ToBase64(buf);
          case "base64url":
            return this.ToBase64Url(buf);
          case "utf16le":
            return Utf16Converter.toString(buf, true);
          case "utf16":
          case "utf16be":
            return Utf16Converter.toString(buf);
          default:
            throw new Error(`Unknown type of encoding '${enc}'`);
        }
      }
      static FromString(str2, enc = "utf8") {
        if (!str2) {
          return new ArrayBuffer(0);
        }
        switch (enc.toLowerCase()) {
          case "utf8":
            return this.FromUtf8String(str2);
          case "binary":
            return this.FromBinary(str2);
          case "hex":
            return this.FromHex(str2);
          case "base64":
            return this.FromBase64(str2);
          case "base64url":
            return this.FromBase64Url(str2);
          case "utf16le":
            return Utf16Converter.fromString(str2, true);
          case "utf16":
          case "utf16be":
            return Utf16Converter.fromString(str2);
          default:
            throw new Error(`Unknown type of encoding '${enc}'`);
        }
      }
      static ToBase64(buffer) {
        const buf = BufferSourceConverter.toUint8Array(buffer);
        if (typeof btoa !== "undefined") {
          const binary = this.ToString(buf, "binary");
          return btoa(binary);
        } else {
          return Buffer.from(buf).toString("base64");
        }
      }
      static FromBase64(base64) {
        const formatted = this.formatString(base64);
        if (!formatted) {
          return new ArrayBuffer(0);
        }
        if (!_Convert.isBase64(formatted)) {
          throw new TypeError("Argument 'base64Text' is not Base64 encoded");
        }
        if (typeof atob !== "undefined") {
          return this.FromBinary(atob(formatted));
        } else {
          return new Uint8Array(Buffer.from(formatted, "base64")).buffer;
        }
      }
      static FromBase64Url(base64url) {
        const formatted = this.formatString(base64url);
        if (!formatted) {
          return new ArrayBuffer(0);
        }
        if (!_Convert.isBase64Url(formatted)) {
          throw new TypeError("Argument 'base64url' is not Base64Url encoded");
        }
        return this.FromBase64(this.Base64Padding(formatted.replace(/\-/g, "+").replace(/\_/g, "/")));
      }
      static ToBase64Url(data) {
        return this.ToBase64(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/\=/g, "");
      }
      static FromUtf8String(text, encoding = _Convert.DEFAULT_UTF8_ENCODING) {
        switch (encoding) {
          case "ascii":
            return this.FromBinary(text);
          case "utf8":
            return Utf8Converter.fromString(text);
          case "utf16":
          case "utf16be":
            return Utf16Converter.fromString(text);
          case "utf16le":
          case "usc2":
            return Utf16Converter.fromString(text, true);
          default:
            throw new Error(`Unknown type of encoding '${encoding}'`);
        }
      }
      static ToUtf8String(buffer, encoding = _Convert.DEFAULT_UTF8_ENCODING) {
        switch (encoding) {
          case "ascii":
            return this.ToBinary(buffer);
          case "utf8":
            return Utf8Converter.toString(buffer);
          case "utf16":
          case "utf16be":
            return Utf16Converter.toString(buffer);
          case "utf16le":
          case "usc2":
            return Utf16Converter.toString(buffer, true);
          default:
            throw new Error(`Unknown type of encoding '${encoding}'`);
        }
      }
      static FromBinary(text) {
        const stringLength = text.length;
        const resultView = new Uint8Array(stringLength);
        for (let i = 0; i < stringLength; i++) {
          resultView[i] = text.charCodeAt(i);
        }
        return resultView.buffer;
      }
      static ToBinary(buffer) {
        const buf = BufferSourceConverter.toUint8Array(buffer);
        let res = "";
        for (let i = 0; i < buf.length; i++) {
          res += String.fromCharCode(buf[i]);
        }
        return res;
      }
      static ToHex(buffer) {
        const buf = BufferSourceConverter.toUint8Array(buffer);
        let result = "";
        const len = buf.length;
        for (let i = 0; i < len; i++) {
          const byte = buf[i];
          if (byte < 16) {
            result += "0";
          }
          result += byte.toString(16);
        }
        return result;
      }
      static FromHex(hexString) {
        let formatted = this.formatString(hexString);
        if (!formatted) {
          return new ArrayBuffer(0);
        }
        if (!_Convert.isHex(formatted)) {
          throw new TypeError("Argument 'hexString' is not HEX encoded");
        }
        if (formatted.length % 2) {
          formatted = `0${formatted}`;
        }
        const res = new Uint8Array(formatted.length / 2);
        for (let i = 0; i < formatted.length; i = i + 2) {
          const c = formatted.slice(i, i + 2);
          res[i / 2] = parseInt(c, 16);
        }
        return res.buffer;
      }
      static ToUtf16String(buffer, littleEndian = false) {
        return Utf16Converter.toString(buffer, littleEndian);
      }
      static FromUtf16String(text, littleEndian = false) {
        return Utf16Converter.fromString(text, littleEndian);
      }
      static Base64Padding(base64) {
        const padCount = 4 - base64.length % 4;
        if (padCount < 4) {
          for (let i = 0; i < padCount; i++) {
            base64 += "=";
          }
        }
        return base64;
      }
      static formatString(data) {
        return (data === null || data === void 0 ? void 0 : data.replace(/[\n\r\t ]/g, "")) || "";
      }
    };
    Convert.DEFAULT_UTF8_ENCODING = "utf8";
    function assign(target, ...sources) {
      const res = arguments[0];
      for (let i = 1; i < arguments.length; i++) {
        const obj = arguments[i];
        for (const prop in obj) {
          res[prop] = obj[prop];
        }
      }
      return res;
    }
    function combine(...buf) {
      const totalByteLength = buf.map((item) => item.byteLength).reduce((prev, cur) => prev + cur);
      const res = new Uint8Array(totalByteLength);
      let currentPos = 0;
      buf.map((item) => new Uint8Array(item)).forEach((arr) => {
        for (const item2 of arr) {
          res[currentPos++] = item2;
        }
      });
      return res.buffer;
    }
    function isEqual(bytes1, bytes2) {
      if (!(bytes1 && bytes2)) {
        return false;
      }
      if (bytes1.byteLength !== bytes2.byteLength) {
        return false;
      }
      const b1 = new Uint8Array(bytes1);
      const b2 = new Uint8Array(bytes2);
      for (let i = 0; i < bytes1.byteLength; i++) {
        if (b1[i] !== b2[i]) {
          return false;
        }
      }
      return true;
    }
    exports.BufferSourceConverter = BufferSourceConverter;
    exports.Convert = Convert;
    exports.assign = assign;
    exports.combine = combine;
    exports.isEqual = isEqual;
  }
});

// node_modules/pvutils/build/utils.js
var require_utils = __commonJS({
  "node_modules/pvutils/build/utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function getUTCDate(date) {
      return new Date(date.getTime() + date.getTimezoneOffset() * 6e4);
    }
    function getParametersValue(parameters, name, defaultValue) {
      var _a;
      if (parameters instanceof Object === false) {
        return defaultValue;
      }
      return (_a = parameters[name]) !== null && _a !== void 0 ? _a : defaultValue;
    }
    function bufferToHexCodes(inputBuffer, inputOffset = 0, inputLength = inputBuffer.byteLength - inputOffset, insertSpace = false) {
      let result = "";
      for (const item of new Uint8Array(inputBuffer, inputOffset, inputLength)) {
        const str2 = item.toString(16).toUpperCase();
        if (str2.length === 1) {
          result += "0";
        }
        result += str2;
        if (insertSpace) {
          result += " ";
        }
      }
      return result.trim();
    }
    function checkBufferParams(baseBlock, inputBuffer, inputOffset, inputLength) {
      if (!(inputBuffer instanceof ArrayBuffer)) {
        baseBlock.error = 'Wrong parameter: inputBuffer must be "ArrayBuffer"';
        return false;
      }
      if (!inputBuffer.byteLength) {
        baseBlock.error = "Wrong parameter: inputBuffer has zero length";
        return false;
      }
      if (inputOffset < 0) {
        baseBlock.error = "Wrong parameter: inputOffset less than zero";
        return false;
      }
      if (inputLength < 0) {
        baseBlock.error = "Wrong parameter: inputLength less than zero";
        return false;
      }
      if (inputBuffer.byteLength - inputOffset - inputLength < 0) {
        baseBlock.error = "End of input reached before message was fully decoded (inconsistent offset and length values)";
        return false;
      }
      return true;
    }
    function utilFromBase(inputBuffer, inputBase) {
      let result = 0;
      if (inputBuffer.length === 1) {
        return inputBuffer[0];
      }
      for (let i = inputBuffer.length - 1; i >= 0; i--) {
        result += inputBuffer[inputBuffer.length - 1 - i] * Math.pow(2, inputBase * i);
      }
      return result;
    }
    function utilToBase(value, base, reserved = -1) {
      const internalReserved = reserved;
      let internalValue = value;
      let result = 0;
      let biggest = Math.pow(2, base);
      for (let i = 1; i < 8; i++) {
        if (value < biggest) {
          let retBuf;
          if (internalReserved < 0) {
            retBuf = new ArrayBuffer(i);
            result = i;
          } else {
            if (internalReserved < i) {
              return new ArrayBuffer(0);
            }
            retBuf = new ArrayBuffer(internalReserved);
            result = internalReserved;
          }
          const retView = new Uint8Array(retBuf);
          for (let j = i - 1; j >= 0; j--) {
            const basis = Math.pow(2, j * base);
            retView[result - j - 1] = Math.floor(internalValue / basis);
            internalValue -= retView[result - j - 1] * basis;
          }
          return retBuf;
        }
        biggest *= Math.pow(2, base);
      }
      return new ArrayBuffer(0);
    }
    function utilConcatBuf(...buffers) {
      let outputLength = 0;
      let prevLength = 0;
      for (const buffer of buffers) {
        outputLength += buffer.byteLength;
      }
      const retBuf = new ArrayBuffer(outputLength);
      const retView = new Uint8Array(retBuf);
      for (const buffer of buffers) {
        retView.set(new Uint8Array(buffer), prevLength);
        prevLength += buffer.byteLength;
      }
      return retBuf;
    }
    function utilConcatView(...views) {
      let outputLength = 0;
      let prevLength = 0;
      for (const view of views) {
        outputLength += view.length;
      }
      const retBuf = new ArrayBuffer(outputLength);
      const retView = new Uint8Array(retBuf);
      for (const view of views) {
        retView.set(view, prevLength);
        prevLength += view.length;
      }
      return retView;
    }
    function utilDecodeTC() {
      const buf = new Uint8Array(this.valueHex);
      if (this.valueHex.byteLength >= 2) {
        const condition1 = buf[0] === 255 && buf[1] & 128;
        const condition2 = buf[0] === 0 && (buf[1] & 128) === 0;
        if (condition1 || condition2) {
          this.warnings.push("Needlessly long format");
        }
      }
      const bigIntBuffer = new ArrayBuffer(this.valueHex.byteLength);
      const bigIntView = new Uint8Array(bigIntBuffer);
      for (let i = 0; i < this.valueHex.byteLength; i++) {
        bigIntView[i] = 0;
      }
      bigIntView[0] = buf[0] & 128;
      const bigInt = utilFromBase(bigIntView, 8);
      const smallIntBuffer = new ArrayBuffer(this.valueHex.byteLength);
      const smallIntView = new Uint8Array(smallIntBuffer);
      for (let j = 0; j < this.valueHex.byteLength; j++) {
        smallIntView[j] = buf[j];
      }
      smallIntView[0] &= 127;
      const smallInt = utilFromBase(smallIntView, 8);
      return smallInt - bigInt;
    }
    function utilEncodeTC(value) {
      const modValue = value < 0 ? value * -1 : value;
      let bigInt = 128;
      for (let i = 1; i < 8; i++) {
        if (modValue <= bigInt) {
          if (value < 0) {
            const smallInt = bigInt - modValue;
            const retBuf2 = utilToBase(smallInt, 8, i);
            const retView2 = new Uint8Array(retBuf2);
            retView2[0] |= 128;
            return retBuf2;
          }
          let retBuf = utilToBase(modValue, 8, i);
          let retView = new Uint8Array(retBuf);
          if (retView[0] & 128) {
            const tempBuf = retBuf.slice(0);
            const tempView = new Uint8Array(tempBuf);
            retBuf = new ArrayBuffer(retBuf.byteLength + 1);
            retView = new Uint8Array(retBuf);
            for (let k = 0; k < tempBuf.byteLength; k++) {
              retView[k + 1] = tempView[k];
            }
            retView[0] = 0;
          }
          return retBuf;
        }
        bigInt *= Math.pow(2, 8);
      }
      return new ArrayBuffer(0);
    }
    function isEqualBuffer(inputBuffer1, inputBuffer2) {
      if (inputBuffer1.byteLength !== inputBuffer2.byteLength) {
        return false;
      }
      const view1 = new Uint8Array(inputBuffer1);
      const view2 = new Uint8Array(inputBuffer2);
      for (let i = 0; i < view1.length; i++) {
        if (view1[i] !== view2[i]) {
          return false;
        }
      }
      return true;
    }
    function padNumber(inputNumber, fullLength) {
      const str2 = inputNumber.toString(10);
      if (fullLength < str2.length) {
        return "";
      }
      const dif = fullLength - str2.length;
      const padding = Array.from({ length: dif });
      for (let i = 0; i < dif; i++) {
        padding[i] = "0";
      }
      const paddingString = padding.join("");
      return paddingString.concat(str2);
    }
    var base64Template = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var base64UrlTemplate = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=";
    function toBase64(input, useUrlTemplate = false, skipPadding = false, skipLeadingZeros = false) {
      let i = 0;
      let flag1 = 0;
      let flag2 = 0;
      let output = "";
      const template = useUrlTemplate ? base64UrlTemplate : base64Template;
      if (skipLeadingZeros) {
        let nonZeroPosition = 0;
        for (let i2 = 0; i2 < input.length; i2++) {
          if (input.charCodeAt(i2) !== 0) {
            nonZeroPosition = i2;
            break;
          }
        }
        input = input.slice(nonZeroPosition);
      }
      while (i < input.length) {
        const chr1 = input.charCodeAt(i++);
        if (i >= input.length) {
          flag1 = 1;
        }
        const chr2 = input.charCodeAt(i++);
        if (i >= input.length) {
          flag2 = 1;
        }
        const chr3 = input.charCodeAt(i++);
        const enc1 = chr1 >> 2;
        const enc2 = (chr1 & 3) << 4 | chr2 >> 4;
        let enc3 = (chr2 & 15) << 2 | chr3 >> 6;
        let enc4 = chr3 & 63;
        if (flag1 === 1) {
          enc3 = enc4 = 64;
        } else {
          if (flag2 === 1) {
            enc4 = 64;
          }
        }
        if (skipPadding) {
          if (enc3 === 64) {
            output += `${template.charAt(enc1)}${template.charAt(enc2)}`;
          } else {
            if (enc4 === 64) {
              output += `${template.charAt(enc1)}${template.charAt(enc2)}${template.charAt(enc3)}`;
            } else {
              output += `${template.charAt(enc1)}${template.charAt(enc2)}${template.charAt(enc3)}${template.charAt(enc4)}`;
            }
          }
        } else {
          output += `${template.charAt(enc1)}${template.charAt(enc2)}${template.charAt(enc3)}${template.charAt(enc4)}`;
        }
      }
      return output;
    }
    function fromBase64(input, useUrlTemplate = false, cutTailZeros = false) {
      const template = useUrlTemplate ? base64UrlTemplate : base64Template;
      function indexOf(toSearch) {
        for (let i2 = 0; i2 < 64; i2++) {
          if (template.charAt(i2) === toSearch)
            return i2;
        }
        return 64;
      }
      function test(incoming) {
        return incoming === 64 ? 0 : incoming;
      }
      let i = 0;
      let output = "";
      while (i < input.length) {
        const enc1 = indexOf(input.charAt(i++));
        const enc2 = i >= input.length ? 0 : indexOf(input.charAt(i++));
        const enc3 = i >= input.length ? 0 : indexOf(input.charAt(i++));
        const enc4 = i >= input.length ? 0 : indexOf(input.charAt(i++));
        const chr1 = test(enc1) << 2 | test(enc2) >> 4;
        const chr2 = (test(enc2) & 15) << 4 | test(enc3) >> 2;
        const chr3 = (test(enc3) & 3) << 6 | test(enc4);
        output += String.fromCharCode(chr1);
        if (enc3 !== 64) {
          output += String.fromCharCode(chr2);
        }
        if (enc4 !== 64) {
          output += String.fromCharCode(chr3);
        }
      }
      if (cutTailZeros) {
        const outputLength = output.length;
        let nonZeroStart = -1;
        for (let i2 = outputLength - 1; i2 >= 0; i2--) {
          if (output.charCodeAt(i2) !== 0) {
            nonZeroStart = i2;
            break;
          }
        }
        if (nonZeroStart !== -1) {
          output = output.slice(0, nonZeroStart + 1);
        } else {
          output = "";
        }
      }
      return output;
    }
    function arrayBufferToString(buffer) {
      let resultString = "";
      const view = new Uint8Array(buffer);
      for (const element of view) {
        resultString += String.fromCharCode(element);
      }
      return resultString;
    }
    function stringToArrayBuffer(str2) {
      const stringLength = str2.length;
      const resultBuffer = new ArrayBuffer(stringLength);
      const resultView = new Uint8Array(resultBuffer);
      for (let i = 0; i < stringLength; i++) {
        resultView[i] = str2.charCodeAt(i);
      }
      return resultBuffer;
    }
    var log2 = Math.log(2);
    function nearestPowerOf2(length) {
      const base = Math.log(length) / log2;
      const floor = Math.floor(base);
      const round = Math.round(base);
      return floor === round ? floor : round;
    }
    function clearProps(object, propsArray) {
      for (const prop of propsArray) {
        delete object[prop];
      }
    }
    exports.arrayBufferToString = arrayBufferToString;
    exports.bufferToHexCodes = bufferToHexCodes;
    exports.checkBufferParams = checkBufferParams;
    exports.clearProps = clearProps;
    exports.fromBase64 = fromBase64;
    exports.getParametersValue = getParametersValue;
    exports.getUTCDate = getUTCDate;
    exports.isEqualBuffer = isEqualBuffer;
    exports.nearestPowerOf2 = nearestPowerOf2;
    exports.padNumber = padNumber;
    exports.stringToArrayBuffer = stringToArrayBuffer;
    exports.toBase64 = toBase64;
    exports.utilConcatBuf = utilConcatBuf;
    exports.utilConcatView = utilConcatView;
    exports.utilDecodeTC = utilDecodeTC;
    exports.utilEncodeTC = utilEncodeTC;
    exports.utilFromBase = utilFromBase;
    exports.utilToBase = utilToBase;
  }
});

// node_modules/asn1js/build/index.js
var require_build2 = __commonJS({
  "node_modules/asn1js/build/index.js"(exports) {
    "use strict";
    var pvtsutils = require_build();
    var pvutils = require_utils();
    function _interopNamespaceDefault(e) {
      var n = /* @__PURE__ */ Object.create(null);
      if (e) {
        Object.keys(e).forEach(function(k) {
          if (k !== "default") {
            var d = Object.getOwnPropertyDescriptor(e, k);
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: function() {
                return e[k];
              }
            });
          }
        });
      }
      n.default = e;
      return Object.freeze(n);
    }
    var pvtsutils__namespace = /* @__PURE__ */ _interopNamespaceDefault(pvtsutils);
    var pvutils__namespace = /* @__PURE__ */ _interopNamespaceDefault(pvutils);
    function assertBigInt() {
      if (typeof BigInt === "undefined") {
        throw new Error("BigInt is not defined. Your environment doesn't implement BigInt.");
      }
    }
    function concat(buffers) {
      let outputLength = 0;
      let prevLength = 0;
      for (let i = 0; i < buffers.length; i++) {
        const buffer = buffers[i];
        outputLength += buffer.byteLength;
      }
      const retView = new Uint8Array(outputLength);
      for (let i = 0; i < buffers.length; i++) {
        const buffer = buffers[i];
        retView.set(new Uint8Array(buffer), prevLength);
        prevLength += buffer.byteLength;
      }
      return retView.buffer;
    }
    function checkBufferParams(baseBlock, inputBuffer, inputOffset, inputLength) {
      if (!(inputBuffer instanceof Uint8Array)) {
        baseBlock.error = "Wrong parameter: inputBuffer must be 'Uint8Array'";
        return false;
      }
      if (!inputBuffer.byteLength) {
        baseBlock.error = "Wrong parameter: inputBuffer has zero length";
        return false;
      }
      if (inputOffset < 0) {
        baseBlock.error = "Wrong parameter: inputOffset less than zero";
        return false;
      }
      if (inputLength < 0) {
        baseBlock.error = "Wrong parameter: inputLength less than zero";
        return false;
      }
      if (inputBuffer.byteLength - inputOffset - inputLength < 0) {
        baseBlock.error = "End of input reached before message was fully decoded (inconsistent offset and length values)";
        return false;
      }
      return true;
    }
    var ViewWriter = class {
      constructor() {
        this.items = [];
      }
      write(buf) {
        this.items.push(buf);
      }
      final() {
        return concat(this.items);
      }
    };
    var powers2 = [new Uint8Array([1])];
    var digitsString = "0123456789";
    var NAME = "name";
    var VALUE_HEX_VIEW = "valueHexView";
    var IS_HEX_ONLY = "isHexOnly";
    var ID_BLOCK = "idBlock";
    var TAG_CLASS = "tagClass";
    var TAG_NUMBER = "tagNumber";
    var IS_CONSTRUCTED = "isConstructed";
    var FROM_BER = "fromBER";
    var TO_BER = "toBER";
    var LOCAL = "local";
    var EMPTY_STRING = "";
    var EMPTY_BUFFER = new ArrayBuffer(0);
    var EMPTY_VIEW = new Uint8Array(0);
    var END_OF_CONTENT_NAME = "EndOfContent";
    var OCTET_STRING_NAME = "OCTET STRING";
    var BIT_STRING_NAME = "BIT STRING";
    function HexBlock(BaseClass) {
      var _a2;
      return _a2 = class Some extends BaseClass {
        get valueHex() {
          return this.valueHexView.slice().buffer;
        }
        set valueHex(value) {
          this.valueHexView = new Uint8Array(value);
        }
        constructor(...args) {
          var _b;
          super(...args);
          const params = args[0] || {};
          this.isHexOnly = (_b = params.isHexOnly) !== null && _b !== void 0 ? _b : false;
          this.valueHexView = params.valueHex ? pvtsutils__namespace.BufferSourceConverter.toUint8Array(params.valueHex) : EMPTY_VIEW;
        }
        fromBER(inputBuffer, inputOffset, inputLength, _context) {
          const view = inputBuffer instanceof ArrayBuffer ? new Uint8Array(inputBuffer) : inputBuffer;
          if (!checkBufferParams(this, view, inputOffset, inputLength)) {
            return -1;
          }
          const endLength = inputOffset + inputLength;
          this.valueHexView = view.subarray(inputOffset, endLength);
          if (!this.valueHexView.length) {
            this.warnings.push("Zero buffer length");
            return inputOffset;
          }
          this.blockLength = inputLength;
          return endLength;
        }
        toBER(sizeOnly = false) {
          if (!this.isHexOnly) {
            this.error = "Flag 'isHexOnly' is not set, abort";
            return EMPTY_BUFFER;
          }
          if (sizeOnly) {
            return new ArrayBuffer(this.valueHexView.byteLength);
          }
          return this.valueHexView.byteLength === this.valueHexView.buffer.byteLength ? this.valueHexView.buffer : this.valueHexView.slice().buffer;
        }
        toJSON() {
          return {
            ...super.toJSON(),
            isHexOnly: this.isHexOnly,
            valueHex: pvtsutils__namespace.Convert.ToHex(this.valueHexView)
          };
        }
      }, _a2.NAME = "hexBlock", _a2;
    }
    var LocalBaseBlock = class {
      static blockName() {
        return this.NAME;
      }
      get valueBeforeDecode() {
        return this.valueBeforeDecodeView.slice().buffer;
      }
      set valueBeforeDecode(value) {
        this.valueBeforeDecodeView = new Uint8Array(value);
      }
      constructor({ blockLength = 0, error = EMPTY_STRING, warnings = [], valueBeforeDecode = EMPTY_VIEW } = {}) {
        this.blockLength = blockLength;
        this.error = error;
        this.warnings = warnings;
        this.valueBeforeDecodeView = pvtsutils__namespace.BufferSourceConverter.toUint8Array(valueBeforeDecode);
      }
      toJSON() {
        return {
          blockName: this.constructor.NAME,
          blockLength: this.blockLength,
          error: this.error,
          warnings: this.warnings,
          valueBeforeDecode: pvtsutils__namespace.Convert.ToHex(this.valueBeforeDecodeView)
        };
      }
    };
    LocalBaseBlock.NAME = "baseBlock";
    var ValueBlock = class extends LocalBaseBlock {
      fromBER(_inputBuffer, _inputOffset, _inputLength, _context) {
        throw TypeError("User need to make a specific function in a class which extends 'ValueBlock'");
      }
      toBER(_sizeOnly, _writer) {
        throw TypeError("User need to make a specific function in a class which extends 'ValueBlock'");
      }
    };
    ValueBlock.NAME = "valueBlock";
    var LocalIdentificationBlock = class extends HexBlock(LocalBaseBlock) {
      constructor({ idBlock = {} } = {}) {
        var _a2, _b, _c, _d;
        super();
        if (idBlock) {
          this.isHexOnly = (_a2 = idBlock.isHexOnly) !== null && _a2 !== void 0 ? _a2 : false;
          this.valueHexView = idBlock.valueHex ? pvtsutils__namespace.BufferSourceConverter.toUint8Array(idBlock.valueHex) : EMPTY_VIEW;
          this.tagClass = (_b = idBlock.tagClass) !== null && _b !== void 0 ? _b : -1;
          this.tagNumber = (_c = idBlock.tagNumber) !== null && _c !== void 0 ? _c : -1;
          this.isConstructed = (_d = idBlock.isConstructed) !== null && _d !== void 0 ? _d : false;
        } else {
          this.tagClass = -1;
          this.tagNumber = -1;
          this.isConstructed = false;
        }
      }
      toBER(sizeOnly = false) {
        let firstOctet = 0;
        switch (this.tagClass) {
          case 1:
            firstOctet |= 0;
            break;
          case 2:
            firstOctet |= 64;
            break;
          case 3:
            firstOctet |= 128;
            break;
          case 4:
            firstOctet |= 192;
            break;
          default:
            this.error = "Unknown tag class";
            return EMPTY_BUFFER;
        }
        if (this.isConstructed)
          firstOctet |= 32;
        if (this.tagNumber < 31 && !this.isHexOnly) {
          const retView2 = new Uint8Array(1);
          if (!sizeOnly) {
            let number = this.tagNumber;
            number &= 31;
            firstOctet |= number;
            retView2[0] = firstOctet;
          }
          return retView2.buffer;
        }
        if (!this.isHexOnly) {
          const encodedBuf = pvutils__namespace.utilToBase(this.tagNumber, 7);
          const encodedView = new Uint8Array(encodedBuf);
          const size = encodedBuf.byteLength;
          const retView2 = new Uint8Array(size + 1);
          retView2[0] = firstOctet | 31;
          if (!sizeOnly) {
            for (let i = 0; i < size - 1; i++)
              retView2[i + 1] = encodedView[i] | 128;
            retView2[size] = encodedView[size - 1];
          }
          return retView2.buffer;
        }
        const retView = new Uint8Array(this.valueHexView.byteLength + 1);
        retView[0] = firstOctet | 31;
        if (!sizeOnly) {
          const curView = this.valueHexView;
          for (let i = 0; i < curView.length - 1; i++)
            retView[i + 1] = curView[i] | 128;
          retView[this.valueHexView.byteLength] = curView[curView.length - 1];
        }
        return retView.buffer;
      }
      fromBER(inputBuffer, inputOffset, inputLength) {
        const inputView = pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer);
        if (!checkBufferParams(this, inputView, inputOffset, inputLength)) {
          return -1;
        }
        const intBuffer = inputView.subarray(inputOffset, inputOffset + inputLength);
        if (intBuffer.length === 0) {
          this.error = "Zero buffer length";
          return -1;
        }
        const tagClassMask = intBuffer[0] & 192;
        switch (tagClassMask) {
          case 0:
            this.tagClass = 1;
            break;
          case 64:
            this.tagClass = 2;
            break;
          case 128:
            this.tagClass = 3;
            break;
          case 192:
            this.tagClass = 4;
            break;
          default:
            this.error = "Unknown tag class";
            return -1;
        }
        this.isConstructed = (intBuffer[0] & 32) === 32;
        this.isHexOnly = false;
        const tagNumberMask = intBuffer[0] & 31;
        if (tagNumberMask !== 31) {
          this.tagNumber = tagNumberMask;
          this.blockLength = 1;
        } else {
          let count = 0;
          while (true) {
            const tagByteIndex = count + 1;
            if (tagByteIndex >= intBuffer.length) {
              this.error = "End of input reached before message was fully decoded";
              return -1;
            }
            count++;
            if ((intBuffer[tagByteIndex] & 128) === 0)
              break;
          }
          this.blockLength = count + 1;
          const intTagNumberBuffer = this.valueHexView = new Uint8Array(count);
          for (let i = 0; i < count; i++)
            intTagNumberBuffer[i] = intBuffer[i + 1] & 127;
          if (this.blockLength <= 9)
            this.tagNumber = pvutils__namespace.utilFromBase(intTagNumberBuffer, 7);
          else {
            this.isHexOnly = true;
            this.warnings.push("Tag too long, represented as hex-coded");
          }
        }
        if (this.tagClass === 1 && this.isConstructed) {
          switch (this.tagNumber) {
            case 1:
            case 2:
            case 5:
            case 6:
            case 9:
            case 13:
            case 14:
            case 23:
            case 24:
            case 31:
            case 32:
            case 33:
            case 34:
              this.error = "Constructed encoding used for primitive type";
              return -1;
          }
        }
        return inputOffset + this.blockLength;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          tagClass: this.tagClass,
          tagNumber: this.tagNumber,
          isConstructed: this.isConstructed
        };
      }
    };
    LocalIdentificationBlock.NAME = "identificationBlock";
    var LocalLengthBlock = class extends LocalBaseBlock {
      constructor({ lenBlock = {} } = {}) {
        var _a2, _b, _c;
        super();
        this.isIndefiniteForm = (_a2 = lenBlock.isIndefiniteForm) !== null && _a2 !== void 0 ? _a2 : false;
        this.longFormUsed = (_b = lenBlock.longFormUsed) !== null && _b !== void 0 ? _b : false;
        this.length = (_c = lenBlock.length) !== null && _c !== void 0 ? _c : 0;
      }
      fromBER(inputBuffer, inputOffset, inputLength) {
        const view = pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer);
        if (!checkBufferParams(this, view, inputOffset, inputLength)) {
          return -1;
        }
        const intBuffer = view.subarray(inputOffset, inputOffset + inputLength);
        if (intBuffer.length === 0) {
          this.error = "Zero buffer length";
          return -1;
        }
        if (intBuffer[0] === 255) {
          this.error = "Length block 0xFF is reserved by standard";
          return -1;
        }
        this.isIndefiniteForm = intBuffer[0] === 128;
        if (this.isIndefiniteForm) {
          this.blockLength = 1;
          return inputOffset + this.blockLength;
        }
        this.longFormUsed = !!(intBuffer[0] & 128);
        if (this.longFormUsed === false) {
          this.length = intBuffer[0];
          this.blockLength = 1;
          return inputOffset + this.blockLength;
        }
        const count = intBuffer[0] & 127;
        if (count > 8) {
          this.error = "Too big integer";
          return -1;
        }
        if (count + 1 > intBuffer.length) {
          this.error = "End of input reached before message was fully decoded";
          return -1;
        }
        const lenOffset = inputOffset + 1;
        const lengthBufferView = view.subarray(lenOffset, lenOffset + count);
        if (lengthBufferView[count - 1] === 0)
          this.warnings.push("Needlessly long encoded length");
        this.length = pvutils__namespace.utilFromBase(lengthBufferView, 8);
        if (this.longFormUsed && this.length <= 127)
          this.warnings.push("Unnecessary usage of long length form");
        this.blockLength = count + 1;
        return inputOffset + this.blockLength;
      }
      toBER(sizeOnly = false) {
        let retBuf;
        let retView;
        if (this.length > 127)
          this.longFormUsed = true;
        if (this.isIndefiniteForm) {
          retBuf = new ArrayBuffer(1);
          if (sizeOnly === false) {
            retView = new Uint8Array(retBuf);
            retView[0] = 128;
          }
          return retBuf;
        }
        if (this.longFormUsed) {
          const encodedBuf = pvutils__namespace.utilToBase(this.length, 8);
          if (encodedBuf.byteLength > 127) {
            this.error = "Too big length";
            return EMPTY_BUFFER;
          }
          retBuf = new ArrayBuffer(encodedBuf.byteLength + 1);
          if (sizeOnly)
            return retBuf;
          const encodedView = new Uint8Array(encodedBuf);
          retView = new Uint8Array(retBuf);
          retView[0] = encodedBuf.byteLength | 128;
          for (let i = 0; i < encodedBuf.byteLength; i++)
            retView[i + 1] = encodedView[i];
          return retBuf;
        }
        retBuf = new ArrayBuffer(1);
        if (sizeOnly === false) {
          retView = new Uint8Array(retBuf);
          retView[0] = this.length;
        }
        return retBuf;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          isIndefiniteForm: this.isIndefiniteForm,
          longFormUsed: this.longFormUsed,
          length: this.length
        };
      }
    };
    LocalLengthBlock.NAME = "lengthBlock";
    var typeStore = {};
    var BaseBlock = class extends LocalBaseBlock {
      constructor({ name = EMPTY_STRING, optional = false, primitiveSchema, ...parameters } = {}, valueBlockType) {
        super(parameters);
        this.name = name;
        this.optional = optional;
        if (primitiveSchema) {
          this.primitiveSchema = primitiveSchema;
        }
        this.idBlock = new LocalIdentificationBlock(parameters);
        this.lenBlock = new LocalLengthBlock(parameters);
        this.valueBlock = valueBlockType ? new valueBlockType(parameters) : new ValueBlock(parameters);
      }
      fromBER(inputBuffer, inputOffset, inputLength, context) {
        const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm ? inputLength : this.lenBlock.length, context);
        if (resultOffset === -1) {
          this.error = this.valueBlock.error;
          return resultOffset;
        }
        if (!this.idBlock.error.length)
          this.blockLength += this.idBlock.blockLength;
        if (!this.lenBlock.error.length)
          this.blockLength += this.lenBlock.blockLength;
        if (!this.valueBlock.error.length)
          this.blockLength += this.valueBlock.blockLength;
        return resultOffset;
      }
      toBER(sizeOnly, writer) {
        const _writer = writer || new ViewWriter();
        if (!writer) {
          prepareIndefiniteForm(this);
        }
        const idBlockBuf = this.idBlock.toBER(sizeOnly);
        _writer.write(idBlockBuf);
        if (this.lenBlock.isIndefiniteForm) {
          _writer.write(new Uint8Array([128]).buffer);
          this.valueBlock.toBER(sizeOnly, _writer);
          _writer.write(new ArrayBuffer(2));
        } else {
          const valueBlockBuf = this.valueBlock.toBER(sizeOnly);
          this.lenBlock.length = valueBlockBuf.byteLength;
          const lenBlockBuf = this.lenBlock.toBER(sizeOnly);
          _writer.write(lenBlockBuf);
          _writer.write(valueBlockBuf);
        }
        if (!writer) {
          return _writer.final();
        }
        return EMPTY_BUFFER;
      }
      toJSON() {
        const object = {
          ...super.toJSON(),
          idBlock: this.idBlock.toJSON(),
          lenBlock: this.lenBlock.toJSON(),
          valueBlock: this.valueBlock.toJSON(),
          name: this.name,
          optional: this.optional
        };
        if (this.primitiveSchema)
          object.primitiveSchema = this.primitiveSchema.toJSON();
        return object;
      }
      toString(encoding = "ascii") {
        if (encoding === "ascii") {
          return this.onAsciiEncoding();
        }
        return pvtsutils__namespace.Convert.ToHex(this.toBER());
      }
      onAsciiEncoding() {
        const name = this.constructor.NAME;
        const value = pvtsutils__namespace.Convert.ToHex(this.valueBlock.valueBeforeDecodeView);
        return `${name} : ${value}`;
      }
      isEqual(other) {
        if (this === other) {
          return true;
        }
        if (!(other instanceof this.constructor)) {
          return false;
        }
        const thisRaw = this.toBER();
        const otherRaw = other.toBER();
        return pvutils__namespace.isEqualBuffer(thisRaw, otherRaw);
      }
    };
    BaseBlock.NAME = "BaseBlock";
    function prepareIndefiniteForm(baseBlock) {
      var _a2;
      if (baseBlock instanceof typeStore.Constructed) {
        for (const value of baseBlock.valueBlock.value) {
          if (prepareIndefiniteForm(value)) {
            baseBlock.lenBlock.isIndefiniteForm = true;
          }
        }
      }
      return !!((_a2 = baseBlock.lenBlock) === null || _a2 === void 0 ? void 0 : _a2.isIndefiniteForm);
    }
    var BaseStringBlock = class extends BaseBlock {
      getValue() {
        return this.valueBlock.value;
      }
      setValue(value) {
        this.valueBlock.value = value;
      }
      constructor({ value = EMPTY_STRING, ...parameters } = {}, stringValueBlockType) {
        super(parameters, stringValueBlockType);
        if (value) {
          this.fromString(value);
        }
      }
      fromBER(inputBuffer, inputOffset, inputLength) {
        const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm ? inputLength : this.lenBlock.length);
        if (resultOffset === -1) {
          this.error = this.valueBlock.error;
          return resultOffset;
        }
        this.fromBuffer(this.valueBlock.valueHexView);
        if (!this.idBlock.error.length)
          this.blockLength += this.idBlock.blockLength;
        if (!this.lenBlock.error.length)
          this.blockLength += this.lenBlock.blockLength;
        if (!this.valueBlock.error.length)
          this.blockLength += this.valueBlock.blockLength;
        return resultOffset;
      }
      onAsciiEncoding() {
        return `${this.constructor.NAME} : '${this.valueBlock.value}'`;
      }
    };
    BaseStringBlock.NAME = "BaseStringBlock";
    var LocalPrimitiveValueBlock = class extends HexBlock(ValueBlock) {
      constructor({ isHexOnly = true, ...parameters } = {}) {
        super(parameters);
        this.isHexOnly = isHexOnly;
      }
    };
    LocalPrimitiveValueBlock.NAME = "PrimitiveValueBlock";
    var _a$w;
    var Primitive = class extends BaseBlock {
      constructor(parameters = {}) {
        super(parameters, LocalPrimitiveValueBlock);
        this.idBlock.isConstructed = false;
      }
    };
    _a$w = Primitive;
    (() => {
      typeStore.Primitive = _a$w;
    })();
    Primitive.NAME = "PRIMITIVE";
    var DEFAULT_MAX_DEPTH = 100;
    var DEFAULT_MAX_NODES = 1e4;
    var DEFAULT_MAX_CONTENT_LENGTH = 16 * 1024 * 1024;
    var MAX_DEPTH_EXCEEDED_ERROR = "Maximum ASN.1 nesting depth exceeded";
    var MAX_NODES_EXCEEDED_ERROR = "Maximum ASN.1 node count exceeded";
    var MAX_CONTENT_LENGTH_EXCEEDED_ERROR = "Maximum ASN.1 content length exceeded";
    function createFromBerContext(options = {}) {
      var _a2, _b, _c;
      return {
        depth: 0,
        maxDepth: (_a2 = options.maxDepth) !== null && _a2 !== void 0 ? _a2 : DEFAULT_MAX_DEPTH,
        nodesCount: 0,
        maxNodes: (_b = options.maxNodes) !== null && _b !== void 0 ? _b : DEFAULT_MAX_NODES,
        maxContentLength: (_c = options.maxContentLength) !== null && _c !== void 0 ? _c : DEFAULT_MAX_CONTENT_LENGTH
      };
    }
    function createErrorResult(error) {
      const result = new BaseBlock({}, ValueBlock);
      result.error = error;
      return {
        offset: -1,
        result
      };
    }
    function checkNodesLimit(context) {
      context.nodesCount += 1;
      if (context.nodesCount > context.maxNodes) {
        return MAX_NODES_EXCEEDED_ERROR;
      }
      return void 0;
    }
    function checkContentLengthLimit(inputLength, context) {
      if (inputLength > context.maxContentLength) {
        return MAX_CONTENT_LENGTH_EXCEEDED_ERROR;
      }
      return void 0;
    }
    function localFromBERWithChildContext(inputBuffer, inputOffset, inputLength, context) {
      const childDepth = context.depth + 1;
      if (childDepth > context.maxDepth) {
        return createErrorResult(MAX_DEPTH_EXCEEDED_ERROR);
      }
      context.depth = childDepth;
      try {
        return localFromBER(inputBuffer, inputOffset, inputLength, context);
      } finally {
        context.depth -= 1;
      }
    }
    function localChangeType(inputObject, newType) {
      if (inputObject instanceof newType) {
        return inputObject;
      }
      const newObject = new newType();
      newObject.idBlock = inputObject.idBlock;
      newObject.lenBlock = inputObject.lenBlock;
      newObject.warnings = inputObject.warnings;
      newObject.valueBeforeDecodeView = inputObject.valueBeforeDecodeView;
      return newObject;
    }
    function localFromBER(inputBuffer, inputOffset = 0, inputLength = inputBuffer.length, context = createFromBerContext()) {
      const incomingOffset = inputOffset;
      let returnObject = new BaseBlock({}, ValueBlock);
      const baseBlock = new LocalBaseBlock();
      if (!checkBufferParams(baseBlock, inputBuffer, inputOffset, inputLength)) {
        returnObject.error = baseBlock.error;
        return {
          offset: -1,
          result: returnObject
        };
      }
      const intBuffer = inputBuffer.subarray(inputOffset, inputOffset + inputLength);
      if (!intBuffer.length) {
        returnObject.error = "Zero buffer length";
        return {
          offset: -1,
          result: returnObject
        };
      }
      const nodesLimitError = checkNodesLimit(context);
      if (nodesLimitError) {
        returnObject.error = nodesLimitError;
        return {
          offset: -1,
          result: returnObject
        };
      }
      let resultOffset = returnObject.idBlock.fromBER(inputBuffer, inputOffset, inputLength);
      if (returnObject.idBlock.warnings.length) {
        returnObject.warnings.concat(returnObject.idBlock.warnings);
      }
      if (resultOffset === -1) {
        returnObject.error = returnObject.idBlock.error;
        return {
          offset: -1,
          result: returnObject
        };
      }
      inputOffset = resultOffset;
      inputLength -= returnObject.idBlock.blockLength;
      resultOffset = returnObject.lenBlock.fromBER(inputBuffer, inputOffset, inputLength);
      if (returnObject.lenBlock.warnings.length) {
        returnObject.warnings.concat(returnObject.lenBlock.warnings);
      }
      if (resultOffset === -1) {
        returnObject.error = returnObject.lenBlock.error;
        return {
          offset: -1,
          result: returnObject
        };
      }
      inputOffset = resultOffset;
      inputLength -= returnObject.lenBlock.blockLength;
      const valueLength = returnObject.lenBlock.isIndefiniteForm ? inputLength : returnObject.lenBlock.length;
      const contentLengthError = checkContentLengthLimit(valueLength, context);
      if (contentLengthError) {
        returnObject.error = contentLengthError;
        return {
          offset: -1,
          result: returnObject
        };
      }
      if (!returnObject.idBlock.isConstructed && returnObject.lenBlock.isIndefiniteForm) {
        returnObject.error = "Indefinite length form used for primitive encoding form";
        return {
          offset: -1,
          result: returnObject
        };
      }
      let newASN1Type = BaseBlock;
      switch (returnObject.idBlock.tagClass) {
        case 1:
          if (returnObject.idBlock.tagNumber >= 37 && returnObject.idBlock.isHexOnly === false) {
            returnObject.error = "UNIVERSAL 37 and upper tags are reserved by ASN.1 standard";
            return {
              offset: -1,
              result: returnObject
            };
          }
          switch (returnObject.idBlock.tagNumber) {
            case 0:
              if (returnObject.idBlock.isConstructed && returnObject.lenBlock.length > 0) {
                returnObject.error = "Type [UNIVERSAL 0] is reserved";
                return {
                  offset: -1,
                  result: returnObject
                };
              }
              newASN1Type = typeStore.EndOfContent;
              break;
            case 1:
              newASN1Type = typeStore.Boolean;
              break;
            case 2:
              newASN1Type = typeStore.Integer;
              break;
            case 3:
              newASN1Type = typeStore.BitString;
              break;
            case 4:
              newASN1Type = typeStore.OctetString;
              break;
            case 5:
              newASN1Type = typeStore.Null;
              break;
            case 6:
              newASN1Type = typeStore.ObjectIdentifier;
              break;
            case 10:
              newASN1Type = typeStore.Enumerated;
              break;
            case 12:
              newASN1Type = typeStore.Utf8String;
              break;
            case 13:
              newASN1Type = typeStore.RelativeObjectIdentifier;
              break;
            case 14:
              newASN1Type = typeStore.TIME;
              break;
            case 15:
              returnObject.error = "[UNIVERSAL 15] is reserved by ASN.1 standard";
              return {
                offset: -1,
                result: returnObject
              };
            case 16:
              newASN1Type = typeStore.Sequence;
              break;
            case 17:
              newASN1Type = typeStore.Set;
              break;
            case 18:
              newASN1Type = typeStore.NumericString;
              break;
            case 19:
              newASN1Type = typeStore.PrintableString;
              break;
            case 20:
              newASN1Type = typeStore.TeletexString;
              break;
            case 21:
              newASN1Type = typeStore.VideotexString;
              break;
            case 22:
              newASN1Type = typeStore.IA5String;
              break;
            case 23:
              newASN1Type = typeStore.UTCTime;
              break;
            case 24:
              newASN1Type = typeStore.GeneralizedTime;
              break;
            case 25:
              newASN1Type = typeStore.GraphicString;
              break;
            case 26:
              newASN1Type = typeStore.VisibleString;
              break;
            case 27:
              newASN1Type = typeStore.GeneralString;
              break;
            case 28:
              newASN1Type = typeStore.UniversalString;
              break;
            case 29:
              newASN1Type = typeStore.CharacterString;
              break;
            case 30:
              newASN1Type = typeStore.BmpString;
              break;
            case 31:
              newASN1Type = typeStore.DATE;
              break;
            case 32:
              newASN1Type = typeStore.TimeOfDay;
              break;
            case 33:
              newASN1Type = typeStore.DateTime;
              break;
            case 34:
              newASN1Type = typeStore.Duration;
              break;
            default: {
              const newObject = returnObject.idBlock.isConstructed ? new typeStore.Constructed() : new typeStore.Primitive();
              newObject.idBlock = returnObject.idBlock;
              newObject.lenBlock = returnObject.lenBlock;
              newObject.warnings = returnObject.warnings;
              returnObject = newObject;
            }
          }
          break;
        case 2:
        case 3:
        case 4:
        default: {
          newASN1Type = returnObject.idBlock.isConstructed ? typeStore.Constructed : typeStore.Primitive;
        }
      }
      returnObject = localChangeType(returnObject, newASN1Type);
      resultOffset = returnObject.fromBER(inputBuffer, inputOffset, valueLength, context);
      returnObject.valueBeforeDecodeView = inputBuffer.subarray(incomingOffset, incomingOffset + returnObject.blockLength);
      return {
        offset: resultOffset,
        result: returnObject
      };
    }
    function fromBER(inputBuffer, options = {}) {
      if (!inputBuffer.byteLength) {
        const result = new BaseBlock({}, ValueBlock);
        result.error = "Input buffer has zero length";
        return {
          offset: -1,
          result
        };
      }
      return localFromBER(pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer).slice(), 0, inputBuffer.byteLength, createFromBerContext(options));
    }
    function checkLen(indefiniteLength, length) {
      if (indefiniteLength) {
        return 1;
      }
      return length;
    }
    var LocalConstructedValueBlock = class extends ValueBlock {
      constructor({ value = [], isIndefiniteForm = false, ...parameters } = {}) {
        super(parameters);
        this.value = value;
        this.isIndefiniteForm = isIndefiniteForm;
      }
      fromBER(inputBuffer, inputOffset, inputLength, context) {
        const view = pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer);
        const parseContext = context !== null && context !== void 0 ? context : createFromBerContext();
        if (!checkBufferParams(this, view, inputOffset, inputLength)) {
          return -1;
        }
        this.valueBeforeDecodeView = view.subarray(inputOffset, inputOffset + inputLength);
        if (this.valueBeforeDecodeView.length === 0) {
          this.warnings.push("Zero buffer length");
          return inputOffset;
        }
        let currentOffset = inputOffset;
        while (checkLen(this.isIndefiniteForm, inputLength) > 0) {
          const returnObject = localFromBERWithChildContext(view, currentOffset, inputLength, parseContext);
          if (returnObject.offset === -1) {
            this.error = returnObject.result.error;
            this.warnings.concat(returnObject.result.warnings);
            return -1;
          }
          currentOffset = returnObject.offset;
          this.blockLength += returnObject.result.blockLength;
          inputLength -= returnObject.result.blockLength;
          this.value.push(returnObject.result);
          if (this.isIndefiniteForm && returnObject.result.constructor.NAME === END_OF_CONTENT_NAME) {
            break;
          }
        }
        if (this.isIndefiniteForm) {
          if (this.value[this.value.length - 1].constructor.NAME === END_OF_CONTENT_NAME) {
            this.value.pop();
          } else {
            this.warnings.push("No EndOfContent block encoded");
          }
        }
        return currentOffset;
      }
      toBER(sizeOnly, writer) {
        const _writer = writer || new ViewWriter();
        for (let i = 0; i < this.value.length; i++) {
          this.value[i].toBER(sizeOnly, _writer);
        }
        if (!writer) {
          return _writer.final();
        }
        return EMPTY_BUFFER;
      }
      toJSON() {
        const object = {
          ...super.toJSON(),
          isIndefiniteForm: this.isIndefiniteForm,
          value: []
        };
        for (const value of this.value) {
          object.value.push(value.toJSON());
        }
        return object;
      }
    };
    LocalConstructedValueBlock.NAME = "ConstructedValueBlock";
    var _a$v;
    var Constructed = class extends BaseBlock {
      constructor(parameters = {}) {
        super(parameters, LocalConstructedValueBlock);
        this.idBlock.isConstructed = true;
      }
      fromBER(inputBuffer, inputOffset, inputLength, context) {
        this.valueBlock.isIndefiniteForm = this.lenBlock.isIndefiniteForm;
        const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm ? inputLength : this.lenBlock.length, context);
        if (resultOffset === -1) {
          this.error = this.valueBlock.error;
          return resultOffset;
        }
        if (!this.idBlock.error.length)
          this.blockLength += this.idBlock.blockLength;
        if (!this.lenBlock.error.length)
          this.blockLength += this.lenBlock.blockLength;
        if (!this.valueBlock.error.length)
          this.blockLength += this.valueBlock.blockLength;
        return resultOffset;
      }
      onAsciiEncoding() {
        const values = [];
        for (const value of this.valueBlock.value) {
          values.push(value.toString("ascii").split("\n").map((o) => `  ${o}`).join("\n"));
        }
        const blockName = this.idBlock.tagClass === 3 ? `[${this.idBlock.tagNumber}]` : this.constructor.NAME;
        return values.length ? `${blockName} :
${values.join("\n")}` : `${blockName} :`;
      }
    };
    _a$v = Constructed;
    (() => {
      typeStore.Constructed = _a$v;
    })();
    Constructed.NAME = "CONSTRUCTED";
    var LocalEndOfContentValueBlock = class extends ValueBlock {
      fromBER(inputBuffer, inputOffset, _inputLength) {
        return inputOffset;
      }
      toBER(_sizeOnly) {
        return EMPTY_BUFFER;
      }
    };
    LocalEndOfContentValueBlock.override = "EndOfContentValueBlock";
    var _a$u;
    var EndOfContent = class extends BaseBlock {
      constructor(parameters = {}) {
        super(parameters, LocalEndOfContentValueBlock);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 0;
      }
    };
    _a$u = EndOfContent;
    (() => {
      typeStore.EndOfContent = _a$u;
    })();
    EndOfContent.NAME = END_OF_CONTENT_NAME;
    var _a$t;
    var Null = class extends BaseBlock {
      constructor(parameters = {}) {
        super(parameters, ValueBlock);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 5;
      }
      fromBER(inputBuffer, inputOffset, inputLength) {
        if (this.lenBlock.length > 0)
          this.warnings.push("Non-zero length of value block for Null type");
        if (!this.idBlock.error.length)
          this.blockLength += this.idBlock.blockLength;
        if (!this.lenBlock.error.length)
          this.blockLength += this.lenBlock.blockLength;
        this.blockLength += inputLength;
        if (inputOffset + inputLength > inputBuffer.byteLength) {
          this.error = "End of input reached before message was fully decoded (inconsistent offset and length values)";
          return -1;
        }
        return inputOffset + inputLength;
      }
      toBER(sizeOnly, writer) {
        const retBuf = new ArrayBuffer(2);
        if (!sizeOnly) {
          const retView = new Uint8Array(retBuf);
          retView[0] = 5;
          retView[1] = 0;
        }
        if (writer) {
          writer.write(retBuf);
        }
        return retBuf;
      }
      onAsciiEncoding() {
        return `${this.constructor.NAME}`;
      }
    };
    _a$t = Null;
    (() => {
      typeStore.Null = _a$t;
    })();
    Null.NAME = "NULL";
    var LocalBooleanValueBlock = class extends HexBlock(ValueBlock) {
      get value() {
        for (const octet of this.valueHexView) {
          if (octet > 0) {
            return true;
          }
        }
        return false;
      }
      set value(value) {
        this.valueHexView[0] = value ? 255 : 0;
      }
      constructor({ value, ...parameters } = {}) {
        super(parameters);
        if (parameters.valueHex) {
          this.valueHexView = pvtsutils__namespace.BufferSourceConverter.toUint8Array(parameters.valueHex);
        } else {
          this.valueHexView = new Uint8Array(1);
        }
        if (value) {
          this.value = value;
        }
      }
      fromBER(inputBuffer, inputOffset, inputLength) {
        const inputView = pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer);
        if (!checkBufferParams(this, inputView, inputOffset, inputLength)) {
          return -1;
        }
        this.valueHexView = inputView.subarray(inputOffset, inputOffset + inputLength);
        if (inputLength > 1)
          this.warnings.push("Boolean value encoded in more then 1 octet");
        this.isHexOnly = true;
        pvutils__namespace.utilDecodeTC.call(this);
        this.blockLength = inputLength;
        return inputOffset + inputLength;
      }
      toBER() {
        return this.valueHexView.slice();
      }
      toJSON() {
        return {
          ...super.toJSON(),
          value: this.value
        };
      }
    };
    LocalBooleanValueBlock.NAME = "BooleanValueBlock";
    var _a$s;
    var Boolean2 = class extends BaseBlock {
      getValue() {
        return this.valueBlock.value;
      }
      setValue(value) {
        this.valueBlock.value = value;
      }
      constructor(parameters = {}) {
        super(parameters, LocalBooleanValueBlock);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 1;
      }
      onAsciiEncoding() {
        return `${this.constructor.NAME} : ${this.getValue}`;
      }
    };
    _a$s = Boolean2;
    (() => {
      typeStore.Boolean = _a$s;
    })();
    Boolean2.NAME = "BOOLEAN";
    var LocalOctetStringValueBlock = class extends HexBlock(LocalConstructedValueBlock) {
      constructor({ isConstructed = false, ...parameters } = {}) {
        super(parameters);
        this.isConstructed = isConstructed;
      }
      fromBER(inputBuffer, inputOffset, inputLength, context) {
        let resultOffset = 0;
        if (this.isConstructed) {
          this.isHexOnly = false;
          resultOffset = LocalConstructedValueBlock.prototype.fromBER.call(this, inputBuffer, inputOffset, inputLength, context);
          if (resultOffset === -1)
            return resultOffset;
          for (let i = 0; i < this.value.length; i++) {
            const currentBlockName = this.value[i].constructor.NAME;
            if (currentBlockName === END_OF_CONTENT_NAME) {
              if (this.isIndefiniteForm)
                break;
              else {
                this.error = "EndOfContent is unexpected, OCTET STRING may consists of OCTET STRINGs only";
                return -1;
              }
            }
            if (currentBlockName !== OCTET_STRING_NAME) {
              this.error = "OCTET STRING may consists of OCTET STRINGs only";
              return -1;
            }
          }
        } else {
          this.isHexOnly = true;
          resultOffset = super.fromBER(inputBuffer, inputOffset, inputLength);
          this.blockLength = inputLength;
        }
        return resultOffset;
      }
      toBER(sizeOnly, writer) {
        if (this.isConstructed)
          return LocalConstructedValueBlock.prototype.toBER.call(this, sizeOnly, writer);
        return sizeOnly ? new ArrayBuffer(this.valueHexView.byteLength) : this.valueHexView.slice().buffer;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          isConstructed: this.isConstructed
        };
      }
    };
    LocalOctetStringValueBlock.NAME = "OctetStringValueBlock";
    var _a$r;
    var OctetString = class extends BaseBlock {
      constructor({ idBlock = {}, lenBlock = {}, ...parameters } = {}) {
        var _b, _c;
        (_b = parameters.isConstructed) !== null && _b !== void 0 ? _b : parameters.isConstructed = !!((_c = parameters.value) === null || _c === void 0 ? void 0 : _c.length);
        super({
          idBlock: {
            isConstructed: parameters.isConstructed,
            ...idBlock
          },
          lenBlock: {
            ...lenBlock,
            isIndefiniteForm: !!parameters.isIndefiniteForm
          },
          ...parameters
        }, LocalOctetStringValueBlock);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 4;
      }
      fromBER(inputBuffer, inputOffset, inputLength, context) {
        this.valueBlock.isConstructed = this.idBlock.isConstructed;
        this.valueBlock.isIndefiniteForm = this.lenBlock.isIndefiniteForm;
        if (inputLength === 0) {
          if (this.idBlock.error.length === 0)
            this.blockLength += this.idBlock.blockLength;
          if (this.lenBlock.error.length === 0)
            this.blockLength += this.lenBlock.blockLength;
          return inputOffset;
        }
        if (!this.valueBlock.isConstructed) {
          const view = inputBuffer instanceof ArrayBuffer ? new Uint8Array(inputBuffer) : inputBuffer;
          const buf = view.subarray(inputOffset, inputOffset + inputLength);
          try {
            if (buf.byteLength) {
              const parseContext = context !== null && context !== void 0 ? context : createFromBerContext();
              const asn = localFromBERWithChildContext(buf, 0, buf.byteLength, parseContext);
              if (asn.offset !== -1 && asn.offset === inputLength) {
                this.valueBlock.value = [asn.result];
              }
            }
          } catch {
          }
        }
        return super.fromBER(inputBuffer, inputOffset, inputLength, context);
      }
      onAsciiEncoding() {
        if (this.valueBlock.isConstructed || this.valueBlock.value && this.valueBlock.value.length) {
          return Constructed.prototype.onAsciiEncoding.call(this);
        }
        const name = this.constructor.NAME;
        const value = pvtsutils__namespace.Convert.ToHex(this.valueBlock.valueHexView);
        return `${name} : ${value}`;
      }
      getValue() {
        if (!this.idBlock.isConstructed) {
          return this.valueBlock.valueHexView.slice().buffer;
        }
        const array = [];
        for (const content of this.valueBlock.value) {
          if (content instanceof _a$r) {
            array.push(content.valueBlock.valueHexView);
          }
        }
        return pvtsutils__namespace.BufferSourceConverter.concat(array);
      }
    };
    _a$r = OctetString;
    (() => {
      typeStore.OctetString = _a$r;
    })();
    OctetString.NAME = OCTET_STRING_NAME;
    var LocalBitStringValueBlock = class extends HexBlock(LocalConstructedValueBlock) {
      constructor({ unusedBits = 0, isConstructed = false, ...parameters } = {}) {
        super(parameters);
        this.unusedBits = unusedBits;
        this.isConstructed = isConstructed;
        this.blockLength = this.valueHexView.byteLength;
      }
      fromBER(inputBuffer, inputOffset, inputLength, context) {
        if (!inputLength) {
          return inputOffset;
        }
        let resultOffset = -1;
        if (this.isConstructed) {
          resultOffset = LocalConstructedValueBlock.prototype.fromBER.call(this, inputBuffer, inputOffset, inputLength, context);
          if (resultOffset === -1)
            return resultOffset;
          for (const value of this.value) {
            const currentBlockName = value.constructor.NAME;
            if (currentBlockName === END_OF_CONTENT_NAME) {
              if (this.isIndefiniteForm)
                break;
              else {
                this.error = "EndOfContent is unexpected, BIT STRING may consists of BIT STRINGs only";
                return -1;
              }
            }
            if (currentBlockName !== BIT_STRING_NAME) {
              this.error = "BIT STRING may consists of BIT STRINGs only";
              return -1;
            }
            const valueBlock = value.valueBlock;
            if (this.unusedBits > 0 && valueBlock.unusedBits > 0) {
              this.error = 'Using of "unused bits" inside constructive BIT STRING allowed for least one only';
              return -1;
            }
            this.unusedBits = valueBlock.unusedBits;
          }
          return resultOffset;
        }
        const inputView = pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer);
        if (!checkBufferParams(this, inputView, inputOffset, inputLength)) {
          return -1;
        }
        const intBuffer = inputView.subarray(inputOffset, inputOffset + inputLength);
        this.unusedBits = intBuffer[0];
        if (this.unusedBits > 7) {
          this.error = "Unused bits for BitString must be in range 0-7";
          return -1;
        }
        if (!this.unusedBits) {
          const buf = intBuffer.subarray(1);
          try {
            if (buf.byteLength) {
              const parseContext = context !== null && context !== void 0 ? context : createFromBerContext();
              const asn = localFromBERWithChildContext(buf, 0, buf.byteLength, parseContext);
              if (asn.offset !== -1 && asn.offset === inputLength - 1) {
                this.value = [asn.result];
              }
            }
          } catch {
          }
        }
        this.valueHexView = intBuffer.subarray(1);
        this.blockLength = intBuffer.length;
        return inputOffset + inputLength;
      }
      toBER(sizeOnly, writer) {
        if (this.isConstructed) {
          return LocalConstructedValueBlock.prototype.toBER.call(this, sizeOnly, writer);
        }
        if (sizeOnly) {
          return new ArrayBuffer(this.valueHexView.byteLength + 1);
        }
        if (!this.valueHexView.byteLength) {
          const empty = new Uint8Array(1);
          empty[0] = 0;
          return empty.buffer;
        }
        const retView = new Uint8Array(this.valueHexView.length + 1);
        retView[0] = this.unusedBits;
        retView.set(this.valueHexView, 1);
        return retView.buffer;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          unusedBits: this.unusedBits,
          isConstructed: this.isConstructed
        };
      }
    };
    LocalBitStringValueBlock.NAME = "BitStringValueBlock";
    var _a$q;
    var BitString = class extends BaseBlock {
      constructor({ idBlock = {}, lenBlock = {}, ...parameters } = {}) {
        var _b, _c;
        (_b = parameters.isConstructed) !== null && _b !== void 0 ? _b : parameters.isConstructed = !!((_c = parameters.value) === null || _c === void 0 ? void 0 : _c.length);
        super({
          idBlock: {
            isConstructed: parameters.isConstructed,
            ...idBlock
          },
          lenBlock: {
            ...lenBlock,
            isIndefiniteForm: !!parameters.isIndefiniteForm
          },
          ...parameters
        }, LocalBitStringValueBlock);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 3;
      }
      fromBER(inputBuffer, inputOffset, inputLength, context) {
        this.valueBlock.isConstructed = this.idBlock.isConstructed;
        this.valueBlock.isIndefiniteForm = this.lenBlock.isIndefiniteForm;
        return super.fromBER(inputBuffer, inputOffset, inputLength, context);
      }
      onAsciiEncoding() {
        if (this.valueBlock.isConstructed || this.valueBlock.value && this.valueBlock.value.length) {
          return Constructed.prototype.onAsciiEncoding.call(this);
        } else {
          const bits = [];
          const valueHex = this.valueBlock.valueHexView;
          for (const byte of valueHex) {
            bits.push(byte.toString(2).padStart(8, "0"));
          }
          const bitsStr = bits.join("");
          const name = this.constructor.NAME;
          const value = bitsStr.substring(0, bitsStr.length - this.valueBlock.unusedBits);
          return `${name} : ${value}`;
        }
      }
    };
    _a$q = BitString;
    (() => {
      typeStore.BitString = _a$q;
    })();
    BitString.NAME = BIT_STRING_NAME;
    var _a$p;
    function viewAdd(first, second) {
      const c = new Uint8Array([0]);
      const firstView = new Uint8Array(first);
      const secondView = new Uint8Array(second);
      let firstViewCopy = firstView.slice(0);
      const firstViewCopyLength = firstViewCopy.length - 1;
      const secondViewCopy = secondView.slice(0);
      const secondViewCopyLength = secondViewCopy.length - 1;
      let value = 0;
      const max = secondViewCopyLength < firstViewCopyLength ? firstViewCopyLength : secondViewCopyLength;
      let counter = 0;
      for (let i = max; i >= 0; i--, counter++) {
        switch (true) {
          case counter < secondViewCopy.length:
            value = firstViewCopy[firstViewCopyLength - counter] + secondViewCopy[secondViewCopyLength - counter] + c[0];
            break;
          default:
            value = firstViewCopy[firstViewCopyLength - counter] + c[0];
        }
        c[0] = value / 10;
        switch (true) {
          case counter >= firstViewCopy.length:
            firstViewCopy = pvutils__namespace.utilConcatView(new Uint8Array([value % 10]), firstViewCopy);
            break;
          default:
            firstViewCopy[firstViewCopyLength - counter] = value % 10;
        }
      }
      if (c[0] > 0)
        firstViewCopy = pvutils__namespace.utilConcatView(c, firstViewCopy);
      return firstViewCopy;
    }
    function power2(n) {
      if (n >= powers2.length) {
        for (let p = powers2.length; p <= n; p++) {
          const c = new Uint8Array([0]);
          let digits = powers2[p - 1].slice(0);
          for (let i = digits.length - 1; i >= 0; i--) {
            const newValue = new Uint8Array([(digits[i] << 1) + c[0]]);
            c[0] = newValue[0] / 10;
            digits[i] = newValue[0] % 10;
          }
          if (c[0] > 0)
            digits = pvutils__namespace.utilConcatView(c, digits);
          powers2.push(digits);
        }
      }
      return powers2[n];
    }
    function viewSub(first, second) {
      let b = 0;
      const firstView = new Uint8Array(first);
      const secondView = new Uint8Array(second);
      const firstViewCopy = firstView.slice(0);
      const firstViewCopyLength = firstViewCopy.length - 1;
      const secondViewCopy = secondView.slice(0);
      const secondViewCopyLength = secondViewCopy.length - 1;
      let value;
      let counter = 0;
      for (let i = secondViewCopyLength; i >= 0; i--, counter++) {
        value = firstViewCopy[firstViewCopyLength - counter] - secondViewCopy[secondViewCopyLength - counter] - b;
        switch (true) {
          case value < 0:
            b = 1;
            firstViewCopy[firstViewCopyLength - counter] = value + 10;
            break;
          default:
            b = 0;
            firstViewCopy[firstViewCopyLength - counter] = value;
        }
      }
      if (b > 0) {
        for (let i = firstViewCopyLength - secondViewCopyLength + 1; i >= 0; i--, counter++) {
          value = firstViewCopy[firstViewCopyLength - counter] - b;
          if (value < 0) {
            b = 1;
            firstViewCopy[firstViewCopyLength - counter] = value + 10;
          } else {
            b = 0;
            firstViewCopy[firstViewCopyLength - counter] = value;
            break;
          }
        }
      }
      return firstViewCopy.slice();
    }
    var LocalIntegerValueBlock = class extends HexBlock(ValueBlock) {
      setValueHex() {
        if (this.valueHexView.length >= 4) {
          this.warnings.push("Too big Integer for decoding, hex only");
          this.isHexOnly = true;
          this._valueDec = 0;
        } else {
          this.isHexOnly = false;
          if (this.valueHexView.length > 0) {
            this._valueDec = pvutils__namespace.utilDecodeTC.call(this);
          }
        }
      }
      constructor({ value, ...parameters } = {}) {
        super(parameters);
        this._valueDec = 0;
        if (parameters.valueHex) {
          this.setValueHex();
        }
        if (value !== void 0) {
          this.valueDec = value;
        }
      }
      set valueDec(v) {
        this._valueDec = v;
        this.isHexOnly = false;
        this.valueHexView = new Uint8Array(pvutils__namespace.utilEncodeTC(v));
      }
      get valueDec() {
        return this._valueDec;
      }
      fromDER(inputBuffer, inputOffset, inputLength, expectedLength = 0) {
        const offset = this.fromBER(inputBuffer, inputOffset, inputLength);
        if (offset === -1)
          return offset;
        const view = this.valueHexView;
        if (view[0] === 0 && (view[1] & 128) !== 0) {
          this.valueHexView = view.subarray(1);
        } else {
          if (expectedLength !== 0) {
            if (view.length < expectedLength) {
              if (expectedLength - view.length > 1)
                expectedLength = view.length + 1;
              this.valueHexView = view.subarray(expectedLength - view.length);
            }
          }
        }
        return offset;
      }
      toDER(sizeOnly = false) {
        const view = this.valueHexView;
        switch (true) {
          case (view[0] & 128) !== 0:
            {
              const updatedView = new Uint8Array(this.valueHexView.length + 1);
              updatedView[0] = 0;
              updatedView.set(view, 1);
              this.valueHexView = updatedView;
            }
            break;
          case (view[0] === 0 && (view[1] & 128) === 0):
            {
              this.valueHexView = this.valueHexView.subarray(1);
            }
            break;
        }
        return this.toBER(sizeOnly);
      }
      fromBER(inputBuffer, inputOffset, inputLength) {
        const resultOffset = super.fromBER(inputBuffer, inputOffset, inputLength);
        if (resultOffset === -1) {
          return resultOffset;
        }
        this.setValueHex();
        return resultOffset;
      }
      toBER(sizeOnly) {
        return sizeOnly ? new ArrayBuffer(this.valueHexView.length) : this.valueHexView.slice().buffer;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          valueDec: this.valueDec
        };
      }
      toString() {
        const firstBit = this.valueHexView.length * 8 - 1;
        let digits = new Uint8Array(this.valueHexView.length * 8 / 3);
        let bitNumber = 0;
        let currentByte;
        const asn1View = this.valueHexView;
        let result = "";
        let flag = false;
        for (let byteNumber = asn1View.byteLength - 1; byteNumber >= 0; byteNumber--) {
          currentByte = asn1View[byteNumber];
          for (let i = 0; i < 8; i++) {
            if ((currentByte & 1) === 1) {
              switch (bitNumber) {
                case firstBit:
                  digits = viewSub(power2(bitNumber), digits);
                  result = "-";
                  break;
                default:
                  digits = viewAdd(digits, power2(bitNumber));
              }
            }
            bitNumber++;
            currentByte >>= 1;
          }
        }
        for (let i = 0; i < digits.length; i++) {
          if (digits[i])
            flag = true;
          if (flag)
            result += digitsString.charAt(digits[i]);
        }
        if (flag === false)
          result += digitsString.charAt(0);
        return result;
      }
    };
    _a$p = LocalIntegerValueBlock;
    LocalIntegerValueBlock.NAME = "IntegerValueBlock";
    (() => {
      Object.defineProperty(_a$p.prototype, "valueHex", {
        set: function(v) {
          this.valueHexView = new Uint8Array(v);
          this.setValueHex();
        },
        get: function() {
          return this.valueHexView.slice().buffer;
        }
      });
    })();
    var _a$o;
    var Integer = class extends BaseBlock {
      constructor(parameters = {}) {
        super(parameters, LocalIntegerValueBlock);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 2;
      }
      toBigInt() {
        assertBigInt();
        return BigInt(this.valueBlock.toString());
      }
      static fromBigInt(value) {
        assertBigInt();
        const bigIntValue = BigInt(value);
        const writer = new ViewWriter();
        const hex = bigIntValue.toString(16).replace(/^-/, "");
        const view = new Uint8Array(pvtsutils__namespace.Convert.FromHex(hex));
        if (bigIntValue < 0) {
          const first = new Uint8Array(view.length + (view[0] & 128 ? 1 : 0));
          first[0] |= 128;
          const firstInt = BigInt(`0x${pvtsutils__namespace.Convert.ToHex(first)}`);
          const secondInt = firstInt + bigIntValue;
          const second = pvtsutils__namespace.BufferSourceConverter.toUint8Array(pvtsutils__namespace.Convert.FromHex(secondInt.toString(16)));
          second[0] |= 128;
          writer.write(second);
        } else {
          if (view[0] & 128) {
            writer.write(new Uint8Array([0]));
          }
          writer.write(view);
        }
        const res = new _a$o({ valueHex: writer.final() });
        return res;
      }
      convertToDER() {
        const integer = new _a$o({ valueHex: this.valueBlock.valueHexView });
        integer.valueBlock.toDER();
        return integer;
      }
      convertFromDER() {
        return new _a$o({
          valueHex: this.valueBlock.valueHexView[0] === 0 ? this.valueBlock.valueHexView.subarray(1) : this.valueBlock.valueHexView
        });
      }
      onAsciiEncoding() {
        return `${this.constructor.NAME} : ${this.valueBlock.toString()}`;
      }
    };
    _a$o = Integer;
    (() => {
      typeStore.Integer = _a$o;
    })();
    Integer.NAME = "INTEGER";
    var _a$n;
    var Enumerated = class extends Integer {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 10;
      }
    };
    _a$n = Enumerated;
    (() => {
      typeStore.Enumerated = _a$n;
    })();
    Enumerated.NAME = "ENUMERATED";
    var LocalSidValueBlock = class extends HexBlock(ValueBlock) {
      constructor({ valueDec = -1, isFirstSid = false, ...parameters } = {}) {
        super(parameters);
        this.valueDec = valueDec;
        this.isFirstSid = isFirstSid;
      }
      fromBER(inputBuffer, inputOffset, inputLength) {
        if (!inputLength) {
          return inputOffset;
        }
        const inputView = pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer);
        if (!checkBufferParams(this, inputView, inputOffset, inputLength)) {
          return -1;
        }
        const intBuffer = inputView.subarray(inputOffset, inputOffset + inputLength);
        this.valueHexView = new Uint8Array(inputLength);
        for (let i = 0; i < inputLength; i++) {
          this.valueHexView[i] = intBuffer[i] & 127;
          this.blockLength++;
          if ((intBuffer[i] & 128) === 0)
            break;
        }
        const tempView = new Uint8Array(this.blockLength);
        for (let i = 0; i < this.blockLength; i++) {
          tempView[i] = this.valueHexView[i];
        }
        this.valueHexView = tempView;
        if ((intBuffer[this.blockLength - 1] & 128) !== 0) {
          this.error = "End of input reached before message was fully decoded";
          return -1;
        }
        if (this.valueHexView[0] === 0)
          this.warnings.push("Needlessly long format of SID encoding");
        if (this.blockLength <= 8)
          this.valueDec = pvutils__namespace.utilFromBase(this.valueHexView, 7);
        else {
          this.isHexOnly = true;
          this.warnings.push("Too big SID for decoding, hex only");
        }
        return inputOffset + this.blockLength;
      }
      set valueBigInt(value) {
        assertBigInt();
        let bits = BigInt(value).toString(2);
        while (bits.length % 7) {
          bits = "0" + bits;
        }
        const bytes = new Uint8Array(bits.length / 7);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(bits.slice(i * 7, i * 7 + 7), 2) + (i + 1 < bytes.length ? 128 : 0);
        }
        this.fromBER(bytes.buffer, 0, bytes.length);
      }
      toBER(sizeOnly) {
        if (this.isHexOnly) {
          if (sizeOnly)
            return new ArrayBuffer(this.valueHexView.byteLength);
          const curView = this.valueHexView;
          const retView2 = new Uint8Array(this.blockLength);
          for (let i = 0; i < this.blockLength - 1; i++)
            retView2[i] = curView[i] | 128;
          retView2[this.blockLength - 1] = curView[this.blockLength - 1];
          return retView2.buffer;
        }
        const encodedBuf = pvutils__namespace.utilToBase(this.valueDec, 7);
        if (encodedBuf.byteLength === 0) {
          this.error = "Error during encoding SID value";
          return EMPTY_BUFFER;
        }
        const retView = new Uint8Array(encodedBuf.byteLength);
        if (!sizeOnly) {
          const encodedView = new Uint8Array(encodedBuf);
          const len = encodedBuf.byteLength - 1;
          for (let i = 0; i < len; i++)
            retView[i] = encodedView[i] | 128;
          retView[len] = encodedView[len];
        }
        return retView;
      }
      toString() {
        let result = "";
        if (this.isHexOnly)
          result = pvtsutils__namespace.Convert.ToHex(this.valueHexView);
        else {
          if (this.isFirstSid) {
            let sidValue = this.valueDec;
            if (this.valueDec <= 39)
              result = "0.";
            else {
              if (this.valueDec <= 79) {
                result = "1.";
                sidValue -= 40;
              } else {
                result = "2.";
                sidValue -= 80;
              }
            }
            result += sidValue.toString();
          } else
            result = this.valueDec.toString();
        }
        return result;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          valueDec: this.valueDec,
          isFirstSid: this.isFirstSid
        };
      }
    };
    LocalSidValueBlock.NAME = "sidBlock";
    var LocalObjectIdentifierValueBlock = class extends ValueBlock {
      constructor({ value = EMPTY_STRING, ...parameters } = {}) {
        super(parameters);
        this.value = [];
        if (value) {
          this.fromString(value);
        }
      }
      fromBER(inputBuffer, inputOffset, inputLength) {
        let resultOffset = inputOffset;
        while (inputLength > 0) {
          const sidBlock = new LocalSidValueBlock();
          resultOffset = sidBlock.fromBER(inputBuffer, resultOffset, inputLength);
          if (resultOffset === -1) {
            this.blockLength = 0;
            this.error = sidBlock.error;
            return resultOffset;
          }
          if (this.value.length === 0)
            sidBlock.isFirstSid = true;
          this.blockLength += sidBlock.blockLength;
          inputLength -= sidBlock.blockLength;
          this.value.push(sidBlock);
        }
        return resultOffset;
      }
      toBER(sizeOnly) {
        const retBuffers = [];
        for (let i = 0; i < this.value.length; i++) {
          const valueBuf = this.value[i].toBER(sizeOnly);
          if (valueBuf.byteLength === 0) {
            this.error = this.value[i].error;
            return EMPTY_BUFFER;
          }
          retBuffers.push(valueBuf);
        }
        return concat(retBuffers);
      }
      fromString(string) {
        this.value = [];
        let pos1 = 0;
        let pos2 = 0;
        let sid = "";
        let flag = false;
        do {
          pos2 = string.indexOf(".", pos1);
          if (pos2 === -1)
            sid = string.substring(pos1);
          else
            sid = string.substring(pos1, pos2);
          pos1 = pos2 + 1;
          if (flag) {
            const sidBlock = this.value[0];
            let plus = 0;
            switch (sidBlock.valueDec) {
              case 0:
                break;
              case 1:
                plus = 40;
                break;
              case 2:
                plus = 80;
                break;
              default:
                this.value = [];
                return;
            }
            const parsedSID = parseInt(sid, 10);
            if (isNaN(parsedSID))
              return;
            sidBlock.valueDec = parsedSID + plus;
            flag = false;
          } else {
            const sidBlock = new LocalSidValueBlock();
            if (sid > Number.MAX_SAFE_INTEGER) {
              assertBigInt();
              const sidValue = BigInt(sid);
              sidBlock.valueBigInt = sidValue;
            } else {
              sidBlock.valueDec = parseInt(sid, 10);
              if (isNaN(sidBlock.valueDec))
                return;
            }
            if (!this.value.length) {
              sidBlock.isFirstSid = true;
              flag = true;
            }
            this.value.push(sidBlock);
          }
        } while (pos2 !== -1);
      }
      toString() {
        let result = "";
        let isHexOnly = false;
        for (let i = 0; i < this.value.length; i++) {
          isHexOnly = this.value[i].isHexOnly;
          let sidStr = this.value[i].toString();
          if (i !== 0)
            result = `${result}.`;
          if (isHexOnly) {
            sidStr = `{${sidStr}}`;
            if (this.value[i].isFirstSid)
              result = `2.{${sidStr} - 80}`;
            else
              result += sidStr;
          } else
            result += sidStr;
        }
        return result;
      }
      toJSON() {
        const object = {
          ...super.toJSON(),
          value: this.toString(),
          sidArray: []
        };
        for (let i = 0; i < this.value.length; i++) {
          object.sidArray.push(this.value[i].toJSON());
        }
        return object;
      }
    };
    LocalObjectIdentifierValueBlock.NAME = "ObjectIdentifierValueBlock";
    var _a$m;
    var ObjectIdentifier = class extends BaseBlock {
      getValue() {
        return this.valueBlock.toString();
      }
      setValue(value) {
        this.valueBlock.fromString(value);
      }
      constructor(parameters = {}) {
        super(parameters, LocalObjectIdentifierValueBlock);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 6;
      }
      onAsciiEncoding() {
        return `${this.constructor.NAME} : ${this.valueBlock.toString() || "empty"}`;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          value: this.getValue()
        };
      }
    };
    _a$m = ObjectIdentifier;
    (() => {
      typeStore.ObjectIdentifier = _a$m;
    })();
    ObjectIdentifier.NAME = "OBJECT IDENTIFIER";
    var LocalRelativeSidValueBlock = class extends HexBlock(LocalBaseBlock) {
      constructor({ valueDec = 0, ...parameters } = {}) {
        super(parameters);
        this.valueDec = valueDec;
      }
      fromBER(inputBuffer, inputOffset, inputLength) {
        if (inputLength === 0)
          return inputOffset;
        const inputView = pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer);
        if (!checkBufferParams(this, inputView, inputOffset, inputLength))
          return -1;
        const intBuffer = inputView.subarray(inputOffset, inputOffset + inputLength);
        this.valueHexView = new Uint8Array(inputLength);
        for (let i = 0; i < inputLength; i++) {
          this.valueHexView[i] = intBuffer[i] & 127;
          this.blockLength++;
          if ((intBuffer[i] & 128) === 0)
            break;
        }
        const tempView = new Uint8Array(this.blockLength);
        for (let i = 0; i < this.blockLength; i++)
          tempView[i] = this.valueHexView[i];
        this.valueHexView = tempView;
        if ((intBuffer[this.blockLength - 1] & 128) !== 0) {
          this.error = "End of input reached before message was fully decoded";
          return -1;
        }
        if (this.valueHexView[0] === 0)
          this.warnings.push("Needlessly long format of SID encoding");
        if (this.blockLength <= 8)
          this.valueDec = pvutils__namespace.utilFromBase(this.valueHexView, 7);
        else {
          this.isHexOnly = true;
          this.warnings.push("Too big SID for decoding, hex only");
        }
        return inputOffset + this.blockLength;
      }
      toBER(sizeOnly) {
        if (this.isHexOnly) {
          if (sizeOnly)
            return new ArrayBuffer(this.valueHexView.byteLength);
          const curView = this.valueHexView;
          const retView2 = new Uint8Array(this.blockLength);
          for (let i = 0; i < this.blockLength - 1; i++)
            retView2[i] = curView[i] | 128;
          retView2[this.blockLength - 1] = curView[this.blockLength - 1];
          return retView2.buffer;
        }
        const encodedBuf = pvutils__namespace.utilToBase(this.valueDec, 7);
        if (encodedBuf.byteLength === 0) {
          this.error = "Error during encoding SID value";
          return EMPTY_BUFFER;
        }
        const retView = new Uint8Array(encodedBuf.byteLength);
        if (!sizeOnly) {
          const encodedView = new Uint8Array(encodedBuf);
          const len = encodedBuf.byteLength - 1;
          for (let i = 0; i < len; i++)
            retView[i] = encodedView[i] | 128;
          retView[len] = encodedView[len];
        }
        return retView.buffer;
      }
      toString() {
        let result = "";
        if (this.isHexOnly)
          result = pvtsutils__namespace.Convert.ToHex(this.valueHexView);
        else {
          result = this.valueDec.toString();
        }
        return result;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          valueDec: this.valueDec
        };
      }
    };
    LocalRelativeSidValueBlock.NAME = "relativeSidBlock";
    var LocalRelativeObjectIdentifierValueBlock = class extends ValueBlock {
      constructor({ value = EMPTY_STRING, ...parameters } = {}) {
        super(parameters);
        this.value = [];
        if (value) {
          this.fromString(value);
        }
      }
      fromBER(inputBuffer, inputOffset, inputLength) {
        let resultOffset = inputOffset;
        while (inputLength > 0) {
          const sidBlock = new LocalRelativeSidValueBlock();
          resultOffset = sidBlock.fromBER(inputBuffer, resultOffset, inputLength);
          if (resultOffset === -1) {
            this.blockLength = 0;
            this.error = sidBlock.error;
            return resultOffset;
          }
          this.blockLength += sidBlock.blockLength;
          inputLength -= sidBlock.blockLength;
          this.value.push(sidBlock);
        }
        return resultOffset;
      }
      toBER(sizeOnly, _writer) {
        const retBuffers = [];
        for (let i = 0; i < this.value.length; i++) {
          const valueBuf = this.value[i].toBER(sizeOnly);
          if (valueBuf.byteLength === 0) {
            this.error = this.value[i].error;
            return EMPTY_BUFFER;
          }
          retBuffers.push(valueBuf);
        }
        return concat(retBuffers);
      }
      fromString(string) {
        this.value = [];
        let pos1 = 0;
        let pos2 = 0;
        let sid = "";
        do {
          pos2 = string.indexOf(".", pos1);
          if (pos2 === -1)
            sid = string.substring(pos1);
          else
            sid = string.substring(pos1, pos2);
          pos1 = pos2 + 1;
          const sidBlock = new LocalRelativeSidValueBlock();
          sidBlock.valueDec = parseInt(sid, 10);
          if (isNaN(sidBlock.valueDec))
            return true;
          this.value.push(sidBlock);
        } while (pos2 !== -1);
        return true;
      }
      toString() {
        let result = "";
        let isHexOnly = false;
        for (let i = 0; i < this.value.length; i++) {
          isHexOnly = this.value[i].isHexOnly;
          let sidStr = this.value[i].toString();
          if (i !== 0)
            result = `${result}.`;
          if (isHexOnly) {
            sidStr = `{${sidStr}}`;
            result += sidStr;
          } else
            result += sidStr;
        }
        return result;
      }
      toJSON() {
        const object = {
          ...super.toJSON(),
          value: this.toString(),
          sidArray: []
        };
        for (let i = 0; i < this.value.length; i++)
          object.sidArray.push(this.value[i].toJSON());
        return object;
      }
    };
    LocalRelativeObjectIdentifierValueBlock.NAME = "RelativeObjectIdentifierValueBlock";
    var _a$l;
    var RelativeObjectIdentifier = class extends BaseBlock {
      getValue() {
        return this.valueBlock.toString();
      }
      setValue(value) {
        this.valueBlock.fromString(value);
      }
      constructor(parameters = {}) {
        super(parameters, LocalRelativeObjectIdentifierValueBlock);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 13;
      }
      onAsciiEncoding() {
        return `${this.constructor.NAME} : ${this.valueBlock.toString() || "empty"}`;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          value: this.getValue()
        };
      }
    };
    _a$l = RelativeObjectIdentifier;
    (() => {
      typeStore.RelativeObjectIdentifier = _a$l;
    })();
    RelativeObjectIdentifier.NAME = "RelativeObjectIdentifier";
    var _a$k;
    var Sequence = class extends Constructed {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 16;
      }
    };
    _a$k = Sequence;
    (() => {
      typeStore.Sequence = _a$k;
    })();
    Sequence.NAME = "SEQUENCE";
    var _a$j;
    var Set2 = class extends Constructed {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 17;
      }
    };
    _a$j = Set2;
    (() => {
      typeStore.Set = _a$j;
    })();
    Set2.NAME = "SET";
    var LocalStringValueBlock = class extends HexBlock(ValueBlock) {
      constructor({ ...parameters } = {}) {
        super(parameters);
        this.isHexOnly = true;
        this.value = EMPTY_STRING;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          value: this.value
        };
      }
    };
    LocalStringValueBlock.NAME = "StringValueBlock";
    var LocalSimpleStringValueBlock = class extends LocalStringValueBlock {
    };
    LocalSimpleStringValueBlock.NAME = "SimpleStringValueBlock";
    var LocalSimpleStringBlock = class extends BaseStringBlock {
      constructor({ ...parameters } = {}) {
        super(parameters, LocalSimpleStringValueBlock);
      }
      fromBuffer(inputBuffer) {
        this.valueBlock.value = String.fromCharCode.apply(null, pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer));
      }
      fromString(inputString) {
        const strLen = inputString.length;
        const view = this.valueBlock.valueHexView = new Uint8Array(strLen);
        for (let i = 0; i < strLen; i++)
          view[i] = inputString.charCodeAt(i);
        this.valueBlock.value = inputString;
      }
    };
    LocalSimpleStringBlock.NAME = "SIMPLE STRING";
    var LocalUtf8StringValueBlock = class extends LocalSimpleStringBlock {
      fromBuffer(inputBuffer) {
        this.valueBlock.valueHexView = pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer);
        try {
          this.valueBlock.value = pvtsutils__namespace.Convert.ToUtf8String(inputBuffer);
        } catch (ex) {
          this.warnings.push(`Error during "decodeURIComponent": ${ex}, using raw string`);
          this.valueBlock.value = pvtsutils__namespace.Convert.ToBinary(inputBuffer);
        }
      }
      fromString(inputString) {
        this.valueBlock.valueHexView = new Uint8Array(pvtsutils__namespace.Convert.FromUtf8String(inputString));
        this.valueBlock.value = inputString;
      }
    };
    LocalUtf8StringValueBlock.NAME = "Utf8StringValueBlock";
    var _a$i;
    var Utf8String = class extends LocalUtf8StringValueBlock {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 12;
      }
    };
    _a$i = Utf8String;
    (() => {
      typeStore.Utf8String = _a$i;
    })();
    Utf8String.NAME = "UTF8String";
    var LocalBmpStringValueBlock = class extends LocalSimpleStringBlock {
      fromBuffer(inputBuffer) {
        this.valueBlock.value = pvtsutils__namespace.Convert.ToUtf16String(inputBuffer);
        this.valueBlock.valueHexView = pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer);
      }
      fromString(inputString) {
        this.valueBlock.value = inputString;
        this.valueBlock.valueHexView = new Uint8Array(pvtsutils__namespace.Convert.FromUtf16String(inputString));
      }
    };
    LocalBmpStringValueBlock.NAME = "BmpStringValueBlock";
    var _a$h;
    var BmpString = class extends LocalBmpStringValueBlock {
      constructor({ ...parameters } = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 30;
      }
    };
    _a$h = BmpString;
    (() => {
      typeStore.BmpString = _a$h;
    })();
    BmpString.NAME = "BMPString";
    var LocalUniversalStringValueBlock = class extends LocalSimpleStringBlock {
      fromBuffer(inputBuffer) {
        const copyBuffer = ArrayBuffer.isView(inputBuffer) ? inputBuffer.slice().buffer : inputBuffer.slice(0);
        const valueView = new Uint8Array(copyBuffer);
        for (let i = 0; i < valueView.length; i += 4) {
          valueView[i] = valueView[i + 3];
          valueView[i + 1] = valueView[i + 2];
          valueView[i + 2] = 0;
          valueView[i + 3] = 0;
        }
        this.valueBlock.value = String.fromCharCode.apply(null, new Uint32Array(copyBuffer));
      }
      fromString(inputString) {
        const strLength = inputString.length;
        const valueHexView = this.valueBlock.valueHexView = new Uint8Array(strLength * 4);
        for (let i = 0; i < strLength; i++) {
          const codeBuf = pvutils__namespace.utilToBase(inputString.charCodeAt(i), 8);
          const codeView = new Uint8Array(codeBuf);
          if (codeView.length > 4)
            continue;
          const dif = 4 - codeView.length;
          for (let j = codeView.length - 1; j >= 0; j--)
            valueHexView[i * 4 + j + dif] = codeView[j];
        }
        this.valueBlock.value = inputString;
      }
    };
    LocalUniversalStringValueBlock.NAME = "UniversalStringValueBlock";
    var _a$g;
    var UniversalString = class extends LocalUniversalStringValueBlock {
      constructor({ ...parameters } = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 28;
      }
    };
    _a$g = UniversalString;
    (() => {
      typeStore.UniversalString = _a$g;
    })();
    UniversalString.NAME = "UniversalString";
    var _a$f;
    var NumericString = class extends LocalSimpleStringBlock {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 18;
      }
    };
    _a$f = NumericString;
    (() => {
      typeStore.NumericString = _a$f;
    })();
    NumericString.NAME = "NumericString";
    var _a$e;
    var PrintableString = class extends LocalSimpleStringBlock {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 19;
      }
    };
    _a$e = PrintableString;
    (() => {
      typeStore.PrintableString = _a$e;
    })();
    PrintableString.NAME = "PrintableString";
    var _a$d;
    var TeletexString = class extends LocalSimpleStringBlock {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 20;
      }
    };
    _a$d = TeletexString;
    (() => {
      typeStore.TeletexString = _a$d;
    })();
    TeletexString.NAME = "TeletexString";
    var _a$c;
    var VideotexString = class extends LocalSimpleStringBlock {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 21;
      }
    };
    _a$c = VideotexString;
    (() => {
      typeStore.VideotexString = _a$c;
    })();
    VideotexString.NAME = "VideotexString";
    var _a$b;
    var IA5String = class extends LocalSimpleStringBlock {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 22;
      }
    };
    _a$b = IA5String;
    (() => {
      typeStore.IA5String = _a$b;
    })();
    IA5String.NAME = "IA5String";
    var _a$a;
    var GraphicString = class extends LocalSimpleStringBlock {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 25;
      }
    };
    _a$a = GraphicString;
    (() => {
      typeStore.GraphicString = _a$a;
    })();
    GraphicString.NAME = "GraphicString";
    var _a$9;
    var VisibleString = class extends LocalSimpleStringBlock {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 26;
      }
    };
    _a$9 = VisibleString;
    (() => {
      typeStore.VisibleString = _a$9;
    })();
    VisibleString.NAME = "VisibleString";
    var _a$8;
    var GeneralString = class extends LocalSimpleStringBlock {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 27;
      }
    };
    _a$8 = GeneralString;
    (() => {
      typeStore.GeneralString = _a$8;
    })();
    GeneralString.NAME = "GeneralString";
    var _a$7;
    var CharacterString = class extends LocalSimpleStringBlock {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 29;
      }
    };
    _a$7 = CharacterString;
    (() => {
      typeStore.CharacterString = _a$7;
    })();
    CharacterString.NAME = "CharacterString";
    var _a$6;
    var UTCTime = class extends VisibleString {
      constructor({ value, valueDate, ...parameters } = {}) {
        super(parameters);
        this.year = 0;
        this.month = 0;
        this.day = 0;
        this.hour = 0;
        this.minute = 0;
        this.second = 0;
        if (value) {
          this.fromString(value);
          this.valueBlock.valueHexView = new Uint8Array(value.length);
          for (let i = 0; i < value.length; i++)
            this.valueBlock.valueHexView[i] = value.charCodeAt(i);
        }
        if (valueDate) {
          this.fromDate(valueDate);
          this.valueBlock.valueHexView = new Uint8Array(this.toBuffer());
        }
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 23;
      }
      fromBuffer(inputBuffer) {
        this.fromString(String.fromCharCode.apply(null, pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer)));
      }
      toBuffer() {
        const str2 = this.toString();
        const buffer = new ArrayBuffer(str2.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < str2.length; i++)
          view[i] = str2.charCodeAt(i);
        return buffer;
      }
      fromDate(inputDate) {
        this.year = inputDate.getUTCFullYear();
        this.month = inputDate.getUTCMonth() + 1;
        this.day = inputDate.getUTCDate();
        this.hour = inputDate.getUTCHours();
        this.minute = inputDate.getUTCMinutes();
        this.second = inputDate.getUTCSeconds();
      }
      toDate() {
        return new Date(Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second));
      }
      fromString(inputString) {
        const parser = /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z/ig;
        const parserArray = parser.exec(inputString);
        if (parserArray === null) {
          this.error = "Wrong input string for conversion";
          return;
        }
        const year = parseInt(parserArray[1], 10);
        if (year >= 50)
          this.year = 1900 + year;
        else
          this.year = 2e3 + year;
        this.month = parseInt(parserArray[2], 10);
        this.day = parseInt(parserArray[3], 10);
        this.hour = parseInt(parserArray[4], 10);
        this.minute = parseInt(parserArray[5], 10);
        this.second = parseInt(parserArray[6], 10);
      }
      toString(encoding = "iso") {
        if (encoding === "iso") {
          const outputArray = new Array(7);
          outputArray[0] = pvutils__namespace.padNumber(this.year < 2e3 ? this.year - 1900 : this.year - 2e3, 2);
          outputArray[1] = pvutils__namespace.padNumber(this.month, 2);
          outputArray[2] = pvutils__namespace.padNumber(this.day, 2);
          outputArray[3] = pvutils__namespace.padNumber(this.hour, 2);
          outputArray[4] = pvutils__namespace.padNumber(this.minute, 2);
          outputArray[5] = pvutils__namespace.padNumber(this.second, 2);
          outputArray[6] = "Z";
          return outputArray.join("");
        }
        return super.toString(encoding);
      }
      onAsciiEncoding() {
        return `${this.constructor.NAME} : ${this.toDate().toISOString()}`;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          year: this.year,
          month: this.month,
          day: this.day,
          hour: this.hour,
          minute: this.minute,
          second: this.second
        };
      }
    };
    _a$6 = UTCTime;
    (() => {
      typeStore.UTCTime = _a$6;
    })();
    UTCTime.NAME = "UTCTime";
    var _a$5;
    var GeneralizedTime = class extends UTCTime {
      constructor(parameters = {}) {
        var _b;
        super(parameters);
        (_b = this.millisecond) !== null && _b !== void 0 ? _b : this.millisecond = 0;
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 24;
      }
      fromDate(inputDate) {
        super.fromDate(inputDate);
        this.millisecond = inputDate.getUTCMilliseconds();
      }
      toDate() {
        const utcDate = Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second, this.millisecond);
        return new Date(utcDate);
      }
      fromString(inputString) {
        let isUTC = false;
        let timeString = "";
        let dateTimeString = "";
        let fractionPart = 0;
        let parser;
        let hourDifference = 0;
        let minuteDifference = 0;
        if (inputString[inputString.length - 1] === "Z") {
          timeString = inputString.substring(0, inputString.length - 1);
          isUTC = true;
        } else {
          const number = new Number(inputString[inputString.length - 1]);
          if (isNaN(number.valueOf()))
            throw new Error("Wrong input string for conversion");
          timeString = inputString;
        }
        if (isUTC) {
          if (timeString.indexOf("+") !== -1)
            throw new Error("Wrong input string for conversion");
          if (timeString.indexOf("-") !== -1)
            throw new Error("Wrong input string for conversion");
        } else {
          let multiplier = 1;
          let differencePosition = timeString.indexOf("+");
          let differenceString = "";
          if (differencePosition === -1) {
            differencePosition = timeString.indexOf("-");
            multiplier = -1;
          }
          if (differencePosition !== -1) {
            differenceString = timeString.substring(differencePosition + 1);
            timeString = timeString.substring(0, differencePosition);
            if (differenceString.length !== 2 && differenceString.length !== 4)
              throw new Error("Wrong input string for conversion");
            let number = parseInt(differenceString.substring(0, 2), 10);
            if (isNaN(number.valueOf()))
              throw new Error("Wrong input string for conversion");
            hourDifference = multiplier * number;
            if (differenceString.length === 4) {
              number = parseInt(differenceString.substring(2, 4), 10);
              if (isNaN(number.valueOf()))
                throw new Error("Wrong input string for conversion");
              minuteDifference = multiplier * number;
            }
          }
        }
        let fractionPointPosition = timeString.indexOf(".");
        if (fractionPointPosition === -1)
          fractionPointPosition = timeString.indexOf(",");
        if (fractionPointPosition !== -1) {
          const fractionPartCheck = new Number(`0${timeString.substring(fractionPointPosition)}`);
          if (isNaN(fractionPartCheck.valueOf()))
            throw new Error("Wrong input string for conversion");
          fractionPart = fractionPartCheck.valueOf();
          dateTimeString = timeString.substring(0, fractionPointPosition);
        } else
          dateTimeString = timeString;
        switch (true) {
          case dateTimeString.length === 8:
            parser = /(\d{4})(\d{2})(\d{2})/ig;
            if (fractionPointPosition !== -1)
              throw new Error("Wrong input string for conversion");
            break;
          case dateTimeString.length === 10:
            parser = /(\d{4})(\d{2})(\d{2})(\d{2})/ig;
            if (fractionPointPosition !== -1) {
              let fractionResult = 60 * fractionPart;
              this.minute = Math.floor(fractionResult);
              fractionResult = 60 * (fractionResult - this.minute);
              this.second = Math.floor(fractionResult);
              fractionResult = 1e3 * (fractionResult - this.second);
              this.millisecond = Math.floor(fractionResult);
            }
            break;
          case dateTimeString.length === 12:
            parser = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/ig;
            if (fractionPointPosition !== -1) {
              let fractionResult = 60 * fractionPart;
              this.second = Math.floor(fractionResult);
              fractionResult = 1e3 * (fractionResult - this.second);
              this.millisecond = Math.floor(fractionResult);
            }
            break;
          case dateTimeString.length === 14:
            parser = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/ig;
            if (fractionPointPosition !== -1) {
              const fractionResult = 1e3 * fractionPart;
              this.millisecond = Math.floor(fractionResult);
            }
            break;
          default:
            throw new Error("Wrong input string for conversion");
        }
        const parserArray = parser.exec(dateTimeString);
        if (parserArray === null)
          throw new Error("Wrong input string for conversion");
        for (let j = 1; j < parserArray.length; j++) {
          switch (j) {
            case 1:
              this.year = parseInt(parserArray[j], 10);
              break;
            case 2:
              this.month = parseInt(parserArray[j], 10);
              break;
            case 3:
              this.day = parseInt(parserArray[j], 10);
              break;
            case 4:
              this.hour = parseInt(parserArray[j], 10) + hourDifference;
              break;
            case 5:
              this.minute = parseInt(parserArray[j], 10) + minuteDifference;
              break;
            case 6:
              this.second = parseInt(parserArray[j], 10);
              break;
            default:
              throw new Error("Wrong input string for conversion");
          }
        }
        if (isUTC === false) {
          const tempDate = new Date(this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond);
          this.year = tempDate.getUTCFullYear();
          this.month = tempDate.getUTCMonth();
          this.day = tempDate.getUTCDay();
          this.hour = tempDate.getUTCHours();
          this.minute = tempDate.getUTCMinutes();
          this.second = tempDate.getUTCSeconds();
          this.millisecond = tempDate.getUTCMilliseconds();
        }
      }
      toString(encoding = "iso") {
        if (encoding === "iso") {
          const outputArray = [];
          outputArray.push(pvutils__namespace.padNumber(this.year, 4));
          outputArray.push(pvutils__namespace.padNumber(this.month, 2));
          outputArray.push(pvutils__namespace.padNumber(this.day, 2));
          outputArray.push(pvutils__namespace.padNumber(this.hour, 2));
          outputArray.push(pvutils__namespace.padNumber(this.minute, 2));
          outputArray.push(pvutils__namespace.padNumber(this.second, 2));
          if (this.millisecond !== 0) {
            outputArray.push(".");
            outputArray.push(pvutils__namespace.padNumber(this.millisecond, 3));
          }
          outputArray.push("Z");
          return outputArray.join("");
        }
        return super.toString(encoding);
      }
      toJSON() {
        return {
          ...super.toJSON(),
          millisecond: this.millisecond
        };
      }
    };
    _a$5 = GeneralizedTime;
    (() => {
      typeStore.GeneralizedTime = _a$5;
    })();
    GeneralizedTime.NAME = "GeneralizedTime";
    var _a$4;
    var DATE = class extends Utf8String {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 31;
      }
    };
    _a$4 = DATE;
    (() => {
      typeStore.DATE = _a$4;
    })();
    DATE.NAME = "DATE";
    var _a$3;
    var TimeOfDay = class extends Utf8String {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 32;
      }
    };
    _a$3 = TimeOfDay;
    (() => {
      typeStore.TimeOfDay = _a$3;
    })();
    TimeOfDay.NAME = "TimeOfDay";
    var _a$2;
    var DateTime = class extends Utf8String {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 33;
      }
    };
    _a$2 = DateTime;
    (() => {
      typeStore.DateTime = _a$2;
    })();
    DateTime.NAME = "DateTime";
    var _a$1;
    var Duration = class extends Utf8String {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 34;
      }
    };
    _a$1 = Duration;
    (() => {
      typeStore.Duration = _a$1;
    })();
    Duration.NAME = "Duration";
    var _a;
    var TIME = class extends Utf8String {
      constructor(parameters = {}) {
        super(parameters);
        this.idBlock.tagClass = 1;
        this.idBlock.tagNumber = 14;
      }
    };
    _a = TIME;
    (() => {
      typeStore.TIME = _a;
    })();
    TIME.NAME = "TIME";
    var Any = class {
      constructor({ name = EMPTY_STRING, optional = false } = {}) {
        this.name = name;
        this.optional = optional;
      }
    };
    var Choice = class extends Any {
      constructor({ value = [], ...parameters } = {}) {
        super(parameters);
        this.value = value;
      }
    };
    var Repeated = class extends Any {
      constructor({ value = new Any(), local = false, ...parameters } = {}) {
        super(parameters);
        this.value = value;
        this.local = local;
      }
    };
    var RawData = class {
      get data() {
        return this.dataView.slice().buffer;
      }
      set data(value) {
        this.dataView = pvtsutils__namespace.BufferSourceConverter.toUint8Array(value);
      }
      constructor({ data = EMPTY_VIEW } = {}) {
        this.dataView = pvtsutils__namespace.BufferSourceConverter.toUint8Array(data);
      }
      fromBER(inputBuffer, inputOffset, inputLength) {
        const endLength = inputOffset + inputLength;
        this.dataView = pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer).subarray(inputOffset, endLength);
        return endLength;
      }
      toBER(_sizeOnly) {
        return this.dataView.slice().buffer;
      }
    };
    function compareSchema(root, inputData, inputSchema) {
      if (inputSchema instanceof Choice) {
        for (const element of inputSchema.value) {
          const result = compareSchema(root, inputData, element);
          if (result.verified) {
            return {
              verified: true,
              result: root
            };
          }
        }
        {
          const _result = {
            verified: false,
            result: { error: "Wrong values for Choice type" }
          };
          if (inputSchema.hasOwnProperty(NAME))
            _result.name = inputSchema.name;
          return _result;
        }
      }
      if (inputSchema instanceof Any) {
        if (inputSchema.hasOwnProperty(NAME))
          root[inputSchema.name] = inputData;
        return {
          verified: true,
          result: root
        };
      }
      if (root instanceof Object === false) {
        return {
          verified: false,
          result: { error: "Wrong root object" }
        };
      }
      if (inputData instanceof Object === false) {
        return {
          verified: false,
          result: { error: "Wrong ASN.1 data" }
        };
      }
      if (inputSchema instanceof Object === false) {
        return {
          verified: false,
          result: { error: "Wrong ASN.1 schema" }
        };
      }
      if (ID_BLOCK in inputSchema === false) {
        return {
          verified: false,
          result: { error: "Wrong ASN.1 schema" }
        };
      }
      if (FROM_BER in inputSchema.idBlock === false) {
        return {
          verified: false,
          result: { error: "Wrong ASN.1 schema" }
        };
      }
      if (TO_BER in inputSchema.idBlock === false) {
        return {
          verified: false,
          result: { error: "Wrong ASN.1 schema" }
        };
      }
      const encodedId = inputSchema.idBlock.toBER(false);
      if (encodedId.byteLength === 0) {
        return {
          verified: false,
          result: { error: "Error encoding idBlock for ASN.1 schema" }
        };
      }
      const decodedOffset = inputSchema.idBlock.fromBER(encodedId, 0, encodedId.byteLength);
      if (decodedOffset === -1) {
        return {
          verified: false,
          result: { error: "Error decoding idBlock for ASN.1 schema" }
        };
      }
      if (inputSchema.idBlock.hasOwnProperty(TAG_CLASS) === false) {
        return {
          verified: false,
          result: { error: "Wrong ASN.1 schema" }
        };
      }
      if (inputSchema.idBlock.tagClass !== inputData.idBlock.tagClass) {
        return {
          verified: false,
          result: root
        };
      }
      if (inputSchema.idBlock.hasOwnProperty(TAG_NUMBER) === false) {
        return {
          verified: false,
          result: { error: "Wrong ASN.1 schema" }
        };
      }
      if (inputSchema.idBlock.tagNumber !== inputData.idBlock.tagNumber) {
        return {
          verified: false,
          result: root
        };
      }
      if (inputSchema.idBlock.hasOwnProperty(IS_CONSTRUCTED) === false) {
        return {
          verified: false,
          result: { error: "Wrong ASN.1 schema" }
        };
      }
      if (inputSchema.idBlock.isConstructed !== inputData.idBlock.isConstructed) {
        return {
          verified: false,
          result: root
        };
      }
      if (!(IS_HEX_ONLY in inputSchema.idBlock)) {
        return {
          verified: false,
          result: { error: "Wrong ASN.1 schema" }
        };
      }
      if (inputSchema.idBlock.isHexOnly !== inputData.idBlock.isHexOnly) {
        return {
          verified: false,
          result: root
        };
      }
      if (inputSchema.idBlock.isHexOnly) {
        if (VALUE_HEX_VIEW in inputSchema.idBlock === false) {
          return {
            verified: false,
            result: { error: "Wrong ASN.1 schema" }
          };
        }
        const schemaView = inputSchema.idBlock.valueHexView;
        const asn1View = inputData.idBlock.valueHexView;
        if (schemaView.length !== asn1View.length) {
          return {
            verified: false,
            result: root
          };
        }
        for (let i = 0; i < schemaView.length; i++) {
          if (schemaView[i] !== asn1View[1]) {
            return {
              verified: false,
              result: root
            };
          }
        }
      }
      if (inputSchema.name) {
        inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
        if (inputSchema.name)
          root[inputSchema.name] = inputData;
      }
      if (inputSchema instanceof typeStore.Constructed) {
        let admission = 0;
        let result = {
          verified: false,
          result: { error: "Unknown error" }
        };
        let maxLength = inputSchema.valueBlock.value.length;
        if (maxLength > 0) {
          if (inputSchema.valueBlock.value[0] instanceof Repeated) {
            maxLength = inputData.valueBlock.value.length;
          }
        }
        if (maxLength === 0) {
          return {
            verified: true,
            result: root
          };
        }
        if (inputData.valueBlock.value.length === 0 && inputSchema.valueBlock.value.length !== 0) {
          let _optional = true;
          for (let i = 0; i < inputSchema.valueBlock.value.length; i++)
            _optional = _optional && (inputSchema.valueBlock.value[i].optional || false);
          if (_optional) {
            return {
              verified: true,
              result: root
            };
          }
          if (inputSchema.name) {
            inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
            if (inputSchema.name)
              delete root[inputSchema.name];
          }
          root.error = "Inconsistent object length";
          return {
            verified: false,
            result: root
          };
        }
        for (let i = 0; i < maxLength; i++) {
          if (i - admission >= inputData.valueBlock.value.length) {
            if (inputSchema.valueBlock.value[i].optional === false) {
              const _result = {
                verified: false,
                result: root
              };
              root.error = "Inconsistent length between ASN.1 data and schema";
              if (inputSchema.name) {
                inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
                if (inputSchema.name) {
                  delete root[inputSchema.name];
                  _result.name = inputSchema.name;
                }
              }
              return _result;
            }
          } else {
            if (inputSchema.valueBlock.value[0] instanceof Repeated) {
              result = compareSchema(root, inputData.valueBlock.value[i], inputSchema.valueBlock.value[0].value);
              if (result.verified === false) {
                if (inputSchema.valueBlock.value[0].optional)
                  admission++;
                else {
                  if (inputSchema.name) {
                    inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
                    if (inputSchema.name)
                      delete root[inputSchema.name];
                  }
                  return result;
                }
              }
              if (NAME in inputSchema.valueBlock.value[0] && inputSchema.valueBlock.value[0].name.length > 0) {
                let arrayRoot = {};
                if (LOCAL in inputSchema.valueBlock.value[0] && inputSchema.valueBlock.value[0].local)
                  arrayRoot = inputData;
                else
                  arrayRoot = root;
                if (typeof arrayRoot[inputSchema.valueBlock.value[0].name] === "undefined")
                  arrayRoot[inputSchema.valueBlock.value[0].name] = [];
                arrayRoot[inputSchema.valueBlock.value[0].name].push(inputData.valueBlock.value[i]);
              }
            } else {
              result = compareSchema(root, inputData.valueBlock.value[i - admission], inputSchema.valueBlock.value[i]);
              if (result.verified === false) {
                if (inputSchema.valueBlock.value[i].optional)
                  admission++;
                else {
                  if (inputSchema.name) {
                    inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
                    if (inputSchema.name)
                      delete root[inputSchema.name];
                  }
                  return result;
                }
              }
            }
          }
        }
        if (result.verified === false) {
          const _result = {
            verified: false,
            result: root
          };
          if (inputSchema.name) {
            inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
            if (inputSchema.name) {
              delete root[inputSchema.name];
              _result.name = inputSchema.name;
            }
          }
          return _result;
        }
        return {
          verified: true,
          result: root
        };
      }
      if (inputSchema.primitiveSchema && VALUE_HEX_VIEW in inputData.valueBlock) {
        const asn1 = localFromBER(inputData.valueBlock.valueHexView);
        if (asn1.offset === -1) {
          const _result = {
            verified: false,
            result: asn1.result
          };
          if (inputSchema.name) {
            inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
            if (inputSchema.name) {
              delete root[inputSchema.name];
              _result.name = inputSchema.name;
            }
          }
          return _result;
        }
        return compareSchema(root, asn1.result, inputSchema.primitiveSchema);
      }
      return {
        verified: true,
        result: root
      };
    }
    function verifySchema(inputBuffer, inputSchema) {
      if (inputSchema instanceof Object === false) {
        return {
          verified: false,
          result: { error: "Wrong ASN.1 schema type" }
        };
      }
      const asn1 = localFromBER(pvtsutils__namespace.BufferSourceConverter.toUint8Array(inputBuffer));
      if (asn1.offset === -1) {
        return {
          verified: false,
          result: asn1.result
        };
      }
      return compareSchema(asn1.result, asn1.result, inputSchema);
    }
    exports.Any = Any;
    exports.BaseBlock = BaseBlock;
    exports.BaseStringBlock = BaseStringBlock;
    exports.BitString = BitString;
    exports.BmpString = BmpString;
    exports.Boolean = Boolean2;
    exports.CharacterString = CharacterString;
    exports.Choice = Choice;
    exports.Constructed = Constructed;
    exports.DATE = DATE;
    exports.DEFAULT_MAX_CONTENT_LENGTH = DEFAULT_MAX_CONTENT_LENGTH;
    exports.DEFAULT_MAX_DEPTH = DEFAULT_MAX_DEPTH;
    exports.DEFAULT_MAX_NODES = DEFAULT_MAX_NODES;
    exports.DateTime = DateTime;
    exports.Duration = Duration;
    exports.EndOfContent = EndOfContent;
    exports.Enumerated = Enumerated;
    exports.GeneralString = GeneralString;
    exports.GeneralizedTime = GeneralizedTime;
    exports.GraphicString = GraphicString;
    exports.HexBlock = HexBlock;
    exports.IA5String = IA5String;
    exports.Integer = Integer;
    exports.Null = Null;
    exports.NumericString = NumericString;
    exports.ObjectIdentifier = ObjectIdentifier;
    exports.OctetString = OctetString;
    exports.Primitive = Primitive;
    exports.PrintableString = PrintableString;
    exports.RawData = RawData;
    exports.RelativeObjectIdentifier = RelativeObjectIdentifier;
    exports.Repeated = Repeated;
    exports.Sequence = Sequence;
    exports.Set = Set2;
    exports.TIME = TIME;
    exports.TeletexString = TeletexString;
    exports.TimeOfDay = TimeOfDay;
    exports.UTCTime = UTCTime;
    exports.UniversalString = UniversalString;
    exports.Utf8String = Utf8String;
    exports.ValueBlock = ValueBlock;
    exports.VideotexString = VideotexString;
    exports.ViewWriter = ViewWriter;
    exports.VisibleString = VisibleString;
    exports.compareSchema = compareSchema;
    exports.fromBER = fromBER;
    exports.verifySchema = verifySchema;
  }
});

// node_modules/@peculiar/utils/build/cjs/bytes/buffer-source.js
var require_buffer_source = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/bytes/buffer-source.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isArrayBuffer = isArrayBuffer;
    exports.isSharedArrayBuffer = isSharedArrayBuffer;
    exports.isArrayBufferLike = isArrayBufferLike;
    exports.isArrayBufferView = isArrayBufferView;
    exports.isBufferSource = isBufferSource;
    exports.assertBufferSource = assertBufferSource;
    exports.toUint8Array = toUint8Array;
    exports.toUint8ArrayCopy = toUint8ArrayCopy;
    exports.toArrayBuffer = toArrayBuffer;
    exports.toArrayBufferLike = toArrayBufferLike;
    exports.toView = toView;
    exports.toViewCopy = toViewCopy;
    var ARRAY_BUFFER_TAG = "[object ArrayBuffer]";
    var SHARED_ARRAY_BUFFER_TAG = "[object SharedArrayBuffer]";
    function tagOf(value) {
      return Object.prototype.toString.call(value);
    }
    function isDataViewConstructor(type) {
      return type === DataView || type.prototype instanceof DataView;
    }
    function bytesPerElement(type) {
      if (isDataViewConstructor(type)) {
        return 1;
      }
      const value = type.BYTES_PER_ELEMENT;
      return value ?? 1;
    }
    function isArrayBufferViewLike(value) {
      if (ArrayBuffer.isView(value)) {
        return true;
      }
      if (!value || typeof value !== "object") {
        return false;
      }
      const view = value;
      return typeof view.byteOffset === "number" && typeof view.byteLength === "number" && isArrayBufferLike(view.buffer);
    }
    function copyBytes(data) {
      const view = toUint8Array(data);
      const copy = new Uint8Array(view.byteLength);
      copy.set(view);
      return copy;
    }
    function isArrayBuffer(value) {
      return tagOf(value) === ARRAY_BUFFER_TAG;
    }
    function isSharedArrayBuffer(value) {
      return typeof SharedArrayBuffer !== "undefined" && tagOf(value) === SHARED_ARRAY_BUFFER_TAG;
    }
    function isArrayBufferLike(value) {
      return isArrayBuffer(value) || isSharedArrayBuffer(value);
    }
    function isArrayBufferView(value) {
      return isArrayBufferViewLike(value);
    }
    function isBufferSource(value) {
      return isArrayBufferLike(value) || isArrayBufferView(value);
    }
    function assertBufferSource(value) {
      if (!isBufferSource(value)) {
        throw new TypeError("Expected ArrayBuffer, SharedArrayBuffer, or ArrayBufferView");
      }
    }
    function toUint8Array(data) {
      assertBufferSource(data);
      if (isArrayBufferLike(data)) {
        return new Uint8Array(data);
      }
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    function toUint8ArrayCopy(data) {
      return copyBytes(data);
    }
    function toArrayBuffer(data) {
      assertBufferSource(data);
      if (isArrayBuffer(data)) {
        return data;
      }
      const buffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(buffer).set(toUint8Array(data));
      return buffer;
    }
    function toArrayBufferLike(data) {
      assertBufferSource(data);
      if (isArrayBufferLike(data)) {
        return data;
      }
      if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
        return data.buffer;
      }
      return copyBytes(data).buffer;
    }
    function toView(data, type) {
      assertBufferSource(data);
      if (ArrayBuffer.isView(data) && data.constructor === type) {
        return data;
      }
      const view = toUint8Array(data);
      const elementSize = bytesPerElement(type);
      if (view.byteOffset % elementSize !== 0 || view.byteLength % elementSize !== 0) {
        throw new RangeError(`Cannot create ${type.name} over unaligned byte range`);
      }
      if (isDataViewConstructor(type)) {
        return new type(view.buffer, view.byteOffset, view.byteLength);
      }
      return new type(view.buffer, view.byteOffset, view.byteLength / elementSize);
    }
    function toViewCopy(data, type) {
      const copy = toUint8ArrayCopy(data);
      return toView(copy, type);
    }
  }
});

// node_modules/@peculiar/utils/build/cjs/bytes/concat.js
var require_concat = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/bytes/concat.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.concatToUint8Array = concatToUint8Array;
    exports.concat = concat;
    var buffer_source_js_1 = require_buffer_source();
    function concatToUint8Array(buffers) {
      const views = [];
      let length = 0;
      for (const buffer of buffers) {
        const view = (0, buffer_source_js_1.toUint8Array)(buffer);
        views.push(view);
        length += view.byteLength;
      }
      const result = new Uint8Array(length);
      let offset = 0;
      for (const view of views) {
        result.set(view, offset);
        offset += view.byteLength;
      }
      return result;
    }
    function concat(first, second, ...rest) {
      let buffers;
      let type;
      if (typeof second === "function") {
        buffers = Array.from(first);
        type = second;
      } else if ((0, buffer_source_js_1.isBufferSource)(first)) {
        buffers = [first, second, ...rest].filter(buffer_source_js_1.isBufferSource);
      } else {
        buffers = Array.from(first);
        if (second) {
          buffers.push(second);
        }
        buffers.push(...rest);
      }
      const bytes = concatToUint8Array(buffers);
      return type ? (0, buffer_source_js_1.toView)(bytes, type) : bytes.buffer;
    }
  }
});

// node_modules/@peculiar/utils/build/cjs/bytes/equal.js
var require_equal = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/bytes/equal.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.equal = equal;
    var buffer_source_js_1 = require_buffer_source();
    function equal(a, b, options = {}) {
      const left = (0, buffer_source_js_1.toUint8Array)(a);
      const right = (0, buffer_source_js_1.toUint8Array)(b);
      if (!options.constantTime && left.byteLength !== right.byteLength) {
        return false;
      }
      const length = Math.max(left.byteLength, right.byteLength);
      let diff = left.byteLength ^ right.byteLength;
      for (let i = 0; i < length; i++) {
        diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
      }
      return diff === 0;
    }
  }
});

// node_modules/@peculiar/utils/build/cjs/bytes/sequence.js
var require_sequence = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/bytes/sequence.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.indexOf = indexOf;
    exports.lastIndexOf = lastIndexOf;
    exports.includes = includes;
    exports.startsWith = startsWith;
    exports.endsWith = endsWith;
    exports.slice = slice;
    exports.tail = tail;
    exports.copy = copy;
    exports.compare = compare;
    var buffer_source_js_1 = require_buffer_source();
    function clampIndex(value, fallback, length) {
      const normalized = Number.isFinite(value) ? Math.trunc(value) : fallback;
      if (normalized <= 0) {
        return 0;
      }
      if (normalized >= length) {
        return length;
      }
      return normalized;
    }
    function normalizeForwardRange(length, options) {
      const start = clampIndex(options?.start, 0, length);
      const end = clampIndex(options?.end, length, length);
      return end >= start ? [start, end] : [start, start];
    }
    function normalizeReverseRange(length, options) {
      const start = clampIndex(options?.start, length, length);
      const end = clampIndex(options?.end, 0, length);
      return start >= end ? [end, start] : [start, start];
    }
    function normalizeSliceIndex(value, fallback, length) {
      const normalized = Number.isFinite(value) ? Math.trunc(value) : fallback;
      if (normalized < 0) {
        return Math.max(length + normalized, 0);
      }
      if (normalized > length) {
        return length;
      }
      return normalized;
    }
    function encodeAscii(text) {
      const bytes = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) {
        bytes[i] = text.charCodeAt(i) & 255;
      }
      return bytes;
    }
    function encodeUtf8(text) {
      return new TextEncoder().encode(text);
    }
    function toPatternBytes(pattern, options) {
      if (typeof pattern === "string") {
        return options?.encoding === "utf8" ? encodeUtf8(pattern) : encodeAscii(pattern);
      }
      return (0, buffer_source_js_1.toUint8Array)(pattern);
    }
    function bytesEqualAt(data, pattern, offset) {
      for (let index = 0; index < pattern.byteLength; index++) {
        if (data[offset + index] !== pattern[index]) {
          return false;
        }
      }
      return true;
    }
    function indexOf(data, pattern, options) {
      const bytes = (0, buffer_source_js_1.toUint8Array)(data);
      const needle = toPatternBytes(pattern, options);
      const [start, end] = normalizeForwardRange(bytes.byteLength, options);
      if (needle.byteLength === 0) {
        return start;
      }
      const lastOffset = end - needle.byteLength;
      if (lastOffset < start) {
        return -1;
      }
      for (let offset = start; offset <= lastOffset; offset++) {
        if (bytesEqualAt(bytes, needle, offset)) {
          return offset;
        }
      }
      return -1;
    }
    function lastIndexOf(data, pattern, options) {
      const bytes = (0, buffer_source_js_1.toUint8Array)(data);
      const needle = toPatternBytes(pattern, options);
      const [end, start] = normalizeReverseRange(bytes.byteLength, options);
      if (needle.byteLength === 0) {
        return start;
      }
      const firstOffset = start - needle.byteLength;
      if (firstOffset < end) {
        return -1;
      }
      for (let offset = firstOffset; offset >= end; offset--) {
        if (bytesEqualAt(bytes, needle, offset)) {
          return offset;
        }
      }
      return -1;
    }
    function includes(data, pattern, options) {
      return indexOf(data, pattern, options) !== -1;
    }
    function startsWith(data, pattern, options) {
      const bytes = (0, buffer_source_js_1.toUint8Array)(data);
      const needle = toPatternBytes(pattern, options);
      if (needle.byteLength > bytes.byteLength) {
        return false;
      }
      return bytesEqualAt(bytes, needle, 0);
    }
    function endsWith(data, pattern, options) {
      const bytes = (0, buffer_source_js_1.toUint8Array)(data);
      const needle = toPatternBytes(pattern, options);
      if (needle.byteLength > bytes.byteLength) {
        return false;
      }
      return bytesEqualAt(bytes, needle, bytes.byteLength - needle.byteLength);
    }
    function slice(data, start, end) {
      const bytes = (0, buffer_source_js_1.toUint8Array)(data);
      const normalizedStart = normalizeSliceIndex(start, 0, bytes.byteLength);
      const normalizedEnd = normalizeSliceIndex(end, bytes.byteLength, bytes.byteLength);
      if (normalizedEnd <= normalizedStart) {
        return bytes.subarray(normalizedStart, normalizedStart);
      }
      return bytes.subarray(normalizedStart, normalizedEnd);
    }
    function tail(data, length) {
      const bytes = (0, buffer_source_js_1.toUint8Array)(data);
      const normalizedLength = Number.isFinite(length) ? Math.max(0, Math.trunc(length)) : 0;
      if (normalizedLength >= bytes.byteLength) {
        return bytes;
      }
      return bytes.subarray(bytes.byteLength - normalizedLength);
    }
    function copy(data) {
      return (0, buffer_source_js_1.toUint8ArrayCopy)(data);
    }
    function compare(a, b) {
      const left = (0, buffer_source_js_1.toUint8Array)(a);
      const right = (0, buffer_source_js_1.toUint8Array)(b);
      const limit = Math.min(left.byteLength, right.byteLength);
      for (let index = 0; index < limit; index++) {
        if (left[index] < right[index]) {
          return -1;
        }
        if (left[index] > right[index]) {
          return 1;
        }
      }
      if (left.byteLength < right.byteLength) {
        return -1;
      }
      if (left.byteLength > right.byteLength) {
        return 1;
      }
      return 0;
    }
  }
});

// node_modules/@peculiar/utils/build/cjs/bytes/index.js
var require_bytes = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/bytes/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.tail = exports.startsWith = exports.slice = exports.lastIndexOf = exports.indexOf = exports.includes = exports.endsWith = exports.copy = exports.compare = exports.equal = exports.concatToUint8Array = exports.concat = exports.toViewCopy = exports.toView = exports.toUint8ArrayCopy = exports.toUint8Array = exports.toArrayBufferLike = exports.toArrayBuffer = exports.isSharedArrayBuffer = exports.isBufferSource = exports.isArrayBufferView = exports.isArrayBufferLike = exports.isArrayBuffer = exports.assertBufferSource = void 0;
    var buffer_source_js_1 = require_buffer_source();
    Object.defineProperty(exports, "assertBufferSource", { enumerable: true, get: function() {
      return buffer_source_js_1.assertBufferSource;
    } });
    Object.defineProperty(exports, "isArrayBuffer", { enumerable: true, get: function() {
      return buffer_source_js_1.isArrayBuffer;
    } });
    Object.defineProperty(exports, "isArrayBufferLike", { enumerable: true, get: function() {
      return buffer_source_js_1.isArrayBufferLike;
    } });
    Object.defineProperty(exports, "isArrayBufferView", { enumerable: true, get: function() {
      return buffer_source_js_1.isArrayBufferView;
    } });
    Object.defineProperty(exports, "isBufferSource", { enumerable: true, get: function() {
      return buffer_source_js_1.isBufferSource;
    } });
    Object.defineProperty(exports, "isSharedArrayBuffer", { enumerable: true, get: function() {
      return buffer_source_js_1.isSharedArrayBuffer;
    } });
    Object.defineProperty(exports, "toArrayBuffer", { enumerable: true, get: function() {
      return buffer_source_js_1.toArrayBuffer;
    } });
    Object.defineProperty(exports, "toArrayBufferLike", { enumerable: true, get: function() {
      return buffer_source_js_1.toArrayBufferLike;
    } });
    Object.defineProperty(exports, "toUint8Array", { enumerable: true, get: function() {
      return buffer_source_js_1.toUint8Array;
    } });
    Object.defineProperty(exports, "toUint8ArrayCopy", { enumerable: true, get: function() {
      return buffer_source_js_1.toUint8ArrayCopy;
    } });
    Object.defineProperty(exports, "toView", { enumerable: true, get: function() {
      return buffer_source_js_1.toView;
    } });
    Object.defineProperty(exports, "toViewCopy", { enumerable: true, get: function() {
      return buffer_source_js_1.toViewCopy;
    } });
    var concat_js_1 = require_concat();
    Object.defineProperty(exports, "concat", { enumerable: true, get: function() {
      return concat_js_1.concat;
    } });
    Object.defineProperty(exports, "concatToUint8Array", { enumerable: true, get: function() {
      return concat_js_1.concatToUint8Array;
    } });
    var equal_js_1 = require_equal();
    Object.defineProperty(exports, "equal", { enumerable: true, get: function() {
      return equal_js_1.equal;
    } });
    var sequence_js_1 = require_sequence();
    Object.defineProperty(exports, "compare", { enumerable: true, get: function() {
      return sequence_js_1.compare;
    } });
    Object.defineProperty(exports, "copy", { enumerable: true, get: function() {
      return sequence_js_1.copy;
    } });
    Object.defineProperty(exports, "endsWith", { enumerable: true, get: function() {
      return sequence_js_1.endsWith;
    } });
    Object.defineProperty(exports, "includes", { enumerable: true, get: function() {
      return sequence_js_1.includes;
    } });
    Object.defineProperty(exports, "indexOf", { enumerable: true, get: function() {
      return sequence_js_1.indexOf;
    } });
    Object.defineProperty(exports, "lastIndexOf", { enumerable: true, get: function() {
      return sequence_js_1.lastIndexOf;
    } });
    Object.defineProperty(exports, "slice", { enumerable: true, get: function() {
      return sequence_js_1.slice;
    } });
    Object.defineProperty(exports, "startsWith", { enumerable: true, get: function() {
      return sequence_js_1.startsWith;
    } });
    Object.defineProperty(exports, "tail", { enumerable: true, get: function() {
      return sequence_js_1.tail;
    } });
  }
});

// node_modules/@peculiar/utils/build/cjs/encoding/binary.js
var require_binary = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/encoding/binary.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.binary = void 0;
    exports.encode = encode;
    exports.decode = decode;
    exports.is = is;
    var index_js_1 = require_bytes();
    function encode(data) {
      const bytes = (0, index_js_1.toUint8Array)(data);
      let result = "";
      for (const byte of bytes) {
        result += String.fromCharCode(byte);
      }
      return result;
    }
    function decode(text) {
      const result = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) {
        result[i] = text.charCodeAt(i) & 255;
      }
      return result;
    }
    function is(text) {
      return typeof text === "string";
    }
    exports.binary = { encode, decode, is };
  }
});

// node_modules/@peculiar/utils/build/cjs/encoding/hex.js
var require_hex = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/encoding/hex.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.hex = exports.formats = void 0;
    exports.normalize = normalize;
    exports.is = is;
    exports.encode = encode;
    exports.decode = decode;
    exports.parse = parse;
    exports.format = format;
    var index_js_1 = require_bytes();
    var HEX_CHARACTER_REGEX = /^[0-9a-f]$/i;
    var COMMON_SEPARATORS = [" ", "	", "\n", "\r", ":", "-", "."];
    function resolveSeparators(options) {
      if (options.separators === "none") {
        return [];
      }
      if (!options.separators || options.separators === "common") {
        return COMMON_SEPARATORS;
      }
      return options.separators;
    }
    function validateSeparator(separator) {
      if (!separator) {
        throw new TypeError("Hex separators must be non-empty strings");
      }
    }
    function matchSeparator(text, index, separators) {
      for (const separator of separators) {
        if (text.startsWith(separator, index)) {
          return separator;
        }
      }
      return void 0;
    }
    function detectCase(text) {
      const hasUpper = /[A-F]/.test(text);
      const hasLower = /[a-f]/.test(text);
      return hasUpper && !hasLower ? "upper" : "lower";
    }
    function detectLineSeparator(text) {
      const match = /\r\n|\n/.exec(text);
      if (!match) {
        return void 0;
      }
      return match[0] === "\r\n" ? "\r\n" : "\n";
    }
    function compactForDetection(text) {
      return text.replace(/[^0-9a-f]/gi, "");
    }
    function detectGroup(text) {
      const segments = text.match(/[0-9A-Fa-f]+|[^0-9A-Fa-f]+/g) ?? [];
      if (segments.length < 3) {
        return void 0;
      }
      const hexSegments = segments.filter((_, index) => index % 2 === 0);
      const separators = segments.filter((_, index) => index % 2 === 1);
      const separator = separators[0];
      if (!separator || separators.some((item) => item !== separator)) {
        return void 0;
      }
      if (hexSegments.some((segment) => segment.length === 0 || segment.length % 2 !== 0)) {
        return void 0;
      }
      const firstLength = hexSegments[0]?.length ?? 0;
      if (!firstLength) {
        return void 0;
      }
      if (hexSegments.slice(0, -1).some((segment) => segment.length !== firstLength)) {
        return void 0;
      }
      if ((hexSegments[hexSegments.length - 1]?.length ?? 0) > firstLength) {
        return void 0;
      }
      return {
        size: firstLength / 2,
        separator
      };
    }
    function detectFormat(text) {
      const trimmed = text.trim();
      const prefix = /^0x/i.test(trimmed) ? "0x" : "";
      const body = prefix ? trimmed.slice(2) : trimmed;
      const lineSeparator = detectLineSeparator(body);
      const lines = body.split(/\r\n|\n/).filter((line) => line.length > 0);
      const sampleLine = lines[0]?.trim() ?? "";
      const group = detectGroup(sampleLine);
      const format2 = {
        case: detectCase(trimmed),
        prefix
      };
      if (group) {
        format2.group = group;
      }
      if (lineSeparator && lines.length > 1) {
        const firstLineBytes = compactForDetection(lines[0] ?? "").length / 2;
        if (firstLineBytes > 0 && lines.slice(0, -1).every((line) => compactForDetection(line).length / 2 === firstLineBytes)) {
          format2.line = {
            bytesPerLine: firstLineBytes,
            separator: lineSeparator
          };
        }
      }
      return format2;
    }
    function normalizeText(text, options) {
      const allowPrefix = options.allowPrefix ?? true;
      const separators = [...resolveSeparators(options)].sort((left, right) => right.length - left.length);
      for (const separator of separators) {
        validateSeparator(separator);
      }
      let working = text.trim();
      if (/^0x/i.test(working)) {
        if (!allowPrefix) {
          throw new TypeError("Hexadecimal text must not include a 0x prefix");
        }
        working = working.slice(2);
      }
      let normalized = "";
      let lastTokenWasSeparator = false;
      for (let index = 0; index < working.length; ) {
        const character = working[index] ?? "";
        if (HEX_CHARACTER_REGEX.test(character)) {
          normalized += character;
          lastTokenWasSeparator = false;
          index += 1;
          continue;
        }
        const separator = matchSeparator(working, index, separators);
        if (!separator) {
          throw new TypeError("Input is not valid hexadecimal text");
        }
        if (options.strict && (lastTokenWasSeparator || normalized.length === 0)) {
          throw new TypeError("Hexadecimal text contains misplaced separators");
        }
        lastTokenWasSeparator = true;
        index += separator.length;
      }
      if (options.strict && lastTokenWasSeparator && normalized.length > 0) {
        throw new TypeError("Hexadecimal text must not end with a separator");
      }
      if (normalized.length % 2 !== 0) {
        if (!options.allowOddLength) {
          throw new TypeError("Hexadecimal text must contain an even number of characters");
        }
        normalized = `0${normalized}`;
      }
      return normalized.toLowerCase();
    }
    function groupPairs(pairs, group) {
      if (!group) {
        return pairs.join("");
      }
      if (!Number.isInteger(group.size) || group.size < 1) {
        throw new RangeError("Hex group size must be a positive integer");
      }
      const chunks = [];
      for (let index = 0; index < pairs.length; index += group.size) {
        chunks.push(pairs.slice(index, index + group.size).join(""));
      }
      return chunks.join(group.separator);
    }
    function normalize(text, options = {}) {
      return normalizeText(text, options);
    }
    function is(text, options = {}) {
      if (typeof text !== "string") {
        return false;
      }
      try {
        normalize(text, options);
        return true;
      } catch {
        return false;
      }
    }
    function encode(data, options = {}) {
      const bytes = (0, index_js_1.toUint8Array)(data);
      const casing = options.case ?? "lower";
      const pairs = Array.from(bytes, (byte) => {
        const text = byte.toString(16).padStart(2, "0");
        return casing === "upper" ? text.toUpperCase() : text;
      });
      let body = "";
      if (options.line) {
        const bytesPerLine = options.line.bytesPerLine;
        if (!Number.isInteger(bytesPerLine) || bytesPerLine < 1) {
          throw new RangeError("Hex bytesPerLine must be a positive integer");
        }
        const separator = options.line.separator ?? "\n";
        const lines = [];
        for (let index = 0; index < pairs.length; index += bytesPerLine) {
          lines.push(groupPairs(pairs.slice(index, index + bytesPerLine), options.group));
        }
        body = lines.join(separator);
      } else {
        body = groupPairs(pairs, options.group);
      }
      return `${options.prefix ?? ""}${body}`;
    }
    function decode(text, options = {}) {
      const normalized = normalize(text, options);
      const result = new Uint8Array(normalized.length / 2);
      for (let i = 0; i < normalized.length; i += 2) {
        result[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
      }
      return result;
    }
    function parse(text, options = {}) {
      const normalized = normalize(text, options);
      return {
        bytes: decode(normalized),
        format: detectFormat(text),
        normalized
      };
    }
    function format(data, value) {
      return encode(data, value);
    }
    exports.formats = {
      compact: Object.freeze({}),
      upper: Object.freeze({ case: "upper" }),
      colon: Object.freeze({ group: { size: 1, separator: ":" } }),
      colonUpper: Object.freeze({ case: "upper", group: { size: 1, separator: ":" } }),
      groupsOf4: Object.freeze({ group: { size: 4, separator: " " } }),
      prefixed: Object.freeze({ prefix: "0x" })
    };
    exports.hex = { encode, decode, format, formats: exports.formats, is, normalize, parse };
  }
});

// node_modules/@peculiar/utils/build/cjs/encoding/utf8.js
var require_utf8 = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/encoding/utf8.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.utf8 = void 0;
    exports.encode = encode;
    exports.decode = decode;
    var index_js_1 = require_bytes();
    function encode(text) {
      return new TextEncoder().encode(text);
    }
    function decode(data) {
      return new TextDecoder("utf-8", { fatal: false }).decode((0, index_js_1.toUint8Array)(data));
    }
    exports.utf8 = { encode, decode };
  }
});

// node_modules/@peculiar/utils/build/cjs/encoding/utf16.js
var require_utf16 = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/encoding/utf16.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.utf16 = void 0;
    exports.encode = encode;
    exports.decode = decode;
    var index_js_1 = require_bytes();
    function encode(text, options = {}) {
      const result = new ArrayBuffer(text.length * 2);
      const view = new DataView(result);
      for (let i = 0; i < text.length; i++) {
        view.setUint16(i * 2, text.charCodeAt(i), options.littleEndian ?? false);
      }
      return new Uint8Array(result);
    }
    function decode(data, options = {}) {
      const buffer = (0, index_js_1.toArrayBuffer)(data);
      const view = new DataView(buffer);
      let result = "";
      for (let i = 0; i < buffer.byteLength; i += 2) {
        result += String.fromCharCode(view.getUint16(i, options.littleEndian ?? false));
      }
      return result;
    }
    exports.utf16 = { encode, decode };
  }
});

// node_modules/@peculiar/utils/build/cjs/encoding/base64.js
var require_base64 = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/encoding/base64.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.base64 = void 0;
    exports.normalize = normalize;
    exports.pad = pad;
    exports.is = is;
    exports.encode = encode;
    exports.decode = decode;
    var index_js_1 = require_bytes();
    var binary_js_1 = require_binary();
    var BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    function nodeBuffer() {
      return globalThis.Buffer;
    }
    function normalize(text) {
      return text.replace(/[\n\r\t ]/g, "");
    }
    function pad(text) {
      const remainder = text.length % 4;
      return remainder ? text + "=".repeat(4 - remainder) : text;
    }
    function is(text) {
      if (typeof text !== "string") {
        return false;
      }
      const normalized = normalize(text);
      return normalized === "" || BASE64_REGEX.test(normalized);
    }
    function encode(data, _options) {
      const bytes = (0, index_js_1.toUint8Array)(data);
      const buffer = nodeBuffer();
      if (buffer) {
        return buffer.from(bytes).toString("base64");
      }
      return btoa((0, binary_js_1.encode)(bytes));
    }
    function decode(text, _options) {
      const normalized = normalize(text);
      if (!is(normalized)) {
        throw new TypeError("Input is not valid Base64 text");
      }
      const buffer = nodeBuffer();
      if (buffer) {
        return new Uint8Array(buffer.from(normalized, "base64"));
      }
      return (0, binary_js_1.decode)(atob(normalized));
    }
    exports.base64 = { encode, decode, is, normalize, pad };
  }
});

// node_modules/@peculiar/utils/build/cjs/encoding/base64url.js
var require_base64url = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/encoding/base64url.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.base64url = void 0;
    exports.normalize = normalize;
    exports.is = is;
    exports.encode = encode;
    exports.decode = decode;
    var base64_js_1 = require_base64();
    var BASE64URL_REGEX = /^[A-Za-z0-9_-]*$/;
    function normalize(text) {
      return text.replace(/[\n\r\t ]/g, "");
    }
    function is(text) {
      return typeof text === "string" && BASE64URL_REGEX.test(normalize(text));
    }
    function encode(data, _options) {
      return base64_js_1.base64.encode(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }
    function decode(text, _options) {
      const normalized = normalize(text);
      if (!is(normalized)) {
        throw new TypeError("Input is not valid Base64Url text");
      }
      return base64_js_1.base64.decode(base64_js_1.base64.pad(normalized.replace(/-/g, "+").replace(/_/g, "/")));
    }
    exports.base64url = { encode, decode, is, normalize };
  }
});

// node_modules/@peculiar/utils/build/cjs/encoding/index.js
var require_encoding = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/encoding/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.base64url = exports.base64 = exports.utf16 = exports.utf8 = exports.hex = exports.binary = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    exports.binary = tslib_1.__importStar(require_binary());
    exports.hex = tslib_1.__importStar(require_hex());
    exports.utf8 = tslib_1.__importStar(require_utf8());
    exports.utf16 = tslib_1.__importStar(require_utf16());
    exports.base64 = tslib_1.__importStar(require_base64());
    exports.base64url = tslib_1.__importStar(require_base64url());
  }
});

// node_modules/@peculiar/utils/build/cjs/pem/pem.js
var require_pem = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/pem/pem.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pemConverter = exports.pem = void 0;
    exports.encode = encode;
    exports.encodeMany = encodeMany;
    exports.decode = decode;
    exports.find = find;
    exports.findAll = findAll;
    exports.decodeFirst = decodeFirst;
    exports.parse = parse;
    exports.format = format;
    var base64_js_1 = require_base64();
    var LABEL_REGEX = /^[A-Z0-9][A-Z0-9 ._-]*[A-Z0-9]$/i;
    var PEM_BLOCK_REGEX = /-----BEGIN ([^-]+)-----([\s\S]*?)-----END \1-----/g;
    function assertLabel(label) {
      if (!LABEL_REGEX.test(label)) {
        throw new TypeError(`Invalid PEM label '${label}'`);
      }
    }
    function wrap(text, lineLength) {
      const result = [];
      for (let i = 0; i < text.length; i += lineLength) {
        result.push(text.slice(i, i + lineLength));
      }
      return result;
    }
    function parseBody(body) {
      const normalized = body.trim().replace(/\r\n/g, "\n");
      const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
      const headers = {};
      let index = 0;
      for (; index < lines.length; index++) {
        const line = lines[index];
        const separator = line.indexOf(":");
        if (separator <= 0) {
          break;
        }
        headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
      }
      return {
        headers: Object.keys(headers).length ? headers : void 0,
        base64Lines: lines.slice(index),
        base64Text: lines.slice(index).join("")
      };
    }
    function detectNewline(text) {
      return /\r\n/.test(text) ? "\r\n" : "\n";
    }
    function collectBlocks(text, options = {}) {
      const blocks = [];
      const requestedLabel = options.label;
      let match;
      PEM_BLOCK_REGEX.lastIndex = 0;
      while (match = PEM_BLOCK_REGEX.exec(text)) {
        const label = match[1].trim();
        if (requestedLabel && label !== requestedLabel) {
          continue;
        }
        assertLabel(label);
        const parsed = parseBody(match[2]);
        blocks.push({
          label,
          data: base64_js_1.base64.decode(parsed.base64Text),
          headers: parsed.headers,
          lineLength: parsed.base64Lines[0]?.length ?? 64,
          newline: detectNewline(match[0])
        });
      }
      if (options.strict && blocks.length === 0) {
        throw new TypeError(requestedLabel ? `No PEM block with label '${requestedLabel}' was found` : "No PEM blocks were found");
      }
      return blocks;
    }
    function encode(label, data, options = {}) {
      assertLabel(label);
      const lineLength = options.lineLength ?? 64;
      if (!Number.isInteger(lineLength) || lineLength < 1) {
        throw new RangeError("PEM lineLength must be a positive integer");
      }
      const newline = options.newline ?? "\n";
      const lines = [`-----BEGIN ${label}-----`];
      if (options.headers) {
        for (const [name, value] of Object.entries(options.headers)) {
          lines.push(`${name}: ${value}`);
        }
        lines.push("");
      }
      lines.push(...wrap(base64_js_1.base64.encode(data), lineLength));
      lines.push(`-----END ${label}-----`);
      return `${lines.join(newline)}${newline}`;
    }
    function encodeMany(blocks, options = {}) {
      return blocks.map((block) => encode(block.label, block.data, { ...options, headers: block.headers ?? options.headers })).join("");
    }
    function decode(text, options = {}) {
      return collectBlocks(text, options).map(({ lineLength: _lineLength, newline: _newline, ...block }) => block);
    }
    function find(text, label) {
      return decode(text, { label })[0];
    }
    function findAll(text, label) {
      return decode(text, { label });
    }
    function decodeFirst(text, label) {
      const [block] = decode(text, { label, strict: true });
      return block.data;
    }
    function parse(text, options = {}) {
      const [block] = collectBlocks(text, { ...options, strict: true });
      const format2 = {
        label: block.label,
        headers: block.headers,
        lineLength: block.lineLength,
        newline: block.newline
      };
      return {
        bytes: block.data,
        format: format2,
        normalized: encode(block.label, block.data, format2)
      };
    }
    function format(data, value) {
      return encode(value.label, data, value);
    }
    exports.pem = { decode, decodeFirst, encode, encodeMany, find, findAll, format, parse };
    exports.pemConverter = {
      name: "pem",
      encode: (data, options) => {
        if (!options?.label) {
          throw new TypeError("PEM label is required");
        }
        return encode(options.label, data, options);
      },
      decode: (text, options) => decodeFirst(text, options?.label),
      format,
      is: (text) => typeof text === "string" && /-----BEGIN [^-]+-----/.test(text),
      parse
    };
  }
});

// node_modules/@peculiar/utils/build/cjs/pem/index.js
var require_pem2 = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/pem/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pemConverter = exports.pem = exports.parse = exports.format = exports.findAll = exports.find = exports.encodeMany = exports.encode = exports.decodeFirst = exports.decode = void 0;
    var pem_js_1 = require_pem();
    Object.defineProperty(exports, "decode", { enumerable: true, get: function() {
      return pem_js_1.decode;
    } });
    Object.defineProperty(exports, "decodeFirst", { enumerable: true, get: function() {
      return pem_js_1.decodeFirst;
    } });
    Object.defineProperty(exports, "encode", { enumerable: true, get: function() {
      return pem_js_1.encode;
    } });
    Object.defineProperty(exports, "encodeMany", { enumerable: true, get: function() {
      return pem_js_1.encodeMany;
    } });
    Object.defineProperty(exports, "find", { enumerable: true, get: function() {
      return pem_js_1.find;
    } });
    Object.defineProperty(exports, "findAll", { enumerable: true, get: function() {
      return pem_js_1.findAll;
    } });
    Object.defineProperty(exports, "format", { enumerable: true, get: function() {
      return pem_js_1.format;
    } });
    Object.defineProperty(exports, "parse", { enumerable: true, get: function() {
      return pem_js_1.parse;
    } });
    Object.defineProperty(exports, "pem", { enumerable: true, get: function() {
      return pem_js_1.pem;
    } });
    Object.defineProperty(exports, "pemConverter", { enumerable: true, get: function() {
      return pem_js_1.pemConverter;
    } });
  }
});

// node_modules/@peculiar/utils/build/cjs/converters/registry.js
var require_registry = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/converters/registry.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createConverterRegistry = createConverterRegistry;
    function keyOf(name) {
      return name.trim().toLowerCase();
    }
    function toError(error) {
      return error instanceof Error ? error : new Error(String(error));
    }
    function removeConverter(converters, primaryNames, converter) {
      for (const alias of [converter.name, ...converter.aliases ?? []]) {
        converters.delete(keyOf(alias));
      }
      primaryNames.delete(keyOf(converter.name));
    }
    function requireCapability(converter, name, capability) {
      const method = converter[capability];
      if (typeof method !== "function") {
        throw new Error(`Converter '${name}' does not support ${capability}()`);
      }
      return method;
    }
    function detectConfidence(name, text, converter) {
      const normalizedName = keyOf(converter.name || name);
      const trimmed = text.trim();
      if (!trimmed) {
        return 0;
      }
      let accepted = false;
      if (converter.is) {
        accepted = converter.is(text);
      }
      let decodable = false;
      try {
        converter.decode(text);
        decodable = true;
      } catch {
        decodable = false;
      }
      if (!accepted && !decodable) {
        return 0;
      }
      switch (normalizedName) {
        case "pem":
          return /-----BEGIN [^-]+-----/.test(text) ? 1 : 0;
        case "hex": {
          const compact = trimmed.replace(/^0x/i, "").replace(/[\s:.-]/g, "");
          if (!compact || /[^0-9a-f]/i.test(compact) || compact.length % 2 !== 0) {
            return 0;
          }
          if (/^0x/i.test(trimmed) || /[:\s.-]/.test(trimmed)) {
            return 0.95;
          }
          if (/[a-f]/.test(trimmed) || /[A-F]/.test(trimmed)) {
            return 0.8;
          }
          return 0.45;
        }
        case "base64url":
          if (/[-_]/.test(trimmed)) {
            return 0.95;
          }
          if (/=/.test(trimmed)) {
            return 0.1;
          }
          return 0.6;
        case "base64":
          if (/[+/=]/.test(trimmed)) {
            return 0.9;
          }
          return 0.55;
        case "binary":
        case "utf8":
        case "utf16be":
        case "utf16le":
          return 0;
        default:
          return accepted && decodable ? 0.75 : 0.5;
      }
    }
    function createConverterRegistry(initialConverters = []) {
      const converters = /* @__PURE__ */ new Map();
      const primaryNames = /* @__PURE__ */ new Set();
      const api = {
        register(converter, options = {}) {
          if (!converter.name || !keyOf(converter.name)) {
            throw new TypeError("Converter name is required");
          }
          const names = [...new Set([converter.name, ...converter.aliases ?? []].map(keyOf))];
          const conflicts = /* @__PURE__ */ new Set();
          for (const name of names) {
            const existing = converters.get(name);
            if (!existing) {
              continue;
            }
            if (!options.override) {
              throw new Error(`Converter '${name}' is already registered`);
            }
            conflicts.add(existing);
          }
          for (const conflicting of conflicts) {
            removeConverter(converters, primaryNames, conflicting);
          }
          for (const name of names) {
            converters.set(name, converter);
          }
          primaryNames.add(keyOf(converter.name));
          return this;
        },
        unregister(name) {
          const converter = converters.get(keyOf(name));
          if (!converter) {
            return false;
          }
          removeConverter(converters, primaryNames, converter);
          return true;
        },
        has(name) {
          return converters.has(keyOf(name));
        },
        get(name) {
          const converter = converters.get(keyOf(name));
          if (!converter) {
            throw new Error(`Converter '${name}' is not registered`);
          }
          return converter;
        },
        list() {
          return [...primaryNames].map((name) => this.get(name));
        },
        encode(name, data, options) {
          return this.get(name).encode(data, options);
        },
        decode(name, text, options) {
          return this.get(name).decode(text, options);
        },
        tryDecode(name, text, options) {
          try {
            return { ok: true, bytes: this.decode(name, text, options) };
          } catch (error) {
            return { ok: false, error: toError(error) };
          }
        },
        normalize(name, text, options) {
          const converter = this.get(name);
          return requireCapability(converter, name, "normalize").call(converter, text, options);
        },
        parse(name, text, options) {
          const converter = this.get(name);
          return requireCapability(converter, name, "parse").call(converter, text, options);
        },
        format(name, data, format) {
          const converter = this.get(name);
          return requireCapability(converter, name, "format").call(converter, data, format);
        },
        transcode(text, options) {
          const bytes = this.decode(options.from, text, options.fromOptions);
          return this.encode(options.to, bytes, options.toOptions);
        },
        detect(text, options = {}) {
          const formatNames = options.formats?.length ? options.formats.map((name) => String(name)) : this.list().map((converter) => converter.name).filter((name) => !["binary", "utf8", "utf16be", "utf16le"].includes(keyOf(name)));
          const detections = /* @__PURE__ */ new Map();
          for (const requestedName of formatNames) {
            const converter = this.get(requestedName);
            const confidence = detectConfidence(requestedName, text, converter);
            if (confidence <= 0) {
              continue;
            }
            const format = converter.name;
            const current = detections.get(format);
            if (!current || confidence > current.confidence) {
              detections.set(format, { format, confidence });
            }
          }
          return [...detections.values()].sort((left, right) => right.confidence - left.confidence);
        }
      };
      for (const converter of initialConverters) {
        api.register(converter);
      }
      return api;
    }
  }
});

// node_modules/@peculiar/utils/build/cjs/converters/defaults.js
var require_defaults = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/converters/defaults.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultConverterRegistry = exports.defaultConverters = exports.utf16leConverter = exports.utf16beConverter = exports.utf8Converter = exports.base64urlConverter = exports.base64Converter = exports.hexConverter = exports.binaryConverter = exports.pemConverter = void 0;
    var index_js_1 = require_encoding();
    var index_js_2 = require_pem2();
    var index_js_3 = require_pem2();
    Object.defineProperty(exports, "pemConverter", { enumerable: true, get: function() {
      return index_js_3.pemConverter;
    } });
    var registry_js_1 = require_registry();
    exports.binaryConverter = {
      name: "binary",
      aliases: ["latin1"],
      encode: index_js_1.binary.encode,
      decode: index_js_1.binary.decode,
      is: index_js_1.binary.is
    };
    exports.hexConverter = {
      name: "hex",
      encode: index_js_1.hex.encode,
      decode: index_js_1.hex.decode,
      format: index_js_1.hex.format,
      is: index_js_1.hex.is,
      normalize: index_js_1.hex.normalize,
      parse: index_js_1.hex.parse
    };
    exports.base64Converter = {
      name: "base64",
      aliases: ["b64"],
      encode: index_js_1.base64.encode,
      decode: index_js_1.base64.decode,
      is: index_js_1.base64.is,
      normalize: index_js_1.base64.normalize
    };
    exports.base64urlConverter = {
      name: "base64url",
      aliases: ["base64-url", "b64url"],
      encode: index_js_1.base64url.encode,
      decode: index_js_1.base64url.decode,
      is: index_js_1.base64url.is,
      normalize: index_js_1.base64url.normalize
    };
    exports.utf8Converter = {
      name: "utf8",
      aliases: ["utf-8"],
      encode: (data) => index_js_1.utf8.decode(data),
      decode: (text) => index_js_1.utf8.encode(text),
      is: (text) => typeof text === "string"
    };
    exports.utf16beConverter = {
      name: "utf16be",
      aliases: ["utf16", "utf-16", "utf-16be"],
      encode: (data) => index_js_1.utf16.decode(data),
      decode: (text) => index_js_1.utf16.encode(text),
      is: (text) => typeof text === "string"
    };
    exports.utf16leConverter = {
      name: "utf16le",
      aliases: ["utf-16le", "ucs2", "usc2"],
      encode: (data) => index_js_1.utf16.decode(data, { littleEndian: true }),
      decode: (text) => index_js_1.utf16.encode(text, { littleEndian: true }),
      is: (text) => typeof text === "string"
    };
    exports.defaultConverters = [
      exports.binaryConverter,
      exports.hexConverter,
      exports.base64Converter,
      exports.base64urlConverter,
      exports.utf8Converter,
      exports.utf16beConverter,
      exports.utf16leConverter,
      index_js_2.pemConverter
    ];
    exports.defaultConverterRegistry = (0, registry_js_1.createConverterRegistry)(exports.defaultConverters);
  }
});

// node_modules/@peculiar/utils/build/cjs/converters/convert.js
var require_convert = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/converters/convert.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.convert = void 0;
    var index_js_1 = require_bytes();
    var index_js_2 = require_encoding();
    var defaults_js_1 = require_defaults();
    function encode(name, data, ...args) {
      return defaults_js_1.defaultConverterRegistry.encode(name, data, ...args);
    }
    function decode(name, text, ...args) {
      return defaults_js_1.defaultConverterRegistry.decode(name, text, ...args);
    }
    function tryDecode(name, text, ...args) {
      return defaults_js_1.defaultConverterRegistry.tryDecode(name, text, ...args);
    }
    function normalize(name, text, ...args) {
      return defaults_js_1.defaultConverterRegistry.normalize(name, text, ...args);
    }
    function parse(name, text, ...args) {
      return defaults_js_1.defaultConverterRegistry.parse(name, text, ...args);
    }
    function format(name, data, value) {
      return defaults_js_1.defaultConverterRegistry.format(name, data, value);
    }
    function transcode(text, options) {
      return defaults_js_1.defaultConverterRegistry.transcode(text, options);
    }
    function detect(text, options) {
      return defaults_js_1.defaultConverterRegistry.detect(text, options);
    }
    function normalizeEncodingName(encoding) {
      return encoding.toLowerCase();
    }
    exports.convert = {
      encode,
      decode,
      tryDecode,
      normalize,
      parse,
      format,
      transcode,
      detect,
      to(format2, data, ...args) {
        return encode(format2, data, ...args);
      },
      from(format2, text, ...args) {
        return decode(format2, text, ...args);
      },
      toString(data, encoding = "utf8") {
        return encode(encoding, data);
      },
      fromString(text, encoding = "utf8") {
        if (normalizeEncodingName(encoding) === "hex") {
          return (0, index_js_1.toArrayBuffer)(index_js_2.hex.decode(text, { allowOddLength: true }));
        }
        return (0, index_js_1.toArrayBuffer)(decode(encoding, text));
      },
      toBase64: index_js_2.base64.encode,
      fromBase64: (text) => (0, index_js_1.toArrayBuffer)(index_js_2.base64.decode(text)),
      toBase64Url: index_js_2.base64url.encode,
      fromBase64Url: (text) => (0, index_js_1.toArrayBuffer)(index_js_2.base64url.decode(text)),
      toHex: index_js_2.hex.encode,
      fromHex: (text) => (0, index_js_1.toArrayBuffer)(index_js_2.hex.decode(text, { allowOddLength: true })),
      toBinary: index_js_2.binary.encode,
      fromBinary: (text) => (0, index_js_1.toArrayBuffer)(index_js_2.binary.decode(text)),
      toUtf8String: index_js_2.utf8.decode,
      fromUtf8String: (text) => (0, index_js_1.toArrayBuffer)(index_js_2.utf8.encode(text)),
      toUtf16String: (data, littleEndian = false) => index_js_2.utf16.decode(data, { littleEndian }),
      fromUtf16String: (text, littleEndian = false) => (0, index_js_1.toArrayBuffer)(index_js_2.utf16.encode(text, { littleEndian })),
      isHex: index_js_2.hex.is,
      isBase64: index_js_2.base64.is,
      isBase64Url: index_js_2.base64url.is,
      formatString: index_js_2.base64.normalize
    };
  }
});

// node_modules/@peculiar/utils/build/cjs/converters/index.js
var require_converters = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/converters/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.convert = exports.utf8Converter = exports.utf16leConverter = exports.utf16beConverter = exports.pemConverter = exports.hexConverter = exports.defaultConverters = exports.defaultConverterRegistry = exports.binaryConverter = exports.base64urlConverter = exports.base64Converter = exports.createConverterRegistry = void 0;
    var registry_js_1 = require_registry();
    Object.defineProperty(exports, "createConverterRegistry", { enumerable: true, get: function() {
      return registry_js_1.createConverterRegistry;
    } });
    var defaults_js_1 = require_defaults();
    Object.defineProperty(exports, "base64Converter", { enumerable: true, get: function() {
      return defaults_js_1.base64Converter;
    } });
    Object.defineProperty(exports, "base64urlConverter", { enumerable: true, get: function() {
      return defaults_js_1.base64urlConverter;
    } });
    Object.defineProperty(exports, "binaryConverter", { enumerable: true, get: function() {
      return defaults_js_1.binaryConverter;
    } });
    Object.defineProperty(exports, "defaultConverterRegistry", { enumerable: true, get: function() {
      return defaults_js_1.defaultConverterRegistry;
    } });
    Object.defineProperty(exports, "defaultConverters", { enumerable: true, get: function() {
      return defaults_js_1.defaultConverters;
    } });
    Object.defineProperty(exports, "hexConverter", { enumerable: true, get: function() {
      return defaults_js_1.hexConverter;
    } });
    Object.defineProperty(exports, "pemConverter", { enumerable: true, get: function() {
      return defaults_js_1.pemConverter;
    } });
    Object.defineProperty(exports, "utf16beConverter", { enumerable: true, get: function() {
      return defaults_js_1.utf16beConverter;
    } });
    Object.defineProperty(exports, "utf16leConverter", { enumerable: true, get: function() {
      return defaults_js_1.utf16leConverter;
    } });
    Object.defineProperty(exports, "utf8Converter", { enumerable: true, get: function() {
      return defaults_js_1.utf8Converter;
    } });
    var convert_js_1 = require_convert();
    Object.defineProperty(exports, "convert", { enumerable: true, get: function() {
      return convert_js_1.convert;
    } });
  }
});

// node_modules/@peculiar/utils/build/cjs/legacy/buffer-source-converter.js
var require_buffer_source_converter = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/legacy/buffer-source-converter.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BufferSourceConverter = void 0;
    var index_js_1 = require_bytes();
    var BufferSourceConverter = class {
      static isArrayBuffer(data) {
        return (0, index_js_1.isArrayBuffer)(data);
      }
      static toArrayBuffer(data) {
        return (0, index_js_1.toArrayBuffer)(data);
      }
      static toUint8Array(data) {
        return (0, index_js_1.toUint8Array)(data);
      }
      static toView(data, type) {
        return (0, index_js_1.toView)(data, type);
      }
      static isBufferSource(data) {
        return (0, index_js_1.isBufferSource)(data);
      }
      static isArrayBufferView(data) {
        return (0, index_js_1.isArrayBufferView)(data);
      }
      static isEqual(a, b) {
        return (0, index_js_1.equal)(a, b);
      }
      static concat(first, second, ...rest) {
        if (Array.isArray(first)) {
          return typeof second === "function" ? (0, index_js_1.concat)(first, second) : (0, index_js_1.concat)(first);
        }
        const buffers = [first, second, ...rest].filter(Boolean);
        return (0, index_js_1.concat)(buffers);
      }
    };
    exports.BufferSourceConverter = BufferSourceConverter;
  }
});

// node_modules/@peculiar/utils/build/cjs/legacy/convert.js
var require_convert2 = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/legacy/convert.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Convert = void 0;
    var index_js_1 = require_converters();
    function normalizeTextEncoding(encoding) {
      return encoding === "ascii" ? "binary" : encoding;
    }
    var Convert = class _Convert {
      static DEFAULT_UTF8_ENCODING = "utf8";
      static isHex(data) {
        return index_js_1.convert.isHex(data);
      }
      static isBase64(data) {
        return index_js_1.convert.isBase64(data);
      }
      static isBase64Url(data) {
        return index_js_1.convert.isBase64Url(data);
      }
      static ToString(buffer, enc = "utf8") {
        return index_js_1.convert.toString(buffer, enc);
      }
      static FromString(str2, enc = "utf8") {
        if (!str2) {
          return new ArrayBuffer(0);
        }
        return index_js_1.convert.fromString(str2, enc);
      }
      static ToBase64(buffer) {
        return index_js_1.convert.toBase64(buffer);
      }
      static FromBase64(base64) {
        return index_js_1.convert.fromBase64(base64);
      }
      static FromBase64Url(base64url) {
        return index_js_1.convert.fromBase64Url(base64url);
      }
      static ToBase64Url(data) {
        return index_js_1.convert.toBase64Url(data);
      }
      static FromUtf8String(text, encoding = _Convert.DEFAULT_UTF8_ENCODING) {
        return index_js_1.convert.fromString(text, normalizeTextEncoding(encoding));
      }
      static ToUtf8String(buffer, encoding = _Convert.DEFAULT_UTF8_ENCODING) {
        return index_js_1.convert.toString(buffer, normalizeTextEncoding(encoding));
      }
      static FromBinary(text) {
        return index_js_1.convert.fromBinary(text);
      }
      static ToBinary(buffer) {
        return index_js_1.convert.toBinary(buffer);
      }
      static ToHex(buffer) {
        return index_js_1.convert.toHex(buffer);
      }
      static FromHex(hexString) {
        return index_js_1.convert.fromHex(hexString);
      }
      static ToUtf16String(buffer, littleEndian = false) {
        return index_js_1.convert.toUtf16String(buffer, littleEndian);
      }
      static FromUtf16String(text, littleEndian = false) {
        return index_js_1.convert.fromUtf16String(text, littleEndian);
      }
      static Base64Padding(base64) {
        const padCount = 4 - base64.length % 4;
        return padCount < 4 ? base64 + "=".repeat(padCount) : base64;
      }
      static formatString(data) {
        return index_js_1.convert.formatString(data);
      }
    };
    exports.Convert = Convert;
  }
});

// node_modules/@peculiar/utils/build/cjs/legacy/functions.js
var require_functions = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/legacy/functions.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.assign = assign;
    exports.combine = combine;
    exports.isEqual = isEqual;
    var index_js_1 = require_bytes();
    function assign(target, ...sources) {
      for (const source of sources) {
        if (!source) {
          continue;
        }
        for (const prop in source) {
          target[prop] = source[prop];
        }
      }
      return target;
    }
    function combine(...buf) {
      return (0, index_js_1.concat)(buf);
    }
    function isEqual(bytes1, bytes2) {
      return (0, index_js_1.equal)(bytes1, bytes2);
    }
  }
});

// node_modules/@peculiar/utils/build/cjs/legacy/index.js
var require_legacy = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/legacy/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isEqual = exports.combine = exports.assign = exports.Convert = exports.BufferSourceConverter = void 0;
    var buffer_source_converter_js_1 = require_buffer_source_converter();
    Object.defineProperty(exports, "BufferSourceConverter", { enumerable: true, get: function() {
      return buffer_source_converter_js_1.BufferSourceConverter;
    } });
    var convert_js_1 = require_convert2();
    Object.defineProperty(exports, "Convert", { enumerable: true, get: function() {
      return convert_js_1.Convert;
    } });
    var functions_js_1 = require_functions();
    Object.defineProperty(exports, "assign", { enumerable: true, get: function() {
      return functions_js_1.assign;
    } });
    Object.defineProperty(exports, "combine", { enumerable: true, get: function() {
      return functions_js_1.combine;
    } });
    Object.defineProperty(exports, "isEqual", { enumerable: true, get: function() {
      return functions_js_1.isEqual;
    } });
  }
});

// node_modules/@peculiar/utils/build/cjs/index.js
var require_cjs = __commonJS({
  "node_modules/@peculiar/utils/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.bytes = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_bytes(), exports);
    exports.bytes = tslib_1.__importStar(require_bytes());
    tslib_1.__exportStar(require_encoding(), exports);
    tslib_1.__exportStar(require_pem2(), exports);
    tslib_1.__exportStar(require_converters(), exports);
    tslib_1.__exportStar(require_legacy(), exports);
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/enums.js
var require_enums = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/enums.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AsnPropTypes = exports.AsnTypeTypes = void 0;
    var AsnTypeTypes;
    (function(AsnTypeTypes2) {
      AsnTypeTypes2[AsnTypeTypes2["Sequence"] = 0] = "Sequence";
      AsnTypeTypes2[AsnTypeTypes2["Set"] = 1] = "Set";
      AsnTypeTypes2[AsnTypeTypes2["Choice"] = 2] = "Choice";
    })(AsnTypeTypes || (exports.AsnTypeTypes = AsnTypeTypes = {}));
    var AsnPropTypes;
    (function(AsnPropTypes2) {
      AsnPropTypes2[AsnPropTypes2["Any"] = 1] = "Any";
      AsnPropTypes2[AsnPropTypes2["Boolean"] = 2] = "Boolean";
      AsnPropTypes2[AsnPropTypes2["OctetString"] = 3] = "OctetString";
      AsnPropTypes2[AsnPropTypes2["BitString"] = 4] = "BitString";
      AsnPropTypes2[AsnPropTypes2["Integer"] = 5] = "Integer";
      AsnPropTypes2[AsnPropTypes2["Enumerated"] = 6] = "Enumerated";
      AsnPropTypes2[AsnPropTypes2["ObjectIdentifier"] = 7] = "ObjectIdentifier";
      AsnPropTypes2[AsnPropTypes2["Utf8String"] = 8] = "Utf8String";
      AsnPropTypes2[AsnPropTypes2["BmpString"] = 9] = "BmpString";
      AsnPropTypes2[AsnPropTypes2["UniversalString"] = 10] = "UniversalString";
      AsnPropTypes2[AsnPropTypes2["NumericString"] = 11] = "NumericString";
      AsnPropTypes2[AsnPropTypes2["PrintableString"] = 12] = "PrintableString";
      AsnPropTypes2[AsnPropTypes2["TeletexString"] = 13] = "TeletexString";
      AsnPropTypes2[AsnPropTypes2["VideotexString"] = 14] = "VideotexString";
      AsnPropTypes2[AsnPropTypes2["IA5String"] = 15] = "IA5String";
      AsnPropTypes2[AsnPropTypes2["GraphicString"] = 16] = "GraphicString";
      AsnPropTypes2[AsnPropTypes2["VisibleString"] = 17] = "VisibleString";
      AsnPropTypes2[AsnPropTypes2["GeneralString"] = 18] = "GeneralString";
      AsnPropTypes2[AsnPropTypes2["CharacterString"] = 19] = "CharacterString";
      AsnPropTypes2[AsnPropTypes2["UTCTime"] = 20] = "UTCTime";
      AsnPropTypes2[AsnPropTypes2["GeneralizedTime"] = 21] = "GeneralizedTime";
      AsnPropTypes2[AsnPropTypes2["DATE"] = 22] = "DATE";
      AsnPropTypes2[AsnPropTypes2["TimeOfDay"] = 23] = "TimeOfDay";
      AsnPropTypes2[AsnPropTypes2["DateTime"] = 24] = "DateTime";
      AsnPropTypes2[AsnPropTypes2["Duration"] = 25] = "Duration";
      AsnPropTypes2[AsnPropTypes2["TIME"] = 26] = "TIME";
      AsnPropTypes2[AsnPropTypes2["Null"] = 27] = "Null";
      AsnPropTypes2[AsnPropTypes2["RelativeObjectIdentifier"] = 28] = "RelativeObjectIdentifier";
    })(AsnPropTypes || (exports.AsnPropTypes = AsnPropTypes = {}));
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/types/bit_string.js
var require_bit_string = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/types/bit_string.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BitString = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1js = tslib_1.__importStar(require_build2());
    var utils_1 = require_cjs();
    var BitString = class {
      unusedBits = 0;
      value = new ArrayBuffer(0);
      constructor(params, unusedBits = 0) {
        if (params) {
          if (typeof params === "number") {
            this.fromNumber(params);
          } else if ((0, utils_1.isBufferSource)(params)) {
            this.unusedBits = unusedBits;
            this.value = (0, utils_1.toArrayBuffer)(params);
          } else {
            throw TypeError("Unsupported type of 'params' argument for BitString");
          }
        }
      }
      fromASN(asn) {
        if (!(asn instanceof asn1js.BitString)) {
          throw new TypeError("Argument 'asn' is not instance of ASN.1 BitString");
        }
        this.unusedBits = asn.valueBlock.unusedBits;
        this.value = (0, utils_1.toArrayBuffer)(asn.valueBlock.valueHex);
        return this;
      }
      toASN() {
        return new asn1js.BitString({
          unusedBits: this.unusedBits,
          valueHex: this.value
        });
      }
      toSchema(name) {
        return new asn1js.BitString({ name });
      }
      toNumber() {
        let res = "";
        const uintArray = new Uint8Array(this.value);
        for (const octet of uintArray) {
          res += octet.toString(2).padStart(8, "0");
        }
        res = res.split("").reverse().join("");
        if (this.unusedBits) {
          res = res.slice(this.unusedBits).padStart(this.unusedBits, "0");
        }
        return parseInt(res, 2);
      }
      fromNumber(value) {
        let bits = value.toString(2);
        const octetSize = bits.length + 7 >> 3;
        this.unusedBits = (octetSize << 3) - bits.length;
        const octets = new Uint8Array(octetSize);
        bits = bits.padStart(octetSize << 3, "0").split("").reverse().join("");
        let index = 0;
        while (index < octetSize) {
          octets[index] = parseInt(bits.slice(index << 3, (index << 3) + 8), 2);
          index++;
        }
        this.value = octets.buffer;
      }
    };
    exports.BitString = BitString;
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/types/octet_string.js
var require_octet_string = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/types/octet_string.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OctetString = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1js = tslib_1.__importStar(require_build2());
    var utils_1 = require_cjs();
    var OctetString = class {
      buffer;
      get byteLength() {
        return this.buffer.byteLength;
      }
      get byteOffset() {
        return 0;
      }
      constructor(param) {
        if (typeof param === "number") {
          this.buffer = new ArrayBuffer(param);
        } else {
          if ((0, utils_1.isBufferSource)(param)) {
            this.buffer = (0, utils_1.toArrayBuffer)(param);
          } else if (Array.isArray(param)) {
            this.buffer = new Uint8Array(param).buffer;
          } else {
            this.buffer = new ArrayBuffer(0);
          }
        }
      }
      fromASN(asn) {
        if (!(asn instanceof asn1js.OctetString)) {
          throw new TypeError("Argument 'asn' is not instance of ASN.1 OctetString");
        }
        this.buffer = (0, utils_1.toArrayBuffer)(asn.valueBlock.valueHex);
        return this;
      }
      toASN() {
        return new asn1js.OctetString({ valueHex: this.buffer });
      }
      toSchema(name) {
        return new asn1js.OctetString({ name });
      }
    };
    exports.OctetString = OctetString;
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/types/index.js
var require_types = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/types/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_bit_string(), exports);
    tslib_1.__exportStar(require_octet_string(), exports);
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/converters.js
var require_converters2 = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/converters.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AsnNullConverter = exports.AsnGeneralizedTimeConverter = exports.AsnUTCTimeConverter = exports.AsnCharacterStringConverter = exports.AsnGeneralStringConverter = exports.AsnVisibleStringConverter = exports.AsnGraphicStringConverter = exports.AsnIA5StringConverter = exports.AsnVideotexStringConverter = exports.AsnTeletexStringConverter = exports.AsnPrintableStringConverter = exports.AsnNumericStringConverter = exports.AsnUniversalStringConverter = exports.AsnBmpStringConverter = exports.AsnUtf8StringConverter = exports.AsnConstructedOctetStringConverter = exports.AsnOctetStringConverter = exports.AsnBooleanConverter = exports.AsnRelativeObjectIdentifierConverter = exports.AsnObjectIdentifierConverter = exports.AsnBitStringConverter = exports.AsnIntegerBigIntConverter = exports.AsnIntegerArrayBufferConverter = exports.AsnEnumeratedConverter = exports.AsnIntegerConverter = exports.AsnAnyConverter = void 0;
    exports.defaultConverter = defaultConverter;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1js = tslib_1.__importStar(require_build2());
    var utils_1 = require_cjs();
    var enums_1 = require_enums();
    var index_1 = require_types();
    exports.AsnAnyConverter = {
      fromASN: (value) => value instanceof asn1js.Null ? null : (0, utils_1.toArrayBuffer)(value.valueBeforeDecodeView),
      toASN: (value) => {
        if (value === null) {
          return new asn1js.Null();
        }
        const schema = asn1js.fromBER(value, { maxDepth: Infinity, maxNodes: Infinity, maxContentLength: Infinity });
        if (schema.result.error) {
          throw new Error(schema.result.error);
        }
        return schema.result;
      }
    };
    exports.AsnIntegerConverter = {
      fromASN: (value) => value.valueBlock.valueHexView.byteLength >= 4 ? value.valueBlock.toString() : value.valueBlock.valueDec,
      toASN: (value) => new asn1js.Integer({ value: +value })
    };
    exports.AsnEnumeratedConverter = {
      fromASN: (value) => value.valueBlock.valueDec,
      toASN: (value) => new asn1js.Enumerated({ value })
    };
    exports.AsnIntegerArrayBufferConverter = {
      fromASN: (value) => (0, utils_1.toArrayBuffer)(value.valueBlock.valueHexView),
      toASN: (value) => new asn1js.Integer({ valueHex: value })
    };
    exports.AsnIntegerBigIntConverter = {
      fromASN: (value) => value.toBigInt(),
      toASN: (value) => asn1js.Integer.fromBigInt(value)
    };
    exports.AsnBitStringConverter = {
      fromASN: (value) => (0, utils_1.toArrayBuffer)(value.valueBlock.valueHexView),
      toASN: (value) => new asn1js.BitString({ valueHex: value })
    };
    exports.AsnObjectIdentifierConverter = {
      fromASN: (value) => value.valueBlock.toString(),
      toASN: (value) => new asn1js.ObjectIdentifier({ value })
    };
    exports.AsnRelativeObjectIdentifierConverter = {
      fromASN: (value) => value.valueBlock.toString(),
      toASN: (value) => new asn1js.RelativeObjectIdentifier({ value })
    };
    exports.AsnBooleanConverter = {
      fromASN: (value) => value.valueBlock.value,
      toASN: (value) => new asn1js.Boolean({ value })
    };
    exports.AsnOctetStringConverter = {
      fromASN: (value) => (0, utils_1.toArrayBuffer)(value.valueBlock.valueHexView),
      toASN: (value) => new asn1js.OctetString({ valueHex: value })
    };
    exports.AsnConstructedOctetStringConverter = {
      fromASN: (value) => new index_1.OctetString(value.getValue()),
      toASN: (value) => value.toASN()
    };
    function createStringConverter(Asn1Type) {
      return {
        fromASN: (value) => value.valueBlock.value,
        toASN: (value) => new Asn1Type({ value })
      };
    }
    exports.AsnUtf8StringConverter = createStringConverter(asn1js.Utf8String);
    exports.AsnBmpStringConverter = createStringConverter(asn1js.BmpString);
    exports.AsnUniversalStringConverter = createStringConverter(asn1js.UniversalString);
    exports.AsnNumericStringConverter = createStringConverter(asn1js.NumericString);
    exports.AsnPrintableStringConverter = createStringConverter(asn1js.PrintableString);
    exports.AsnTeletexStringConverter = createStringConverter(asn1js.TeletexString);
    exports.AsnVideotexStringConverter = createStringConverter(asn1js.VideotexString);
    exports.AsnIA5StringConverter = createStringConverter(asn1js.IA5String);
    exports.AsnGraphicStringConverter = createStringConverter(asn1js.GraphicString);
    exports.AsnVisibleStringConverter = createStringConverter(asn1js.VisibleString);
    exports.AsnGeneralStringConverter = createStringConverter(asn1js.GeneralString);
    exports.AsnCharacterStringConverter = createStringConverter(asn1js.CharacterString);
    exports.AsnUTCTimeConverter = {
      fromASN: (value) => value.toDate(),
      toASN: (value) => new asn1js.UTCTime({ valueDate: value })
    };
    exports.AsnGeneralizedTimeConverter = {
      fromASN: (value) => value.toDate(),
      toASN: (value) => new asn1js.GeneralizedTime({ valueDate: value })
    };
    exports.AsnNullConverter = {
      fromASN: () => null,
      toASN: () => {
        return new asn1js.Null();
      }
    };
    function defaultConverter(type) {
      switch (type) {
        case enums_1.AsnPropTypes.Any:
          return exports.AsnAnyConverter;
        case enums_1.AsnPropTypes.BitString:
          return exports.AsnBitStringConverter;
        case enums_1.AsnPropTypes.BmpString:
          return exports.AsnBmpStringConverter;
        case enums_1.AsnPropTypes.Boolean:
          return exports.AsnBooleanConverter;
        case enums_1.AsnPropTypes.CharacterString:
          return exports.AsnCharacterStringConverter;
        case enums_1.AsnPropTypes.Enumerated:
          return exports.AsnEnumeratedConverter;
        case enums_1.AsnPropTypes.GeneralString:
          return exports.AsnGeneralStringConverter;
        case enums_1.AsnPropTypes.GeneralizedTime:
          return exports.AsnGeneralizedTimeConverter;
        case enums_1.AsnPropTypes.GraphicString:
          return exports.AsnGraphicStringConverter;
        case enums_1.AsnPropTypes.IA5String:
          return exports.AsnIA5StringConverter;
        case enums_1.AsnPropTypes.Integer:
          return exports.AsnIntegerConverter;
        case enums_1.AsnPropTypes.Null:
          return exports.AsnNullConverter;
        case enums_1.AsnPropTypes.NumericString:
          return exports.AsnNumericStringConverter;
        case enums_1.AsnPropTypes.ObjectIdentifier:
          return exports.AsnObjectIdentifierConverter;
        case enums_1.AsnPropTypes.RelativeObjectIdentifier:
          return exports.AsnRelativeObjectIdentifierConverter;
        case enums_1.AsnPropTypes.OctetString:
          return exports.AsnOctetStringConverter;
        case enums_1.AsnPropTypes.PrintableString:
          return exports.AsnPrintableStringConverter;
        case enums_1.AsnPropTypes.TeletexString:
          return exports.AsnTeletexStringConverter;
        case enums_1.AsnPropTypes.UTCTime:
          return exports.AsnUTCTimeConverter;
        case enums_1.AsnPropTypes.UniversalString:
          return exports.AsnUniversalStringConverter;
        case enums_1.AsnPropTypes.Utf8String:
          return exports.AsnUtf8StringConverter;
        case enums_1.AsnPropTypes.VideotexString:
          return exports.AsnVideotexStringConverter;
        case enums_1.AsnPropTypes.VisibleString:
          return exports.AsnVisibleStringConverter;
        default:
          return null;
      }
    }
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/helper.js
var require_helper = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/helper.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isConvertible = isConvertible;
    exports.isTypeOfArray = isTypeOfArray;
    exports.isArrayEqual = isArrayEqual;
    function isConvertible(target) {
      if (typeof target === "function" && target.prototype) {
        if (target.prototype.toASN && target.prototype.fromASN) {
          return true;
        } else {
          return isConvertible(target.prototype);
        }
      } else {
        return !!(target && typeof target === "object" && "toASN" in target && "fromASN" in target);
      }
    }
    function isTypeOfArray(target) {
      if (target) {
        const proto = Object.getPrototypeOf(target);
        if (proto?.prototype?.constructor === Array) {
          return true;
        }
        return isTypeOfArray(proto);
      }
      return false;
    }
    function isArrayEqual(bytes1, bytes2) {
      if (!(bytes1 && bytes2)) {
        return false;
      }
      if (bytes1.byteLength !== bytes2.byteLength) {
        return false;
      }
      const b1 = new Uint8Array(bytes1);
      const b2 = new Uint8Array(bytes2);
      for (let i = 0; i < bytes1.byteLength; i++) {
        if (b1[i] !== b2[i]) {
          return false;
        }
      }
      return true;
    }
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/schema.js
var require_schema = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/schema.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AsnSchemaStorage = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1js = tslib_1.__importStar(require_build2());
    var enums_1 = require_enums();
    var helper_1 = require_helper();
    var AsnSchemaStorage = class {
      items = /* @__PURE__ */ new WeakMap();
      has(target) {
        return this.items.has(target);
      }
      get(target, checkSchema = false) {
        const schema = this.items.get(target);
        if (!schema) {
          throw new Error(`Cannot get schema for '${target.prototype.constructor.name}' target`);
        }
        if (checkSchema && !schema.schema) {
          throw new Error(`Schema '${target.prototype.constructor.name}' doesn't contain ASN.1 schema. Call 'AsnSchemaStorage.cache'.`);
        }
        return schema;
      }
      cache(target) {
        const schema = this.get(target);
        if (!schema.schema) {
          schema.schema = this.create(target, true);
        }
      }
      createDefault(target) {
        const schema = {
          type: enums_1.AsnTypeTypes.Sequence,
          items: {}
        };
        const parentSchema = this.findParentSchema(target);
        if (parentSchema) {
          Object.assign(schema, parentSchema);
          schema.items = Object.assign({}, schema.items, parentSchema.items);
        }
        return schema;
      }
      create(target, useNames) {
        const schema = this.items.get(target) || this.createDefault(target);
        const asn1Value = [];
        for (const key in schema.items) {
          const item = schema.items[key];
          const name = useNames ? key : "";
          let asn1Item;
          if (typeof item.type === "number") {
            const Asn1TypeName = enums_1.AsnPropTypes[item.type];
            const Asn1Type = asn1js[Asn1TypeName];
            if (!Asn1Type) {
              throw new Error(`Cannot get ASN1 class by name '${Asn1TypeName}'`);
            }
            asn1Item = new Asn1Type({ name });
          } else if ((0, helper_1.isConvertible)(item.type)) {
            const instance = new item.type();
            asn1Item = instance.toSchema(name);
          } else if (item.optional) {
            const itemSchema = this.get(item.type);
            if (itemSchema.type === enums_1.AsnTypeTypes.Choice) {
              asn1Item = new asn1js.Any({ name });
            } else {
              asn1Item = this.create(item.type, false);
              asn1Item.name = name;
            }
          } else {
            asn1Item = new asn1js.Any({ name });
          }
          const optional = !!item.optional || item.defaultValue !== void 0;
          if (item.repeated) {
            asn1Item.name = "";
            const Container = item.repeated === "set" ? asn1js.Set : asn1js.Sequence;
            asn1Item = new Container({
              name: "",
              value: [
                new asn1js.Repeated({
                  name,
                  value: asn1Item
                })
              ]
            });
          }
          if (item.context !== null && item.context !== void 0) {
            if (item.implicit) {
              if (typeof item.type === "number" || (0, helper_1.isConvertible)(item.type)) {
                const Container = item.repeated ? asn1js.Constructed : asn1js.Primitive;
                asn1Value.push(new Container({
                  name,
                  optional,
                  idBlock: {
                    tagClass: 3,
                    tagNumber: item.context
                  }
                }));
              } else {
                this.cache(item.type);
                const isRepeated = !!item.repeated;
                let value = !isRepeated ? this.get(item.type, true).schema : asn1Item;
                value = "valueBlock" in value ? value.valueBlock.value : value.value;
                asn1Value.push(new asn1js.Constructed({
                  name: !isRepeated ? name : "",
                  optional,
                  idBlock: {
                    tagClass: 3,
                    tagNumber: item.context
                  },
                  value
                }));
              }
            } else {
              asn1Value.push(new asn1js.Constructed({
                optional,
                idBlock: {
                  tagClass: 3,
                  tagNumber: item.context
                },
                value: [asn1Item]
              }));
            }
          } else {
            asn1Item.optional = optional;
            asn1Value.push(asn1Item);
          }
        }
        switch (schema.type) {
          case enums_1.AsnTypeTypes.Sequence:
            return new asn1js.Sequence({
              value: asn1Value,
              name: ""
            });
          case enums_1.AsnTypeTypes.Set:
            return new asn1js.Set({
              value: asn1Value,
              name: ""
            });
          case enums_1.AsnTypeTypes.Choice:
            return new asn1js.Choice({
              value: asn1Value,
              name: ""
            });
          default:
            throw new Error("Unsupported ASN1 type in use");
        }
      }
      set(target, schema) {
        this.items.set(target, schema);
        return this;
      }
      findParentSchema(target) {
        const parent = Object.getPrototypeOf(target);
        if (parent) {
          const schema = this.items.get(parent);
          return schema || this.findParentSchema(parent);
        }
        return null;
      }
    };
    exports.AsnSchemaStorage = AsnSchemaStorage;
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/storage.js
var require_storage = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/storage.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.schemaStorage = void 0;
    var schema_1 = require_schema();
    exports.schemaStorage = new schema_1.AsnSchemaStorage();
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/decorators.js
var require_decorators = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/decorators.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AsnProp = exports.AsnSequenceType = exports.AsnSetType = exports.AsnChoiceType = exports.AsnType = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var converters = tslib_1.__importStar(require_converters2());
    var enums_1 = require_enums();
    var storage_1 = require_storage();
    var AsnType = (options) => (target) => {
      let schema;
      if (!storage_1.schemaStorage.has(target)) {
        schema = storage_1.schemaStorage.createDefault(target);
        storage_1.schemaStorage.set(target, schema);
      } else {
        schema = storage_1.schemaStorage.get(target);
      }
      Object.assign(schema, options);
    };
    exports.AsnType = AsnType;
    var AsnChoiceType = () => (0, exports.AsnType)({ type: enums_1.AsnTypeTypes.Choice });
    exports.AsnChoiceType = AsnChoiceType;
    var AsnSetType = (options) => (0, exports.AsnType)({
      type: enums_1.AsnTypeTypes.Set,
      ...options
    });
    exports.AsnSetType = AsnSetType;
    var AsnSequenceType = (options) => (0, exports.AsnType)({
      type: enums_1.AsnTypeTypes.Sequence,
      ...options
    });
    exports.AsnSequenceType = AsnSequenceType;
    var AsnProp = (options) => (target, propertyKey) => {
      let schema;
      if (!storage_1.schemaStorage.has(target.constructor)) {
        schema = storage_1.schemaStorage.createDefault(target.constructor);
        storage_1.schemaStorage.set(target.constructor, schema);
      } else {
        schema = storage_1.schemaStorage.get(target.constructor);
      }
      const copyOptions = Object.assign({}, options);
      if (typeof copyOptions.type === "number" && !copyOptions.converter) {
        const defaultConverter = converters.defaultConverter(options.type);
        if (!defaultConverter) {
          throw new Error(`Cannot get default converter for property '${propertyKey}' of ${target.constructor.name}`);
        }
        copyOptions.converter = defaultConverter;
      }
      copyOptions.raw = options.raw;
      schema.items[propertyKey] = copyOptions;
    };
    exports.AsnProp = AsnProp;
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/errors/schema_validation.js
var require_schema_validation = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/errors/schema_validation.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AsnSchemaValidationError = void 0;
    var AsnSchemaValidationError = class extends Error {
      schemas = [];
    };
    exports.AsnSchemaValidationError = AsnSchemaValidationError;
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/errors/index.js
var require_errors = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/errors/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_schema_validation(), exports);
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/parser.js
var require_parser = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/parser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AsnParser = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1js = tslib_1.__importStar(require_build2());
    var utils_1 = require_cjs();
    var enums_1 = require_enums();
    var converters = tslib_1.__importStar(require_converters2());
    var errors_1 = require_errors();
    var helper_1 = require_helper();
    var storage_1 = require_storage();
    var AsnParser = class {
      static parse(data, target, options) {
        const asn1Parsed = asn1js.fromBER((0, utils_1.toArrayBuffer)(data), options?.berOptions);
        if (asn1Parsed.result.error) {
          throw new Error(asn1Parsed.result.error);
        }
        const res = this.fromASN(asn1Parsed.result, target, options);
        return res;
      }
      static fromASN(asn1Schema, target, options) {
        try {
          if ((0, helper_1.isConvertible)(target)) {
            const value = new target();
            return value.fromASN(asn1Schema);
          }
          const schema = storage_1.schemaStorage.get(target);
          storage_1.schemaStorage.cache(target);
          let targetSchema = schema.schema;
          const choiceResult = this.handleChoiceTypes(asn1Schema, schema, target, targetSchema, options);
          if (choiceResult?.result) {
            return choiceResult.result;
          }
          if (choiceResult?.targetSchema) {
            targetSchema = choiceResult.targetSchema;
          }
          const sequenceResult = this.handleSequenceTypes(asn1Schema, schema, target, targetSchema);
          const res = new target();
          if ((0, helper_1.isTypeOfArray)(target)) {
            return this.handleArrayTypes(asn1Schema, schema, target, options);
          }
          this.processSchemaItems(schema, sequenceResult, res, options);
          return res;
        } catch (error) {
          if (error instanceof errors_1.AsnSchemaValidationError) {
            error.schemas.push(target.name);
          }
          throw error;
        }
      }
      static handleChoiceTypes(asn1Schema, schema, target, targetSchema, options) {
        if (asn1Schema.constructor === asn1js.Constructed && schema.type === enums_1.AsnTypeTypes.Choice && asn1Schema.idBlock.tagClass === 3) {
          for (const key in schema.items) {
            const schemaItem = schema.items[key];
            if (schemaItem.context === asn1Schema.idBlock.tagNumber && schemaItem.implicit) {
              if (typeof schemaItem.type === "function" && storage_1.schemaStorage.has(schemaItem.type)) {
                const fieldSchema = storage_1.schemaStorage.get(schemaItem.type);
                if (fieldSchema && fieldSchema.type === enums_1.AsnTypeTypes.Sequence) {
                  const newSeq = new asn1js.Sequence();
                  if ("value" in asn1Schema.valueBlock && Array.isArray(asn1Schema.valueBlock.value) && "value" in newSeq.valueBlock) {
                    newSeq.valueBlock.value = asn1Schema.valueBlock.value;
                    const fieldValue = this.fromASN(newSeq, schemaItem.type, options);
                    const res = new target();
                    res[key] = fieldValue;
                    return { result: res };
                  }
                }
              }
            }
          }
        } else if (asn1Schema.constructor === asn1js.Constructed && schema.type !== enums_1.AsnTypeTypes.Choice) {
          const newTargetSchema = new asn1js.Constructed({
            idBlock: {
              tagClass: 3,
              tagNumber: asn1Schema.idBlock.tagNumber
            },
            value: schema.schema.valueBlock.value
          });
          for (const key in schema.items) {
            delete asn1Schema[key];
          }
          return { targetSchema: newTargetSchema };
        }
        return null;
      }
      static handleSequenceTypes(asn1Schema, schema, target, targetSchema) {
        if (schema.type === enums_1.AsnTypeTypes.Sequence) {
          const asn1ComparedSchema = asn1js.compareSchema({}, asn1Schema, targetSchema);
          if (!asn1ComparedSchema.verified) {
            throw new errors_1.AsnSchemaValidationError(`Data does not match to ${target.name} ASN1 schema.${asn1ComparedSchema.result.error ? ` ${asn1ComparedSchema.result.error}` : ""}`);
          }
          return asn1ComparedSchema;
        } else {
          const asn1ComparedSchema = asn1js.compareSchema({}, asn1Schema, targetSchema);
          if (!asn1ComparedSchema.verified) {
            throw new errors_1.AsnSchemaValidationError(`Data does not match to ${target.name} ASN1 schema.${asn1ComparedSchema.result.error ? ` ${asn1ComparedSchema.result.error}` : ""}`);
          }
          return asn1ComparedSchema;
        }
      }
      static processRepeatedField(asn1Elements, asn1Index, schemaItem) {
        let elementsToProcess = asn1Elements.slice(asn1Index);
        if (elementsToProcess.length === 1 && elementsToProcess[0].constructor.name === "Sequence") {
          const seq = elementsToProcess[0];
          if (seq.valueBlock && seq.valueBlock.value && Array.isArray(seq.valueBlock.value)) {
            elementsToProcess = seq.valueBlock.value;
          }
        }
        if (typeof schemaItem.type === "number") {
          const converter = converters.defaultConverter(schemaItem.type);
          if (!converter)
            throw new Error(`No converter for ASN.1 type ${schemaItem.type}`);
          return elementsToProcess.filter((el) => el && el.valueBlock).map((el) => {
            try {
              return converter.fromASN(el);
            } catch {
              return void 0;
            }
          }).filter((v) => v !== void 0);
        } else {
          return elementsToProcess.filter((el) => el && el.valueBlock).map((el) => {
            try {
              return this.fromASN(el, schemaItem.type);
            } catch {
              return void 0;
            }
          }).filter((v) => v !== void 0);
        }
      }
      static processPrimitiveField(asn1Element, schemaItem) {
        const converter = converters.defaultConverter(schemaItem.type);
        if (!converter)
          throw new Error(`No converter for ASN.1 type ${schemaItem.type}`);
        return converter.fromASN(asn1Element);
      }
      static isOptionalChoiceField(schemaItem) {
        return schemaItem.optional && typeof schemaItem.type === "function" && storage_1.schemaStorage.has(schemaItem.type) && storage_1.schemaStorage.get(schemaItem.type).type === enums_1.AsnTypeTypes.Choice;
      }
      static processOptionalChoiceField(asn1Element, schemaItem) {
        try {
          const value = this.fromASN(asn1Element, schemaItem.type);
          return {
            processed: true,
            value
          };
        } catch (err) {
          if (err instanceof errors_1.AsnSchemaValidationError && /Wrong values for Choice type/.test(err.message)) {
            return { processed: false };
          }
          throw err;
        }
      }
      static handleArrayTypes(asn1Schema, schema, target, options) {
        if (!("value" in asn1Schema.valueBlock && Array.isArray(asn1Schema.valueBlock.value))) {
          throw new Error("Cannot get items from the ASN.1 parsed value. ASN.1 object is not constructed.");
        }
        const itemType = schema.itemType;
        if (typeof itemType === "number") {
          const converter = converters.defaultConverter(itemType);
          if (!converter) {
            throw new Error(`Cannot get default converter for array item of ${target.name} ASN1 schema`);
          }
          return target.from(asn1Schema.valueBlock.value, (element) => converter.fromASN(element));
        } else {
          return target.from(asn1Schema.valueBlock.value, (element) => this.fromASN(element, itemType, options));
        }
      }
      static processSchemaItems(schema, asn1ComparedSchema, res, options) {
        for (const key in schema.items) {
          const asn1SchemaValue = asn1ComparedSchema.result[key];
          if (!asn1SchemaValue) {
            continue;
          }
          const schemaItem = schema.items[key];
          const schemaItemType = schemaItem.type;
          let parsedValue;
          if (typeof schemaItemType === "number" || (0, helper_1.isConvertible)(schemaItemType)) {
            parsedValue = this.processPrimitiveSchemaItem(asn1SchemaValue, schemaItem, schemaItemType, options);
          } else {
            parsedValue = this.processComplexSchemaItem(asn1SchemaValue, schemaItem, schemaItemType, options);
          }
          if (parsedValue && typeof parsedValue === "object" && "value" in parsedValue && "raw" in parsedValue) {
            res[key] = parsedValue.value;
            res[`${key}Raw`] = parsedValue.raw;
          } else {
            res[key] = parsedValue;
          }
        }
      }
      static processPrimitiveSchemaItem(asn1SchemaValue, schemaItem, schemaItemType, options) {
        const converter = schemaItem.converter ?? ((0, helper_1.isConvertible)(schemaItemType) ? new schemaItemType() : null);
        if (!converter) {
          throw new Error("Converter is empty");
        }
        if (schemaItem.repeated) {
          return this.processRepeatedPrimitiveItem(asn1SchemaValue, schemaItem, converter, options);
        } else {
          return this.processSinglePrimitiveItem(asn1SchemaValue, schemaItem, schemaItemType, converter, options);
        }
      }
      static processRepeatedPrimitiveItem(asn1SchemaValue, schemaItem, converter, options) {
        if (schemaItem.implicit) {
          const Container = schemaItem.repeated === "sequence" ? asn1js.Sequence : asn1js.Set;
          const newItem = new Container();
          newItem.valueBlock = asn1SchemaValue.valueBlock;
          const newItemAsn = asn1js.fromBER(newItem.toBER(false), options?.berOptions);
          if (newItemAsn.offset === -1) {
            throw new Error(`Cannot parse the child item. ${newItemAsn.result.error}`);
          }
          if (!("value" in newItemAsn.result.valueBlock && Array.isArray(newItemAsn.result.valueBlock.value))) {
            throw new Error("Cannot get items from the ASN.1 parsed value. ASN.1 object is not constructed.");
          }
          const value = newItemAsn.result.valueBlock.value;
          return Array.from(value, (element) => converter.fromASN(element));
        } else {
          return Array.from(asn1SchemaValue, (element) => converter.fromASN(element));
        }
      }
      static processSinglePrimitiveItem(asn1SchemaValue, schemaItem, schemaItemType, converter, options) {
        let value = asn1SchemaValue;
        if (schemaItem.implicit) {
          let newItem;
          if ((0, helper_1.isConvertible)(schemaItemType)) {
            newItem = new schemaItemType().toSchema("");
          } else {
            const Asn1TypeName = enums_1.AsnPropTypes[schemaItemType];
            const Asn1Type = asn1js[Asn1TypeName];
            if (!Asn1Type) {
              throw new Error(`Cannot get '${Asn1TypeName}' class from asn1js module`);
            }
            newItem = new Asn1Type();
          }
          newItem.valueBlock = value.valueBlock;
          value = asn1js.fromBER(newItem.toBER(false), options?.berOptions).result;
        }
        return converter.fromASN(value);
      }
      static processComplexSchemaItem(asn1SchemaValue, schemaItem, schemaItemType, options) {
        if (schemaItem.repeated) {
          if (!Array.isArray(asn1SchemaValue)) {
            throw new Error("Cannot get list of items from the ASN.1 parsed value. ASN.1 value should be iterable.");
          }
          return Array.from(asn1SchemaValue, (element) => this.fromASN(element, schemaItemType, options));
        } else {
          const valueToProcess = this.handleImplicitTagging(asn1SchemaValue, schemaItem, schemaItemType);
          if (this.isOptionalChoiceField(schemaItem)) {
            try {
              return this.fromASN(valueToProcess, schemaItemType, options);
            } catch (err) {
              if (err instanceof errors_1.AsnSchemaValidationError && /Wrong values for Choice type/.test(err.message)) {
                return void 0;
              }
              throw err;
            }
          } else {
            const parsedValue = this.fromASN(valueToProcess, schemaItemType, options);
            if (schemaItem.raw) {
              return {
                value: parsedValue,
                raw: asn1SchemaValue.valueBeforeDecodeView
              };
            }
            return parsedValue;
          }
        }
      }
      static handleImplicitTagging(asn1SchemaValue, schemaItem, schemaItemType) {
        if (schemaItem.implicit && typeof schemaItem.context === "number") {
          const schema = storage_1.schemaStorage.get(schemaItemType);
          if (schema.type === enums_1.AsnTypeTypes.Sequence) {
            const newSeq = new asn1js.Sequence();
            if ("value" in asn1SchemaValue.valueBlock && Array.isArray(asn1SchemaValue.valueBlock.value) && "value" in newSeq.valueBlock) {
              newSeq.valueBlock.value = asn1SchemaValue.valueBlock.value;
              return newSeq;
            }
          } else if (schema.type === enums_1.AsnTypeTypes.Set) {
            const newSet = new asn1js.Set();
            if ("value" in asn1SchemaValue.valueBlock && Array.isArray(asn1SchemaValue.valueBlock.value) && "value" in newSet.valueBlock) {
              newSet.valueBlock.value = asn1SchemaValue.valueBlock.value;
              return newSet;
            }
          }
        }
        return asn1SchemaValue;
      }
    };
    exports.AsnParser = AsnParser;
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/serializer.js
var require_serializer = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/serializer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AsnSerializer = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1js = tslib_1.__importStar(require_build2());
    var utils_1 = require_cjs();
    var converters = tslib_1.__importStar(require_converters2());
    var enums_1 = require_enums();
    var helper_1 = require_helper();
    var storage_1 = require_storage();
    var AsnSerializer = class _AsnSerializer {
      static serialize(obj) {
        if (obj instanceof asn1js.BaseBlock) {
          return obj.toBER(false);
        }
        return this.toASN(obj).toBER(false);
      }
      static toASN(obj) {
        if (obj && typeof obj === "object" && (0, helper_1.isConvertible)(obj)) {
          return obj.toASN();
        }
        if (!(obj && typeof obj === "object")) {
          throw new TypeError("Parameter 1 should be type of Object.");
        }
        const target = obj.constructor;
        const schema = storage_1.schemaStorage.get(target);
        storage_1.schemaStorage.cache(target);
        let asn1Value = [];
        if (schema.itemType) {
          if (!Array.isArray(obj)) {
            throw new TypeError("Parameter 1 should be type of Array.");
          }
          if (typeof schema.itemType === "number") {
            const converter = converters.defaultConverter(schema.itemType);
            if (!converter) {
              throw new Error(`Cannot get default converter for array item of ${target.name} ASN1 schema`);
            }
            asn1Value = obj.map((o) => converter.toASN(o));
          } else {
            asn1Value = obj.map((o) => this.toAsnItem({ type: schema.itemType }, "[]", target, o));
          }
        } else {
          for (const key in schema.items) {
            const schemaItem = schema.items[key];
            const objProp = obj[key];
            if (objProp === void 0 || schemaItem.defaultValue === objProp || typeof schemaItem.defaultValue === "object" && typeof objProp === "object" && (0, helper_1.isArrayEqual)(this.serialize(schemaItem.defaultValue), this.serialize(objProp))) {
              continue;
            }
            const asn1Item = _AsnSerializer.toAsnItem(schemaItem, key, target, objProp);
            if (typeof schemaItem.context === "number") {
              if (schemaItem.implicit) {
                if (!schemaItem.repeated && (typeof schemaItem.type === "number" || (0, helper_1.isConvertible)(schemaItem.type))) {
                  const value = {};
                  value.valueHex = asn1Item instanceof asn1js.Null ? (0, utils_1.toArrayBuffer)(asn1Item.valueBeforeDecodeView) : asn1Item.valueBlock.toBER();
                  asn1Value.push(new asn1js.Primitive({
                    optional: schemaItem.optional,
                    idBlock: {
                      tagClass: 3,
                      tagNumber: schemaItem.context
                    },
                    ...value
                  }));
                } else {
                  asn1Value.push(new asn1js.Constructed({
                    optional: schemaItem.optional,
                    idBlock: {
                      tagClass: 3,
                      tagNumber: schemaItem.context
                    },
                    value: asn1Item.valueBlock.value
                  }));
                }
              } else {
                asn1Value.push(new asn1js.Constructed({
                  optional: schemaItem.optional,
                  idBlock: {
                    tagClass: 3,
                    tagNumber: schemaItem.context
                  },
                  value: [asn1Item]
                }));
              }
            } else if (schemaItem.repeated) {
              asn1Value = asn1Value.concat(asn1Item);
            } else {
              asn1Value.push(asn1Item);
            }
          }
        }
        let asnSchema;
        switch (schema.type) {
          case enums_1.AsnTypeTypes.Sequence:
            asnSchema = new asn1js.Sequence({ value: asn1Value });
            break;
          case enums_1.AsnTypeTypes.Set:
            asnSchema = new asn1js.Set({ value: asn1Value });
            break;
          case enums_1.AsnTypeTypes.Choice:
            if (!asn1Value[0]) {
              throw new Error(`Schema '${target.name}' has wrong data. Choice cannot be empty.`);
            }
            asnSchema = asn1Value[0];
            break;
        }
        return asnSchema;
      }
      static toAsnItem(schemaItem, key, target, objProp) {
        let asn1Item;
        if (typeof schemaItem.type === "number") {
          const converter = schemaItem.converter;
          if (!converter) {
            throw new Error(`Property '${key}' doesn't have converter for type ${enums_1.AsnPropTypes[schemaItem.type]} in schema '${target.name}'`);
          }
          if (schemaItem.repeated) {
            if (!Array.isArray(objProp)) {
              throw new TypeError("Parameter 'objProp' should be type of Array.");
            }
            const items = Array.from(objProp, (element) => converter.toASN(element));
            const Container = schemaItem.repeated === "sequence" ? asn1js.Sequence : asn1js.Set;
            asn1Item = new Container({ value: items });
          } else {
            asn1Item = converter.toASN(objProp);
          }
        } else {
          if (schemaItem.repeated) {
            if (!Array.isArray(objProp)) {
              throw new TypeError("Parameter 'objProp' should be type of Array.");
            }
            const items = Array.from(objProp, (element) => this.toASN(element));
            const Container = schemaItem.repeated === "sequence" ? asn1js.Sequence : asn1js.Set;
            asn1Item = new Container({ value: items });
          } else {
            asn1Item = this.toASN(objProp);
          }
        }
        return asn1Item;
      }
    };
    exports.AsnSerializer = AsnSerializer;
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/objects.js
var require_objects = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/objects.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AsnArray = void 0;
    var AsnArray = class extends Array {
      constructor(items = []) {
        if (typeof items === "number") {
          super(items);
        } else {
          super();
          for (const item of items) {
            this.push(item);
          }
        }
      }
    };
    exports.AsnArray = AsnArray;
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/convert.js
var require_convert3 = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/convert.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AsnConvert = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1js = tslib_1.__importStar(require_build2());
    var utils_1 = require_cjs();
    var parser_1 = require_parser();
    var serializer_1 = require_serializer();
    var AsnConvert = class _AsnConvert {
      static serialize(obj) {
        return serializer_1.AsnSerializer.serialize(obj);
      }
      static parse(data, target, options) {
        return parser_1.AsnParser.parse(data, target, options);
      }
      static toString(data, options) {
        const buf = (0, utils_1.isBufferSource)(data) ? (0, utils_1.toArrayBuffer)(data) : _AsnConvert.serialize(data);
        const asn = asn1js.fromBER(buf, options?.berOptions);
        if (asn.offset === -1) {
          throw new Error(`Cannot decode ASN.1 data. ${asn.result.error}`);
        }
        return asn.result.toString();
      }
    };
    exports.AsnConvert = AsnConvert;
  }
});

// node_modules/@peculiar/asn1-schema/build/cjs/index.js
var require_cjs2 = __commonJS({
  "node_modules/@peculiar/asn1-schema/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AsnSerializer = exports.AsnParser = exports.AsnPropTypes = exports.AsnTypeTypes = exports.AsnSetType = exports.AsnSequenceType = exports.AsnChoiceType = exports.AsnType = exports.AsnProp = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_converters2(), exports);
    tslib_1.__exportStar(require_types(), exports);
    var decorators_1 = require_decorators();
    Object.defineProperty(exports, "AsnProp", { enumerable: true, get: function() {
      return decorators_1.AsnProp;
    } });
    Object.defineProperty(exports, "AsnType", { enumerable: true, get: function() {
      return decorators_1.AsnType;
    } });
    Object.defineProperty(exports, "AsnChoiceType", { enumerable: true, get: function() {
      return decorators_1.AsnChoiceType;
    } });
    Object.defineProperty(exports, "AsnSequenceType", { enumerable: true, get: function() {
      return decorators_1.AsnSequenceType;
    } });
    Object.defineProperty(exports, "AsnSetType", { enumerable: true, get: function() {
      return decorators_1.AsnSetType;
    } });
    var enums_1 = require_enums();
    Object.defineProperty(exports, "AsnTypeTypes", { enumerable: true, get: function() {
      return enums_1.AsnTypeTypes;
    } });
    Object.defineProperty(exports, "AsnPropTypes", { enumerable: true, get: function() {
      return enums_1.AsnPropTypes;
    } });
    var parser_1 = require_parser();
    Object.defineProperty(exports, "AsnParser", { enumerable: true, get: function() {
      return parser_1.AsnParser;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports, "AsnSerializer", { enumerable: true, get: function() {
      return serializer_1.AsnSerializer;
    } });
    tslib_1.__exportStar(require_errors(), exports);
    tslib_1.__exportStar(require_objects(), exports);
    tslib_1.__exportStar(require_convert3(), exports);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/ip_converter.js
var require_ip_converter = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/ip_converter.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IpConverter = void 0;
    var encoding_1 = require_encoding();
    var IpConverter = class {
      static isIPv4(ip) {
        return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
      }
      static parseIPv4(ip) {
        const parts = ip.split(".");
        if (parts.length !== 4) {
          throw new Error("Invalid IPv4 address");
        }
        return parts.map((part) => {
          const num2 = parseInt(part, 10);
          if (isNaN(num2) || num2 < 0 || num2 > 255) {
            throw new Error("Invalid IPv4 address part");
          }
          return num2;
        });
      }
      static parseIPv6(ip) {
        const expandedIP = this.expandIPv6(ip);
        const parts = expandedIP.split(":");
        if (parts.length !== 8) {
          throw new Error("Invalid IPv6 address");
        }
        return parts.reduce((bytes, part) => {
          const num2 = parseInt(part, 16);
          if (isNaN(num2) || num2 < 0 || num2 > 65535) {
            throw new Error("Invalid IPv6 address part");
          }
          bytes.push(num2 >> 8 & 255);
          bytes.push(num2 & 255);
          return bytes;
        }, []);
      }
      static expandIPv6(ip) {
        if (!ip.includes("::")) {
          return ip;
        }
        const parts = ip.split("::");
        if (parts.length > 2) {
          throw new Error("Invalid IPv6 address");
        }
        const left = parts[0] ? parts[0].split(":") : [];
        const right = parts[1] ? parts[1].split(":") : [];
        const missing = 8 - (left.length + right.length);
        if (missing < 0) {
          throw new Error("Invalid IPv6 address");
        }
        return [...left, ...Array(missing).fill("0"), ...right].join(":");
      }
      static formatIPv6(bytes) {
        const parts = [];
        for (let i = 0; i < 16; i += 2) {
          parts.push((bytes[i] << 8 | bytes[i + 1]).toString(16));
        }
        return this.compressIPv6(parts.join(":"));
      }
      static compressIPv6(ip) {
        const parts = ip.split(":");
        let longestZeroStart = -1;
        let longestZeroLength = 0;
        let currentZeroStart = -1;
        let currentZeroLength = 0;
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] === "0") {
            if (currentZeroStart === -1) {
              currentZeroStart = i;
            }
            currentZeroLength++;
          } else {
            if (currentZeroLength > longestZeroLength) {
              longestZeroStart = currentZeroStart;
              longestZeroLength = currentZeroLength;
            }
            currentZeroStart = -1;
            currentZeroLength = 0;
          }
        }
        if (currentZeroLength > longestZeroLength) {
          longestZeroStart = currentZeroStart;
          longestZeroLength = currentZeroLength;
        }
        if (longestZeroLength > 1) {
          const before = parts.slice(0, longestZeroStart).join(":");
          const after = parts.slice(longestZeroStart + longestZeroLength).join(":");
          return `${before}::${after}`;
        }
        return ip;
      }
      static parseCIDR(text) {
        const [addr, prefixStr] = text.split("/");
        const prefix = parseInt(prefixStr, 10);
        if (this.isIPv4(addr)) {
          if (prefix < 0 || prefix > 32) {
            throw new Error("Invalid IPv4 prefix length");
          }
          return [this.parseIPv4(addr), prefix];
        } else {
          if (prefix < 0 || prefix > 128) {
            throw new Error("Invalid IPv6 prefix length");
          }
          return [this.parseIPv6(addr), prefix];
        }
      }
      static decodeIP(value) {
        if (value.length === 64 && parseInt(value, 16) === 0) {
          return "::/0";
        }
        if (value.length !== 16) {
          return value;
        }
        const mask = parseInt(value.slice(8), 16).toString(2).split("").reduce((a, k) => a + +k, 0);
        let ip = value.slice(0, 8).replace(/(.{2})/g, (match) => `${parseInt(match, 16)}.`);
        ip = ip.slice(0, -1);
        return `${ip}/${mask}`;
      }
      static toString(buf) {
        const uint8 = new Uint8Array(buf);
        if (uint8.length === 4) {
          return Array.from(uint8).join(".");
        }
        if (uint8.length === 16) {
          return this.formatIPv6(uint8);
        }
        if (uint8.length === 8 || uint8.length === 32) {
          const half = uint8.length / 2;
          const addrBytes = uint8.slice(0, half);
          const maskBytes = uint8.slice(half);
          const isAllZeros = uint8.every((byte) => byte === 0);
          if (isAllZeros) {
            return uint8.length === 8 ? "0.0.0.0/0" : "::/0";
          }
          const prefixLen = maskBytes.reduce((a, b) => a + (b.toString(2).match(/1/g) || []).length, 0);
          if (uint8.length === 8) {
            const addrStr = Array.from(addrBytes).join(".");
            return `${addrStr}/${prefixLen}`;
          } else {
            const addrStr = this.formatIPv6(addrBytes);
            return `${addrStr}/${prefixLen}`;
          }
        }
        return this.decodeIP(encoding_1.hex.encode(buf));
      }
      static fromString(text) {
        if (text.includes("/")) {
          const [addr, prefix] = this.parseCIDR(text);
          const maskBytes = new Uint8Array(addr.length);
          let bitsLeft = prefix;
          for (let i = 0; i < maskBytes.length; i++) {
            if (bitsLeft >= 8) {
              maskBytes[i] = 255;
              bitsLeft -= 8;
            } else if (bitsLeft > 0) {
              maskBytes[i] = 255 << 8 - bitsLeft;
              bitsLeft = 0;
            }
          }
          const out = new Uint8Array(addr.length * 2);
          out.set(addr, 0);
          out.set(maskBytes, addr.length);
          return out.buffer;
        }
        const bytes = this.isIPv4(text) ? this.parseIPv4(text) : this.parseIPv6(text);
        return new Uint8Array(bytes).buffer;
      }
    };
    exports.IpConverter = IpConverter;
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/name.js
var require_name = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/name.js"(exports) {
    "use strict";
    var RelativeDistinguishedName_1;
    var RDNSequence_1;
    var Name_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Name = exports.RDNSequence = exports.RelativeDistinguishedName = exports.AttributeTypeAndValue = exports.AttributeValue = exports.DirectoryString = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var encoding_1 = require_encoding();
    var DirectoryString = class DirectoryString {
      teletexString;
      printableString;
      universalString;
      utf8String;
      bmpString;
      constructor(params = {}) {
        Object.assign(this, params);
      }
      toString() {
        return this.bmpString || this.printableString || this.teletexString || this.universalString || this.utf8String || "";
      }
    };
    exports.DirectoryString = DirectoryString;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.TeletexString })
    ], DirectoryString.prototype, "teletexString", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.PrintableString })
    ], DirectoryString.prototype, "printableString", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.UniversalString })
    ], DirectoryString.prototype, "universalString", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Utf8String })
    ], DirectoryString.prototype, "utf8String", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.BmpString })
    ], DirectoryString.prototype, "bmpString", void 0);
    exports.DirectoryString = DirectoryString = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], DirectoryString);
    var AttributeValue = class AttributeValue extends DirectoryString {
      ia5String;
      anyValue;
      constructor(params = {}) {
        super(params);
        Object.assign(this, params);
      }
      toString() {
        return this.ia5String || (this.anyValue ? encoding_1.hex.encode(this.anyValue) : super.toString());
      }
    };
    exports.AttributeValue = AttributeValue;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.IA5String })
    ], AttributeValue.prototype, "ia5String", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Any })
    ], AttributeValue.prototype, "anyValue", void 0);
    exports.AttributeValue = AttributeValue = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], AttributeValue);
    var AttributeTypeAndValue = class {
      type = "";
      value = new AttributeValue();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.AttributeTypeAndValue = AttributeTypeAndValue;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], AttributeTypeAndValue.prototype, "type", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: AttributeValue })
    ], AttributeTypeAndValue.prototype, "value", void 0);
    var RelativeDistinguishedName = RelativeDistinguishedName_1 = class RelativeDistinguishedName extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, RelativeDistinguishedName_1.prototype);
      }
    };
    exports.RelativeDistinguishedName = RelativeDistinguishedName;
    exports.RelativeDistinguishedName = RelativeDistinguishedName = RelativeDistinguishedName_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Set,
        itemType: AttributeTypeAndValue
      })
    ], RelativeDistinguishedName);
    var RDNSequence = RDNSequence_1 = class RDNSequence extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, RDNSequence_1.prototype);
      }
    };
    exports.RDNSequence = RDNSequence;
    exports.RDNSequence = RDNSequence = RDNSequence_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: RelativeDistinguishedName
      })
    ], RDNSequence);
    var Name = Name_1 = class Name extends RDNSequence {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, Name_1.prototype);
      }
    };
    exports.Name = Name;
    exports.Name = Name = Name_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], Name);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/general_name.js
var require_general_name = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/general_name.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GeneralName = exports.EDIPartyName = exports.OtherName = exports.AsnIpConverter = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var ip_converter_1 = require_ip_converter();
    var name_1 = require_name();
    exports.AsnIpConverter = {
      fromASN: (value) => ip_converter_1.IpConverter.toString(asn1_schema_1.AsnOctetStringConverter.fromASN(value)),
      toASN: (value) => asn1_schema_1.AsnOctetStringConverter.toASN(ip_converter_1.IpConverter.fromString(value))
    };
    var OtherName = class {
      typeId = "";
      value = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.OtherName = OtherName;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], OtherName.prototype, "typeId", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        context: 0
      })
    ], OtherName.prototype, "value", void 0);
    var EDIPartyName = class {
      nameAssigner;
      partyName = new name_1.DirectoryString();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.EDIPartyName = EDIPartyName;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: name_1.DirectoryString,
        optional: true,
        context: 0,
        implicit: true
      })
    ], EDIPartyName.prototype, "nameAssigner", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: name_1.DirectoryString,
        context: 1,
        implicit: true
      })
    ], EDIPartyName.prototype, "partyName", void 0);
    var GeneralName = class GeneralName {
      otherName;
      rfc822Name;
      dNSName;
      x400Address;
      directoryName;
      ediPartyName;
      uniformResourceIdentifier;
      iPAddress;
      registeredID;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.GeneralName = GeneralName;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: OtherName,
        context: 0,
        implicit: true
      })
    ], GeneralName.prototype, "otherName", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.IA5String,
        context: 1,
        implicit: true
      })
    ], GeneralName.prototype, "rfc822Name", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.IA5String,
        context: 2,
        implicit: true
      })
    ], GeneralName.prototype, "dNSName", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        context: 3,
        implicit: true
      })
    ], GeneralName.prototype, "x400Address", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: name_1.Name,
        context: 4,
        implicit: false
      })
    ], GeneralName.prototype, "directoryName", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: EDIPartyName,
        context: 5
      })
    ], GeneralName.prototype, "ediPartyName", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.IA5String,
        context: 6,
        implicit: true
      })
    ], GeneralName.prototype, "uniformResourceIdentifier", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.OctetString,
        context: 7,
        implicit: true,
        converter: exports.AsnIpConverter
      })
    ], GeneralName.prototype, "iPAddress", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.ObjectIdentifier,
        context: 8,
        implicit: true
      })
    ], GeneralName.prototype, "registeredID", void 0);
    exports.GeneralName = GeneralName = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], GeneralName);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/object_identifiers.js
var require_object_identifiers = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/object_identifiers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.id_alg_unsigned = exports.id_ce = exports.id_ad_caRepository = exports.id_ad_timeStamping = exports.id_ad_caIssuers = exports.id_ad_ocsp = exports.id_qt_unotice = exports.id_qt_csp = exports.id_ad = exports.id_kp = exports.id_qt = exports.id_pe = exports.id_pkix = void 0;
    exports.id_pkix = "1.3.6.1.5.5.7";
    exports.id_pe = `${exports.id_pkix}.1`;
    exports.id_qt = `${exports.id_pkix}.2`;
    exports.id_kp = `${exports.id_pkix}.3`;
    exports.id_ad = `${exports.id_pkix}.48`;
    exports.id_qt_csp = `${exports.id_qt}.1`;
    exports.id_qt_unotice = `${exports.id_qt}.2`;
    exports.id_ad_ocsp = `${exports.id_ad}.1`;
    exports.id_ad_caIssuers = `${exports.id_ad}.2`;
    exports.id_ad_timeStamping = `${exports.id_ad}.3`;
    exports.id_ad_caRepository = `${exports.id_ad}.5`;
    exports.id_ce = "2.5.29";
    exports.id_alg_unsigned = "1.3.6.1.5.5.7.6.36";
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/authority_information_access.js
var require_authority_information_access = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/authority_information_access.js"(exports) {
    "use strict";
    var AuthorityInfoAccessSyntax_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AuthorityInfoAccessSyntax = exports.AccessDescription = exports.id_pe_authorityInfoAccess = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var general_name_1 = require_general_name();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_pe_authorityInfoAccess = `${object_identifiers_1.id_pe}.1`;
    var AccessDescription = class {
      accessMethod = "";
      accessLocation = new general_name_1.GeneralName();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.AccessDescription = AccessDescription;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], AccessDescription.prototype, "accessMethod", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: general_name_1.GeneralName })
    ], AccessDescription.prototype, "accessLocation", void 0);
    var AuthorityInfoAccessSyntax = AuthorityInfoAccessSyntax_1 = class AuthorityInfoAccessSyntax extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, AuthorityInfoAccessSyntax_1.prototype);
      }
    };
    exports.AuthorityInfoAccessSyntax = AuthorityInfoAccessSyntax;
    exports.AuthorityInfoAccessSyntax = AuthorityInfoAccessSyntax = AuthorityInfoAccessSyntax_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: AccessDescription
      })
    ], AuthorityInfoAccessSyntax);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/authority_key_identifier.js
var require_authority_key_identifier = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/authority_key_identifier.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AuthorityKeyIdentifier = exports.KeyIdentifier = exports.id_ce_authorityKeyIdentifier = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var general_name_1 = require_general_name();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_authorityKeyIdentifier = `${object_identifiers_1.id_ce}.35`;
    var KeyIdentifier = class extends asn1_schema_1.OctetString {
    };
    exports.KeyIdentifier = KeyIdentifier;
    var AuthorityKeyIdentifier = class {
      keyIdentifier;
      authorityCertIssuer;
      authorityCertSerialNumber;
      constructor(params = {}) {
        if (params) {
          Object.assign(this, params);
        }
      }
    };
    exports.AuthorityKeyIdentifier = AuthorityKeyIdentifier;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: KeyIdentifier,
        context: 0,
        optional: true,
        implicit: true
      })
    ], AuthorityKeyIdentifier.prototype, "keyIdentifier", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: general_name_1.GeneralName,
        context: 1,
        optional: true,
        implicit: true,
        repeated: "sequence"
      })
    ], AuthorityKeyIdentifier.prototype, "authorityCertIssuer", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        context: 2,
        optional: true,
        implicit: true,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], AuthorityKeyIdentifier.prototype, "authorityCertSerialNumber", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/basic_constraints.js
var require_basic_constraints = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/basic_constraints.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BasicConstraints = exports.id_ce_basicConstraints = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_basicConstraints = `${object_identifiers_1.id_ce}.19`;
    var BasicConstraints = class {
      cA = false;
      pathLenConstraint;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.BasicConstraints = BasicConstraints;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Boolean,
        defaultValue: false
      })
    ], BasicConstraints.prototype, "cA", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        optional: true
      })
    ], BasicConstraints.prototype, "pathLenConstraint", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/general_names.js
var require_general_names = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/general_names.js"(exports) {
    "use strict";
    var GeneralNames_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GeneralNames = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var general_name_1 = require_general_name();
    var GeneralNames = GeneralNames_1 = class GeneralNames extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, GeneralNames_1.prototype);
      }
    };
    exports.GeneralNames = GeneralNames;
    exports.GeneralNames = GeneralNames = GeneralNames_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: general_name_1.GeneralName
      })
    ], GeneralNames);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/certificate_issuer.js
var require_certificate_issuer = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/certificate_issuer.js"(exports) {
    "use strict";
    var CertificateIssuer_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CertificateIssuer = exports.id_ce_certificateIssuer = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var general_names_1 = require_general_names();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_certificateIssuer = `${object_identifiers_1.id_ce}.29`;
    var CertificateIssuer = CertificateIssuer_1 = class CertificateIssuer extends general_names_1.GeneralNames {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, CertificateIssuer_1.prototype);
      }
    };
    exports.CertificateIssuer = CertificateIssuer;
    exports.CertificateIssuer = CertificateIssuer = CertificateIssuer_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], CertificateIssuer);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/certificate_policies.js
var require_certificate_policies = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/certificate_policies.js"(exports) {
    "use strict";
    var CertificatePolicies_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CertificatePolicies = exports.PolicyInformation = exports.PolicyQualifierInfo = exports.Qualifier = exports.UserNotice = exports.NoticeReference = exports.DisplayText = exports.id_ce_certificatePolicies_anyPolicy = exports.id_ce_certificatePolicies = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_certificatePolicies = `${object_identifiers_1.id_ce}.32`;
    exports.id_ce_certificatePolicies_anyPolicy = `${exports.id_ce_certificatePolicies}.0`;
    var DisplayText = class DisplayText {
      ia5String;
      visibleString;
      bmpString;
      utf8String;
      constructor(params = {}) {
        Object.assign(this, params);
      }
      toString() {
        return this.ia5String || this.visibleString || this.bmpString || this.utf8String || "";
      }
    };
    exports.DisplayText = DisplayText;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.IA5String })
    ], DisplayText.prototype, "ia5String", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.VisibleString })
    ], DisplayText.prototype, "visibleString", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.BmpString })
    ], DisplayText.prototype, "bmpString", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Utf8String })
    ], DisplayText.prototype, "utf8String", void 0);
    exports.DisplayText = DisplayText = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], DisplayText);
    var NoticeReference = class {
      organization = new DisplayText();
      noticeNumbers = [];
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.NoticeReference = NoticeReference;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: DisplayText })
    ], NoticeReference.prototype, "organization", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        repeated: "sequence"
      })
    ], NoticeReference.prototype, "noticeNumbers", void 0);
    var UserNotice = class {
      noticeRef;
      explicitText;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.UserNotice = UserNotice;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: NoticeReference,
        optional: true
      })
    ], UserNotice.prototype, "noticeRef", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: DisplayText,
        optional: true
      })
    ], UserNotice.prototype, "explicitText", void 0);
    var Qualifier = class Qualifier {
      cPSuri;
      userNotice;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.Qualifier = Qualifier;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.IA5String })
    ], Qualifier.prototype, "cPSuri", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: UserNotice })
    ], Qualifier.prototype, "userNotice", void 0);
    exports.Qualifier = Qualifier = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], Qualifier);
    var PolicyQualifierInfo = class {
      policyQualifierId = "";
      qualifier = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.PolicyQualifierInfo = PolicyQualifierInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], PolicyQualifierInfo.prototype, "policyQualifierId", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Any })
    ], PolicyQualifierInfo.prototype, "qualifier", void 0);
    var PolicyInformation = class {
      policyIdentifier = "";
      policyQualifiers;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.PolicyInformation = PolicyInformation;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], PolicyInformation.prototype, "policyIdentifier", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: PolicyQualifierInfo,
        repeated: "sequence",
        optional: true
      })
    ], PolicyInformation.prototype, "policyQualifiers", void 0);
    var CertificatePolicies = CertificatePolicies_1 = class CertificatePolicies extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, CertificatePolicies_1.prototype);
      }
    };
    exports.CertificatePolicies = CertificatePolicies;
    exports.CertificatePolicies = CertificatePolicies = CertificatePolicies_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: PolicyInformation
      })
    ], CertificatePolicies);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/crl_number.js
var require_crl_number = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/crl_number.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CRLNumber = exports.id_ce_cRLNumber = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_cRLNumber = `${object_identifiers_1.id_ce}.20`;
    var CRLNumber = class CRLNumber {
      value;
      constructor(value = 0) {
        this.value = value;
      }
    };
    exports.CRLNumber = CRLNumber;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], CRLNumber.prototype, "value", void 0);
    exports.CRLNumber = CRLNumber = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], CRLNumber);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/crl_delta_indicator.js
var require_crl_delta_indicator = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/crl_delta_indicator.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BaseCRLNumber = exports.id_ce_deltaCRLIndicator = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    var crl_number_1 = require_crl_number();
    exports.id_ce_deltaCRLIndicator = `${object_identifiers_1.id_ce}.27`;
    var BaseCRLNumber = class BaseCRLNumber extends crl_number_1.CRLNumber {
    };
    exports.BaseCRLNumber = BaseCRLNumber;
    exports.BaseCRLNumber = BaseCRLNumber = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], BaseCRLNumber);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/crl_distribution_points.js
var require_crl_distribution_points = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/crl_distribution_points.js"(exports) {
    "use strict";
    var CRLDistributionPoints_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CRLDistributionPoints = exports.DistributionPoint = exports.DistributionPointName = exports.Reason = exports.ReasonFlags = exports.id_ce_cRLDistributionPoints = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var name_1 = require_name();
    var general_name_1 = require_general_name();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_cRLDistributionPoints = `${object_identifiers_1.id_ce}.31`;
    var ReasonFlags;
    (function(ReasonFlags2) {
      ReasonFlags2[ReasonFlags2["unused"] = 1] = "unused";
      ReasonFlags2[ReasonFlags2["keyCompromise"] = 2] = "keyCompromise";
      ReasonFlags2[ReasonFlags2["cACompromise"] = 4] = "cACompromise";
      ReasonFlags2[ReasonFlags2["affiliationChanged"] = 8] = "affiliationChanged";
      ReasonFlags2[ReasonFlags2["superseded"] = 16] = "superseded";
      ReasonFlags2[ReasonFlags2["cessationOfOperation"] = 32] = "cessationOfOperation";
      ReasonFlags2[ReasonFlags2["certificateHold"] = 64] = "certificateHold";
      ReasonFlags2[ReasonFlags2["privilegeWithdrawn"] = 128] = "privilegeWithdrawn";
      ReasonFlags2[ReasonFlags2["aACompromise"] = 256] = "aACompromise";
    })(ReasonFlags || (exports.ReasonFlags = ReasonFlags = {}));
    var Reason = class extends asn1_schema_1.BitString {
      toJSON() {
        const res = [];
        const flags = this.toNumber();
        if (flags & ReasonFlags.aACompromise) {
          res.push("aACompromise");
        }
        if (flags & ReasonFlags.affiliationChanged) {
          res.push("affiliationChanged");
        }
        if (flags & ReasonFlags.cACompromise) {
          res.push("cACompromise");
        }
        if (flags & ReasonFlags.certificateHold) {
          res.push("certificateHold");
        }
        if (flags & ReasonFlags.cessationOfOperation) {
          res.push("cessationOfOperation");
        }
        if (flags & ReasonFlags.keyCompromise) {
          res.push("keyCompromise");
        }
        if (flags & ReasonFlags.privilegeWithdrawn) {
          res.push("privilegeWithdrawn");
        }
        if (flags & ReasonFlags.superseded) {
          res.push("superseded");
        }
        if (flags & ReasonFlags.unused) {
          res.push("unused");
        }
        return res;
      }
      toString() {
        return `[${this.toJSON().join(", ")}]`;
      }
    };
    exports.Reason = Reason;
    var DistributionPointName = class DistributionPointName {
      fullName;
      nameRelativeToCRLIssuer;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.DistributionPointName = DistributionPointName;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: general_name_1.GeneralName,
        context: 0,
        repeated: "sequence",
        implicit: true
      })
    ], DistributionPointName.prototype, "fullName", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: name_1.RelativeDistinguishedName,
        context: 1,
        implicit: true
      })
    ], DistributionPointName.prototype, "nameRelativeToCRLIssuer", void 0);
    exports.DistributionPointName = DistributionPointName = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], DistributionPointName);
    var DistributionPoint = class {
      distributionPoint;
      reasons;
      cRLIssuer;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.DistributionPoint = DistributionPoint;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: DistributionPointName,
        context: 0,
        optional: true
      })
    ], DistributionPoint.prototype, "distributionPoint", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: Reason,
        context: 1,
        optional: true,
        implicit: true
      })
    ], DistributionPoint.prototype, "reasons", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: general_name_1.GeneralName,
        context: 2,
        optional: true,
        repeated: "sequence",
        implicit: true
      })
    ], DistributionPoint.prototype, "cRLIssuer", void 0);
    var CRLDistributionPoints = CRLDistributionPoints_1 = class CRLDistributionPoints extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, CRLDistributionPoints_1.prototype);
      }
    };
    exports.CRLDistributionPoints = CRLDistributionPoints;
    exports.CRLDistributionPoints = CRLDistributionPoints = CRLDistributionPoints_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: DistributionPoint
      })
    ], CRLDistributionPoints);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/crl_freshest.js
var require_crl_freshest = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/crl_freshest.js"(exports) {
    "use strict";
    var FreshestCRL_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FreshestCRL = exports.id_ce_freshestCRL = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    var crl_distribution_points_1 = require_crl_distribution_points();
    exports.id_ce_freshestCRL = `${object_identifiers_1.id_ce}.46`;
    var FreshestCRL = FreshestCRL_1 = class FreshestCRL extends crl_distribution_points_1.CRLDistributionPoints {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, FreshestCRL_1.prototype);
      }
    };
    exports.FreshestCRL = FreshestCRL;
    exports.FreshestCRL = FreshestCRL = FreshestCRL_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: crl_distribution_points_1.DistributionPoint
      })
    ], FreshestCRL);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/crl_issuing_distribution_point.js
var require_crl_issuing_distribution_point = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/crl_issuing_distribution_point.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IssuingDistributionPoint = exports.id_ce_issuingDistributionPoint = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    var crl_distribution_points_1 = require_crl_distribution_points();
    exports.id_ce_issuingDistributionPoint = `${object_identifiers_1.id_ce}.28`;
    var IssuingDistributionPoint = class _IssuingDistributionPoint {
      static ONLY = false;
      distributionPoint;
      onlyContainsUserCerts = _IssuingDistributionPoint.ONLY;
      onlyContainsCACerts = _IssuingDistributionPoint.ONLY;
      onlySomeReasons;
      indirectCRL = _IssuingDistributionPoint.ONLY;
      onlyContainsAttributeCerts = _IssuingDistributionPoint.ONLY;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.IssuingDistributionPoint = IssuingDistributionPoint;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: crl_distribution_points_1.DistributionPointName,
        context: 0,
        optional: true
      })
    ], IssuingDistributionPoint.prototype, "distributionPoint", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Boolean,
        context: 1,
        defaultValue: IssuingDistributionPoint.ONLY,
        implicit: true
      })
    ], IssuingDistributionPoint.prototype, "onlyContainsUserCerts", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Boolean,
        context: 2,
        defaultValue: IssuingDistributionPoint.ONLY,
        implicit: true
      })
    ], IssuingDistributionPoint.prototype, "onlyContainsCACerts", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: crl_distribution_points_1.Reason,
        context: 3,
        optional: true,
        implicit: true
      })
    ], IssuingDistributionPoint.prototype, "onlySomeReasons", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Boolean,
        context: 4,
        defaultValue: IssuingDistributionPoint.ONLY,
        implicit: true
      })
    ], IssuingDistributionPoint.prototype, "indirectCRL", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Boolean,
        context: 5,
        defaultValue: IssuingDistributionPoint.ONLY,
        implicit: true
      })
    ], IssuingDistributionPoint.prototype, "onlyContainsAttributeCerts", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/crl_reason.js
var require_crl_reason = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/crl_reason.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CRLReason = exports.CRLReasons = exports.id_ce_cRLReasons = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_cRLReasons = `${object_identifiers_1.id_ce}.21`;
    var CRLReasons;
    (function(CRLReasons2) {
      CRLReasons2[CRLReasons2["unspecified"] = 0] = "unspecified";
      CRLReasons2[CRLReasons2["keyCompromise"] = 1] = "keyCompromise";
      CRLReasons2[CRLReasons2["cACompromise"] = 2] = "cACompromise";
      CRLReasons2[CRLReasons2["affiliationChanged"] = 3] = "affiliationChanged";
      CRLReasons2[CRLReasons2["superseded"] = 4] = "superseded";
      CRLReasons2[CRLReasons2["cessationOfOperation"] = 5] = "cessationOfOperation";
      CRLReasons2[CRLReasons2["certificateHold"] = 6] = "certificateHold";
      CRLReasons2[CRLReasons2["removeFromCRL"] = 8] = "removeFromCRL";
      CRLReasons2[CRLReasons2["privilegeWithdrawn"] = 9] = "privilegeWithdrawn";
      CRLReasons2[CRLReasons2["aACompromise"] = 10] = "aACompromise";
    })(CRLReasons || (exports.CRLReasons = CRLReasons = {}));
    var CRLReason = class CRLReason {
      reason = CRLReasons.unspecified;
      constructor(reason = CRLReasons.unspecified) {
        this.reason = reason;
      }
      toJSON() {
        return CRLReasons[this.reason];
      }
      toString() {
        return this.toJSON();
      }
    };
    exports.CRLReason = CRLReason;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Enumerated })
    ], CRLReason.prototype, "reason", void 0);
    exports.CRLReason = CRLReason = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], CRLReason);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/extended_key_usage.js
var require_extended_key_usage = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/extended_key_usage.js"(exports) {
    "use strict";
    var ExtendedKeyUsage_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.id_kp_OCSPSigning = exports.id_kp_timeStamping = exports.id_kp_emailProtection = exports.id_kp_codeSigning = exports.id_kp_clientAuth = exports.id_kp_serverAuth = exports.anyExtendedKeyUsage = exports.ExtendedKeyUsage = exports.id_ce_extKeyUsage = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_extKeyUsage = `${object_identifiers_1.id_ce}.37`;
    var ExtendedKeyUsage = ExtendedKeyUsage_1 = class ExtendedKeyUsage extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, ExtendedKeyUsage_1.prototype);
      }
    };
    exports.ExtendedKeyUsage = ExtendedKeyUsage;
    exports.ExtendedKeyUsage = ExtendedKeyUsage = ExtendedKeyUsage_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: asn1_schema_1.AsnPropTypes.ObjectIdentifier
      })
    ], ExtendedKeyUsage);
    exports.anyExtendedKeyUsage = `${exports.id_ce_extKeyUsage}.0`;
    exports.id_kp_serverAuth = `${object_identifiers_1.id_kp}.1`;
    exports.id_kp_clientAuth = `${object_identifiers_1.id_kp}.2`;
    exports.id_kp_codeSigning = `${object_identifiers_1.id_kp}.3`;
    exports.id_kp_emailProtection = `${object_identifiers_1.id_kp}.4`;
    exports.id_kp_timeStamping = `${object_identifiers_1.id_kp}.8`;
    exports.id_kp_OCSPSigning = `${object_identifiers_1.id_kp}.9`;
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/inhibit_any_policy.js
var require_inhibit_any_policy = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/inhibit_any_policy.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InhibitAnyPolicy = exports.id_ce_inhibitAnyPolicy = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_inhibitAnyPolicy = `${object_identifiers_1.id_ce}.54`;
    var InhibitAnyPolicy = class InhibitAnyPolicy {
      value;
      constructor(value = new ArrayBuffer(0)) {
        this.value = value;
      }
    };
    exports.InhibitAnyPolicy = InhibitAnyPolicy;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], InhibitAnyPolicy.prototype, "value", void 0);
    exports.InhibitAnyPolicy = InhibitAnyPolicy = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], InhibitAnyPolicy);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/invalidity_date.js
var require_invalidity_date = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/invalidity_date.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InvalidityDate = exports.id_ce_invalidityDate = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_invalidityDate = `${object_identifiers_1.id_ce}.24`;
    var InvalidityDate = class InvalidityDate {
      value = /* @__PURE__ */ new Date();
      constructor(value) {
        if (value) {
          this.value = value;
        }
      }
    };
    exports.InvalidityDate = InvalidityDate;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.GeneralizedTime })
    ], InvalidityDate.prototype, "value", void 0);
    exports.InvalidityDate = InvalidityDate = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], InvalidityDate);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/issuer_alternative_name.js
var require_issuer_alternative_name = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/issuer_alternative_name.js"(exports) {
    "use strict";
    var IssueAlternativeName_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IssueAlternativeName = exports.id_ce_issuerAltName = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var general_names_1 = require_general_names();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_issuerAltName = `${object_identifiers_1.id_ce}.18`;
    var IssueAlternativeName = IssueAlternativeName_1 = class IssueAlternativeName extends general_names_1.GeneralNames {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, IssueAlternativeName_1.prototype);
      }
    };
    exports.IssueAlternativeName = IssueAlternativeName;
    exports.IssueAlternativeName = IssueAlternativeName = IssueAlternativeName_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], IssueAlternativeName);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/key_usage.js
var require_key_usage = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/key_usage.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.KeyUsage = exports.KeyUsageFlags = exports.id_ce_keyUsage = void 0;
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_keyUsage = `${object_identifiers_1.id_ce}.15`;
    var KeyUsageFlags;
    (function(KeyUsageFlags2) {
      KeyUsageFlags2[KeyUsageFlags2["digitalSignature"] = 1] = "digitalSignature";
      KeyUsageFlags2[KeyUsageFlags2["nonRepudiation"] = 2] = "nonRepudiation";
      KeyUsageFlags2[KeyUsageFlags2["keyEncipherment"] = 4] = "keyEncipherment";
      KeyUsageFlags2[KeyUsageFlags2["dataEncipherment"] = 8] = "dataEncipherment";
      KeyUsageFlags2[KeyUsageFlags2["keyAgreement"] = 16] = "keyAgreement";
      KeyUsageFlags2[KeyUsageFlags2["keyCertSign"] = 32] = "keyCertSign";
      KeyUsageFlags2[KeyUsageFlags2["cRLSign"] = 64] = "cRLSign";
      KeyUsageFlags2[KeyUsageFlags2["encipherOnly"] = 128] = "encipherOnly";
      KeyUsageFlags2[KeyUsageFlags2["decipherOnly"] = 256] = "decipherOnly";
    })(KeyUsageFlags || (exports.KeyUsageFlags = KeyUsageFlags = {}));
    var KeyUsage = class extends asn1_schema_1.BitString {
      toJSON() {
        const flag = this.toNumber();
        const res = [];
        if (flag & KeyUsageFlags.cRLSign) {
          res.push("crlSign");
        }
        if (flag & KeyUsageFlags.dataEncipherment) {
          res.push("dataEncipherment");
        }
        if (flag & KeyUsageFlags.decipherOnly) {
          res.push("decipherOnly");
        }
        if (flag & KeyUsageFlags.digitalSignature) {
          res.push("digitalSignature");
        }
        if (flag & KeyUsageFlags.encipherOnly) {
          res.push("encipherOnly");
        }
        if (flag & KeyUsageFlags.keyAgreement) {
          res.push("keyAgreement");
        }
        if (flag & KeyUsageFlags.keyCertSign) {
          res.push("keyCertSign");
        }
        if (flag & KeyUsageFlags.keyEncipherment) {
          res.push("keyEncipherment");
        }
        if (flag & KeyUsageFlags.nonRepudiation) {
          res.push("nonRepudiation");
        }
        return res;
      }
      toString() {
        return `[${this.toJSON().join(", ")}]`;
      }
    };
    exports.KeyUsage = KeyUsage;
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/name_constraints.js
var require_name_constraints = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/name_constraints.js"(exports) {
    "use strict";
    var GeneralSubtrees_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NameConstraints = exports.GeneralSubtrees = exports.GeneralSubtree = exports.id_ce_nameConstraints = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var general_name_1 = require_general_name();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_nameConstraints = `${object_identifiers_1.id_ce}.30`;
    var GeneralSubtree = class {
      base = new general_name_1.GeneralName();
      minimum = 0;
      maximum;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.GeneralSubtree = GeneralSubtree;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: general_name_1.GeneralName })
    ], GeneralSubtree.prototype, "base", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        context: 0,
        defaultValue: 0,
        implicit: true
      })
    ], GeneralSubtree.prototype, "minimum", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        context: 1,
        optional: true,
        implicit: true
      })
    ], GeneralSubtree.prototype, "maximum", void 0);
    var GeneralSubtrees = GeneralSubtrees_1 = class GeneralSubtrees extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, GeneralSubtrees_1.prototype);
      }
    };
    exports.GeneralSubtrees = GeneralSubtrees;
    exports.GeneralSubtrees = GeneralSubtrees = GeneralSubtrees_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: GeneralSubtree
      })
    ], GeneralSubtrees);
    var NameConstraints = class {
      permittedSubtrees;
      excludedSubtrees;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.NameConstraints = NameConstraints;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: GeneralSubtrees,
        context: 0,
        optional: true,
        implicit: true
      })
    ], NameConstraints.prototype, "permittedSubtrees", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: GeneralSubtrees,
        context: 1,
        optional: true,
        implicit: true
      })
    ], NameConstraints.prototype, "excludedSubtrees", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/policy_constraints.js
var require_policy_constraints = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/policy_constraints.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PolicyConstraints = exports.id_ce_policyConstraints = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_policyConstraints = `${object_identifiers_1.id_ce}.36`;
    var PolicyConstraints = class {
      requireExplicitPolicy;
      inhibitPolicyMapping;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.PolicyConstraints = PolicyConstraints;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        context: 0,
        implicit: true,
        optional: true,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], PolicyConstraints.prototype, "requireExplicitPolicy", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        context: 1,
        implicit: true,
        optional: true,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], PolicyConstraints.prototype, "inhibitPolicyMapping", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/policy_mappings.js
var require_policy_mappings = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/policy_mappings.js"(exports) {
    "use strict";
    var PolicyMappings_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PolicyMappings = exports.PolicyMapping = exports.id_ce_policyMappings = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_policyMappings = `${object_identifiers_1.id_ce}.33`;
    var PolicyMapping = class {
      issuerDomainPolicy = "";
      subjectDomainPolicy = "";
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.PolicyMapping = PolicyMapping;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], PolicyMapping.prototype, "issuerDomainPolicy", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], PolicyMapping.prototype, "subjectDomainPolicy", void 0);
    var PolicyMappings = PolicyMappings_1 = class PolicyMappings extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, PolicyMappings_1.prototype);
      }
    };
    exports.PolicyMappings = PolicyMappings;
    exports.PolicyMappings = PolicyMappings = PolicyMappings_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: PolicyMapping
      })
    ], PolicyMappings);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/subject_alternative_name.js
var require_subject_alternative_name = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/subject_alternative_name.js"(exports) {
    "use strict";
    var SubjectAlternativeName_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SubjectAlternativeName = exports.id_ce_subjectAltName = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var general_names_1 = require_general_names();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_subjectAltName = `${object_identifiers_1.id_ce}.17`;
    var SubjectAlternativeName = SubjectAlternativeName_1 = class SubjectAlternativeName extends general_names_1.GeneralNames {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, SubjectAlternativeName_1.prototype);
      }
    };
    exports.SubjectAlternativeName = SubjectAlternativeName;
    exports.SubjectAlternativeName = SubjectAlternativeName = SubjectAlternativeName_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], SubjectAlternativeName);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/attribute.js
var require_attribute = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/attribute.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Attribute = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var Attribute = class {
      type = "";
      values = [];
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.Attribute = Attribute;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], Attribute.prototype, "type", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        repeated: "set"
      })
    ], Attribute.prototype, "values", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/subject_directory_attributes.js
var require_subject_directory_attributes = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/subject_directory_attributes.js"(exports) {
    "use strict";
    var SubjectDirectoryAttributes_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SubjectDirectoryAttributes = exports.id_ce_subjectDirectoryAttributes = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var attribute_1 = require_attribute();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_subjectDirectoryAttributes = `${object_identifiers_1.id_ce}.9`;
    var SubjectDirectoryAttributes = SubjectDirectoryAttributes_1 = class SubjectDirectoryAttributes extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, SubjectDirectoryAttributes_1.prototype);
      }
    };
    exports.SubjectDirectoryAttributes = SubjectDirectoryAttributes;
    exports.SubjectDirectoryAttributes = SubjectDirectoryAttributes = SubjectDirectoryAttributes_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: attribute_1.Attribute
      })
    ], SubjectDirectoryAttributes);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/subject_key_identifier.js
var require_subject_key_identifier = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/subject_key_identifier.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SubjectKeyIdentifier = exports.id_ce_subjectKeyIdentifier = void 0;
    var object_identifiers_1 = require_object_identifiers();
    var authority_key_identifier_1 = require_authority_key_identifier();
    exports.id_ce_subjectKeyIdentifier = `${object_identifiers_1.id_ce}.14`;
    var SubjectKeyIdentifier = class extends authority_key_identifier_1.KeyIdentifier {
    };
    exports.SubjectKeyIdentifier = SubjectKeyIdentifier;
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/private_key_usage_period.js
var require_private_key_usage_period = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/private_key_usage_period.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PrivateKeyUsagePeriod = exports.id_ce_privateKeyUsagePeriod = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    exports.id_ce_privateKeyUsagePeriod = `${object_identifiers_1.id_ce}.16`;
    var PrivateKeyUsagePeriod = class {
      notBefore;
      notAfter;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.PrivateKeyUsagePeriod = PrivateKeyUsagePeriod;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.GeneralizedTime,
        context: 0,
        implicit: true,
        optional: true
      })
    ], PrivateKeyUsagePeriod.prototype, "notBefore", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.GeneralizedTime,
        context: 1,
        implicit: true,
        optional: true
      })
    ], PrivateKeyUsagePeriod.prototype, "notAfter", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/entrust_version_info.js
var require_entrust_version_info = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/entrust_version_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EntrustVersionInfo = exports.EntrustInfo = exports.EntrustInfoFlags = exports.id_entrust_entrustVersInfo = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    exports.id_entrust_entrustVersInfo = "1.2.840.113533.7.65.0";
    var EntrustInfoFlags;
    (function(EntrustInfoFlags2) {
      EntrustInfoFlags2[EntrustInfoFlags2["keyUpdateAllowed"] = 1] = "keyUpdateAllowed";
      EntrustInfoFlags2[EntrustInfoFlags2["newExtensions"] = 2] = "newExtensions";
      EntrustInfoFlags2[EntrustInfoFlags2["pKIXCertificate"] = 4] = "pKIXCertificate";
    })(EntrustInfoFlags || (exports.EntrustInfoFlags = EntrustInfoFlags = {}));
    var EntrustInfo = class extends asn1_schema_1.BitString {
      toJSON() {
        const res = [];
        const flags = this.toNumber();
        if (flags & EntrustInfoFlags.pKIXCertificate) {
          res.push("pKIXCertificate");
        }
        if (flags & EntrustInfoFlags.newExtensions) {
          res.push("newExtensions");
        }
        if (flags & EntrustInfoFlags.keyUpdateAllowed) {
          res.push("keyUpdateAllowed");
        }
        return res;
      }
      toString() {
        return `[${this.toJSON().join(", ")}]`;
      }
    };
    exports.EntrustInfo = EntrustInfo;
    var EntrustVersionInfo = class {
      entrustVers = "";
      entrustInfoFlags = new EntrustInfo();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.EntrustVersionInfo = EntrustVersionInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.GeneralString })
    ], EntrustVersionInfo.prototype, "entrustVers", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: EntrustInfo })
    ], EntrustVersionInfo.prototype, "entrustInfoFlags", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/subject_info_access.js
var require_subject_info_access = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/subject_info_access.js"(exports) {
    "use strict";
    var SubjectInfoAccessSyntax_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SubjectInfoAccessSyntax = exports.id_pe_subjectInfoAccess = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var object_identifiers_1 = require_object_identifiers();
    var authority_information_access_1 = require_authority_information_access();
    exports.id_pe_subjectInfoAccess = `${object_identifiers_1.id_pe}.11`;
    var SubjectInfoAccessSyntax = SubjectInfoAccessSyntax_1 = class SubjectInfoAccessSyntax extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, SubjectInfoAccessSyntax_1.prototype);
      }
    };
    exports.SubjectInfoAccessSyntax = SubjectInfoAccessSyntax;
    exports.SubjectInfoAccessSyntax = SubjectInfoAccessSyntax = SubjectInfoAccessSyntax_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: authority_information_access_1.AccessDescription
      })
    ], SubjectInfoAccessSyntax);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extensions/index.js
var require_extensions = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extensions/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_authority_information_access(), exports);
    tslib_1.__exportStar(require_authority_key_identifier(), exports);
    tslib_1.__exportStar(require_basic_constraints(), exports);
    tslib_1.__exportStar(require_certificate_issuer(), exports);
    tslib_1.__exportStar(require_certificate_policies(), exports);
    tslib_1.__exportStar(require_crl_delta_indicator(), exports);
    tslib_1.__exportStar(require_crl_distribution_points(), exports);
    tslib_1.__exportStar(require_crl_freshest(), exports);
    tslib_1.__exportStar(require_crl_issuing_distribution_point(), exports);
    tslib_1.__exportStar(require_crl_number(), exports);
    tslib_1.__exportStar(require_crl_reason(), exports);
    tslib_1.__exportStar(require_extended_key_usage(), exports);
    tslib_1.__exportStar(require_inhibit_any_policy(), exports);
    tslib_1.__exportStar(require_invalidity_date(), exports);
    tslib_1.__exportStar(require_issuer_alternative_name(), exports);
    tslib_1.__exportStar(require_key_usage(), exports);
    tslib_1.__exportStar(require_name_constraints(), exports);
    tslib_1.__exportStar(require_policy_constraints(), exports);
    tslib_1.__exportStar(require_policy_mappings(), exports);
    tslib_1.__exportStar(require_subject_alternative_name(), exports);
    tslib_1.__exportStar(require_subject_directory_attributes(), exports);
    tslib_1.__exportStar(require_subject_key_identifier(), exports);
    tslib_1.__exportStar(require_private_key_usage_period(), exports);
    tslib_1.__exportStar(require_entrust_version_info(), exports);
    tslib_1.__exportStar(require_subject_info_access(), exports);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/algorithm_identifier.js
var require_algorithm_identifier = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/algorithm_identifier.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AlgorithmIdentifier = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var bytes_1 = require_bytes();
    var AlgorithmIdentifier = class _AlgorithmIdentifier {
      algorithm = "";
      parameters;
      constructor(params = {}) {
        Object.assign(this, params);
      }
      isEqual(data) {
        return data instanceof _AlgorithmIdentifier && data.algorithm == this.algorithm && (data.parameters && this.parameters && (0, bytes_1.equal)(data.parameters, this.parameters) || data.parameters === this.parameters);
      }
    };
    exports.AlgorithmIdentifier = AlgorithmIdentifier;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], AlgorithmIdentifier.prototype, "algorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        optional: true
      })
    ], AlgorithmIdentifier.prototype, "parameters", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/subject_public_key_info.js
var require_subject_public_key_info = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/subject_public_key_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SubjectPublicKeyInfo = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var algorithm_identifier_1 = require_algorithm_identifier();
    var SubjectPublicKeyInfo = class {
      algorithm = new algorithm_identifier_1.AlgorithmIdentifier();
      subjectPublicKey = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.SubjectPublicKeyInfo = SubjectPublicKeyInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: algorithm_identifier_1.AlgorithmIdentifier })
    ], SubjectPublicKeyInfo.prototype, "algorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.BitString })
    ], SubjectPublicKeyInfo.prototype, "subjectPublicKey", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/time.js
var require_time = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/time.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Time = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var Time = class Time {
      utcTime;
      generalTime;
      constructor(time) {
        if (time) {
          if (typeof time === "string" || typeof time === "number" || time instanceof Date) {
            const date = new Date(time);
            date.setMilliseconds(0);
            if (date.getUTCFullYear() > 2049) {
              this.generalTime = date;
            } else {
              this.utcTime = date;
            }
          } else {
            Object.assign(this, time);
          }
        }
      }
      getTime() {
        const time = this.utcTime || this.generalTime;
        if (!time) {
          throw new Error("Cannot get time from CHOICE object");
        }
        return time;
      }
    };
    exports.Time = Time;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.UTCTime })
    ], Time.prototype, "utcTime", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.GeneralizedTime })
    ], Time.prototype, "generalTime", void 0);
    exports.Time = Time = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], Time);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/validity.js
var require_validity = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/validity.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Validity = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var time_1 = require_time();
    var Validity = class {
      notBefore = new time_1.Time(/* @__PURE__ */ new Date());
      notAfter = new time_1.Time(/* @__PURE__ */ new Date());
      constructor(params) {
        if (params) {
          this.notBefore = new time_1.Time(params.notBefore);
          this.notAfter = new time_1.Time(params.notAfter);
        }
      }
    };
    exports.Validity = Validity;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: time_1.Time })
    ], Validity.prototype, "notBefore", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: time_1.Time })
    ], Validity.prototype, "notAfter", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/extension.js
var require_extension2 = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/extension.js"(exports) {
    "use strict";
    var Extensions_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Extensions = exports.Extension = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var Extension = class _Extension {
      static CRITICAL = false;
      extnID = "";
      critical = _Extension.CRITICAL;
      extnValue = new asn1_schema_1.OctetString();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.Extension = Extension;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], Extension.prototype, "extnID", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Boolean,
        defaultValue: Extension.CRITICAL
      })
    ], Extension.prototype, "critical", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.OctetString })
    ], Extension.prototype, "extnValue", void 0);
    var Extensions = Extensions_1 = class Extensions extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, Extensions_1.prototype);
      }
    };
    exports.Extensions = Extensions;
    exports.Extensions = Extensions = Extensions_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: Extension
      })
    ], Extensions);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/types.js
var require_types2 = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/types.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Version = void 0;
    var Version;
    (function(Version2) {
      Version2[Version2["v1"] = 0] = "v1";
      Version2[Version2["v2"] = 1] = "v2";
      Version2[Version2["v3"] = 2] = "v3";
    })(Version || (exports.Version = Version = {}));
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/tbs_certificate.js
var require_tbs_certificate = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/tbs_certificate.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TBSCertificate = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var algorithm_identifier_1 = require_algorithm_identifier();
    var name_1 = require_name();
    var subject_public_key_info_1 = require_subject_public_key_info();
    var validity_1 = require_validity();
    var extension_1 = require_extension2();
    var types_1 = require_types2();
    var TBSCertificate = class {
      version = types_1.Version.v1;
      serialNumber = new ArrayBuffer(0);
      signature = new algorithm_identifier_1.AlgorithmIdentifier();
      issuer = new name_1.Name();
      validity = new validity_1.Validity();
      subject = new name_1.Name();
      subjectPublicKeyInfo = new subject_public_key_info_1.SubjectPublicKeyInfo();
      issuerUniqueID;
      subjectUniqueID;
      extensions;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.TBSCertificate = TBSCertificate;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        context: 0,
        defaultValue: types_1.Version.v1
      })
    ], TBSCertificate.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], TBSCertificate.prototype, "serialNumber", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: algorithm_identifier_1.AlgorithmIdentifier })
    ], TBSCertificate.prototype, "signature", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: name_1.Name })
    ], TBSCertificate.prototype, "issuer", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: validity_1.Validity })
    ], TBSCertificate.prototype, "validity", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: name_1.Name })
    ], TBSCertificate.prototype, "subject", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: subject_public_key_info_1.SubjectPublicKeyInfo })
    ], TBSCertificate.prototype, "subjectPublicKeyInfo", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.BitString,
        context: 1,
        implicit: true,
        optional: true
      })
    ], TBSCertificate.prototype, "issuerUniqueID", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.BitString,
        context: 2,
        implicit: true,
        optional: true
      })
    ], TBSCertificate.prototype, "subjectUniqueID", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: extension_1.Extensions,
        context: 3,
        optional: true
      })
    ], TBSCertificate.prototype, "extensions", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/certificate.js
var require_certificate = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/certificate.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Certificate = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var algorithm_identifier_1 = require_algorithm_identifier();
    var tbs_certificate_1 = require_tbs_certificate();
    var Certificate = class {
      tbsCertificate = new tbs_certificate_1.TBSCertificate();
      tbsCertificateRaw;
      signatureAlgorithm = new algorithm_identifier_1.AlgorithmIdentifier();
      signatureValue = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.Certificate = Certificate;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: tbs_certificate_1.TBSCertificate,
        raw: true
      })
    ], Certificate.prototype, "tbsCertificate", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: algorithm_identifier_1.AlgorithmIdentifier })
    ], Certificate.prototype, "signatureAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.BitString })
    ], Certificate.prototype, "signatureValue", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/tbs_cert_list.js
var require_tbs_cert_list = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/tbs_cert_list.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TBSCertList = exports.RevokedCertificate = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var algorithm_identifier_1 = require_algorithm_identifier();
    var name_1 = require_name();
    var time_1 = require_time();
    var extension_1 = require_extension2();
    var RevokedCertificate = class {
      userCertificate = new ArrayBuffer(0);
      revocationDate = new time_1.Time();
      crlEntryExtensions;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.RevokedCertificate = RevokedCertificate;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], RevokedCertificate.prototype, "userCertificate", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: time_1.Time })
    ], RevokedCertificate.prototype, "revocationDate", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: extension_1.Extension,
        optional: true,
        repeated: "sequence"
      })
    ], RevokedCertificate.prototype, "crlEntryExtensions", void 0);
    var TBSCertList = class {
      version;
      signature = new algorithm_identifier_1.AlgorithmIdentifier();
      issuer = new name_1.Name();
      thisUpdate = new time_1.Time();
      nextUpdate;
      revokedCertificates;
      crlExtensions;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.TBSCertList = TBSCertList;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        optional: true
      })
    ], TBSCertList.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: algorithm_identifier_1.AlgorithmIdentifier })
    ], TBSCertList.prototype, "signature", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: name_1.Name })
    ], TBSCertList.prototype, "issuer", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: time_1.Time })
    ], TBSCertList.prototype, "thisUpdate", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: time_1.Time,
        optional: true
      })
    ], TBSCertList.prototype, "nextUpdate", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: RevokedCertificate,
        repeated: "sequence",
        optional: true
      })
    ], TBSCertList.prototype, "revokedCertificates", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: extension_1.Extension,
        optional: true,
        context: 0,
        repeated: "sequence"
      })
    ], TBSCertList.prototype, "crlExtensions", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/certificate_list.js
var require_certificate_list = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/certificate_list.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CertificateList = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var algorithm_identifier_1 = require_algorithm_identifier();
    var tbs_cert_list_1 = require_tbs_cert_list();
    var CertificateList = class {
      tbsCertList = new tbs_cert_list_1.TBSCertList();
      tbsCertListRaw;
      signatureAlgorithm = new algorithm_identifier_1.AlgorithmIdentifier();
      signature = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.CertificateList = CertificateList;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: tbs_cert_list_1.TBSCertList,
        raw: true
      })
    ], CertificateList.prototype, "tbsCertList", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: algorithm_identifier_1.AlgorithmIdentifier })
    ], CertificateList.prototype, "signatureAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.BitString })
    ], CertificateList.prototype, "signature", void 0);
  }
});

// node_modules/@peculiar/asn1-x509/build/cjs/index.js
var require_cjs3 = __commonJS({
  "node_modules/@peculiar/asn1-x509/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_extensions(), exports);
    tslib_1.__exportStar(require_algorithm_identifier(), exports);
    tslib_1.__exportStar(require_attribute(), exports);
    tslib_1.__exportStar(require_certificate(), exports);
    tslib_1.__exportStar(require_certificate_list(), exports);
    tslib_1.__exportStar(require_extension2(), exports);
    tslib_1.__exportStar(require_general_name(), exports);
    tslib_1.__exportStar(require_general_names(), exports);
    tslib_1.__exportStar(require_name(), exports);
    tslib_1.__exportStar(require_object_identifiers(), exports);
    tslib_1.__exportStar(require_subject_public_key_info(), exports);
    tslib_1.__exportStar(require_tbs_cert_list(), exports);
    tslib_1.__exportStar(require_tbs_certificate(), exports);
    tslib_1.__exportStar(require_time(), exports);
    tslib_1.__exportStar(require_types2(), exports);
    tslib_1.__exportStar(require_validity(), exports);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/issuer_and_serial_number.js
var require_issuer_and_serial_number = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/issuer_and_serial_number.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IssuerAndSerialNumber = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var IssuerAndSerialNumber = class {
      issuer = new asn1_x509_1.Name();
      serialNumber = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.IssuerAndSerialNumber = IssuerAndSerialNumber;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.Name })
    ], IssuerAndSerialNumber.prototype, "issuer", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], IssuerAndSerialNumber.prototype, "serialNumber", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/signer_identifier.js
var require_signer_identifier = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/signer_identifier.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SignerIdentifier = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var issuer_and_serial_number_1 = require_issuer_and_serial_number();
    var SignerIdentifier = class SignerIdentifier {
      subjectKeyIdentifier;
      issuerAndSerialNumber;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.SignerIdentifier = SignerIdentifier;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.SubjectKeyIdentifier,
        context: 0,
        implicit: true
      })
    ], SignerIdentifier.prototype, "subjectKeyIdentifier", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: issuer_and_serial_number_1.IssuerAndSerialNumber })
    ], SignerIdentifier.prototype, "issuerAndSerialNumber", void 0);
    exports.SignerIdentifier = SignerIdentifier = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], SignerIdentifier);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/types.js
var require_types3 = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/types.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.KeyDerivationAlgorithmIdentifier = exports.MessageAuthenticationCodeAlgorithm = exports.ContentEncryptionAlgorithmIdentifier = exports.KeyEncryptionAlgorithmIdentifier = exports.SignatureAlgorithmIdentifier = exports.DigestAlgorithmIdentifier = exports.CMSVersion = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_x509_1 = require_cjs3();
    var asn1_schema_1 = require_cjs2();
    var CMSVersion;
    (function(CMSVersion2) {
      CMSVersion2[CMSVersion2["v0"] = 0] = "v0";
      CMSVersion2[CMSVersion2["v1"] = 1] = "v1";
      CMSVersion2[CMSVersion2["v2"] = 2] = "v2";
      CMSVersion2[CMSVersion2["v3"] = 3] = "v3";
      CMSVersion2[CMSVersion2["v4"] = 4] = "v4";
      CMSVersion2[CMSVersion2["v5"] = 5] = "v5";
    })(CMSVersion || (exports.CMSVersion = CMSVersion = {}));
    var DigestAlgorithmIdentifier = class DigestAlgorithmIdentifier extends asn1_x509_1.AlgorithmIdentifier {
    };
    exports.DigestAlgorithmIdentifier = DigestAlgorithmIdentifier;
    exports.DigestAlgorithmIdentifier = DigestAlgorithmIdentifier = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], DigestAlgorithmIdentifier);
    var SignatureAlgorithmIdentifier = class SignatureAlgorithmIdentifier extends asn1_x509_1.AlgorithmIdentifier {
    };
    exports.SignatureAlgorithmIdentifier = SignatureAlgorithmIdentifier;
    exports.SignatureAlgorithmIdentifier = SignatureAlgorithmIdentifier = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], SignatureAlgorithmIdentifier);
    var KeyEncryptionAlgorithmIdentifier = class KeyEncryptionAlgorithmIdentifier extends asn1_x509_1.AlgorithmIdentifier {
    };
    exports.KeyEncryptionAlgorithmIdentifier = KeyEncryptionAlgorithmIdentifier;
    exports.KeyEncryptionAlgorithmIdentifier = KeyEncryptionAlgorithmIdentifier = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], KeyEncryptionAlgorithmIdentifier);
    var ContentEncryptionAlgorithmIdentifier = class ContentEncryptionAlgorithmIdentifier extends asn1_x509_1.AlgorithmIdentifier {
    };
    exports.ContentEncryptionAlgorithmIdentifier = ContentEncryptionAlgorithmIdentifier;
    exports.ContentEncryptionAlgorithmIdentifier = ContentEncryptionAlgorithmIdentifier = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], ContentEncryptionAlgorithmIdentifier);
    var MessageAuthenticationCodeAlgorithm = class MessageAuthenticationCodeAlgorithm extends asn1_x509_1.AlgorithmIdentifier {
    };
    exports.MessageAuthenticationCodeAlgorithm = MessageAuthenticationCodeAlgorithm;
    exports.MessageAuthenticationCodeAlgorithm = MessageAuthenticationCodeAlgorithm = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], MessageAuthenticationCodeAlgorithm);
    var KeyDerivationAlgorithmIdentifier = class KeyDerivationAlgorithmIdentifier extends asn1_x509_1.AlgorithmIdentifier {
    };
    exports.KeyDerivationAlgorithmIdentifier = KeyDerivationAlgorithmIdentifier;
    exports.KeyDerivationAlgorithmIdentifier = KeyDerivationAlgorithmIdentifier = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], KeyDerivationAlgorithmIdentifier);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/attribute.js
var require_attribute2 = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/attribute.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Attribute = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var Attribute = class {
      attrType = "";
      attrValues = [];
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.Attribute = Attribute;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], Attribute.prototype, "attrType", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        repeated: "set"
      })
    ], Attribute.prototype, "attrValues", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/signer_info.js
var require_signer_info = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/signer_info.js"(exports) {
    "use strict";
    var SignerInfos_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SignerInfos = exports.SignerInfo = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var signer_identifier_1 = require_signer_identifier();
    var types_1 = require_types3();
    var attribute_1 = require_attribute2();
    var SignerInfo = class {
      version = types_1.CMSVersion.v0;
      sid = new signer_identifier_1.SignerIdentifier();
      digestAlgorithm = new types_1.DigestAlgorithmIdentifier();
      signedAttrs;
      signedAttrsRaw;
      signatureAlgorithm = new types_1.SignatureAlgorithmIdentifier();
      signature = new asn1_schema_1.OctetString();
      unsignedAttrs;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.SignerInfo = SignerInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], SignerInfo.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: signer_identifier_1.SignerIdentifier })
    ], SignerInfo.prototype, "sid", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: types_1.DigestAlgorithmIdentifier })
    ], SignerInfo.prototype, "digestAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: attribute_1.Attribute,
        repeated: "set",
        context: 0,
        implicit: true,
        optional: true,
        raw: true
      })
    ], SignerInfo.prototype, "signedAttrs", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: types_1.SignatureAlgorithmIdentifier })
    ], SignerInfo.prototype, "signatureAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.OctetString })
    ], SignerInfo.prototype, "signature", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: attribute_1.Attribute,
        repeated: "set",
        context: 1,
        implicit: true,
        optional: true
      })
    ], SignerInfo.prototype, "unsignedAttrs", void 0);
    var SignerInfos = SignerInfos_1 = class SignerInfos extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, SignerInfos_1.prototype);
      }
    };
    exports.SignerInfos = SignerInfos;
    exports.SignerInfos = SignerInfos = SignerInfos_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Set,
        itemType: SignerInfo
      })
    ], SignerInfos);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/attributes/counter_signature.js
var require_counter_signature = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/attributes/counter_signature.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CounterSignature = exports.id_counterSignature = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var signer_info_1 = require_signer_info();
    exports.id_counterSignature = "1.2.840.113549.1.9.6";
    var CounterSignature = class CounterSignature extends signer_info_1.SignerInfo {
    };
    exports.CounterSignature = CounterSignature;
    exports.CounterSignature = CounterSignature = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], CounterSignature);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/attributes/message_digest.js
var require_message_digest = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/attributes/message_digest.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MessageDigest = exports.id_messageDigest = void 0;
    var asn1_schema_1 = require_cjs2();
    exports.id_messageDigest = "1.2.840.113549.1.9.4";
    var MessageDigest = class extends asn1_schema_1.OctetString {
    };
    exports.MessageDigest = MessageDigest;
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/attributes/signing_time.js
var require_signing_time = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/attributes/signing_time.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SigningTime = exports.id_signingTime = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_x509_1 = require_cjs3();
    var asn1_schema_1 = require_cjs2();
    exports.id_signingTime = "1.2.840.113549.1.9.5";
    var SigningTime = class SigningTime extends asn1_x509_1.Time {
    };
    exports.SigningTime = SigningTime;
    exports.SigningTime = SigningTime = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], SigningTime);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/attributes/index.js
var require_attributes = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/attributes/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.id_contentType = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_counter_signature(), exports);
    tslib_1.__exportStar(require_message_digest(), exports);
    tslib_1.__exportStar(require_signing_time(), exports);
    exports.id_contentType = "1.2.840.113549.1.9.3";
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/aa_clear_attrs.js
var require_aa_clear_attrs = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/aa_clear_attrs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ACClearAttrs = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var ACClearAttrs = class {
      acIssuer = new asn1_x509_1.GeneralName();
      acSerial = 0;
      attrs = [];
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.ACClearAttrs = ACClearAttrs;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.GeneralName })
    ], ACClearAttrs.prototype, "acIssuer", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], ACClearAttrs.prototype, "acSerial", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.Attribute,
        repeated: "sequence"
      })
    ], ACClearAttrs.prototype, "attrs", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/attr_spec.js
var require_attr_spec = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/attr_spec.js"(exports) {
    "use strict";
    var AttrSpec_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AttrSpec = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var AttrSpec = AttrSpec_1 = class AttrSpec extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, AttrSpec_1.prototype);
      }
    };
    exports.AttrSpec = AttrSpec;
    exports.AttrSpec = AttrSpec = AttrSpec_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: asn1_schema_1.AsnPropTypes.ObjectIdentifier
      })
    ], AttrSpec);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/aa_controls.js
var require_aa_controls = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/aa_controls.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AAControls = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var attr_spec_1 = require_attr_spec();
    var AAControls = class {
      pathLenConstraint;
      permittedAttrs;
      excludedAttrs;
      permitUnSpecified = true;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.AAControls = AAControls;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        optional: true
      })
    ], AAControls.prototype, "pathLenConstraint", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: attr_spec_1.AttrSpec,
        implicit: true,
        context: 0,
        optional: true
      })
    ], AAControls.prototype, "permittedAttrs", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: attr_spec_1.AttrSpec,
        implicit: true,
        context: 1,
        optional: true
      })
    ], AAControls.prototype, "excludedAttrs", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Boolean,
        defaultValue: true
      })
    ], AAControls.prototype, "permitUnSpecified", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/issuer_serial.js
var require_issuer_serial = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/issuer_serial.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IssuerSerial = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var IssuerSerial = class {
      issuer = new asn1_x509_1.GeneralNames();
      serial = new ArrayBuffer(0);
      issuerUID = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.IssuerSerial = IssuerSerial;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.GeneralNames })
    ], IssuerSerial.prototype, "issuer", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], IssuerSerial.prototype, "serial", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.BitString,
        optional: true
      })
    ], IssuerSerial.prototype, "issuerUID", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/object_digest_info.js
var require_object_digest_info = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/object_digest_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ObjectDigestInfo = exports.DigestedObjectType = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var DigestedObjectType;
    (function(DigestedObjectType2) {
      DigestedObjectType2[DigestedObjectType2["publicKey"] = 0] = "publicKey";
      DigestedObjectType2[DigestedObjectType2["publicKeyCert"] = 1] = "publicKeyCert";
      DigestedObjectType2[DigestedObjectType2["otherObjectTypes"] = 2] = "otherObjectTypes";
    })(DigestedObjectType || (exports.DigestedObjectType = DigestedObjectType = {}));
    var ObjectDigestInfo = class {
      digestedObjectType = DigestedObjectType.publicKey;
      otherObjectTypeID;
      digestAlgorithm = new asn1_x509_1.AlgorithmIdentifier();
      objectDigest = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.ObjectDigestInfo = ObjectDigestInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Enumerated })
    ], ObjectDigestInfo.prototype, "digestedObjectType", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.ObjectIdentifier,
        optional: true
      })
    ], ObjectDigestInfo.prototype, "otherObjectTypeID", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.AlgorithmIdentifier })
    ], ObjectDigestInfo.prototype, "digestAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.BitString })
    ], ObjectDigestInfo.prototype, "objectDigest", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/v2_form.js
var require_v2_form = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/v2_form.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.V2Form = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var issuer_serial_1 = require_issuer_serial();
    var object_digest_info_1 = require_object_digest_info();
    var V2Form = class {
      issuerName;
      baseCertificateID;
      objectDigestInfo;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.V2Form = V2Form;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.GeneralNames,
        optional: true
      })
    ], V2Form.prototype, "issuerName", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: issuer_serial_1.IssuerSerial,
        context: 0,
        implicit: true,
        optional: true
      })
    ], V2Form.prototype, "baseCertificateID", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: object_digest_info_1.ObjectDigestInfo,
        context: 1,
        implicit: true,
        optional: true
      })
    ], V2Form.prototype, "objectDigestInfo", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/attr_cert_issuer.js
var require_attr_cert_issuer = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/attr_cert_issuer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AttCertIssuer = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var v2_form_1 = require_v2_form();
    var AttCertIssuer = class AttCertIssuer {
      v1Form;
      v2Form;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.AttCertIssuer = AttCertIssuer;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.GeneralName,
        repeated: "sequence"
      })
    ], AttCertIssuer.prototype, "v1Form", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: v2_form_1.V2Form,
        context: 0,
        implicit: true
      })
    ], AttCertIssuer.prototype, "v2Form", void 0);
    exports.AttCertIssuer = AttCertIssuer = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], AttCertIssuer);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/attr_cert_validity_period.js
var require_attr_cert_validity_period = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/attr_cert_validity_period.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AttCertValidityPeriod = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var AttCertValidityPeriod = class {
      notBeforeTime = /* @__PURE__ */ new Date();
      notAfterTime = /* @__PURE__ */ new Date();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.AttCertValidityPeriod = AttCertValidityPeriod;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.GeneralizedTime })
    ], AttCertValidityPeriod.prototype, "notBeforeTime", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.GeneralizedTime })
    ], AttCertValidityPeriod.prototype, "notAfterTime", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/holder.js
var require_holder = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/holder.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Holder = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var issuer_serial_1 = require_issuer_serial();
    var object_digest_info_1 = require_object_digest_info();
    var Holder = class {
      baseCertificateID;
      entityName;
      objectDigestInfo;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.Holder = Holder;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: issuer_serial_1.IssuerSerial,
        implicit: true,
        context: 0,
        optional: true
      })
    ], Holder.prototype, "baseCertificateID", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.GeneralNames,
        implicit: true,
        context: 1,
        optional: true
      })
    ], Holder.prototype, "entityName", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: object_digest_info_1.ObjectDigestInfo,
        implicit: true,
        context: 2,
        optional: true
      })
    ], Holder.prototype, "objectDigestInfo", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/attribute_certificate_info.js
var require_attribute_certificate_info = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/attribute_certificate_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AttributeCertificateInfo = exports.AttCertVersion = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var holder_1 = require_holder();
    var attr_cert_issuer_1 = require_attr_cert_issuer();
    var attr_cert_validity_period_1 = require_attr_cert_validity_period();
    var AttCertVersion;
    (function(AttCertVersion2) {
      AttCertVersion2[AttCertVersion2["v2"] = 1] = "v2";
    })(AttCertVersion || (exports.AttCertVersion = AttCertVersion = {}));
    var AttributeCertificateInfo = class {
      version = AttCertVersion.v2;
      holder = new holder_1.Holder();
      issuer = new attr_cert_issuer_1.AttCertIssuer();
      signature = new asn1_x509_1.AlgorithmIdentifier();
      serialNumber = new ArrayBuffer(0);
      attrCertValidityPeriod = new attr_cert_validity_period_1.AttCertValidityPeriod();
      attributes = [];
      issuerUniqueID;
      extensions;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.AttributeCertificateInfo = AttributeCertificateInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], AttributeCertificateInfo.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: holder_1.Holder })
    ], AttributeCertificateInfo.prototype, "holder", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: attr_cert_issuer_1.AttCertIssuer })
    ], AttributeCertificateInfo.prototype, "issuer", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.AlgorithmIdentifier })
    ], AttributeCertificateInfo.prototype, "signature", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], AttributeCertificateInfo.prototype, "serialNumber", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: attr_cert_validity_period_1.AttCertValidityPeriod })
    ], AttributeCertificateInfo.prototype, "attrCertValidityPeriod", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.Attribute,
        repeated: "sequence"
      })
    ], AttributeCertificateInfo.prototype, "attributes", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.BitString,
        optional: true
      })
    ], AttributeCertificateInfo.prototype, "issuerUniqueID", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.Extensions,
        optional: true
      })
    ], AttributeCertificateInfo.prototype, "extensions", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/attribute_certificate.js
var require_attribute_certificate = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/attribute_certificate.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AttributeCertificate = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var attribute_certificate_info_1 = require_attribute_certificate_info();
    var AttributeCertificate = class {
      acinfo = new attribute_certificate_info_1.AttributeCertificateInfo();
      signatureAlgorithm = new asn1_x509_1.AlgorithmIdentifier();
      signatureValue = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.AttributeCertificate = AttributeCertificate;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: attribute_certificate_info_1.AttributeCertificateInfo })
    ], AttributeCertificate.prototype, "acinfo", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.AlgorithmIdentifier })
    ], AttributeCertificate.prototype, "signatureAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.BitString })
    ], AttributeCertificate.prototype, "signatureValue", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/class_list.js
var require_class_list = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/class_list.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ClassList = exports.ClassListFlags = void 0;
    var asn1_schema_1 = require_cjs2();
    var ClassListFlags;
    (function(ClassListFlags2) {
      ClassListFlags2[ClassListFlags2["unmarked"] = 1] = "unmarked";
      ClassListFlags2[ClassListFlags2["unclassified"] = 2] = "unclassified";
      ClassListFlags2[ClassListFlags2["restricted"] = 4] = "restricted";
      ClassListFlags2[ClassListFlags2["confidential"] = 8] = "confidential";
      ClassListFlags2[ClassListFlags2["secret"] = 16] = "secret";
      ClassListFlags2[ClassListFlags2["topSecret"] = 32] = "topSecret";
    })(ClassListFlags || (exports.ClassListFlags = ClassListFlags = {}));
    var ClassList = class extends asn1_schema_1.BitString {
    };
    exports.ClassList = ClassList;
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/security_category.js
var require_security_category = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/security_category.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SecurityCategory = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var SecurityCategory = class {
      type = "";
      value = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.SecurityCategory = SecurityCategory;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.ObjectIdentifier,
        implicit: true,
        context: 0
      })
    ], SecurityCategory.prototype, "type", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        implicit: true,
        context: 1
      })
    ], SecurityCategory.prototype, "value", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/clearance.js
var require_clearance = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/clearance.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Clearance = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var class_list_1 = require_class_list();
    var security_category_1 = require_security_category();
    var Clearance = class {
      policyId = "";
      classList = new class_list_1.ClassList(class_list_1.ClassListFlags.unclassified);
      securityCategories;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.Clearance = Clearance;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], Clearance.prototype, "policyId", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: class_list_1.ClassList,
        defaultValue: new class_list_1.ClassList(class_list_1.ClassListFlags.unclassified)
      })
    ], Clearance.prototype, "classList", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: security_category_1.SecurityCategory,
        repeated: "set"
      })
    ], Clearance.prototype, "securityCategories", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/ietf_attr_syntax.js
var require_ietf_attr_syntax = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/ietf_attr_syntax.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IetfAttrSyntax = exports.IetfAttrSyntaxValueChoices = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var IetfAttrSyntaxValueChoices = class {
      cotets;
      oid;
      string;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.IetfAttrSyntaxValueChoices = IetfAttrSyntaxValueChoices;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.OctetString })
    ], IetfAttrSyntaxValueChoices.prototype, "cotets", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], IetfAttrSyntaxValueChoices.prototype, "oid", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Utf8String })
    ], IetfAttrSyntaxValueChoices.prototype, "string", void 0);
    var IetfAttrSyntax = class {
      policyAuthority;
      values = [];
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.IetfAttrSyntax = IetfAttrSyntax;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.GeneralNames,
        implicit: true,
        context: 0,
        optional: true
      })
    ], IetfAttrSyntax.prototype, "policyAuthority", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: IetfAttrSyntaxValueChoices,
        repeated: "sequence"
      })
    ], IetfAttrSyntax.prototype, "values", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/object_identifiers.js
var require_object_identifiers2 = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/object_identifiers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.id_at_clearance = exports.id_at_role = exports.id_at = exports.id_aca_encAttrs = exports.id_aca_group = exports.id_aca_chargingIdentity = exports.id_aca_accessIdentity = exports.id_aca_authenticationInfo = exports.id_aca = exports.id_ce_targetInformation = exports.id_pe_ac_proxying = exports.id_pe_aaControls = exports.id_pe_ac_auditIdentity = void 0;
    var asn1_x509_1 = require_cjs3();
    exports.id_pe_ac_auditIdentity = `${asn1_x509_1.id_pe}.4`;
    exports.id_pe_aaControls = `${asn1_x509_1.id_pe}.6`;
    exports.id_pe_ac_proxying = `${asn1_x509_1.id_pe}.10`;
    exports.id_ce_targetInformation = `${asn1_x509_1.id_ce}.55`;
    exports.id_aca = `${asn1_x509_1.id_pkix}.10`;
    exports.id_aca_authenticationInfo = `${exports.id_aca}.1`;
    exports.id_aca_accessIdentity = `${exports.id_aca}.2`;
    exports.id_aca_chargingIdentity = `${exports.id_aca}.3`;
    exports.id_aca_group = `${exports.id_aca}.4`;
    exports.id_aca_encAttrs = `${exports.id_aca}.6`;
    exports.id_at = "2.5.4";
    exports.id_at_role = `${exports.id_at}.72`;
    exports.id_at_clearance = "2.5.1.5.55";
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/target.js
var require_target = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/target.js"(exports) {
    "use strict";
    var Targets_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Targets = exports.Target = exports.TargetCert = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var issuer_serial_1 = require_issuer_serial();
    var object_digest_info_1 = require_object_digest_info();
    var TargetCert = class {
      targetCertificate = new issuer_serial_1.IssuerSerial();
      targetName;
      certDigestInfo;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.TargetCert = TargetCert;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: issuer_serial_1.IssuerSerial })
    ], TargetCert.prototype, "targetCertificate", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.GeneralName,
        optional: true
      })
    ], TargetCert.prototype, "targetName", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: object_digest_info_1.ObjectDigestInfo,
        optional: true
      })
    ], TargetCert.prototype, "certDigestInfo", void 0);
    var Target = class Target {
      targetName;
      targetGroup;
      targetCert;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.Target = Target;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.GeneralName,
        context: 0,
        implicit: true
      })
    ], Target.prototype, "targetName", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.GeneralName,
        context: 1,
        implicit: true
      })
    ], Target.prototype, "targetGroup", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: TargetCert,
        context: 2,
        implicit: true
      })
    ], Target.prototype, "targetCert", void 0);
    exports.Target = Target = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], Target);
    var Targets = Targets_1 = class Targets extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, Targets_1.prototype);
      }
    };
    exports.Targets = Targets;
    exports.Targets = Targets = Targets_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: Target
      })
    ], Targets);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/proxy_info.js
var require_proxy_info = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/proxy_info.js"(exports) {
    "use strict";
    var ProxyInfo_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ProxyInfo = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var target_1 = require_target();
    var ProxyInfo = ProxyInfo_1 = class ProxyInfo extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, ProxyInfo_1.prototype);
      }
    };
    exports.ProxyInfo = ProxyInfo;
    exports.ProxyInfo = ProxyInfo = ProxyInfo_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: target_1.Targets
      })
    ], ProxyInfo);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/role_syntax.js
var require_role_syntax = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/role_syntax.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RoleSyntax = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var RoleSyntax = class {
      roleAuthority;
      roleName;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.RoleSyntax = RoleSyntax;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.GeneralNames,
        implicit: true,
        context: 0,
        optional: true
      })
    ], RoleSyntax.prototype, "roleAuthority", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.GeneralName,
        implicit: true,
        context: 1
      })
    ], RoleSyntax.prototype, "roleName", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/svce_auth_info.js
var require_svce_auth_info = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/svce_auth_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SvceAuthInfo = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var SvceAuthInfo = class {
      service = new asn1_x509_1.GeneralName();
      ident = new asn1_x509_1.GeneralName();
      authInfo;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.SvceAuthInfo = SvceAuthInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.GeneralName })
    ], SvceAuthInfo.prototype, "service", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.GeneralName })
    ], SvceAuthInfo.prototype, "ident", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.OctetString,
        optional: true
      })
    ], SvceAuthInfo.prototype, "authInfo", void 0);
  }
});

// node_modules/@peculiar/asn1-x509-attr/build/cjs/index.js
var require_cjs4 = __commonJS({
  "node_modules/@peculiar/asn1-x509-attr/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_aa_clear_attrs(), exports);
    tslib_1.__exportStar(require_aa_controls(), exports);
    tslib_1.__exportStar(require_attr_cert_issuer(), exports);
    tslib_1.__exportStar(require_attr_cert_validity_period(), exports);
    tslib_1.__exportStar(require_attr_spec(), exports);
    tslib_1.__exportStar(require_attribute_certificate(), exports);
    tslib_1.__exportStar(require_attribute_certificate_info(), exports);
    tslib_1.__exportStar(require_class_list(), exports);
    tslib_1.__exportStar(require_clearance(), exports);
    tslib_1.__exportStar(require_holder(), exports);
    tslib_1.__exportStar(require_ietf_attr_syntax(), exports);
    tslib_1.__exportStar(require_issuer_serial(), exports);
    tslib_1.__exportStar(require_object_digest_info(), exports);
    tslib_1.__exportStar(require_object_identifiers2(), exports);
    tslib_1.__exportStar(require_proxy_info(), exports);
    tslib_1.__exportStar(require_role_syntax(), exports);
    tslib_1.__exportStar(require_security_category(), exports);
    tslib_1.__exportStar(require_svce_auth_info(), exports);
    tslib_1.__exportStar(require_target(), exports);
    tslib_1.__exportStar(require_v2_form(), exports);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/certificate_choices.js
var require_certificate_choices = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/certificate_choices.js"(exports) {
    "use strict";
    var CertificateSet_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CertificateSet = exports.CertificateChoices = exports.OtherCertificateFormat = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var asn1_x509_attr_1 = require_cjs4();
    var OtherCertificateFormat = class {
      otherCertFormat = "";
      otherCert = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.OtherCertificateFormat = OtherCertificateFormat;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], OtherCertificateFormat.prototype, "otherCertFormat", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Any })
    ], OtherCertificateFormat.prototype, "otherCert", void 0);
    var CertificateChoices = class CertificateChoices {
      certificate;
      v2AttrCert;
      other;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.CertificateChoices = CertificateChoices;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.Certificate })
    ], CertificateChoices.prototype, "certificate", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_attr_1.AttributeCertificate,
        context: 2,
        implicit: true
      })
    ], CertificateChoices.prototype, "v2AttrCert", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: OtherCertificateFormat,
        context: 3,
        implicit: true
      })
    ], CertificateChoices.prototype, "other", void 0);
    exports.CertificateChoices = CertificateChoices = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], CertificateChoices);
    var CertificateSet = CertificateSet_1 = class CertificateSet extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, CertificateSet_1.prototype);
      }
    };
    exports.CertificateSet = CertificateSet;
    exports.CertificateSet = CertificateSet = CertificateSet_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Set,
        itemType: CertificateChoices
      })
    ], CertificateSet);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/content_info.js
var require_content_info = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/content_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ContentInfo = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var ContentInfo = class {
      contentType = "";
      content = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.ContentInfo = ContentInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], ContentInfo.prototype, "contentType", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        context: 0
      })
    ], ContentInfo.prototype, "content", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/encapsulated_content_info.js
var require_encapsulated_content_info = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/encapsulated_content_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EncapsulatedContentInfo = exports.EncapsulatedContent = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var EncapsulatedContent = class EncapsulatedContent {
      single;
      any;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.EncapsulatedContent = EncapsulatedContent;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.OctetString })
    ], EncapsulatedContent.prototype, "single", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Any })
    ], EncapsulatedContent.prototype, "any", void 0);
    exports.EncapsulatedContent = EncapsulatedContent = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], EncapsulatedContent);
    var EncapsulatedContentInfo = class {
      eContentType = "";
      eContent;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.EncapsulatedContentInfo = EncapsulatedContentInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], EncapsulatedContentInfo.prototype, "eContentType", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: EncapsulatedContent,
        context: 0,
        optional: true
      })
    ], EncapsulatedContentInfo.prototype, "eContent", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/encrypted_content_info.js
var require_encrypted_content_info = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/encrypted_content_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EncryptedContentInfo = exports.EncryptedContent = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var types_1 = require_types3();
    var EncryptedContent = class EncryptedContent {
      value;
      constructedValue;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.EncryptedContent = EncryptedContent;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.OctetString,
        context: 0,
        implicit: true,
        optional: true
      })
    ], EncryptedContent.prototype, "value", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.OctetString,
        converter: asn1_schema_1.AsnConstructedOctetStringConverter,
        context: 0,
        implicit: true,
        optional: true,
        repeated: "sequence"
      })
    ], EncryptedContent.prototype, "constructedValue", void 0);
    exports.EncryptedContent = EncryptedContent = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], EncryptedContent);
    var EncryptedContentInfo = class {
      contentType = "";
      contentEncryptionAlgorithm = new types_1.ContentEncryptionAlgorithmIdentifier();
      encryptedContent;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.EncryptedContentInfo = EncryptedContentInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], EncryptedContentInfo.prototype, "contentType", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: types_1.ContentEncryptionAlgorithmIdentifier })
    ], EncryptedContentInfo.prototype, "contentEncryptionAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: EncryptedContent,
        optional: true
      })
    ], EncryptedContentInfo.prototype, "encryptedContent", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/other_key_attribute.js
var require_other_key_attribute = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/other_key_attribute.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OtherKeyAttribute = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var OtherKeyAttribute = class {
      keyAttrId = "";
      keyAttr;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.OtherKeyAttribute = OtherKeyAttribute;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], OtherKeyAttribute.prototype, "keyAttrId", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        optional: true
      })
    ], OtherKeyAttribute.prototype, "keyAttr", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/key_agree_recipient_info.js
var require_key_agree_recipient_info = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/key_agree_recipient_info.js"(exports) {
    "use strict";
    var RecipientEncryptedKeys_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.KeyAgreeRecipientInfo = exports.OriginatorIdentifierOrKey = exports.OriginatorPublicKey = exports.RecipientEncryptedKeys = exports.RecipientEncryptedKey = exports.KeyAgreeRecipientIdentifier = exports.RecipientKeyIdentifier = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var types_1 = require_types3();
    var issuer_and_serial_number_1 = require_issuer_and_serial_number();
    var other_key_attribute_1 = require_other_key_attribute();
    var RecipientKeyIdentifier = class {
      subjectKeyIdentifier = new asn1_x509_1.SubjectKeyIdentifier();
      date;
      other;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.RecipientKeyIdentifier = RecipientKeyIdentifier;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.SubjectKeyIdentifier })
    ], RecipientKeyIdentifier.prototype, "subjectKeyIdentifier", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.GeneralizedTime,
        optional: true
      })
    ], RecipientKeyIdentifier.prototype, "date", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: other_key_attribute_1.OtherKeyAttribute,
        optional: true
      })
    ], RecipientKeyIdentifier.prototype, "other", void 0);
    var KeyAgreeRecipientIdentifier = class KeyAgreeRecipientIdentifier {
      rKeyId;
      issuerAndSerialNumber;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.KeyAgreeRecipientIdentifier = KeyAgreeRecipientIdentifier;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: RecipientKeyIdentifier,
        context: 0,
        implicit: true,
        optional: true
      })
    ], KeyAgreeRecipientIdentifier.prototype, "rKeyId", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: issuer_and_serial_number_1.IssuerAndSerialNumber,
        optional: true
      })
    ], KeyAgreeRecipientIdentifier.prototype, "issuerAndSerialNumber", void 0);
    exports.KeyAgreeRecipientIdentifier = KeyAgreeRecipientIdentifier = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], KeyAgreeRecipientIdentifier);
    var RecipientEncryptedKey = class {
      rid = new KeyAgreeRecipientIdentifier();
      encryptedKey = new asn1_schema_1.OctetString();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.RecipientEncryptedKey = RecipientEncryptedKey;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: KeyAgreeRecipientIdentifier })
    ], RecipientEncryptedKey.prototype, "rid", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.OctetString })
    ], RecipientEncryptedKey.prototype, "encryptedKey", void 0);
    var RecipientEncryptedKeys = RecipientEncryptedKeys_1 = class RecipientEncryptedKeys extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, RecipientEncryptedKeys_1.prototype);
      }
    };
    exports.RecipientEncryptedKeys = RecipientEncryptedKeys;
    exports.RecipientEncryptedKeys = RecipientEncryptedKeys = RecipientEncryptedKeys_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: RecipientEncryptedKey
      })
    ], RecipientEncryptedKeys);
    var OriginatorPublicKey = class {
      algorithm = new asn1_x509_1.AlgorithmIdentifier();
      publicKey = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.OriginatorPublicKey = OriginatorPublicKey;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.AlgorithmIdentifier })
    ], OriginatorPublicKey.prototype, "algorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.BitString })
    ], OriginatorPublicKey.prototype, "publicKey", void 0);
    var OriginatorIdentifierOrKey = class OriginatorIdentifierOrKey {
      subjectKeyIdentifier;
      originatorKey;
      issuerAndSerialNumber;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.OriginatorIdentifierOrKey = OriginatorIdentifierOrKey;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.SubjectKeyIdentifier,
        context: 0,
        implicit: true,
        optional: true
      })
    ], OriginatorIdentifierOrKey.prototype, "subjectKeyIdentifier", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: OriginatorPublicKey,
        context: 1,
        implicit: true,
        optional: true
      })
    ], OriginatorIdentifierOrKey.prototype, "originatorKey", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: issuer_and_serial_number_1.IssuerAndSerialNumber,
        optional: true
      })
    ], OriginatorIdentifierOrKey.prototype, "issuerAndSerialNumber", void 0);
    exports.OriginatorIdentifierOrKey = OriginatorIdentifierOrKey = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], OriginatorIdentifierOrKey);
    var KeyAgreeRecipientInfo = class {
      version = types_1.CMSVersion.v3;
      originator = new OriginatorIdentifierOrKey();
      ukm;
      keyEncryptionAlgorithm = new types_1.KeyEncryptionAlgorithmIdentifier();
      recipientEncryptedKeys = new RecipientEncryptedKeys();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.KeyAgreeRecipientInfo = KeyAgreeRecipientInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], KeyAgreeRecipientInfo.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: OriginatorIdentifierOrKey,
        context: 0
      })
    ], KeyAgreeRecipientInfo.prototype, "originator", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.OctetString,
        context: 1,
        optional: true
      })
    ], KeyAgreeRecipientInfo.prototype, "ukm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: types_1.KeyEncryptionAlgorithmIdentifier })
    ], KeyAgreeRecipientInfo.prototype, "keyEncryptionAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: RecipientEncryptedKeys })
    ], KeyAgreeRecipientInfo.prototype, "recipientEncryptedKeys", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/key_trans_recipient_info.js
var require_key_trans_recipient_info = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/key_trans_recipient_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.KeyTransRecipientInfo = exports.RecipientIdentifier = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var types_1 = require_types3();
    var issuer_and_serial_number_1 = require_issuer_and_serial_number();
    var RecipientIdentifier = class RecipientIdentifier {
      subjectKeyIdentifier;
      issuerAndSerialNumber;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.RecipientIdentifier = RecipientIdentifier;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.SubjectKeyIdentifier,
        context: 0,
        implicit: true
      })
    ], RecipientIdentifier.prototype, "subjectKeyIdentifier", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: issuer_and_serial_number_1.IssuerAndSerialNumber })
    ], RecipientIdentifier.prototype, "issuerAndSerialNumber", void 0);
    exports.RecipientIdentifier = RecipientIdentifier = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], RecipientIdentifier);
    var KeyTransRecipientInfo = class {
      version = types_1.CMSVersion.v0;
      rid = new RecipientIdentifier();
      keyEncryptionAlgorithm = new types_1.KeyEncryptionAlgorithmIdentifier();
      encryptedKey = new asn1_schema_1.OctetString();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.KeyTransRecipientInfo = KeyTransRecipientInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], KeyTransRecipientInfo.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: RecipientIdentifier })
    ], KeyTransRecipientInfo.prototype, "rid", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: types_1.KeyEncryptionAlgorithmIdentifier })
    ], KeyTransRecipientInfo.prototype, "keyEncryptionAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.OctetString })
    ], KeyTransRecipientInfo.prototype, "encryptedKey", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/kek_recipient_info.js
var require_kek_recipient_info = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/kek_recipient_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.KEKRecipientInfo = exports.KEKIdentifier = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var other_key_attribute_1 = require_other_key_attribute();
    var types_1 = require_types3();
    var KEKIdentifier = class {
      keyIdentifier = new asn1_schema_1.OctetString();
      date;
      other;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.KEKIdentifier = KEKIdentifier;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.OctetString })
    ], KEKIdentifier.prototype, "keyIdentifier", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.GeneralizedTime,
        optional: true
      })
    ], KEKIdentifier.prototype, "date", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: other_key_attribute_1.OtherKeyAttribute,
        optional: true
      })
    ], KEKIdentifier.prototype, "other", void 0);
    var KEKRecipientInfo = class {
      version = types_1.CMSVersion.v4;
      kekid = new KEKIdentifier();
      keyEncryptionAlgorithm = new types_1.KeyEncryptionAlgorithmIdentifier();
      encryptedKey = new asn1_schema_1.OctetString();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.KEKRecipientInfo = KEKRecipientInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], KEKRecipientInfo.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: KEKIdentifier })
    ], KEKRecipientInfo.prototype, "kekid", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: types_1.KeyEncryptionAlgorithmIdentifier })
    ], KEKRecipientInfo.prototype, "keyEncryptionAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.OctetString })
    ], KEKRecipientInfo.prototype, "encryptedKey", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/password_recipient_info.js
var require_password_recipient_info = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/password_recipient_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PasswordRecipientInfo = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var types_1 = require_types3();
    var PasswordRecipientInfo = class {
      version = types_1.CMSVersion.v0;
      keyDerivationAlgorithm;
      keyEncryptionAlgorithm = new types_1.KeyEncryptionAlgorithmIdentifier();
      encryptedKey = new asn1_schema_1.OctetString();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.PasswordRecipientInfo = PasswordRecipientInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], PasswordRecipientInfo.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: types_1.KeyDerivationAlgorithmIdentifier,
        context: 0,
        optional: true
      })
    ], PasswordRecipientInfo.prototype, "keyDerivationAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: types_1.KeyEncryptionAlgorithmIdentifier })
    ], PasswordRecipientInfo.prototype, "keyEncryptionAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.OctetString })
    ], PasswordRecipientInfo.prototype, "encryptedKey", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/recipient_info.js
var require_recipient_info = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/recipient_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RecipientInfo = exports.OtherRecipientInfo = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var key_agree_recipient_info_1 = require_key_agree_recipient_info();
    var key_trans_recipient_info_1 = require_key_trans_recipient_info();
    var kek_recipient_info_1 = require_kek_recipient_info();
    var password_recipient_info_1 = require_password_recipient_info();
    var OtherRecipientInfo = class {
      oriType = "";
      oriValue = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.OtherRecipientInfo = OtherRecipientInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], OtherRecipientInfo.prototype, "oriType", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Any })
    ], OtherRecipientInfo.prototype, "oriValue", void 0);
    var RecipientInfo = class RecipientInfo {
      ktri;
      kari;
      kekri;
      pwri;
      ori;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.RecipientInfo = RecipientInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: key_trans_recipient_info_1.KeyTransRecipientInfo,
        optional: true
      })
    ], RecipientInfo.prototype, "ktri", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: key_agree_recipient_info_1.KeyAgreeRecipientInfo,
        context: 1,
        implicit: true,
        optional: true
      })
    ], RecipientInfo.prototype, "kari", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: kek_recipient_info_1.KEKRecipientInfo,
        context: 2,
        implicit: true,
        optional: true
      })
    ], RecipientInfo.prototype, "kekri", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: password_recipient_info_1.PasswordRecipientInfo,
        context: 3,
        implicit: true,
        optional: true
      })
    ], RecipientInfo.prototype, "pwri", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: OtherRecipientInfo,
        context: 4,
        implicit: true,
        optional: true
      })
    ], RecipientInfo.prototype, "ori", void 0);
    exports.RecipientInfo = RecipientInfo = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], RecipientInfo);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/recipient_infos.js
var require_recipient_infos = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/recipient_infos.js"(exports) {
    "use strict";
    var RecipientInfos_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RecipientInfos = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var recipient_info_1 = require_recipient_info();
    var RecipientInfos = RecipientInfos_1 = class RecipientInfos extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, RecipientInfos_1.prototype);
      }
    };
    exports.RecipientInfos = RecipientInfos;
    exports.RecipientInfos = RecipientInfos = RecipientInfos_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Set,
        itemType: recipient_info_1.RecipientInfo
      })
    ], RecipientInfos);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/revocation_info_choice.js
var require_revocation_info_choice = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/revocation_info_choice.js"(exports) {
    "use strict";
    var RevocationInfoChoices_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RevocationInfoChoices = exports.RevocationInfoChoice = exports.OtherRevocationInfoFormat = exports.id_ri_scvp = exports.id_ri_ocsp_response = exports.id_ri = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    exports.id_ri = `${asn1_x509_1.id_pkix}.16`;
    exports.id_ri_ocsp_response = `${exports.id_ri}.2`;
    exports.id_ri_scvp = `${exports.id_ri}.4`;
    var OtherRevocationInfoFormat = class {
      otherRevInfoFormat = "";
      otherRevInfo = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.OtherRevocationInfoFormat = OtherRevocationInfoFormat;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], OtherRevocationInfoFormat.prototype, "otherRevInfoFormat", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Any })
    ], OtherRevocationInfoFormat.prototype, "otherRevInfo", void 0);
    var RevocationInfoChoice = class RevocationInfoChoice {
      other = new OtherRevocationInfoFormat();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.RevocationInfoChoice = RevocationInfoChoice;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: OtherRevocationInfoFormat,
        context: 1,
        implicit: true
      })
    ], RevocationInfoChoice.prototype, "other", void 0);
    exports.RevocationInfoChoice = RevocationInfoChoice = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], RevocationInfoChoice);
    var RevocationInfoChoices = RevocationInfoChoices_1 = class RevocationInfoChoices extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, RevocationInfoChoices_1.prototype);
      }
    };
    exports.RevocationInfoChoices = RevocationInfoChoices;
    exports.RevocationInfoChoices = RevocationInfoChoices = RevocationInfoChoices_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Set,
        itemType: RevocationInfoChoice
      })
    ], RevocationInfoChoices);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/originator_info.js
var require_originator_info = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/originator_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OriginatorInfo = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var certificate_choices_1 = require_certificate_choices();
    var revocation_info_choice_1 = require_revocation_info_choice();
    var OriginatorInfo = class {
      certs;
      crls;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.OriginatorInfo = OriginatorInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: certificate_choices_1.CertificateSet,
        context: 0,
        implicit: true,
        optional: true
      })
    ], OriginatorInfo.prototype, "certs", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: revocation_info_choice_1.RevocationInfoChoices,
        context: 1,
        implicit: true,
        optional: true
      })
    ], OriginatorInfo.prototype, "crls", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/enveloped_data.js
var require_enveloped_data = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/enveloped_data.js"(exports) {
    "use strict";
    var UnprotectedAttributes_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EnvelopedData = exports.UnprotectedAttributes = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var types_1 = require_types3();
    var attribute_1 = require_attribute2();
    var recipient_infos_1 = require_recipient_infos();
    var originator_info_1 = require_originator_info();
    var encrypted_content_info_1 = require_encrypted_content_info();
    var UnprotectedAttributes = UnprotectedAttributes_1 = class UnprotectedAttributes extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, UnprotectedAttributes_1.prototype);
      }
    };
    exports.UnprotectedAttributes = UnprotectedAttributes;
    exports.UnprotectedAttributes = UnprotectedAttributes = UnprotectedAttributes_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Set,
        itemType: attribute_1.Attribute
      })
    ], UnprotectedAttributes);
    var EnvelopedData = class {
      version = types_1.CMSVersion.v0;
      originatorInfo;
      recipientInfos = new recipient_infos_1.RecipientInfos();
      encryptedContentInfo = new encrypted_content_info_1.EncryptedContentInfo();
      unprotectedAttrs;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.EnvelopedData = EnvelopedData;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], EnvelopedData.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: originator_info_1.OriginatorInfo,
        context: 0,
        implicit: true,
        optional: true
      })
    ], EnvelopedData.prototype, "originatorInfo", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: recipient_infos_1.RecipientInfos })
    ], EnvelopedData.prototype, "recipientInfos", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: encrypted_content_info_1.EncryptedContentInfo })
    ], EnvelopedData.prototype, "encryptedContentInfo", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: UnprotectedAttributes,
        context: 1,
        implicit: true,
        optional: true
      })
    ], EnvelopedData.prototype, "unprotectedAttrs", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/object_identifiers.js
var require_object_identifiers3 = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/object_identifiers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.id_authData = exports.id_encryptedData = exports.id_digestedData = exports.id_envelopedData = exports.id_signedData = exports.id_data = exports.id_ct_contentInfo = void 0;
    exports.id_ct_contentInfo = "1.2.840.113549.1.9.16.1.6";
    exports.id_data = "1.2.840.113549.1.7.1";
    exports.id_signedData = "1.2.840.113549.1.7.2";
    exports.id_envelopedData = "1.2.840.113549.1.7.3";
    exports.id_digestedData = "1.2.840.113549.1.7.5";
    exports.id_encryptedData = "1.2.840.113549.1.7.6";
    exports.id_authData = "1.2.840.113549.1.9.16.1.2";
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/signed_data.js
var require_signed_data = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/signed_data.js"(exports) {
    "use strict";
    var DigestAlgorithmIdentifiers_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SignedData = exports.DigestAlgorithmIdentifiers = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var certificate_choices_1 = require_certificate_choices();
    var types_1 = require_types3();
    var encapsulated_content_info_1 = require_encapsulated_content_info();
    var revocation_info_choice_1 = require_revocation_info_choice();
    var signer_info_1 = require_signer_info();
    var DigestAlgorithmIdentifiers = DigestAlgorithmIdentifiers_1 = class DigestAlgorithmIdentifiers extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, DigestAlgorithmIdentifiers_1.prototype);
      }
    };
    exports.DigestAlgorithmIdentifiers = DigestAlgorithmIdentifiers;
    exports.DigestAlgorithmIdentifiers = DigestAlgorithmIdentifiers = DigestAlgorithmIdentifiers_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Set,
        itemType: types_1.DigestAlgorithmIdentifier
      })
    ], DigestAlgorithmIdentifiers);
    var SignedData = class {
      version = types_1.CMSVersion.v0;
      digestAlgorithms = new DigestAlgorithmIdentifiers();
      encapContentInfo = new encapsulated_content_info_1.EncapsulatedContentInfo();
      certificates;
      crls;
      signerInfos = new signer_info_1.SignerInfos();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.SignedData = SignedData;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], SignedData.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: DigestAlgorithmIdentifiers })
    ], SignedData.prototype, "digestAlgorithms", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: encapsulated_content_info_1.EncapsulatedContentInfo })
    ], SignedData.prototype, "encapContentInfo", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: certificate_choices_1.CertificateSet,
        context: 0,
        implicit: true,
        optional: true
      })
    ], SignedData.prototype, "certificates", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: revocation_info_choice_1.RevocationInfoChoices,
        context: 1,
        implicit: true,
        optional: true
      })
    ], SignedData.prototype, "crls", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: signer_info_1.SignerInfos })
    ], SignedData.prototype, "signerInfos", void 0);
  }
});

// node_modules/@peculiar/asn1-cms/build/cjs/index.js
var require_cjs5 = __commonJS({
  "node_modules/@peculiar/asn1-cms/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_attributes(), exports);
    tslib_1.__exportStar(require_attribute2(), exports);
    tslib_1.__exportStar(require_certificate_choices(), exports);
    tslib_1.__exportStar(require_content_info(), exports);
    tslib_1.__exportStar(require_encapsulated_content_info(), exports);
    tslib_1.__exportStar(require_encrypted_content_info(), exports);
    tslib_1.__exportStar(require_enveloped_data(), exports);
    tslib_1.__exportStar(require_issuer_and_serial_number(), exports);
    tslib_1.__exportStar(require_kek_recipient_info(), exports);
    tslib_1.__exportStar(require_key_agree_recipient_info(), exports);
    tslib_1.__exportStar(require_key_trans_recipient_info(), exports);
    tslib_1.__exportStar(require_object_identifiers3(), exports);
    tslib_1.__exportStar(require_originator_info(), exports);
    tslib_1.__exportStar(require_password_recipient_info(), exports);
    tslib_1.__exportStar(require_recipient_info(), exports);
    tslib_1.__exportStar(require_recipient_infos(), exports);
    tslib_1.__exportStar(require_revocation_info_choice(), exports);
    tslib_1.__exportStar(require_signed_data(), exports);
    tslib_1.__exportStar(require_signer_identifier(), exports);
    tslib_1.__exportStar(require_signer_info(), exports);
    tslib_1.__exportStar(require_types3(), exports);
  }
});

// node_modules/@peculiar/asn1-ecc/build/cjs/object_identifiers.js
var require_object_identifiers4 = __commonJS({
  "node_modules/@peculiar/asn1-ecc/build/cjs/object_identifiers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.id_sect571r1 = exports.id_sect571k1 = exports.id_secp521r1 = exports.id_sect409r1 = exports.id_sect409k1 = exports.id_secp384r1 = exports.id_sect283r1 = exports.id_sect283k1 = exports.id_secp256r1 = exports.id_sect233r1 = exports.id_sect233k1 = exports.id_secp224r1 = exports.id_sect163r2 = exports.id_sect163k1 = exports.id_secp192r1 = exports.id_ecdsaWithSHA512 = exports.id_ecdsaWithSHA384 = exports.id_ecdsaWithSHA256 = exports.id_ecdsaWithSHA224 = exports.id_ecdsaWithSHA1 = exports.id_ecMQV = exports.id_ecDH = exports.id_ecPublicKey = void 0;
    exports.id_ecPublicKey = "1.2.840.10045.2.1";
    exports.id_ecDH = "1.3.132.1.12";
    exports.id_ecMQV = "1.3.132.1.13";
    exports.id_ecdsaWithSHA1 = "1.2.840.10045.4.1";
    exports.id_ecdsaWithSHA224 = "1.2.840.10045.4.3.1";
    exports.id_ecdsaWithSHA256 = "1.2.840.10045.4.3.2";
    exports.id_ecdsaWithSHA384 = "1.2.840.10045.4.3.3";
    exports.id_ecdsaWithSHA512 = "1.2.840.10045.4.3.4";
    exports.id_secp192r1 = "1.2.840.10045.3.1.1";
    exports.id_sect163k1 = "1.3.132.0.1";
    exports.id_sect163r2 = "1.3.132.0.15";
    exports.id_secp224r1 = "1.3.132.0.33";
    exports.id_sect233k1 = "1.3.132.0.26";
    exports.id_sect233r1 = "1.3.132.0.27";
    exports.id_secp256r1 = "1.2.840.10045.3.1.7";
    exports.id_sect283k1 = "1.3.132.0.16";
    exports.id_sect283r1 = "1.3.132.0.17";
    exports.id_secp384r1 = "1.3.132.0.34";
    exports.id_sect409k1 = "1.3.132.0.36";
    exports.id_sect409r1 = "1.3.132.0.37";
    exports.id_secp521r1 = "1.3.132.0.35";
    exports.id_sect571k1 = "1.3.132.0.38";
    exports.id_sect571r1 = "1.3.132.0.39";
  }
});

// node_modules/@peculiar/asn1-ecc/build/cjs/algorithms.js
var require_algorithms = __commonJS({
  "node_modules/@peculiar/asn1-ecc/build/cjs/algorithms.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ecdsaWithSHA512 = exports.ecdsaWithSHA384 = exports.ecdsaWithSHA256 = exports.ecdsaWithSHA224 = exports.ecdsaWithSHA1 = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_x509_1 = require_cjs3();
    var oid = tslib_1.__importStar(require_object_identifiers4());
    function create(algorithm) {
      return new asn1_x509_1.AlgorithmIdentifier({ algorithm });
    }
    exports.ecdsaWithSHA1 = create(oid.id_ecdsaWithSHA1);
    exports.ecdsaWithSHA224 = create(oid.id_ecdsaWithSHA224);
    exports.ecdsaWithSHA256 = create(oid.id_ecdsaWithSHA256);
    exports.ecdsaWithSHA384 = create(oid.id_ecdsaWithSHA384);
    exports.ecdsaWithSHA512 = create(oid.id_ecdsaWithSHA512);
  }
});

// node_modules/@peculiar/asn1-ecc/build/cjs/rfc3279.js
var require_rfc3279 = __commonJS({
  "node_modules/@peculiar/asn1-ecc/build/cjs/rfc3279.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SpecifiedECDomain = exports.ECPVer = exports.Curve = exports.FieldElement = exports.ECPoint = exports.FieldID = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var FieldID = class FieldID {
      fieldType;
      parameters;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.FieldID = FieldID;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], FieldID.prototype, "fieldType", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Any })
    ], FieldID.prototype, "parameters", void 0);
    exports.FieldID = FieldID = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], FieldID);
    var ECPoint = class extends asn1_schema_1.OctetString {
    };
    exports.ECPoint = ECPoint;
    var FieldElement = class extends asn1_schema_1.OctetString {
    };
    exports.FieldElement = FieldElement;
    var Curve = class Curve {
      a;
      b;
      seed;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.Curve = Curve;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.OctetString })
    ], Curve.prototype, "a", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.OctetString })
    ], Curve.prototype, "b", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.BitString,
        optional: true
      })
    ], Curve.prototype, "seed", void 0);
    exports.Curve = Curve = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], Curve);
    var ECPVer;
    (function(ECPVer2) {
      ECPVer2[ECPVer2["ecpVer1"] = 1] = "ecpVer1";
    })(ECPVer || (exports.ECPVer = ECPVer = {}));
    var SpecifiedECDomain = class SpecifiedECDomain {
      version = ECPVer.ecpVer1;
      fieldID;
      curve;
      base;
      order;
      cofactor;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.SpecifiedECDomain = SpecifiedECDomain;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], SpecifiedECDomain.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: FieldID })
    ], SpecifiedECDomain.prototype, "fieldID", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: Curve })
    ], SpecifiedECDomain.prototype, "curve", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: ECPoint })
    ], SpecifiedECDomain.prototype, "base", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], SpecifiedECDomain.prototype, "order", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        optional: true
      })
    ], SpecifiedECDomain.prototype, "cofactor", void 0);
    exports.SpecifiedECDomain = SpecifiedECDomain = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], SpecifiedECDomain);
  }
});

// node_modules/@peculiar/asn1-ecc/build/cjs/ec_parameters.js
var require_ec_parameters = __commonJS({
  "node_modules/@peculiar/asn1-ecc/build/cjs/ec_parameters.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ECParameters = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var rfc3279_1 = require_rfc3279();
    var ECParameters = class ECParameters {
      namedCurve;
      implicitCurve;
      specifiedCurve;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.ECParameters = ECParameters;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], ECParameters.prototype, "namedCurve", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Null })
    ], ECParameters.prototype, "implicitCurve", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: rfc3279_1.SpecifiedECDomain })
    ], ECParameters.prototype, "specifiedCurve", void 0);
    exports.ECParameters = ECParameters = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], ECParameters);
  }
});

// node_modules/@peculiar/asn1-ecc/build/cjs/ec_private_key.js
var require_ec_private_key = __commonJS({
  "node_modules/@peculiar/asn1-ecc/build/cjs/ec_private_key.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ECPrivateKey = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var ec_parameters_1 = require_ec_parameters();
    var ECPrivateKey = class {
      version = 1;
      privateKey = new asn1_schema_1.OctetString();
      parameters;
      publicKey;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.ECPrivateKey = ECPrivateKey;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], ECPrivateKey.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.OctetString })
    ], ECPrivateKey.prototype, "privateKey", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: ec_parameters_1.ECParameters,
        context: 0,
        optional: true
      })
    ], ECPrivateKey.prototype, "parameters", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.BitString,
        context: 1,
        optional: true
      })
    ], ECPrivateKey.prototype, "publicKey", void 0);
  }
});

// node_modules/@peculiar/asn1-ecc/build/cjs/ec_signature_value.js
var require_ec_signature_value = __commonJS({
  "node_modules/@peculiar/asn1-ecc/build/cjs/ec_signature_value.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ECDSASigValue = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var ECDSASigValue = class {
      r = new ArrayBuffer(0);
      s = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.ECDSASigValue = ECDSASigValue;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], ECDSASigValue.prototype, "r", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], ECDSASigValue.prototype, "s", void 0);
  }
});

// node_modules/@peculiar/asn1-ecc/build/cjs/index.js
var require_cjs6 = __commonJS({
  "node_modules/@peculiar/asn1-ecc/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_algorithms(), exports);
    tslib_1.__exportStar(require_ec_parameters(), exports);
    tslib_1.__exportStar(require_ec_private_key(), exports);
    tslib_1.__exportStar(require_ec_signature_value(), exports);
    tslib_1.__exportStar(require_object_identifiers4(), exports);
    tslib_1.__exportStar(require_rfc3279(), exports);
  }
});

// node_modules/@peculiar/asn1-rsa/build/cjs/object_identifiers.js
var require_object_identifiers5 = __commonJS({
  "node_modules/@peculiar/asn1-rsa/build/cjs/object_identifiers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.id_mgf1 = exports.id_md5 = exports.id_md2 = exports.id_sha512_256 = exports.id_sha512_224 = exports.id_sha512 = exports.id_sha384 = exports.id_sha256 = exports.id_sha224 = exports.id_sha1 = exports.id_sha512_256WithRSAEncryption = exports.id_sha512_224WithRSAEncryption = exports.id_sha512WithRSAEncryption = exports.id_sha384WithRSAEncryption = exports.id_sha256WithRSAEncryption = exports.id_ssha224WithRSAEncryption = exports.id_sha224WithRSAEncryption = exports.id_sha1WithRSAEncryption = exports.id_md5WithRSAEncryption = exports.id_md2WithRSAEncryption = exports.id_RSASSA_PSS = exports.id_pSpecified = exports.id_RSAES_OAEP = exports.id_rsaEncryption = exports.id_pkcs_1 = void 0;
    exports.id_pkcs_1 = "1.2.840.113549.1.1";
    exports.id_rsaEncryption = `${exports.id_pkcs_1}.1`;
    exports.id_RSAES_OAEP = `${exports.id_pkcs_1}.7`;
    exports.id_pSpecified = `${exports.id_pkcs_1}.9`;
    exports.id_RSASSA_PSS = `${exports.id_pkcs_1}.10`;
    exports.id_md2WithRSAEncryption = `${exports.id_pkcs_1}.2`;
    exports.id_md5WithRSAEncryption = `${exports.id_pkcs_1}.4`;
    exports.id_sha1WithRSAEncryption = `${exports.id_pkcs_1}.5`;
    exports.id_sha224WithRSAEncryption = `${exports.id_pkcs_1}.14`;
    exports.id_ssha224WithRSAEncryption = exports.id_sha224WithRSAEncryption;
    exports.id_sha256WithRSAEncryption = `${exports.id_pkcs_1}.11`;
    exports.id_sha384WithRSAEncryption = `${exports.id_pkcs_1}.12`;
    exports.id_sha512WithRSAEncryption = `${exports.id_pkcs_1}.13`;
    exports.id_sha512_224WithRSAEncryption = `${exports.id_pkcs_1}.15`;
    exports.id_sha512_256WithRSAEncryption = `${exports.id_pkcs_1}.16`;
    exports.id_sha1 = "1.3.14.3.2.26";
    exports.id_sha224 = "2.16.840.1.101.3.4.2.4";
    exports.id_sha256 = "2.16.840.1.101.3.4.2.1";
    exports.id_sha384 = "2.16.840.1.101.3.4.2.2";
    exports.id_sha512 = "2.16.840.1.101.3.4.2.3";
    exports.id_sha512_224 = "2.16.840.1.101.3.4.2.5";
    exports.id_sha512_256 = "2.16.840.1.101.3.4.2.6";
    exports.id_md2 = "1.2.840.113549.2.2";
    exports.id_md5 = "1.2.840.113549.2.5";
    exports.id_mgf1 = `${exports.id_pkcs_1}.8`;
  }
});

// node_modules/@peculiar/asn1-rsa/build/cjs/algorithms.js
var require_algorithms2 = __commonJS({
  "node_modules/@peculiar/asn1-rsa/build/cjs/algorithms.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.sha512_256WithRSAEncryption = exports.sha512_224WithRSAEncryption = exports.sha512WithRSAEncryption = exports.sha384WithRSAEncryption = exports.sha256WithRSAEncryption = exports.sha224WithRSAEncryption = exports.sha1WithRSAEncryption = exports.md5WithRSAEncryption = exports.md2WithRSAEncryption = exports.rsaEncryption = exports.pSpecifiedEmpty = exports.mgf1SHA1 = exports.sha512_256 = exports.sha512_224 = exports.sha512 = exports.sha384 = exports.sha256 = exports.sha224 = exports.sha1 = exports.md4 = exports.md2 = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var oid = tslib_1.__importStar(require_object_identifiers5());
    function create(algorithm) {
      return new asn1_x509_1.AlgorithmIdentifier({
        algorithm,
        parameters: null
      });
    }
    exports.md2 = create(oid.id_md2);
    exports.md4 = create(oid.id_md5);
    exports.sha1 = create(oid.id_sha1);
    exports.sha224 = create(oid.id_sha224);
    exports.sha256 = create(oid.id_sha256);
    exports.sha384 = create(oid.id_sha384);
    exports.sha512 = create(oid.id_sha512);
    exports.sha512_224 = create(oid.id_sha512_224);
    exports.sha512_256 = create(oid.id_sha512_256);
    exports.mgf1SHA1 = new asn1_x509_1.AlgorithmIdentifier({
      algorithm: oid.id_mgf1,
      parameters: asn1_schema_1.AsnConvert.serialize(exports.sha1)
    });
    exports.pSpecifiedEmpty = new asn1_x509_1.AlgorithmIdentifier({
      algorithm: oid.id_pSpecified,
      parameters: asn1_schema_1.AsnConvert.serialize(asn1_schema_1.AsnOctetStringConverter.toASN(new Uint8Array([218, 57, 163, 238, 94, 107, 75, 13, 50, 85, 191, 239, 149, 96, 24, 144, 175, 216, 7, 9]).buffer))
    });
    exports.rsaEncryption = create(oid.id_rsaEncryption);
    exports.md2WithRSAEncryption = create(oid.id_md2WithRSAEncryption);
    exports.md5WithRSAEncryption = create(oid.id_md5WithRSAEncryption);
    exports.sha1WithRSAEncryption = create(oid.id_sha1WithRSAEncryption);
    exports.sha224WithRSAEncryption = create(oid.id_sha512_224WithRSAEncryption);
    exports.sha256WithRSAEncryption = create(oid.id_sha512_256WithRSAEncryption);
    exports.sha384WithRSAEncryption = create(oid.id_sha384WithRSAEncryption);
    exports.sha512WithRSAEncryption = create(oid.id_sha512WithRSAEncryption);
    exports.sha512_224WithRSAEncryption = create(oid.id_sha512_224WithRSAEncryption);
    exports.sha512_256WithRSAEncryption = create(oid.id_sha512_256WithRSAEncryption);
  }
});

// node_modules/@peculiar/asn1-rsa/build/cjs/parameters/rsaes_oaep.js
var require_rsaes_oaep = __commonJS({
  "node_modules/@peculiar/asn1-rsa/build/cjs/parameters/rsaes_oaep.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RSAES_OAEP = exports.RsaEsOaepParams = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var object_identifiers_1 = require_object_identifiers5();
    var algorithms_1 = require_algorithms2();
    var RsaEsOaepParams = class {
      hashAlgorithm = new asn1_x509_1.AlgorithmIdentifier(algorithms_1.sha1);
      maskGenAlgorithm = new asn1_x509_1.AlgorithmIdentifier({
        algorithm: object_identifiers_1.id_mgf1,
        parameters: asn1_schema_1.AsnConvert.serialize(algorithms_1.sha1)
      });
      pSourceAlgorithm = new asn1_x509_1.AlgorithmIdentifier(algorithms_1.pSpecifiedEmpty);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.RsaEsOaepParams = RsaEsOaepParams;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.AlgorithmIdentifier,
        context: 0,
        defaultValue: algorithms_1.sha1
      })
    ], RsaEsOaepParams.prototype, "hashAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.AlgorithmIdentifier,
        context: 1,
        defaultValue: algorithms_1.mgf1SHA1
      })
    ], RsaEsOaepParams.prototype, "maskGenAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.AlgorithmIdentifier,
        context: 2,
        defaultValue: algorithms_1.pSpecifiedEmpty
      })
    ], RsaEsOaepParams.prototype, "pSourceAlgorithm", void 0);
    exports.RSAES_OAEP = new asn1_x509_1.AlgorithmIdentifier({
      algorithm: object_identifiers_1.id_RSAES_OAEP,
      parameters: asn1_schema_1.AsnConvert.serialize(new RsaEsOaepParams())
    });
  }
});

// node_modules/@peculiar/asn1-rsa/build/cjs/parameters/rsassa_pss.js
var require_rsassa_pss = __commonJS({
  "node_modules/@peculiar/asn1-rsa/build/cjs/parameters/rsassa_pss.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RSASSA_PSS = exports.RsaSaPssParams = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var object_identifiers_1 = require_object_identifiers5();
    var algorithms_1 = require_algorithms2();
    var RsaSaPssParams = class {
      hashAlgorithm = new asn1_x509_1.AlgorithmIdentifier(algorithms_1.sha1);
      maskGenAlgorithm = new asn1_x509_1.AlgorithmIdentifier({
        algorithm: object_identifiers_1.id_mgf1,
        parameters: asn1_schema_1.AsnConvert.serialize(algorithms_1.sha1)
      });
      saltLength = 20;
      trailerField = 1;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.RsaSaPssParams = RsaSaPssParams;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.AlgorithmIdentifier,
        context: 0,
        defaultValue: algorithms_1.sha1
      })
    ], RsaSaPssParams.prototype, "hashAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_x509_1.AlgorithmIdentifier,
        context: 1,
        defaultValue: algorithms_1.mgf1SHA1
      })
    ], RsaSaPssParams.prototype, "maskGenAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        context: 2,
        defaultValue: 20
      })
    ], RsaSaPssParams.prototype, "saltLength", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        context: 3,
        defaultValue: 1
      })
    ], RsaSaPssParams.prototype, "trailerField", void 0);
    exports.RSASSA_PSS = new asn1_x509_1.AlgorithmIdentifier({
      algorithm: object_identifiers_1.id_RSASSA_PSS,
      parameters: asn1_schema_1.AsnConvert.serialize(new RsaSaPssParams())
    });
  }
});

// node_modules/@peculiar/asn1-rsa/build/cjs/parameters/rsassa_pkcs1_v1_5.js
var require_rsassa_pkcs1_v1_5 = __commonJS({
  "node_modules/@peculiar/asn1-rsa/build/cjs/parameters/rsassa_pkcs1_v1_5.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DigestInfo = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_x509_1 = require_cjs3();
    var asn1_schema_1 = require_cjs2();
    var DigestInfo = class {
      digestAlgorithm = new asn1_x509_1.AlgorithmIdentifier();
      digest = new asn1_schema_1.OctetString();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.DigestInfo = DigestInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.AlgorithmIdentifier })
    ], DigestInfo.prototype, "digestAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.OctetString })
    ], DigestInfo.prototype, "digest", void 0);
  }
});

// node_modules/@peculiar/asn1-rsa/build/cjs/parameters/index.js
var require_parameters = __commonJS({
  "node_modules/@peculiar/asn1-rsa/build/cjs/parameters/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_rsaes_oaep(), exports);
    tslib_1.__exportStar(require_rsassa_pss(), exports);
    tslib_1.__exportStar(require_rsassa_pkcs1_v1_5(), exports);
  }
});

// node_modules/@peculiar/asn1-rsa/build/cjs/other_prime_info.js
var require_other_prime_info = __commonJS({
  "node_modules/@peculiar/asn1-rsa/build/cjs/other_prime_info.js"(exports) {
    "use strict";
    var OtherPrimeInfos_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OtherPrimeInfos = exports.OtherPrimeInfo = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var OtherPrimeInfo = class {
      prime = new ArrayBuffer(0);
      exponent = new ArrayBuffer(0);
      coefficient = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.OtherPrimeInfo = OtherPrimeInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], OtherPrimeInfo.prototype, "prime", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], OtherPrimeInfo.prototype, "exponent", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], OtherPrimeInfo.prototype, "coefficient", void 0);
    var OtherPrimeInfos = OtherPrimeInfos_1 = class OtherPrimeInfos extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, OtherPrimeInfos_1.prototype);
      }
    };
    exports.OtherPrimeInfos = OtherPrimeInfos;
    exports.OtherPrimeInfos = OtherPrimeInfos = OtherPrimeInfos_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: OtherPrimeInfo
      })
    ], OtherPrimeInfos);
  }
});

// node_modules/@peculiar/asn1-rsa/build/cjs/rsa_private_key.js
var require_rsa_private_key = __commonJS({
  "node_modules/@peculiar/asn1-rsa/build/cjs/rsa_private_key.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RSAPrivateKey = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var other_prime_info_1 = require_other_prime_info();
    var RSAPrivateKey = class {
      version = 0;
      modulus = new ArrayBuffer(0);
      publicExponent = new ArrayBuffer(0);
      privateExponent = new ArrayBuffer(0);
      prime1 = new ArrayBuffer(0);
      prime2 = new ArrayBuffer(0);
      exponent1 = new ArrayBuffer(0);
      exponent2 = new ArrayBuffer(0);
      coefficient = new ArrayBuffer(0);
      otherPrimeInfos;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.RSAPrivateKey = RSAPrivateKey;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], RSAPrivateKey.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], RSAPrivateKey.prototype, "modulus", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], RSAPrivateKey.prototype, "publicExponent", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], RSAPrivateKey.prototype, "privateExponent", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], RSAPrivateKey.prototype, "prime1", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], RSAPrivateKey.prototype, "prime2", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], RSAPrivateKey.prototype, "exponent1", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], RSAPrivateKey.prototype, "exponent2", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], RSAPrivateKey.prototype, "coefficient", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: other_prime_info_1.OtherPrimeInfos,
        optional: true
      })
    ], RSAPrivateKey.prototype, "otherPrimeInfos", void 0);
  }
});

// node_modules/@peculiar/asn1-rsa/build/cjs/rsa_public_key.js
var require_rsa_public_key = __commonJS({
  "node_modules/@peculiar/asn1-rsa/build/cjs/rsa_public_key.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RSAPublicKey = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var RSAPublicKey = class {
      modulus = new ArrayBuffer(0);
      publicExponent = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.RSAPublicKey = RSAPublicKey;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], RSAPublicKey.prototype, "modulus", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        converter: asn1_schema_1.AsnIntegerArrayBufferConverter
      })
    ], RSAPublicKey.prototype, "publicExponent", void 0);
  }
});

// node_modules/@peculiar/asn1-rsa/build/cjs/index.js
var require_cjs7 = __commonJS({
  "node_modules/@peculiar/asn1-rsa/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_parameters(), exports);
    tslib_1.__exportStar(require_algorithms2(), exports);
    tslib_1.__exportStar(require_object_identifiers5(), exports);
    tslib_1.__exportStar(require_other_prime_info(), exports);
    tslib_1.__exportStar(require_rsa_private_key(), exports);
    tslib_1.__exportStar(require_rsa_public_key(), exports);
  }
});

// node_modules/tsyringe/node_modules/tslib/tslib.es6.js
var tslib_es6_exports2 = {};
__export(tslib_es6_exports2, {
  __assign: () => __assign2,
  __asyncDelegator: () => __asyncDelegator2,
  __asyncGenerator: () => __asyncGenerator2,
  __asyncValues: () => __asyncValues2,
  __await: () => __await2,
  __awaiter: () => __awaiter2,
  __classPrivateFieldGet: () => __classPrivateFieldGet2,
  __classPrivateFieldSet: () => __classPrivateFieldSet2,
  __createBinding: () => __createBinding2,
  __decorate: () => __decorate2,
  __exportStar: () => __exportStar2,
  __extends: () => __extends2,
  __generator: () => __generator2,
  __importDefault: () => __importDefault2,
  __importStar: () => __importStar2,
  __makeTemplateObject: () => __makeTemplateObject2,
  __metadata: () => __metadata2,
  __param: () => __param2,
  __read: () => __read2,
  __rest: () => __rest2,
  __spread: () => __spread2,
  __spreadArrays: () => __spreadArrays2,
  __values: () => __values2
});
function __extends2(d, b) {
  extendStatics2(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
function __rest2(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
    t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
        t[p[i]] = s[p[i]];
    }
  return t;
}
function __decorate2(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function __param2(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
function __metadata2(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}
function __awaiter2(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
function __generator2(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1) throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (_) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          _.label++;
          return { value: op[1], done: false };
        case 5:
          _.label++;
          y = op[1];
          op = [0];
          continue;
        case 7:
          op = _.ops.pop();
          _.trys.pop();
          continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }
          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1];
            t = op;
            break;
          }
          if (t && _.label < t[2]) {
            _.label = t[2];
            _.ops.push(op);
            break;
          }
          if (t[2]) _.ops.pop();
          _.trys.pop();
          continue;
      }
      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e];
      y = 0;
    } finally {
      f = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
}
function __createBinding2(o, m, k, k2) {
  if (k2 === void 0) k2 = k;
  o[k2] = m[k];
}
function __exportStar2(m, exports) {
  for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) exports[p] = m[p];
}
function __values2(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function() {
      if (o && i >= o.length) o = void 0;
      return { value: o && o[i++], done: !o };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __read2(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
}
function __spread2() {
  for (var ar = [], i = 0; i < arguments.length; i++)
    ar = ar.concat(__read2(arguments[i]));
  return ar;
}
function __spreadArrays2() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++)
    for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
      r[k] = a[j];
  return r;
}
function __await2(v) {
  return this instanceof __await2 ? (this.v = v, this) : new __await2(v);
}
function __asyncGenerator2(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i;
  function verb(n) {
    if (g[n]) i[n] = function(v) {
      return new Promise(function(a, b) {
        q.push([n, v, a, b]) > 1 || resume(n, v);
      });
    };
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await2 ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
}
function __asyncDelegator2(o) {
  var i, p;
  return i = {}, verb("next"), verb("throw", function(e) {
    throw e;
  }), verb("return"), i[Symbol.iterator] = function() {
    return this;
  }, i;
  function verb(n, f) {
    i[n] = o[n] ? function(v) {
      return (p = !p) ? { value: __await2(o[n](v)), done: n === "return" } : f ? f(v) : v;
    } : f;
  }
}
function __asyncValues2(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values2 === "function" ? __values2(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i);
  function verb(n) {
    i[n] = o[n] && function(v) {
      return new Promise(function(resolve, reject) {
        v = o[n](v), settle(resolve, reject, v.done, v.value);
      });
    };
  }
  function settle(resolve, reject, d, v) {
    Promise.resolve(v).then(function(v2) {
      resolve({ value: v2, done: d });
    }, reject);
  }
}
function __makeTemplateObject2(cooked, raw) {
  if (Object.defineProperty) {
    Object.defineProperty(cooked, "raw", { value: raw });
  } else {
    cooked.raw = raw;
  }
  return cooked;
}
function __importStar2(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) {
    for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
  }
  result.default = mod;
  return result;
}
function __importDefault2(mod) {
  return mod && mod.__esModule ? mod : { default: mod };
}
function __classPrivateFieldGet2(receiver, privateMap) {
  if (!privateMap.has(receiver)) {
    throw new TypeError("attempted to get private field on non-instance");
  }
  return privateMap.get(receiver);
}
function __classPrivateFieldSet2(receiver, privateMap, value) {
  if (!privateMap.has(receiver)) {
    throw new TypeError("attempted to set private field on non-instance");
  }
  privateMap.set(receiver, value);
  return value;
}
var extendStatics2, __assign2;
var init_tslib_es62 = __esm({
  "node_modules/tsyringe/node_modules/tslib/tslib.es6.js"() {
    extendStatics2 = function(d, b) {
      extendStatics2 = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
        d2.__proto__ = b2;
      } || function(d2, b2) {
        for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
      };
      return extendStatics2(d, b);
    };
    __assign2 = function() {
      __assign2 = Object.assign || function __assign3(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
      return __assign2.apply(this, arguments);
    };
  }
});

// node_modules/tsyringe/dist/cjs/types/lifecycle.js
var require_lifecycle = __commonJS({
  "node_modules/tsyringe/dist/cjs/types/lifecycle.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Lifecycle;
    (function(Lifecycle2) {
      Lifecycle2[Lifecycle2["Transient"] = 0] = "Transient";
      Lifecycle2[Lifecycle2["Singleton"] = 1] = "Singleton";
      Lifecycle2[Lifecycle2["ResolutionScoped"] = 2] = "ResolutionScoped";
      Lifecycle2[Lifecycle2["ContainerScoped"] = 3] = "ContainerScoped";
    })(Lifecycle || (Lifecycle = {}));
    exports.default = Lifecycle;
  }
});

// node_modules/tsyringe/dist/cjs/types/index.js
var require_types4 = __commonJS({
  "node_modules/tsyringe/dist/cjs/types/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var lifecycle_1 = require_lifecycle();
    Object.defineProperty(exports, "Lifecycle", { enumerable: true, get: function() {
      return lifecycle_1.default;
    } });
  }
});

// node_modules/tsyringe/dist/cjs/reflection-helpers.js
var require_reflection_helpers = __commonJS({
  "node_modules/tsyringe/dist/cjs/reflection-helpers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defineInjectionTokenMetadata = exports.getParamInfo = exports.INJECTION_TOKEN_METADATA_KEY = void 0;
    exports.INJECTION_TOKEN_METADATA_KEY = "injectionTokens";
    function getParamInfo(target) {
      const params = Reflect.getMetadata("design:paramtypes", target) || [];
      const injectionTokens = Reflect.getOwnMetadata(exports.INJECTION_TOKEN_METADATA_KEY, target) || {};
      Object.keys(injectionTokens).forEach((key) => {
        params[+key] = injectionTokens[key];
      });
      return params;
    }
    exports.getParamInfo = getParamInfo;
    function defineInjectionTokenMetadata(data, transform) {
      return function(target, _propertyKey, parameterIndex) {
        const descriptors = Reflect.getOwnMetadata(exports.INJECTION_TOKEN_METADATA_KEY, target) || {};
        descriptors[parameterIndex] = transform ? {
          token: data,
          transform: transform.transformToken,
          transformArgs: transform.args || []
        } : data;
        Reflect.defineMetadata(exports.INJECTION_TOKEN_METADATA_KEY, descriptors, target);
      };
    }
    exports.defineInjectionTokenMetadata = defineInjectionTokenMetadata;
  }
});

// node_modules/tsyringe/dist/cjs/providers/class-provider.js
var require_class_provider = __commonJS({
  "node_modules/tsyringe/dist/cjs/providers/class-provider.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isClassProvider = void 0;
    function isClassProvider(provider) {
      return !!provider.useClass;
    }
    exports.isClassProvider = isClassProvider;
  }
});

// node_modules/tsyringe/dist/cjs/providers/factory-provider.js
var require_factory_provider = __commonJS({
  "node_modules/tsyringe/dist/cjs/providers/factory-provider.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isFactoryProvider = void 0;
    function isFactoryProvider(provider) {
      return !!provider.useFactory;
    }
    exports.isFactoryProvider = isFactoryProvider;
  }
});

// node_modules/tsyringe/dist/cjs/lazy-helpers.js
var require_lazy_helpers = __commonJS({
  "node_modules/tsyringe/dist/cjs/lazy-helpers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.delay = exports.DelayedConstructor = void 0;
    var DelayedConstructor = class {
      constructor(wrap) {
        this.wrap = wrap;
        this.reflectMethods = [
          "get",
          "getPrototypeOf",
          "setPrototypeOf",
          "getOwnPropertyDescriptor",
          "defineProperty",
          "has",
          "set",
          "deleteProperty",
          "apply",
          "construct",
          "ownKeys"
        ];
      }
      createProxy(createObject) {
        const target = {};
        let init = false;
        let value;
        const delayedObject = () => {
          if (!init) {
            value = createObject(this.wrap());
            init = true;
          }
          return value;
        };
        return new Proxy(target, this.createHandler(delayedObject));
      }
      createHandler(delayedObject) {
        const handler = {};
        const install = (name) => {
          handler[name] = (...args) => {
            args[0] = delayedObject();
            const method = Reflect[name];
            return method(...args);
          };
        };
        this.reflectMethods.forEach(install);
        return handler;
      }
    };
    exports.DelayedConstructor = DelayedConstructor;
    function delay(wrappedConstructor) {
      if (typeof wrappedConstructor === "undefined") {
        throw new Error("Attempt to `delay` undefined. Constructor must be wrapped in a callback");
      }
      return new DelayedConstructor(wrappedConstructor);
    }
    exports.delay = delay;
  }
});

// node_modules/tsyringe/dist/cjs/providers/injection-token.js
var require_injection_token = __commonJS({
  "node_modules/tsyringe/dist/cjs/providers/injection-token.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isConstructorToken = exports.isTransformDescriptor = exports.isTokenDescriptor = exports.isNormalToken = void 0;
    var lazy_helpers_1 = require_lazy_helpers();
    function isNormalToken(token2) {
      return typeof token2 === "string" || typeof token2 === "symbol";
    }
    exports.isNormalToken = isNormalToken;
    function isTokenDescriptor(descriptor) {
      return typeof descriptor === "object" && "token" in descriptor && "multiple" in descriptor;
    }
    exports.isTokenDescriptor = isTokenDescriptor;
    function isTransformDescriptor(descriptor) {
      return typeof descriptor === "object" && "token" in descriptor && "transform" in descriptor;
    }
    exports.isTransformDescriptor = isTransformDescriptor;
    function isConstructorToken(token2) {
      return typeof token2 === "function" || token2 instanceof lazy_helpers_1.DelayedConstructor;
    }
    exports.isConstructorToken = isConstructorToken;
  }
});

// node_modules/tsyringe/dist/cjs/providers/token-provider.js
var require_token_provider = __commonJS({
  "node_modules/tsyringe/dist/cjs/providers/token-provider.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isTokenProvider = void 0;
    function isTokenProvider(provider) {
      return !!provider.useToken;
    }
    exports.isTokenProvider = isTokenProvider;
  }
});

// node_modules/tsyringe/dist/cjs/providers/value-provider.js
var require_value_provider = __commonJS({
  "node_modules/tsyringe/dist/cjs/providers/value-provider.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isValueProvider = void 0;
    function isValueProvider(provider) {
      return provider.useValue != void 0;
    }
    exports.isValueProvider = isValueProvider;
  }
});

// node_modules/tsyringe/dist/cjs/providers/index.js
var require_providers = __commonJS({
  "node_modules/tsyringe/dist/cjs/providers/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var class_provider_1 = require_class_provider();
    Object.defineProperty(exports, "isClassProvider", { enumerable: true, get: function() {
      return class_provider_1.isClassProvider;
    } });
    var factory_provider_1 = require_factory_provider();
    Object.defineProperty(exports, "isFactoryProvider", { enumerable: true, get: function() {
      return factory_provider_1.isFactoryProvider;
    } });
    var injection_token_1 = require_injection_token();
    Object.defineProperty(exports, "isNormalToken", { enumerable: true, get: function() {
      return injection_token_1.isNormalToken;
    } });
    var token_provider_1 = require_token_provider();
    Object.defineProperty(exports, "isTokenProvider", { enumerable: true, get: function() {
      return token_provider_1.isTokenProvider;
    } });
    var value_provider_1 = require_value_provider();
    Object.defineProperty(exports, "isValueProvider", { enumerable: true, get: function() {
      return value_provider_1.isValueProvider;
    } });
  }
});

// node_modules/tsyringe/dist/cjs/providers/provider.js
var require_provider = __commonJS({
  "node_modules/tsyringe/dist/cjs/providers/provider.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isProvider = void 0;
    var class_provider_1 = require_class_provider();
    var value_provider_1 = require_value_provider();
    var token_provider_1 = require_token_provider();
    var factory_provider_1 = require_factory_provider();
    function isProvider(provider) {
      return class_provider_1.isClassProvider(provider) || value_provider_1.isValueProvider(provider) || token_provider_1.isTokenProvider(provider) || factory_provider_1.isFactoryProvider(provider);
    }
    exports.isProvider = isProvider;
  }
});

// node_modules/tsyringe/dist/cjs/registry-base.js
var require_registry_base = __commonJS({
  "node_modules/tsyringe/dist/cjs/registry-base.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var RegistryBase = class {
      constructor() {
        this._registryMap = /* @__PURE__ */ new Map();
      }
      entries() {
        return this._registryMap.entries();
      }
      getAll(key) {
        this.ensure(key);
        return this._registryMap.get(key);
      }
      get(key) {
        this.ensure(key);
        const value = this._registryMap.get(key);
        return value[value.length - 1] || null;
      }
      set(key, value) {
        this.ensure(key);
        this._registryMap.get(key).push(value);
      }
      setAll(key, value) {
        this._registryMap.set(key, value);
      }
      has(key) {
        this.ensure(key);
        return this._registryMap.get(key).length > 0;
      }
      clear() {
        this._registryMap.clear();
      }
      ensure(key) {
        if (!this._registryMap.has(key)) {
          this._registryMap.set(key, []);
        }
      }
    };
    exports.default = RegistryBase;
  }
});

// node_modules/tsyringe/dist/cjs/registry.js
var require_registry2 = __commonJS({
  "node_modules/tsyringe/dist/cjs/registry.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var registry_base_1 = require_registry_base();
    var Registry = class extends registry_base_1.default {
    };
    exports.default = Registry;
  }
});

// node_modules/tsyringe/dist/cjs/resolution-context.js
var require_resolution_context = __commonJS({
  "node_modules/tsyringe/dist/cjs/resolution-context.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ResolutionContext = class {
      constructor() {
        this.scopedResolutions = /* @__PURE__ */ new Map();
      }
    };
    exports.default = ResolutionContext;
  }
});

// node_modules/tsyringe/dist/cjs/error-helpers.js
var require_error_helpers = __commonJS({
  "node_modules/tsyringe/dist/cjs/error-helpers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatErrorCtor = void 0;
    function formatDependency(params, idx) {
      if (params === null) {
        return `at position #${idx}`;
      }
      const argName = params.split(",")[idx].trim();
      return `"${argName}" at position #${idx}`;
    }
    function composeErrorMessage(msg, e, indent = "    ") {
      return [msg, ...e.message.split("\n").map((l) => indent + l)].join("\n");
    }
    function formatErrorCtor(ctor, paramIdx, error) {
      const [, params = null] = ctor.toString().match(/constructor\(([\w, ]+)\)/) || [];
      const dep = formatDependency(params, paramIdx);
      return composeErrorMessage(`Cannot inject the dependency ${dep} of "${ctor.name}" constructor. Reason:`, error);
    }
    exports.formatErrorCtor = formatErrorCtor;
  }
});

// node_modules/tsyringe/dist/cjs/types/disposable.js
var require_disposable = __commonJS({
  "node_modules/tsyringe/dist/cjs/types/disposable.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isDisposable = void 0;
    function isDisposable(value) {
      if (typeof value.dispose !== "function")
        return false;
      const disposeFun = value.dispose;
      if (disposeFun.length > 0) {
        return false;
      }
      return true;
    }
    exports.isDisposable = isDisposable;
  }
});

// node_modules/tsyringe/dist/cjs/interceptors.js
var require_interceptors = __commonJS({
  "node_modules/tsyringe/dist/cjs/interceptors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PostResolutionInterceptors = exports.PreResolutionInterceptors = void 0;
    var registry_base_1 = require_registry_base();
    var PreResolutionInterceptors = class extends registry_base_1.default {
    };
    exports.PreResolutionInterceptors = PreResolutionInterceptors;
    var PostResolutionInterceptors = class extends registry_base_1.default {
    };
    exports.PostResolutionInterceptors = PostResolutionInterceptors;
    var Interceptors = class {
      constructor() {
        this.preResolution = new PreResolutionInterceptors();
        this.postResolution = new PostResolutionInterceptors();
      }
    };
    exports.default = Interceptors;
  }
});

// node_modules/tsyringe/dist/cjs/dependency-container.js
var require_dependency_container = __commonJS({
  "node_modules/tsyringe/dist/cjs/dependency-container.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.instance = exports.typeInfo = void 0;
    var tslib_1 = (init_tslib_es62(), __toCommonJS(tslib_es6_exports2));
    var providers_1 = require_providers();
    var provider_1 = require_provider();
    var injection_token_1 = require_injection_token();
    var registry_1 = require_registry2();
    var lifecycle_1 = require_lifecycle();
    var resolution_context_1 = require_resolution_context();
    var error_helpers_1 = require_error_helpers();
    var lazy_helpers_1 = require_lazy_helpers();
    var disposable_1 = require_disposable();
    var interceptors_1 = require_interceptors();
    exports.typeInfo = /* @__PURE__ */ new Map();
    var InternalDependencyContainer = class _InternalDependencyContainer {
      constructor(parent) {
        this.parent = parent;
        this._registry = new registry_1.default();
        this.interceptors = new interceptors_1.default();
        this.disposed = false;
        this.disposables = /* @__PURE__ */ new Set();
      }
      register(token2, providerOrConstructor, options = { lifecycle: lifecycle_1.default.Transient }) {
        this.ensureNotDisposed();
        let provider;
        if (!provider_1.isProvider(providerOrConstructor)) {
          provider = { useClass: providerOrConstructor };
        } else {
          provider = providerOrConstructor;
        }
        if (providers_1.isTokenProvider(provider)) {
          const path6 = [token2];
          let tokenProvider = provider;
          while (tokenProvider != null) {
            const currentToken = tokenProvider.useToken;
            if (path6.includes(currentToken)) {
              throw new Error(`Token registration cycle detected! ${[...path6, currentToken].join(" -> ")}`);
            }
            path6.push(currentToken);
            const registration = this._registry.get(currentToken);
            if (registration && providers_1.isTokenProvider(registration.provider)) {
              tokenProvider = registration.provider;
            } else {
              tokenProvider = null;
            }
          }
        }
        if (options.lifecycle === lifecycle_1.default.Singleton || options.lifecycle == lifecycle_1.default.ContainerScoped || options.lifecycle == lifecycle_1.default.ResolutionScoped) {
          if (providers_1.isValueProvider(provider) || providers_1.isFactoryProvider(provider)) {
            throw new Error(`Cannot use lifecycle "${lifecycle_1.default[options.lifecycle]}" with ValueProviders or FactoryProviders`);
          }
        }
        this._registry.set(token2, { provider, options });
        return this;
      }
      registerType(from, to) {
        this.ensureNotDisposed();
        if (providers_1.isNormalToken(to)) {
          return this.register(from, {
            useToken: to
          });
        }
        return this.register(from, {
          useClass: to
        });
      }
      registerInstance(token2, instance) {
        this.ensureNotDisposed();
        return this.register(token2, {
          useValue: instance
        });
      }
      registerSingleton(from, to) {
        this.ensureNotDisposed();
        if (providers_1.isNormalToken(from)) {
          if (providers_1.isNormalToken(to)) {
            return this.register(from, {
              useToken: to
            }, { lifecycle: lifecycle_1.default.Singleton });
          } else if (to) {
            return this.register(from, {
              useClass: to
            }, { lifecycle: lifecycle_1.default.Singleton });
          }
          throw new Error('Cannot register a type name as a singleton without a "to" token');
        }
        let useClass = from;
        if (to && !providers_1.isNormalToken(to)) {
          useClass = to;
        }
        return this.register(from, {
          useClass
        }, { lifecycle: lifecycle_1.default.Singleton });
      }
      resolve(token2, context = new resolution_context_1.default(), isOptional = false) {
        this.ensureNotDisposed();
        const registration = this.getRegistration(token2);
        if (!registration && providers_1.isNormalToken(token2)) {
          if (isOptional) {
            return void 0;
          }
          throw new Error(`Attempted to resolve unregistered dependency token: "${token2.toString()}"`);
        }
        this.executePreResolutionInterceptor(token2, "Single");
        if (registration) {
          const result = this.resolveRegistration(registration, context);
          this.executePostResolutionInterceptor(token2, result, "Single");
          return result;
        }
        if (injection_token_1.isConstructorToken(token2)) {
          const result = this.construct(token2, context);
          this.executePostResolutionInterceptor(token2, result, "Single");
          return result;
        }
        throw new Error("Attempted to construct an undefined constructor. Could mean a circular dependency problem. Try using `delay` function.");
      }
      executePreResolutionInterceptor(token2, resolutionType) {
        if (this.interceptors.preResolution.has(token2)) {
          const remainingInterceptors = [];
          for (const interceptor of this.interceptors.preResolution.getAll(token2)) {
            if (interceptor.options.frequency != "Once") {
              remainingInterceptors.push(interceptor);
            }
            interceptor.callback(token2, resolutionType);
          }
          this.interceptors.preResolution.setAll(token2, remainingInterceptors);
        }
      }
      executePostResolutionInterceptor(token2, result, resolutionType) {
        if (this.interceptors.postResolution.has(token2)) {
          const remainingInterceptors = [];
          for (const interceptor of this.interceptors.postResolution.getAll(token2)) {
            if (interceptor.options.frequency != "Once") {
              remainingInterceptors.push(interceptor);
            }
            interceptor.callback(token2, result, resolutionType);
          }
          this.interceptors.postResolution.setAll(token2, remainingInterceptors);
        }
      }
      resolveRegistration(registration, context) {
        this.ensureNotDisposed();
        if (registration.options.lifecycle === lifecycle_1.default.ResolutionScoped && context.scopedResolutions.has(registration)) {
          return context.scopedResolutions.get(registration);
        }
        const isSingleton = registration.options.lifecycle === lifecycle_1.default.Singleton;
        const isContainerScoped = registration.options.lifecycle === lifecycle_1.default.ContainerScoped;
        const returnInstance = isSingleton || isContainerScoped;
        let resolved;
        if (providers_1.isValueProvider(registration.provider)) {
          resolved = registration.provider.useValue;
        } else if (providers_1.isTokenProvider(registration.provider)) {
          resolved = returnInstance ? registration.instance || (registration.instance = this.resolve(registration.provider.useToken, context)) : this.resolve(registration.provider.useToken, context);
        } else if (providers_1.isClassProvider(registration.provider)) {
          resolved = returnInstance ? registration.instance || (registration.instance = this.construct(registration.provider.useClass, context)) : this.construct(registration.provider.useClass, context);
        } else if (providers_1.isFactoryProvider(registration.provider)) {
          resolved = registration.provider.useFactory(this);
        } else {
          resolved = this.construct(registration.provider, context);
        }
        if (registration.options.lifecycle === lifecycle_1.default.ResolutionScoped) {
          context.scopedResolutions.set(registration, resolved);
        }
        return resolved;
      }
      resolveAll(token2, context = new resolution_context_1.default(), isOptional = false) {
        this.ensureNotDisposed();
        const registrations = this.getAllRegistrations(token2);
        if (!registrations && providers_1.isNormalToken(token2)) {
          if (isOptional) {
            return [];
          }
          throw new Error(`Attempted to resolve unregistered dependency token: "${token2.toString()}"`);
        }
        this.executePreResolutionInterceptor(token2, "All");
        if (registrations) {
          const result2 = registrations.map((item) => this.resolveRegistration(item, context));
          this.executePostResolutionInterceptor(token2, result2, "All");
          return result2;
        }
        const result = [this.construct(token2, context)];
        this.executePostResolutionInterceptor(token2, result, "All");
        return result;
      }
      isRegistered(token2, recursive = false) {
        this.ensureNotDisposed();
        return this._registry.has(token2) || recursive && (this.parent || false) && this.parent.isRegistered(token2, true);
      }
      reset() {
        this.ensureNotDisposed();
        this._registry.clear();
        this.interceptors.preResolution.clear();
        this.interceptors.postResolution.clear();
      }
      clearInstances() {
        this.ensureNotDisposed();
        for (const [token2, registrations] of this._registry.entries()) {
          this._registry.setAll(token2, registrations.filter((registration) => !providers_1.isValueProvider(registration.provider)).map((registration) => {
            registration.instance = void 0;
            return registration;
          }));
        }
      }
      createChildContainer() {
        this.ensureNotDisposed();
        const childContainer = new _InternalDependencyContainer(this);
        for (const [token2, registrations] of this._registry.entries()) {
          if (registrations.some(({ options }) => options.lifecycle === lifecycle_1.default.ContainerScoped)) {
            childContainer._registry.setAll(token2, registrations.map((registration) => {
              if (registration.options.lifecycle === lifecycle_1.default.ContainerScoped) {
                return {
                  provider: registration.provider,
                  options: registration.options
                };
              }
              return registration;
            }));
          }
        }
        return childContainer;
      }
      beforeResolution(token2, callback, options = { frequency: "Always" }) {
        this.interceptors.preResolution.set(token2, {
          callback,
          options
        });
      }
      afterResolution(token2, callback, options = { frequency: "Always" }) {
        this.interceptors.postResolution.set(token2, {
          callback,
          options
        });
      }
      dispose() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
          this.disposed = true;
          const promises = [];
          this.disposables.forEach((disposable) => {
            const maybePromise = disposable.dispose();
            if (maybePromise) {
              promises.push(maybePromise);
            }
          });
          yield Promise.all(promises);
        });
      }
      getRegistration(token2) {
        if (this.isRegistered(token2)) {
          return this._registry.get(token2);
        }
        if (this.parent) {
          return this.parent.getRegistration(token2);
        }
        return null;
      }
      getAllRegistrations(token2) {
        if (this.isRegistered(token2)) {
          return this._registry.getAll(token2);
        }
        if (this.parent) {
          return this.parent.getAllRegistrations(token2);
        }
        return null;
      }
      construct(ctor, context) {
        if (ctor instanceof lazy_helpers_1.DelayedConstructor) {
          return ctor.createProxy((target) => this.resolve(target, context));
        }
        const instance = (() => {
          const paramInfo = exports.typeInfo.get(ctor);
          if (!paramInfo || paramInfo.length === 0) {
            if (ctor.length === 0) {
              return new ctor();
            } else {
              throw new Error(`TypeInfo not known for "${ctor.name}"`);
            }
          }
          const params = paramInfo.map(this.resolveParams(context, ctor));
          return new ctor(...params);
        })();
        if (disposable_1.isDisposable(instance)) {
          this.disposables.add(instance);
        }
        return instance;
      }
      resolveParams(context, ctor) {
        return (param, idx) => {
          try {
            if (injection_token_1.isTokenDescriptor(param)) {
              if (injection_token_1.isTransformDescriptor(param)) {
                return param.multiple ? this.resolve(param.transform).transform(this.resolveAll(param.token, new resolution_context_1.default(), param.isOptional), ...param.transformArgs) : this.resolve(param.transform).transform(this.resolve(param.token, context, param.isOptional), ...param.transformArgs);
              } else {
                return param.multiple ? this.resolveAll(param.token, new resolution_context_1.default(), param.isOptional) : this.resolve(param.token, context, param.isOptional);
              }
            } else if (injection_token_1.isTransformDescriptor(param)) {
              return this.resolve(param.transform, context).transform(this.resolve(param.token, context), ...param.transformArgs);
            }
            return this.resolve(param, context);
          } catch (e) {
            throw new Error(error_helpers_1.formatErrorCtor(ctor, idx, e));
          }
        };
      }
      ensureNotDisposed() {
        if (this.disposed) {
          throw new Error("This container has been disposed, you cannot interact with a disposed container");
        }
      }
    };
    exports.instance = new InternalDependencyContainer();
    exports.default = exports.instance;
  }
});

// node_modules/tsyringe/dist/cjs/decorators/auto-injectable.js
var require_auto_injectable = __commonJS({
  "node_modules/tsyringe/dist/cjs/decorators/auto-injectable.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var reflection_helpers_1 = require_reflection_helpers();
    var dependency_container_1 = require_dependency_container();
    var injection_token_1 = require_injection_token();
    var error_helpers_1 = require_error_helpers();
    function autoInjectable() {
      return function(target) {
        const paramInfo = reflection_helpers_1.getParamInfo(target);
        return class extends target {
          constructor(...args) {
            super(...args.concat(paramInfo.slice(args.length).map((type, index) => {
              try {
                if (injection_token_1.isTokenDescriptor(type)) {
                  if (injection_token_1.isTransformDescriptor(type)) {
                    return type.multiple ? dependency_container_1.instance.resolve(type.transform).transform(dependency_container_1.instance.resolveAll(type.token), ...type.transformArgs) : dependency_container_1.instance.resolve(type.transform).transform(dependency_container_1.instance.resolve(type.token), ...type.transformArgs);
                  } else {
                    return type.multiple ? dependency_container_1.instance.resolveAll(type.token) : dependency_container_1.instance.resolve(type.token);
                  }
                } else if (injection_token_1.isTransformDescriptor(type)) {
                  return dependency_container_1.instance.resolve(type.transform).transform(dependency_container_1.instance.resolve(type.token), ...type.transformArgs);
                }
                return dependency_container_1.instance.resolve(type);
              } catch (e) {
                const argIndex = index + args.length;
                throw new Error(error_helpers_1.formatErrorCtor(target, argIndex, e));
              }
            })));
          }
        };
      };
    }
    exports.default = autoInjectable;
  }
});

// node_modules/tsyringe/dist/cjs/decorators/inject.js
var require_inject = __commonJS({
  "node_modules/tsyringe/dist/cjs/decorators/inject.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var reflection_helpers_1 = require_reflection_helpers();
    function inject(token2, options) {
      const data = {
        token: token2,
        multiple: false,
        isOptional: options && options.isOptional
      };
      return reflection_helpers_1.defineInjectionTokenMetadata(data);
    }
    exports.default = inject;
  }
});

// node_modules/tsyringe/dist/cjs/decorators/injectable.js
var require_injectable = __commonJS({
  "node_modules/tsyringe/dist/cjs/decorators/injectable.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var reflection_helpers_1 = require_reflection_helpers();
    var dependency_container_1 = require_dependency_container();
    var dependency_container_2 = require_dependency_container();
    function injectable(options) {
      return function(target) {
        dependency_container_1.typeInfo.set(target, reflection_helpers_1.getParamInfo(target));
        if (options && options.token) {
          if (!Array.isArray(options.token)) {
            dependency_container_2.instance.register(options.token, target);
          } else {
            options.token.forEach((token2) => {
              dependency_container_2.instance.register(token2, target);
            });
          }
        }
      };
    }
    exports.default = injectable;
  }
});

// node_modules/tsyringe/dist/cjs/decorators/registry.js
var require_registry3 = __commonJS({
  "node_modules/tsyringe/dist/cjs/decorators/registry.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es62(), __toCommonJS(tslib_es6_exports2));
    var dependency_container_1 = require_dependency_container();
    function registry(registrations = []) {
      return function(target) {
        registrations.forEach((_a) => {
          var { token: token2, options } = _a, provider = tslib_1.__rest(_a, ["token", "options"]);
          return dependency_container_1.instance.register(token2, provider, options);
        });
        return target;
      };
    }
    exports.default = registry;
  }
});

// node_modules/tsyringe/dist/cjs/decorators/singleton.js
var require_singleton = __commonJS({
  "node_modules/tsyringe/dist/cjs/decorators/singleton.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var injectable_1 = require_injectable();
    var dependency_container_1 = require_dependency_container();
    function singleton() {
      return function(target) {
        injectable_1.default()(target);
        dependency_container_1.instance.registerSingleton(target);
      };
    }
    exports.default = singleton;
  }
});

// node_modules/tsyringe/dist/cjs/decorators/inject-all.js
var require_inject_all = __commonJS({
  "node_modules/tsyringe/dist/cjs/decorators/inject-all.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var reflection_helpers_1 = require_reflection_helpers();
    function injectAll(token2, options) {
      const data = {
        token: token2,
        multiple: true,
        isOptional: options && options.isOptional
      };
      return reflection_helpers_1.defineInjectionTokenMetadata(data);
    }
    exports.default = injectAll;
  }
});

// node_modules/tsyringe/dist/cjs/decorators/inject-all-with-transform.js
var require_inject_all_with_transform = __commonJS({
  "node_modules/tsyringe/dist/cjs/decorators/inject-all-with-transform.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var reflection_helpers_1 = require_reflection_helpers();
    function injectAllWithTransform(token2, transformer, ...args) {
      const data = {
        token: token2,
        multiple: true,
        transform: transformer,
        transformArgs: args
      };
      return reflection_helpers_1.defineInjectionTokenMetadata(data);
    }
    exports.default = injectAllWithTransform;
  }
});

// node_modules/tsyringe/dist/cjs/decorators/inject-with-transform.js
var require_inject_with_transform = __commonJS({
  "node_modules/tsyringe/dist/cjs/decorators/inject-with-transform.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var reflection_helpers_1 = require_reflection_helpers();
    function injectWithTransform(token2, transformer, ...args) {
      return reflection_helpers_1.defineInjectionTokenMetadata(token2, {
        transformToken: transformer,
        args
      });
    }
    exports.default = injectWithTransform;
  }
});

// node_modules/tsyringe/dist/cjs/decorators/scoped.js
var require_scoped = __commonJS({
  "node_modules/tsyringe/dist/cjs/decorators/scoped.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var injectable_1 = require_injectable();
    var dependency_container_1 = require_dependency_container();
    function scoped(lifecycle, token2) {
      return function(target) {
        injectable_1.default()(target);
        dependency_container_1.instance.register(token2 || target, target, {
          lifecycle
        });
      };
    }
    exports.default = scoped;
  }
});

// node_modules/tsyringe/dist/cjs/decorators/index.js
var require_decorators2 = __commonJS({
  "node_modules/tsyringe/dist/cjs/decorators/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var auto_injectable_1 = require_auto_injectable();
    Object.defineProperty(exports, "autoInjectable", { enumerable: true, get: function() {
      return auto_injectable_1.default;
    } });
    var inject_1 = require_inject();
    Object.defineProperty(exports, "inject", { enumerable: true, get: function() {
      return inject_1.default;
    } });
    var injectable_1 = require_injectable();
    Object.defineProperty(exports, "injectable", { enumerable: true, get: function() {
      return injectable_1.default;
    } });
    var registry_1 = require_registry3();
    Object.defineProperty(exports, "registry", { enumerable: true, get: function() {
      return registry_1.default;
    } });
    var singleton_1 = require_singleton();
    Object.defineProperty(exports, "singleton", { enumerable: true, get: function() {
      return singleton_1.default;
    } });
    var inject_all_1 = require_inject_all();
    Object.defineProperty(exports, "injectAll", { enumerable: true, get: function() {
      return inject_all_1.default;
    } });
    var inject_all_with_transform_1 = require_inject_all_with_transform();
    Object.defineProperty(exports, "injectAllWithTransform", { enumerable: true, get: function() {
      return inject_all_with_transform_1.default;
    } });
    var inject_with_transform_1 = require_inject_with_transform();
    Object.defineProperty(exports, "injectWithTransform", { enumerable: true, get: function() {
      return inject_with_transform_1.default;
    } });
    var scoped_1 = require_scoped();
    Object.defineProperty(exports, "scoped", { enumerable: true, get: function() {
      return scoped_1.default;
    } });
  }
});

// node_modules/tsyringe/dist/cjs/factories/instance-caching-factory.js
var require_instance_caching_factory = __commonJS({
  "node_modules/tsyringe/dist/cjs/factories/instance-caching-factory.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function instanceCachingFactory(factoryFunc) {
      let instance;
      return (dependencyContainer) => {
        if (instance == void 0) {
          instance = factoryFunc(dependencyContainer);
        }
        return instance;
      };
    }
    exports.default = instanceCachingFactory;
  }
});

// node_modules/tsyringe/dist/cjs/factories/instance-per-container-caching-factory.js
var require_instance_per_container_caching_factory = __commonJS({
  "node_modules/tsyringe/dist/cjs/factories/instance-per-container-caching-factory.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function instancePerContainerCachingFactory(factoryFunc) {
      const cache = /* @__PURE__ */ new WeakMap();
      return (dependencyContainer) => {
        let instance = cache.get(dependencyContainer);
        if (instance == void 0) {
          instance = factoryFunc(dependencyContainer);
          cache.set(dependencyContainer, instance);
        }
        return instance;
      };
    }
    exports.default = instancePerContainerCachingFactory;
  }
});

// node_modules/tsyringe/dist/cjs/factories/predicate-aware-class-factory.js
var require_predicate_aware_class_factory = __commonJS({
  "node_modules/tsyringe/dist/cjs/factories/predicate-aware-class-factory.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function predicateAwareClassFactory(predicate, trueConstructor, falseConstructor, useCaching = true) {
      let instance;
      let previousPredicate;
      return (dependencyContainer) => {
        const currentPredicate = predicate(dependencyContainer);
        if (!useCaching || previousPredicate !== currentPredicate) {
          if (previousPredicate = currentPredicate) {
            instance = dependencyContainer.resolve(trueConstructor);
          } else {
            instance = dependencyContainer.resolve(falseConstructor);
          }
        }
        return instance;
      };
    }
    exports.default = predicateAwareClassFactory;
  }
});

// node_modules/tsyringe/dist/cjs/factories/index.js
var require_factories = __commonJS({
  "node_modules/tsyringe/dist/cjs/factories/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var instance_caching_factory_1 = require_instance_caching_factory();
    Object.defineProperty(exports, "instanceCachingFactory", { enumerable: true, get: function() {
      return instance_caching_factory_1.default;
    } });
    var instance_per_container_caching_factory_1 = require_instance_per_container_caching_factory();
    Object.defineProperty(exports, "instancePerContainerCachingFactory", { enumerable: true, get: function() {
      return instance_per_container_caching_factory_1.default;
    } });
    var predicate_aware_class_factory_1 = require_predicate_aware_class_factory();
    Object.defineProperty(exports, "predicateAwareClassFactory", { enumerable: true, get: function() {
      return predicate_aware_class_factory_1.default;
    } });
  }
});

// node_modules/tsyringe/dist/cjs/index.js
var require_cjs8 = __commonJS({
  "node_modules/tsyringe/dist/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es62(), __toCommonJS(tslib_es6_exports2));
    if (typeof Reflect === "undefined" || !Reflect.getMetadata) {
      throw new Error(`tsyringe requires a reflect polyfill. Please add 'import "reflect-metadata"' to the top of your entry point.`);
    }
    var types_1 = require_types4();
    Object.defineProperty(exports, "Lifecycle", { enumerable: true, get: function() {
      return types_1.Lifecycle;
    } });
    tslib_1.__exportStar(require_decorators2(), exports);
    tslib_1.__exportStar(require_factories(), exports);
    tslib_1.__exportStar(require_providers(), exports);
    var lazy_helpers_1 = require_lazy_helpers();
    Object.defineProperty(exports, "delay", { enumerable: true, get: function() {
      return lazy_helpers_1.delay;
    } });
    var dependency_container_1 = require_dependency_container();
    Object.defineProperty(exports, "container", { enumerable: true, get: function() {
      return dependency_container_1.instance;
    } });
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/attribute.js
var require_attribute3 = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/attribute.js"(exports) {
    "use strict";
    var PKCS12AttrSet_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PKCS12AttrSet = exports.PKCS12Attribute = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var PKCS12Attribute = class {
      attrId = "";
      attrValues = [];
      constructor(params = {}) {
        Object.assign(params);
      }
    };
    exports.PKCS12Attribute = PKCS12Attribute;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], PKCS12Attribute.prototype, "attrId", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        repeated: "set"
      })
    ], PKCS12Attribute.prototype, "attrValues", void 0);
    var PKCS12AttrSet = PKCS12AttrSet_1 = class PKCS12AttrSet extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, PKCS12AttrSet_1.prototype);
      }
    };
    exports.PKCS12AttrSet = PKCS12AttrSet;
    exports.PKCS12AttrSet = PKCS12AttrSet = PKCS12AttrSet_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: PKCS12Attribute
      })
    ], PKCS12AttrSet);
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/authenticated_safe.js
var require_authenticated_safe = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/authenticated_safe.js"(exports) {
    "use strict";
    var AuthenticatedSafe_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AuthenticatedSafe = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_cms_1 = require_cjs5();
    var AuthenticatedSafe = AuthenticatedSafe_1 = class AuthenticatedSafe extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, AuthenticatedSafe_1.prototype);
      }
    };
    exports.AuthenticatedSafe = AuthenticatedSafe;
    exports.AuthenticatedSafe = AuthenticatedSafe = AuthenticatedSafe_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: asn1_cms_1.ContentInfo
      })
    ], AuthenticatedSafe);
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/object_identifiers.js
var require_object_identifiers6 = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/object_identifiers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.id_bagtypes = exports.id_pbewithSHAAnd40BitRC2_CBC = exports.id_pbeWithSHAAnd128BitRC2_CBC = exports.id_pbeWithSHAAnd2_KeyTripleDES_CBC = exports.id_pbeWithSHAAnd3_KeyTripleDES_CBC = exports.id_pbeWithSHAAnd40BitRC4 = exports.id_pbeWithSHAAnd128BitRC4 = exports.id_pkcs_12PbeIds = exports.id_pkcs_12 = exports.id_pkcs = exports.id_rsadsi = void 0;
    exports.id_rsadsi = "1.2.840.113549";
    exports.id_pkcs = `${exports.id_rsadsi}.1`;
    exports.id_pkcs_12 = `${exports.id_pkcs}.12`;
    exports.id_pkcs_12PbeIds = `${exports.id_pkcs_12}.1`;
    exports.id_pbeWithSHAAnd128BitRC4 = `${exports.id_pkcs_12PbeIds}.1`;
    exports.id_pbeWithSHAAnd40BitRC4 = `${exports.id_pkcs_12PbeIds}.2`;
    exports.id_pbeWithSHAAnd3_KeyTripleDES_CBC = `${exports.id_pkcs_12PbeIds}.3`;
    exports.id_pbeWithSHAAnd2_KeyTripleDES_CBC = `${exports.id_pkcs_12PbeIds}.4`;
    exports.id_pbeWithSHAAnd128BitRC2_CBC = `${exports.id_pkcs_12PbeIds}.5`;
    exports.id_pbewithSHAAnd40BitRC2_CBC = `${exports.id_pkcs_12PbeIds}.6`;
    exports.id_bagtypes = `${exports.id_pkcs_12}.10.1`;
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/bags/types.js
var require_types5 = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/bags/types.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.id_pkcs_9 = exports.id_SafeContents = exports.id_SecretBag = exports.id_CRLBag = exports.id_certBag = exports.id_pkcs8ShroudedKeyBag = exports.id_keyBag = void 0;
    var object_identifiers_1 = require_object_identifiers6();
    exports.id_keyBag = `${object_identifiers_1.id_bagtypes}.1`;
    exports.id_pkcs8ShroudedKeyBag = `${object_identifiers_1.id_bagtypes}.2`;
    exports.id_certBag = `${object_identifiers_1.id_bagtypes}.3`;
    exports.id_CRLBag = `${object_identifiers_1.id_bagtypes}.4`;
    exports.id_SecretBag = `${object_identifiers_1.id_bagtypes}.5`;
    exports.id_SafeContents = `${object_identifiers_1.id_bagtypes}.6`;
    exports.id_pkcs_9 = "1.2.840.113549.1.9";
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/bags/cert_bag.js
var require_cert_bag = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/bags/cert_bag.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.id_sdsiCertificate = exports.id_x509Certificate = exports.id_certTypes = exports.CertBag = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var types_1 = require_types5();
    var CertBag = class {
      certId = "";
      certValue = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.CertBag = CertBag;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], CertBag.prototype, "certId", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        context: 0
      })
    ], CertBag.prototype, "certValue", void 0);
    exports.id_certTypes = `${types_1.id_pkcs_9}.22`;
    exports.id_x509Certificate = `${exports.id_certTypes}.1`;
    exports.id_sdsiCertificate = `${exports.id_certTypes}.2`;
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/bags/crl_bag.js
var require_crl_bag = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/bags/crl_bag.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.id_x509CRL = exports.id_crlTypes = exports.CRLBag = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var types_1 = require_types5();
    var CRLBag = class {
      crlId = "";
      crltValue = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.CRLBag = CRLBag;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], CRLBag.prototype, "crlId", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        context: 0
      })
    ], CRLBag.prototype, "crltValue", void 0);
    exports.id_crlTypes = `${types_1.id_pkcs_9}.23`;
    exports.id_x509CRL = `${exports.id_crlTypes}.1`;
  }
});

// node_modules/@peculiar/asn1-pkcs8/build/cjs/encrypted_private_key_info.js
var require_encrypted_private_key_info = __commonJS({
  "node_modules/@peculiar/asn1-pkcs8/build/cjs/encrypted_private_key_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EncryptedPrivateKeyInfo = exports.EncryptedData = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var EncryptedData = class extends asn1_schema_1.OctetString {
    };
    exports.EncryptedData = EncryptedData;
    var EncryptedPrivateKeyInfo = class {
      encryptionAlgorithm = new asn1_x509_1.AlgorithmIdentifier();
      encryptedData = new EncryptedData();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.EncryptedPrivateKeyInfo = EncryptedPrivateKeyInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.AlgorithmIdentifier })
    ], EncryptedPrivateKeyInfo.prototype, "encryptionAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: EncryptedData })
    ], EncryptedPrivateKeyInfo.prototype, "encryptedData", void 0);
  }
});

// node_modules/@peculiar/asn1-pkcs8/build/cjs/private_key_info.js
var require_private_key_info = __commonJS({
  "node_modules/@peculiar/asn1-pkcs8/build/cjs/private_key_info.js"(exports) {
    "use strict";
    var Attributes_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PrivateKeyInfo = exports.Attributes = exports.PrivateKey = exports.Version = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var Version;
    (function(Version2) {
      Version2[Version2["v1"] = 0] = "v1";
    })(Version || (exports.Version = Version = {}));
    var PrivateKey = class extends asn1_schema_1.OctetString {
    };
    exports.PrivateKey = PrivateKey;
    var Attributes = Attributes_1 = class Attributes extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, Attributes_1.prototype);
      }
    };
    exports.Attributes = Attributes;
    exports.Attributes = Attributes = Attributes_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: asn1_x509_1.Attribute
      })
    ], Attributes);
    var PrivateKeyInfo = class {
      version = Version.v1;
      privateKeyAlgorithm = new asn1_x509_1.AlgorithmIdentifier();
      privateKey = new PrivateKey();
      attributes;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.PrivateKeyInfo = PrivateKeyInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], PrivateKeyInfo.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.AlgorithmIdentifier })
    ], PrivateKeyInfo.prototype, "privateKeyAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: PrivateKey })
    ], PrivateKeyInfo.prototype, "privateKey", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: Attributes,
        implicit: true,
        context: 0,
        optional: true
      })
    ], PrivateKeyInfo.prototype, "attributes", void 0);
  }
});

// node_modules/@peculiar/asn1-pkcs8/build/cjs/index.js
var require_cjs9 = __commonJS({
  "node_modules/@peculiar/asn1-pkcs8/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_encrypted_private_key_info(), exports);
    tslib_1.__exportStar(require_private_key_info(), exports);
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/bags/key_bag.js
var require_key_bag = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/bags/key_bag.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.KeyBag = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_pkcs8_1 = require_cjs9();
    var asn1_schema_1 = require_cjs2();
    var KeyBag = class KeyBag extends asn1_pkcs8_1.PrivateKeyInfo {
    };
    exports.KeyBag = KeyBag;
    exports.KeyBag = KeyBag = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], KeyBag);
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/bags/pkcs8_shrouded_key_bag.js
var require_pkcs8_shrouded_key_bag = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/bags/pkcs8_shrouded_key_bag.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PKCS8ShroudedKeyBag = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_pkcs8_1 = require_cjs9();
    var asn1_schema_1 = require_cjs2();
    var PKCS8ShroudedKeyBag = class PKCS8ShroudedKeyBag extends asn1_pkcs8_1.EncryptedPrivateKeyInfo {
    };
    exports.PKCS8ShroudedKeyBag = PKCS8ShroudedKeyBag;
    exports.PKCS8ShroudedKeyBag = PKCS8ShroudedKeyBag = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], PKCS8ShroudedKeyBag);
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/bags/secret_bag.js
var require_secret_bag = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/bags/secret_bag.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SecretBag = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var SecretBag = class {
      secretTypeId = "";
      secretValue = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.SecretBag = SecretBag;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], SecretBag.prototype, "secretTypeId", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        context: 0
      })
    ], SecretBag.prototype, "secretValue", void 0);
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/bags/index.js
var require_bags = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/bags/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_cert_bag(), exports);
    tslib_1.__exportStar(require_crl_bag(), exports);
    tslib_1.__exportStar(require_key_bag(), exports);
    tslib_1.__exportStar(require_pkcs8_shrouded_key_bag(), exports);
    tslib_1.__exportStar(require_secret_bag(), exports);
    tslib_1.__exportStar(require_types5(), exports);
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/mac_data.js
var require_mac_data = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/mac_data.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MacData = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_rsa_1 = require_cjs7();
    var asn1_schema_1 = require_cjs2();
    var MacData = class {
      mac = new asn1_rsa_1.DigestInfo();
      macSalt = new asn1_schema_1.OctetString();
      iterations = 1;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.MacData = MacData;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_rsa_1.DigestInfo })
    ], MacData.prototype, "mac", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.OctetString })
    ], MacData.prototype, "macSalt", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Integer,
        defaultValue: 1
      })
    ], MacData.prototype, "iterations", void 0);
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/pfx.js
var require_pfx = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/pfx.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PFX = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_cms_1 = require_cjs5();
    var mac_data_1 = require_mac_data();
    var PFX = class {
      version = 3;
      authSafe = new asn1_cms_1.ContentInfo();
      macData = new mac_data_1.MacData();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.PFX = PFX;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], PFX.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_cms_1.ContentInfo })
    ], PFX.prototype, "authSafe", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: mac_data_1.MacData,
        optional: true
      })
    ], PFX.prototype, "macData", void 0);
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/safe_bag.js
var require_safe_bag = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/safe_bag.js"(exports) {
    "use strict";
    var SafeContents_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SafeContents = exports.SafeBag = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var attribute_1 = require_attribute3();
    var SafeBag = class {
      bagId = "";
      bagValue = new ArrayBuffer(0);
      bagAttributes;
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.SafeBag = SafeBag;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], SafeBag.prototype, "bagId", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: asn1_schema_1.AsnPropTypes.Any,
        context: 0
      })
    ], SafeBag.prototype, "bagValue", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: attribute_1.PKCS12Attribute,
        repeated: "set",
        optional: true
      })
    ], SafeBag.prototype, "bagAttributes", void 0);
    var SafeContents = SafeContents_1 = class SafeContents extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, SafeContents_1.prototype);
      }
    };
    exports.SafeContents = SafeContents;
    exports.SafeContents = SafeContents = SafeContents_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: SafeBag
      })
    ], SafeContents);
  }
});

// node_modules/@peculiar/asn1-pfx/build/cjs/index.js
var require_cjs10 = __commonJS({
  "node_modules/@peculiar/asn1-pfx/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_attribute3(), exports);
    tslib_1.__exportStar(require_authenticated_safe(), exports);
    tslib_1.__exportStar(require_bags(), exports);
    tslib_1.__exportStar(require_mac_data(), exports);
    tslib_1.__exportStar(require_object_identifiers6(), exports);
    tslib_1.__exportStar(require_pfx(), exports);
    tslib_1.__exportStar(require_safe_bag(), exports);
  }
});

// node_modules/@peculiar/asn1-pkcs9/build/cjs/index.js
var require_cjs11 = __commonJS({
  "node_modules/@peculiar/asn1-pkcs9/build/cjs/index.js"(exports) {
    "use strict";
    var ExtensionRequest_1;
    var ExtendedCertificateAttributes_1;
    var SMIMECapabilities_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DateOfBirth = exports.UnstructuredAddress = exports.UnstructuredName = exports.EmailAddress = exports.EncryptedPrivateKeyInfo = exports.UserPKCS12 = exports.Pkcs7PDU = exports.PKCS9String = exports.id_at_pseudonym = exports.crlTypes = exports.id_certTypes = exports.id_smime = exports.id_pkcs9_mr_signingTimeMatch = exports.id_pkcs9_mr_caseIgnoreMatch = exports.id_pkcs9_sx_signingTime = exports.id_pkcs9_sx_pkcs9String = exports.id_pkcs9_at_countryOfResidence = exports.id_pkcs9_at_countryOfCitizenship = exports.id_pkcs9_at_gender = exports.id_pkcs9_at_placeOfBirth = exports.id_pkcs9_at_dateOfBirth = exports.id_ietf_at = exports.id_pkcs9_at_pkcs7PDU = exports.id_pkcs9_at_sequenceNumber = exports.id_pkcs9_at_randomNonce = exports.id_pkcs9_at_encryptedPrivateKeyInfo = exports.id_pkcs9_at_pkcs15Token = exports.id_pkcs9_at_userPKCS12 = exports.id_pkcs9_at_localKeyId = exports.id_pkcs9_at_friendlyName = exports.id_pkcs9_at_smimeCapabilities = exports.id_pkcs9_at_extensionRequest = exports.id_pkcs9_at_signingDescription = exports.id_pkcs9_at_extendedCertificateAttributes = exports.id_pkcs9_at_unstructuredAddress = exports.id_pkcs9_at_challengePassword = exports.id_pkcs9_at_counterSignature = exports.id_pkcs9_at_signingTime = exports.id_pkcs9_at_messageDigest = exports.id_pkcs9_at_contentType = exports.id_pkcs9_at_unstructuredName = exports.id_pkcs9_at_emailAddress = exports.id_pkcs9_oc_naturalPerson = exports.id_pkcs9_oc_pkcsEntity = exports.id_pkcs9_mr = exports.id_pkcs9_sx = exports.id_pkcs9_at = exports.id_pkcs9_oc = exports.id_pkcs9_mo = exports.id_pkcs9 = void 0;
    exports.SMIMECapabilities = exports.SMIMECapability = exports.SigningDescription = exports.LocalKeyId = exports.FriendlyName = exports.ExtendedCertificateAttributes = exports.ExtensionRequest = exports.ChallengePassword = exports.CounterSignature = exports.SequenceNumber = exports.RandomNonce = exports.SigningTime = exports.MessageDigest = exports.ContentType = exports.Pseudonym = exports.CountryOfResidence = exports.CountryOfCitizenship = exports.Gender = exports.PlaceOfBirth = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var cms = tslib_1.__importStar(require_cjs5());
    var pfx = tslib_1.__importStar(require_cjs10());
    var pkcs8 = tslib_1.__importStar(require_cjs9());
    var x509 = tslib_1.__importStar(require_cjs3());
    var attr = tslib_1.__importStar(require_cjs4());
    exports.id_pkcs9 = "1.2.840.113549.1.9";
    exports.id_pkcs9_mo = `${exports.id_pkcs9}.0`;
    exports.id_pkcs9_oc = `${exports.id_pkcs9}.24`;
    exports.id_pkcs9_at = `${exports.id_pkcs9}.25`;
    exports.id_pkcs9_sx = `${exports.id_pkcs9}.26`;
    exports.id_pkcs9_mr = `${exports.id_pkcs9}.27`;
    exports.id_pkcs9_oc_pkcsEntity = `${exports.id_pkcs9_oc}.1`;
    exports.id_pkcs9_oc_naturalPerson = `${exports.id_pkcs9_oc}.2`;
    exports.id_pkcs9_at_emailAddress = `${exports.id_pkcs9}.1`;
    exports.id_pkcs9_at_unstructuredName = `${exports.id_pkcs9}.2`;
    exports.id_pkcs9_at_contentType = `${exports.id_pkcs9}.3`;
    exports.id_pkcs9_at_messageDigest = `${exports.id_pkcs9}.4`;
    exports.id_pkcs9_at_signingTime = `${exports.id_pkcs9}.5`;
    exports.id_pkcs9_at_counterSignature = `${exports.id_pkcs9}.6`;
    exports.id_pkcs9_at_challengePassword = `${exports.id_pkcs9}.7`;
    exports.id_pkcs9_at_unstructuredAddress = `${exports.id_pkcs9}.8`;
    exports.id_pkcs9_at_extendedCertificateAttributes = `${exports.id_pkcs9}.9`;
    exports.id_pkcs9_at_signingDescription = `${exports.id_pkcs9}.13`;
    exports.id_pkcs9_at_extensionRequest = `${exports.id_pkcs9}.14`;
    exports.id_pkcs9_at_smimeCapabilities = `${exports.id_pkcs9}.15`;
    exports.id_pkcs9_at_friendlyName = `${exports.id_pkcs9}.20`;
    exports.id_pkcs9_at_localKeyId = `${exports.id_pkcs9}.21`;
    exports.id_pkcs9_at_userPKCS12 = "2.16.840.1.113730.3.1.216";
    exports.id_pkcs9_at_pkcs15Token = `${exports.id_pkcs9_at}.1`;
    exports.id_pkcs9_at_encryptedPrivateKeyInfo = `${exports.id_pkcs9_at}.2`;
    exports.id_pkcs9_at_randomNonce = `${exports.id_pkcs9_at}.3`;
    exports.id_pkcs9_at_sequenceNumber = `${exports.id_pkcs9_at}.4`;
    exports.id_pkcs9_at_pkcs7PDU = `${exports.id_pkcs9_at}.5`;
    exports.id_ietf_at = "1.3.6.1.5.5.7.9";
    exports.id_pkcs9_at_dateOfBirth = `${exports.id_ietf_at}.1`;
    exports.id_pkcs9_at_placeOfBirth = `${exports.id_ietf_at}.2`;
    exports.id_pkcs9_at_gender = `${exports.id_ietf_at}.3`;
    exports.id_pkcs9_at_countryOfCitizenship = `${exports.id_ietf_at}.4`;
    exports.id_pkcs9_at_countryOfResidence = `${exports.id_ietf_at}.5`;
    exports.id_pkcs9_sx_pkcs9String = `${exports.id_pkcs9_sx}.1`;
    exports.id_pkcs9_sx_signingTime = `${exports.id_pkcs9_sx}.2`;
    exports.id_pkcs9_mr_caseIgnoreMatch = `${exports.id_pkcs9_mr}.1`;
    exports.id_pkcs9_mr_signingTimeMatch = `${exports.id_pkcs9_mr}.2`;
    exports.id_smime = `${exports.id_pkcs9}.16`;
    exports.id_certTypes = `${exports.id_pkcs9}.22`;
    exports.crlTypes = `${exports.id_pkcs9}.23`;
    exports.id_at_pseudonym = `${attr.id_at}.65`;
    var PKCS9String = class PKCS9String extends x509.DirectoryString {
      ia5String;
      constructor(params = {}) {
        super(params);
      }
      toString() {
        const o = {};
        o.toString();
        return this.ia5String || super.toString();
      }
    };
    exports.PKCS9String = PKCS9String;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.IA5String })
    ], PKCS9String.prototype, "ia5String", void 0);
    exports.PKCS9String = PKCS9String = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], PKCS9String);
    var Pkcs7PDU = class Pkcs7PDU extends cms.ContentInfo {
    };
    exports.Pkcs7PDU = Pkcs7PDU;
    exports.Pkcs7PDU = Pkcs7PDU = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], Pkcs7PDU);
    var UserPKCS12 = class UserPKCS12 extends pfx.PFX {
    };
    exports.UserPKCS12 = UserPKCS12;
    exports.UserPKCS12 = UserPKCS12 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], UserPKCS12);
    var EncryptedPrivateKeyInfo = class EncryptedPrivateKeyInfo extends pkcs8.EncryptedPrivateKeyInfo {
    };
    exports.EncryptedPrivateKeyInfo = EncryptedPrivateKeyInfo;
    exports.EncryptedPrivateKeyInfo = EncryptedPrivateKeyInfo = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], EncryptedPrivateKeyInfo);
    var EmailAddress = class EmailAddress {
      value;
      constructor(value = "") {
        this.value = value;
      }
      toString() {
        return this.value;
      }
    };
    exports.EmailAddress = EmailAddress;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.IA5String })
    ], EmailAddress.prototype, "value", void 0);
    exports.EmailAddress = EmailAddress = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], EmailAddress);
    var UnstructuredName = class UnstructuredName extends PKCS9String {
    };
    exports.UnstructuredName = UnstructuredName;
    exports.UnstructuredName = UnstructuredName = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], UnstructuredName);
    var UnstructuredAddress = class UnstructuredAddress extends x509.DirectoryString {
    };
    exports.UnstructuredAddress = UnstructuredAddress;
    exports.UnstructuredAddress = UnstructuredAddress = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], UnstructuredAddress);
    var DateOfBirth = class DateOfBirth {
      value;
      constructor(value = /* @__PURE__ */ new Date()) {
        this.value = value;
      }
    };
    exports.DateOfBirth = DateOfBirth;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.GeneralizedTime })
    ], DateOfBirth.prototype, "value", void 0);
    exports.DateOfBirth = DateOfBirth = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], DateOfBirth);
    var PlaceOfBirth = class PlaceOfBirth extends x509.DirectoryString {
    };
    exports.PlaceOfBirth = PlaceOfBirth;
    exports.PlaceOfBirth = PlaceOfBirth = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], PlaceOfBirth);
    var Gender = class Gender {
      value;
      constructor(value = "M") {
        this.value = value;
      }
      toString() {
        return this.value;
      }
    };
    exports.Gender = Gender;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.PrintableString })
    ], Gender.prototype, "value", void 0);
    exports.Gender = Gender = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], Gender);
    var CountryOfCitizenship = class CountryOfCitizenship {
      value;
      constructor(value = "") {
        this.value = value;
      }
      toString() {
        return this.value;
      }
    };
    exports.CountryOfCitizenship = CountryOfCitizenship;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.PrintableString })
    ], CountryOfCitizenship.prototype, "value", void 0);
    exports.CountryOfCitizenship = CountryOfCitizenship = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], CountryOfCitizenship);
    var CountryOfResidence = class CountryOfResidence extends CountryOfCitizenship {
    };
    exports.CountryOfResidence = CountryOfResidence;
    exports.CountryOfResidence = CountryOfResidence = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], CountryOfResidence);
    var Pseudonym = class Pseudonym extends x509.DirectoryString {
    };
    exports.Pseudonym = Pseudonym;
    exports.Pseudonym = Pseudonym = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], Pseudonym);
    var ContentType = class ContentType {
      value;
      constructor(value = "") {
        this.value = value;
      }
      toString() {
        return this.value;
      }
    };
    exports.ContentType = ContentType;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.ObjectIdentifier })
    ], ContentType.prototype, "value", void 0);
    exports.ContentType = ContentType = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], ContentType);
    var MessageDigest = class extends asn1_schema_1.OctetString {
    };
    exports.MessageDigest = MessageDigest;
    var SigningTime = class SigningTime extends x509.Time {
    };
    exports.SigningTime = SigningTime;
    exports.SigningTime = SigningTime = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], SigningTime);
    var RandomNonce = class extends asn1_schema_1.OctetString {
    };
    exports.RandomNonce = RandomNonce;
    var SequenceNumber = class SequenceNumber {
      value;
      constructor(value = 0) {
        this.value = value;
      }
      toString() {
        return this.value.toString();
      }
    };
    exports.SequenceNumber = SequenceNumber;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], SequenceNumber.prototype, "value", void 0);
    exports.SequenceNumber = SequenceNumber = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], SequenceNumber);
    var CounterSignature = class CounterSignature extends cms.SignerInfo {
    };
    exports.CounterSignature = CounterSignature;
    exports.CounterSignature = CounterSignature = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], CounterSignature);
    var ChallengePassword = class ChallengePassword extends x509.DirectoryString {
    };
    exports.ChallengePassword = ChallengePassword;
    exports.ChallengePassword = ChallengePassword = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], ChallengePassword);
    var ExtensionRequest = ExtensionRequest_1 = class ExtensionRequest extends x509.Extensions {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, ExtensionRequest_1.prototype);
      }
    };
    exports.ExtensionRequest = ExtensionRequest;
    exports.ExtensionRequest = ExtensionRequest = ExtensionRequest_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], ExtensionRequest);
    var ExtendedCertificateAttributes = ExtendedCertificateAttributes_1 = class ExtendedCertificateAttributes extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, ExtendedCertificateAttributes_1.prototype);
      }
    };
    exports.ExtendedCertificateAttributes = ExtendedCertificateAttributes;
    exports.ExtendedCertificateAttributes = ExtendedCertificateAttributes = ExtendedCertificateAttributes_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Set,
        itemType: cms.Attribute
      })
    ], ExtendedCertificateAttributes);
    var FriendlyName = class FriendlyName {
      value;
      constructor(value = "") {
        this.value = value;
      }
      toString() {
        return this.value;
      }
    };
    exports.FriendlyName = FriendlyName;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.BmpString })
    ], FriendlyName.prototype, "value", void 0);
    exports.FriendlyName = FriendlyName = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Choice })
    ], FriendlyName);
    var LocalKeyId = class extends asn1_schema_1.OctetString {
    };
    exports.LocalKeyId = LocalKeyId;
    var SigningDescription = class extends x509.DirectoryString {
    };
    exports.SigningDescription = SigningDescription;
    var SMIMECapability = class SMIMECapability extends x509.AlgorithmIdentifier {
    };
    exports.SMIMECapability = SMIMECapability;
    exports.SMIMECapability = SMIMECapability = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({ type: asn1_schema_1.AsnTypeTypes.Sequence })
    ], SMIMECapability);
    var SMIMECapabilities = SMIMECapabilities_1 = class SMIMECapabilities extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, SMIMECapabilities_1.prototype);
      }
    };
    exports.SMIMECapabilities = SMIMECapabilities;
    exports.SMIMECapabilities = SMIMECapabilities = SMIMECapabilities_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: SMIMECapability
      })
    ], SMIMECapabilities);
  }
});

// node_modules/@peculiar/asn1-csr/build/cjs/attributes.js
var require_attributes2 = __commonJS({
  "node_modules/@peculiar/asn1-csr/build/cjs/attributes.js"(exports) {
    "use strict";
    var Attributes_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Attributes = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var Attributes = Attributes_1 = class Attributes extends asn1_schema_1.AsnArray {
      constructor(items) {
        super(items);
        Object.setPrototypeOf(this, Attributes_1.prototype);
      }
    };
    exports.Attributes = Attributes;
    exports.Attributes = Attributes = Attributes_1 = tslib_1.__decorate([
      (0, asn1_schema_1.AsnType)({
        type: asn1_schema_1.AsnTypeTypes.Sequence,
        itemType: asn1_x509_1.Attribute
      })
    ], Attributes);
  }
});

// node_modules/@peculiar/asn1-csr/build/cjs/certification_request_info.js
var require_certification_request_info = __commonJS({
  "node_modules/@peculiar/asn1-csr/build/cjs/certification_request_info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CertificationRequestInfo = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var attributes_1 = require_attributes2();
    var CertificationRequestInfo = class {
      version = 0;
      subject = new asn1_x509_1.Name();
      subjectPKInfo = new asn1_x509_1.SubjectPublicKeyInfo();
      attributes = new attributes_1.Attributes();
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.CertificationRequestInfo = CertificationRequestInfo;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.Integer })
    ], CertificationRequestInfo.prototype, "version", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.Name })
    ], CertificationRequestInfo.prototype, "subject", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.SubjectPublicKeyInfo })
    ], CertificationRequestInfo.prototype, "subjectPKInfo", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: attributes_1.Attributes,
        implicit: true,
        context: 0,
        optional: true
      })
    ], CertificationRequestInfo.prototype, "attributes", void 0);
  }
});

// node_modules/@peculiar/asn1-csr/build/cjs/certification_request.js
var require_certification_request = __commonJS({
  "node_modules/@peculiar/asn1-csr/build/cjs/certification_request.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CertificationRequest = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1_schema_1 = require_cjs2();
    var asn1_x509_1 = require_cjs3();
    var certification_request_info_1 = require_certification_request_info();
    var CertificationRequest = class {
      certificationRequestInfo = new certification_request_info_1.CertificationRequestInfo();
      certificationRequestInfoRaw;
      signatureAlgorithm = new asn1_x509_1.AlgorithmIdentifier();
      signature = new ArrayBuffer(0);
      constructor(params = {}) {
        Object.assign(this, params);
      }
    };
    exports.CertificationRequest = CertificationRequest;
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({
        type: certification_request_info_1.CertificationRequestInfo,
        raw: true
      })
    ], CertificationRequest.prototype, "certificationRequestInfo", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_x509_1.AlgorithmIdentifier })
    ], CertificationRequest.prototype, "signatureAlgorithm", void 0);
    tslib_1.__decorate([
      (0, asn1_schema_1.AsnProp)({ type: asn1_schema_1.AsnPropTypes.BitString })
    ], CertificationRequest.prototype, "signature", void 0);
  }
});

// node_modules/@peculiar/asn1-csr/build/cjs/index.js
var require_cjs12 = __commonJS({
  "node_modules/@peculiar/asn1-csr/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_attributes2(), exports);
    tslib_1.__exportStar(require_certification_request(), exports);
    tslib_1.__exportStar(require_certification_request_info(), exports);
  }
});

// node_modules/@peculiar/x509/build/x509.cjs.js
var require_x509_cjs = __commonJS({
  "node_modules/@peculiar/x509/build/x509.cjs.js"(exports) {
    "use strict";
    require_Reflect();
    var asn1Schema = require_cjs2();
    var asn1X509 = require_cjs3();
    var pvtsutils = require_build();
    var tslib = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var asn1Cms = require_cjs5();
    var asn1Ecc = require_cjs6();
    var asn1Rsa = require_cjs7();
    var tsyringe = require_cjs8();
    var asnPkcs9 = require_cjs11();
    var asn1Csr = require_cjs12();
    function _interopNamespaceDefault(e) {
      var n = /* @__PURE__ */ Object.create(null);
      if (e) {
        Object.keys(e).forEach(function(k) {
          if (k !== "default") {
            var d = Object.getOwnPropertyDescriptor(e, k);
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: function() {
                return e[k];
              }
            });
          }
        });
      }
      n.default = e;
      return Object.freeze(n);
    }
    var asn1X509__namespace = /* @__PURE__ */ _interopNamespaceDefault(asn1X509);
    var asn1Cms__namespace = /* @__PURE__ */ _interopNamespaceDefault(asn1Cms);
    var asn1Ecc__namespace = /* @__PURE__ */ _interopNamespaceDefault(asn1Ecc);
    var asn1Rsa__namespace = /* @__PURE__ */ _interopNamespaceDefault(asn1Rsa);
    var asnPkcs9__namespace = /* @__PURE__ */ _interopNamespaceDefault(asnPkcs9);
    var diAlgorithm = "crypto.algorithm";
    var AlgorithmProvider = class {
      getAlgorithms() {
        return tsyringe.container.resolveAll(diAlgorithm);
      }
      toAsnAlgorithm(alg) {
        ({ ...alg });
        for (const algorithm of this.getAlgorithms()) {
          const res = algorithm.toAsnAlgorithm(alg);
          if (res) {
            return res;
          }
        }
        if (/^[0-9.]+$/.test(alg.name)) {
          const res = new asn1X509.AlgorithmIdentifier({ algorithm: alg.name });
          if ("parameters" in alg) {
            const unknown = alg;
            res.parameters = unknown.parameters;
          }
          return res;
        }
        throw new Error("Cannot convert WebCrypto algorithm to ASN.1 algorithm");
      }
      toWebAlgorithm(alg) {
        for (const algorithm of this.getAlgorithms()) {
          const res = algorithm.toWebAlgorithm(alg);
          if (res) {
            return res;
          }
        }
        const unknown = {
          name: alg.algorithm,
          parameters: alg.parameters
        };
        return unknown;
      }
    };
    var diAlgorithmProvider = "crypto.algorithmProvider";
    tsyringe.container.registerSingleton(diAlgorithmProvider, AlgorithmProvider);
    var EcAlgorithm_1;
    var idVersionOne = "1.3.36.3.3.2.8.1.1";
    var idBrainpoolP160r1 = `${idVersionOne}.1`;
    var idBrainpoolP160t1 = `${idVersionOne}.2`;
    var idBrainpoolP192r1 = `${idVersionOne}.3`;
    var idBrainpoolP192t1 = `${idVersionOne}.4`;
    var idBrainpoolP224r1 = `${idVersionOne}.5`;
    var idBrainpoolP224t1 = `${idVersionOne}.6`;
    var idBrainpoolP256r1 = `${idVersionOne}.7`;
    var idBrainpoolP256t1 = `${idVersionOne}.8`;
    var idBrainpoolP320r1 = `${idVersionOne}.9`;
    var idBrainpoolP320t1 = `${idVersionOne}.10`;
    var idBrainpoolP384r1 = `${idVersionOne}.11`;
    var idBrainpoolP384t1 = `${idVersionOne}.12`;
    var idBrainpoolP512r1 = `${idVersionOne}.13`;
    var idBrainpoolP512t1 = `${idVersionOne}.14`;
    var brainpoolP160r1 = "brainpoolP160r1";
    var brainpoolP160t1 = "brainpoolP160t1";
    var brainpoolP192r1 = "brainpoolP192r1";
    var brainpoolP192t1 = "brainpoolP192t1";
    var brainpoolP224r1 = "brainpoolP224r1";
    var brainpoolP224t1 = "brainpoolP224t1";
    var brainpoolP256r1 = "brainpoolP256r1";
    var brainpoolP256t1 = "brainpoolP256t1";
    var brainpoolP320r1 = "brainpoolP320r1";
    var brainpoolP320t1 = "brainpoolP320t1";
    var brainpoolP384r1 = "brainpoolP384r1";
    var brainpoolP384t1 = "brainpoolP384t1";
    var brainpoolP512r1 = "brainpoolP512r1";
    var brainpoolP512t1 = "brainpoolP512t1";
    var ECDSA = "ECDSA";
    exports.EcAlgorithm = EcAlgorithm_1 = class EcAlgorithm {
      toAsnAlgorithm(alg) {
        switch (alg.name.toLowerCase()) {
          case ECDSA.toLowerCase():
            if ("hash" in alg) {
              const hash = typeof alg.hash === "string" ? alg.hash : alg.hash.name;
              switch (hash.toLowerCase()) {
                case "sha-1":
                  return asn1Ecc__namespace.ecdsaWithSHA1;
                case "sha-256":
                  return asn1Ecc__namespace.ecdsaWithSHA256;
                case "sha-384":
                  return asn1Ecc__namespace.ecdsaWithSHA384;
                case "sha-512":
                  return asn1Ecc__namespace.ecdsaWithSHA512;
              }
            } else if ("namedCurve" in alg) {
              let parameters = "";
              switch (alg.namedCurve) {
                case "P-256":
                  parameters = asn1Ecc__namespace.id_secp256r1;
                  break;
                case "K-256":
                  parameters = EcAlgorithm_1.SECP256K1;
                  break;
                case "P-384":
                  parameters = asn1Ecc__namespace.id_secp384r1;
                  break;
                case "P-521":
                  parameters = asn1Ecc__namespace.id_secp521r1;
                  break;
                case brainpoolP160r1:
                  parameters = idBrainpoolP160r1;
                  break;
                case brainpoolP160t1:
                  parameters = idBrainpoolP160t1;
                  break;
                case brainpoolP192r1:
                  parameters = idBrainpoolP192r1;
                  break;
                case brainpoolP192t1:
                  parameters = idBrainpoolP192t1;
                  break;
                case brainpoolP224r1:
                  parameters = idBrainpoolP224r1;
                  break;
                case brainpoolP224t1:
                  parameters = idBrainpoolP224t1;
                  break;
                case brainpoolP256r1:
                  parameters = idBrainpoolP256r1;
                  break;
                case brainpoolP256t1:
                  parameters = idBrainpoolP256t1;
                  break;
                case brainpoolP320r1:
                  parameters = idBrainpoolP320r1;
                  break;
                case brainpoolP320t1:
                  parameters = idBrainpoolP320t1;
                  break;
                case brainpoolP384r1:
                  parameters = idBrainpoolP384r1;
                  break;
                case brainpoolP384t1:
                  parameters = idBrainpoolP384t1;
                  break;
                case brainpoolP512r1:
                  parameters = idBrainpoolP512r1;
                  break;
                case brainpoolP512t1:
                  parameters = idBrainpoolP512t1;
                  break;
              }
              if (parameters) {
                return new asn1X509.AlgorithmIdentifier({
                  algorithm: asn1Ecc__namespace.id_ecPublicKey,
                  parameters: asn1Schema.AsnConvert.serialize(new asn1Ecc__namespace.ECParameters({ namedCurve: parameters }))
                });
              }
            }
        }
        return null;
      }
      toWebAlgorithm(alg) {
        switch (alg.algorithm) {
          case asn1Ecc__namespace.id_ecdsaWithSHA1:
            return {
              name: ECDSA,
              hash: { name: "SHA-1" }
            };
          case asn1Ecc__namespace.id_ecdsaWithSHA256:
            return {
              name: ECDSA,
              hash: { name: "SHA-256" }
            };
          case asn1Ecc__namespace.id_ecdsaWithSHA384:
            return {
              name: ECDSA,
              hash: { name: "SHA-384" }
            };
          case asn1Ecc__namespace.id_ecdsaWithSHA512:
            return {
              name: ECDSA,
              hash: { name: "SHA-512" }
            };
          case asn1Ecc__namespace.id_ecPublicKey: {
            if (!alg.parameters) {
              throw new TypeError("Cannot get required parameters from EC algorithm");
            }
            const parameters = asn1Schema.AsnConvert.parse(alg.parameters, asn1Ecc__namespace.ECParameters);
            switch (parameters.namedCurve) {
              case asn1Ecc__namespace.id_secp256r1:
                return {
                  name: ECDSA,
                  namedCurve: "P-256"
                };
              case EcAlgorithm_1.SECP256K1:
                return {
                  name: ECDSA,
                  namedCurve: "K-256"
                };
              case asn1Ecc__namespace.id_secp384r1:
                return {
                  name: ECDSA,
                  namedCurve: "P-384"
                };
              case asn1Ecc__namespace.id_secp521r1:
                return {
                  name: ECDSA,
                  namedCurve: "P-521"
                };
              case idBrainpoolP160r1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP160r1
                };
              case idBrainpoolP160t1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP160t1
                };
              case idBrainpoolP192r1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP192r1
                };
              case idBrainpoolP192t1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP192t1
                };
              case idBrainpoolP224r1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP224r1
                };
              case idBrainpoolP224t1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP224t1
                };
              case idBrainpoolP256r1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP256r1
                };
              case idBrainpoolP256t1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP256t1
                };
              case idBrainpoolP320r1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP320r1
                };
              case idBrainpoolP320t1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP320t1
                };
              case idBrainpoolP384r1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP384r1
                };
              case idBrainpoolP384t1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP384t1
                };
              case idBrainpoolP512r1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP512r1
                };
              case idBrainpoolP512t1:
                return {
                  name: ECDSA,
                  namedCurve: brainpoolP512t1
                };
            }
          }
        }
        return null;
      }
    };
    exports.EcAlgorithm.SECP256K1 = "1.3.132.0.10";
    exports.EcAlgorithm = EcAlgorithm_1 = tslib.__decorate([
      tsyringe.injectable()
    ], exports.EcAlgorithm);
    tsyringe.container.registerSingleton(diAlgorithm, exports.EcAlgorithm);
    var NAME = /* @__PURE__ */ Symbol("name");
    var VALUE = /* @__PURE__ */ Symbol("value");
    var TextObject = class {
      constructor(name, items = {}, value = "") {
        this[NAME] = name;
        this[VALUE] = value;
        for (const key in items) {
          this[key] = items[key];
        }
      }
    };
    TextObject.NAME = NAME;
    TextObject.VALUE = VALUE;
    var DefaultAlgorithmSerializer = class {
      static toTextObject(alg) {
        const obj = new TextObject("Algorithm Identifier", {}, OidSerializer.toString(alg.algorithm));
        if (alg.parameters) {
          switch (alg.algorithm) {
            case asn1Ecc__namespace.id_ecPublicKey: {
              const ecAlg = new exports.EcAlgorithm().toWebAlgorithm(alg);
              if (ecAlg && "namedCurve" in ecAlg) {
                obj["Named Curve"] = ecAlg.namedCurve;
              } else {
                obj["Parameters"] = alg.parameters;
              }
              break;
            }
            default:
              obj["Parameters"] = alg.parameters;
          }
        }
        return obj;
      }
    };
    var OidSerializer = class {
      static toString(oid) {
        const name = this.items[oid];
        if (name) {
          return name;
        }
        return oid;
      }
    };
    OidSerializer.items = {
      [asn1Rsa__namespace.id_sha1]: "sha1",
      [asn1Rsa__namespace.id_sha224]: "sha224",
      [asn1Rsa__namespace.id_sha256]: "sha256",
      [asn1Rsa__namespace.id_sha384]: "sha384",
      [asn1Rsa__namespace.id_sha512]: "sha512",
      [asn1Rsa__namespace.id_rsaEncryption]: "rsaEncryption",
      [asn1Rsa__namespace.id_sha1WithRSAEncryption]: "sha1WithRSAEncryption",
      [asn1Rsa__namespace.id_sha224WithRSAEncryption]: "sha224WithRSAEncryption",
      [asn1Rsa__namespace.id_sha256WithRSAEncryption]: "sha256WithRSAEncryption",
      [asn1Rsa__namespace.id_sha384WithRSAEncryption]: "sha384WithRSAEncryption",
      [asn1Rsa__namespace.id_sha512WithRSAEncryption]: "sha512WithRSAEncryption",
      [asn1Ecc__namespace.id_ecPublicKey]: "ecPublicKey",
      [asn1Ecc__namespace.id_ecdsaWithSHA1]: "ecdsaWithSHA1",
      [asn1Ecc__namespace.id_ecdsaWithSHA224]: "ecdsaWithSHA224",
      [asn1Ecc__namespace.id_ecdsaWithSHA256]: "ecdsaWithSHA256",
      [asn1Ecc__namespace.id_ecdsaWithSHA384]: "ecdsaWithSHA384",
      [asn1Ecc__namespace.id_ecdsaWithSHA512]: "ecdsaWithSHA512",
      [asn1X509__namespace.id_kp_serverAuth]: "TLS WWW server authentication",
      [asn1X509__namespace.id_kp_clientAuth]: "TLS WWW client authentication",
      [asn1X509__namespace.id_kp_codeSigning]: "Code Signing",
      [asn1X509__namespace.id_kp_emailProtection]: "E-mail Protection",
      [asn1X509__namespace.id_kp_timeStamping]: "Time Stamping",
      [asn1X509__namespace.id_kp_OCSPSigning]: "OCSP Signing",
      [asn1Cms__namespace.id_signedData]: "Signed Data"
    };
    var TextConverter = class {
      static serialize(obj) {
        return this.serializeObj(obj).join("\n");
      }
      static pad(deep = 0) {
        return "".padStart(2 * deep, " ");
      }
      static serializeObj(obj, deep = 0) {
        const res = [];
        let pad = this.pad(deep++);
        let value = "";
        const objValue = obj[TextObject.VALUE];
        if (objValue) {
          value = ` ${objValue}`;
        }
        res.push(`${pad}${obj[TextObject.NAME]}:${value}`);
        pad = this.pad(deep);
        for (const key in obj) {
          if (typeof key === "symbol") {
            continue;
          }
          const value2 = obj[key];
          const keyValue = key ? `${key}: ` : "";
          if (typeof value2 === "string" || typeof value2 === "number" || typeof value2 === "boolean") {
            res.push(`${pad}${keyValue}${value2}`);
          } else if (value2 instanceof Date) {
            res.push(`${pad}${keyValue}${value2.toUTCString()}`);
          } else if (Array.isArray(value2)) {
            for (const obj2 of value2) {
              obj2[TextObject.NAME] = key;
              res.push(...this.serializeObj(obj2, deep));
            }
          } else if (value2 instanceof TextObject) {
            value2[TextObject.NAME] = key;
            res.push(...this.serializeObj(value2, deep));
          } else if (pvtsutils.BufferSourceConverter.isBufferSource(value2)) {
            if (key) {
              res.push(`${pad}${keyValue}`);
              res.push(...this.serializeBufferSource(value2, deep + 1));
            } else {
              res.push(...this.serializeBufferSource(value2, deep));
            }
          } else if ("toTextObject" in value2) {
            const obj2 = value2.toTextObject();
            obj2[TextObject.NAME] = key;
            res.push(...this.serializeObj(obj2, deep));
          } else {
            throw new TypeError("Cannot serialize data in text format. Unsupported type.");
          }
        }
        return res;
      }
      static serializeBufferSource(buffer, deep = 0) {
        const pad = this.pad(deep);
        const view = pvtsutils.BufferSourceConverter.toUint8Array(buffer);
        const res = [];
        for (let i = 0; i < view.length; ) {
          const row = [];
          for (let j = 0; j < 16 && i < view.length; j++) {
            if (j === 8) {
              row.push("");
            }
            const hex = view[i++].toString(16).padStart(2, "0");
            row.push(hex);
          }
          res.push(`${pad}${row.join(" ")}`);
        }
        return res;
      }
      static serializeAlgorithm(alg) {
        return this.algorithmSerializer.toTextObject(alg);
      }
    };
    TextConverter.oidSerializer = OidSerializer;
    TextConverter.algorithmSerializer = DefaultAlgorithmSerializer;
    var _AsnData_rawData;
    var AsnData = class _AsnData {
      get rawData() {
        if (!tslib.__classPrivateFieldGet(this, _AsnData_rawData, "f")) {
          tslib.__classPrivateFieldSet(this, _AsnData_rawData, asn1Schema.AsnConvert.serialize(this.asn), "f");
        }
        return tslib.__classPrivateFieldGet(this, _AsnData_rawData, "f");
      }
      constructor(...args) {
        _AsnData_rawData.set(this, void 0);
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          this.asn = asn1Schema.AsnConvert.parse(args[0], args[1]);
          tslib.__classPrivateFieldSet(this, _AsnData_rawData, pvtsutils.BufferSourceConverter.toArrayBuffer(args[0]), "f");
          this.onInit(this.asn);
        } else {
          this.asn = args[0];
          this.onInit(this.asn);
        }
      }
      equal(data) {
        if (data instanceof _AsnData) {
          return pvtsutils.isEqual(data.rawData, this.rawData);
        }
        return false;
      }
      toString(format = "text") {
        switch (format) {
          case "asn":
            return asn1Schema.AsnConvert.toString(this.rawData);
          case "text":
            return TextConverter.serialize(this.toTextObject());
          case "hex":
            return pvtsutils.Convert.ToHex(this.rawData);
          case "base64":
            return pvtsutils.Convert.ToBase64(this.rawData);
          case "base64url":
            return pvtsutils.Convert.ToBase64Url(this.rawData);
          default:
            throw TypeError("Argument 'format' is unsupported value");
        }
      }
      getTextName() {
        const constructor = this.constructor;
        return constructor.NAME;
      }
      toTextObject() {
        const obj = this.toTextObjectEmpty();
        obj[""] = this.rawData;
        return obj;
      }
      toTextObjectEmpty(value) {
        return new TextObject(this.getTextName(), {}, value);
      }
    };
    _AsnData_rawData = /* @__PURE__ */ new WeakMap();
    AsnData.NAME = "ASN";
    var Extension = class _Extension extends AsnData {
      constructor(...args) {
        let raw;
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          raw = pvtsutils.BufferSourceConverter.toArrayBuffer(args[0]);
        } else {
          raw = asn1Schema.AsnConvert.serialize(new asn1X509.Extension({
            extnID: args[0],
            critical: args[1],
            extnValue: new asn1Schema.OctetString(pvtsutils.BufferSourceConverter.toArrayBuffer(args[2]))
          }));
        }
        super(raw, asn1X509.Extension);
      }
      onInit(asn) {
        this.type = asn.extnID;
        this.critical = asn.critical;
        this.value = asn.extnValue.buffer;
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        obj[""] = this.value;
        return obj;
      }
      toTextObjectWithoutValue() {
        const obj = this.toTextObjectEmpty(this.critical ? "critical" : void 0);
        if (obj[TextObject.NAME] === _Extension.NAME) {
          obj[TextObject.NAME] = OidSerializer.toString(this.type);
        }
        return obj;
      }
    };
    var _a;
    var CryptoProvider = class _CryptoProvider {
      static isCryptoKeyPair(data) {
        return data && data.privateKey && data.publicKey;
      }
      static isCryptoKey(data) {
        return data && data.usages && data.type && data.algorithm && data.extractable !== void 0;
      }
      constructor() {
        this.items = /* @__PURE__ */ new Map();
        this[_a] = "CryptoProvider";
        if (typeof self !== "undefined" && typeof crypto !== "undefined") {
          this.set(_CryptoProvider.DEFAULT, crypto);
        } else if (typeof global !== "undefined" && global.crypto && global.crypto.subtle) {
          this.set(_CryptoProvider.DEFAULT, global.crypto);
        }
      }
      clear() {
        this.items.clear();
      }
      delete(key) {
        return this.items.delete(key);
      }
      forEach(callbackfn, thisArg) {
        return this.items.forEach(callbackfn, thisArg);
      }
      has(key) {
        return this.items.has(key);
      }
      get size() {
        return this.items.size;
      }
      entries() {
        return this.items.entries();
      }
      keys() {
        return this.items.keys();
      }
      values() {
        return this.items.values();
      }
      [Symbol.iterator]() {
        return this.items[Symbol.iterator]();
      }
      get(key = _CryptoProvider.DEFAULT) {
        const crypto2 = this.items.get(key.toLowerCase());
        if (!crypto2) {
          throw new Error(`Cannot get Crypto by name '${key}'`);
        }
        return crypto2;
      }
      set(key, value) {
        if (typeof key === "string") {
          if (!value) {
            throw new TypeError("Argument 'value' is required");
          }
          this.items.set(key.toLowerCase(), value);
        } else {
          this.items.set(_CryptoProvider.DEFAULT, key);
        }
        return this;
      }
    };
    _a = Symbol.toStringTag;
    CryptoProvider.DEFAULT = "default";
    var cryptoProvider = new CryptoProvider();
    var OID_REGEX = /^[0-2](?:\.[1-9][0-9]*)+$/;
    function isOID(id) {
      return new RegExp(OID_REGEX).test(id);
    }
    var NameIdentifier = class {
      constructor(names2 = {}) {
        this.items = {};
        for (const id in names2) {
          this.register(id, names2[id]);
        }
      }
      get(idOrName) {
        return this.items[idOrName] || null;
      }
      findId(idOrName) {
        if (!isOID(idOrName)) {
          return this.get(idOrName);
        }
        return idOrName;
      }
      register(id, name) {
        this.items[id] = name;
        this.items[name] = id;
      }
    };
    var names = new NameIdentifier();
    names.register("CN", "2.5.4.3");
    names.register("L", "2.5.4.7");
    names.register("ST", "2.5.4.8");
    names.register("O", "2.5.4.10");
    names.register("OU", "2.5.4.11");
    names.register("C", "2.5.4.6");
    names.register("DC", "0.9.2342.19200300.100.1.25");
    names.register("E", "1.2.840.113549.1.9.1");
    names.register("G", "2.5.4.42");
    names.register("I", "2.5.4.43");
    names.register("SN", "2.5.4.4");
    names.register("T", "2.5.4.12");
    function replaceUnknownCharacter(text, char) {
      return `\\${pvtsutils.Convert.ToHex(pvtsutils.Convert.FromUtf8String(char)).toUpperCase()}`;
    }
    function escape2(data) {
      return data.replace(/([,+"\\<>;])/g, "\\$1").replace(/^([ #])/, "\\$1").replace(/([ ]$)/, "\\$1").replace(/([\r\n\t])/, replaceUnknownCharacter);
    }
    var Name = class _Name {
      static isASCII(text) {
        for (let i = 0; i < text.length; i++) {
          const code = text.charCodeAt(i);
          if (code > 255) {
            return false;
          }
        }
        return true;
      }
      static isPrintableString(text) {
        return /^[A-Za-z0-9 '()+,-./:=?]*$/g.test(text);
      }
      constructor(data, extraNames = {}) {
        this.extraNames = new NameIdentifier();
        this.asn = new asn1X509.Name();
        for (const key in extraNames) {
          if (Object.prototype.hasOwnProperty.call(extraNames, key)) {
            const value = extraNames[key];
            this.extraNames.register(key, value);
          }
        }
        if (typeof data === "string") {
          this.asn = this.fromString(data);
        } else if (data instanceof asn1X509.Name) {
          this.asn = data;
        } else if (pvtsutils.BufferSourceConverter.isBufferSource(data)) {
          this.asn = asn1Schema.AsnConvert.parse(data, asn1X509.Name);
        } else {
          this.asn = this.fromJSON(data);
        }
      }
      getField(idOrName) {
        const id = this.extraNames.findId(idOrName) || names.findId(idOrName);
        const res = [];
        for (const name of this.asn) {
          for (const rdn of name) {
            if (rdn.type === id) {
              res.push(rdn.value.toString());
            }
          }
        }
        return res;
      }
      getName(idOrName) {
        return this.extraNames.get(idOrName) || names.get(idOrName);
      }
      toString() {
        return this.asn.map((rdn) => rdn.map((o) => {
          const type = this.getName(o.type) || o.type;
          const value = o.value.anyValue ? `#${pvtsutils.Convert.ToHex(o.value.anyValue)}` : escape2(o.value.toString());
          return `${type}=${value}`;
        }).join("+")).join(", ");
      }
      toJSON() {
        var _a2;
        const json = [];
        for (const rdn of this.asn) {
          const jsonItem = {};
          for (const attr of rdn) {
            const type = this.getName(attr.type) || attr.type;
            (_a2 = jsonItem[type]) !== null && _a2 !== void 0 ? _a2 : jsonItem[type] = [];
            jsonItem[type].push(attr.value.anyValue ? `#${pvtsutils.Convert.ToHex(attr.value.anyValue)}` : attr.value.toString());
          }
          json.push(jsonItem);
        }
        return json;
      }
      fromString(data) {
        const asn = new asn1X509.Name();
        const regex = /(\d\.[\d.]*\d|[A-Za-z]+)=((?:"")|(?:".*?[^\\]")|(?:[^,+"\\](?=[,+]|$))|(?:[^,+].*?(?:[^\\][,+]))|(?:))([,+])?/g;
        let matches2 = null;
        let level = ",";
        while (matches2 = regex.exec(`${data},`)) {
          let [, type, value] = matches2;
          const lastChar = value[value.length - 1];
          if (lastChar === "," || lastChar === "+") {
            value = value.slice(0, value.length - 1);
            matches2[3] = lastChar;
          }
          const next = matches2[3];
          type = this.getTypeOid(type);
          const attr = this.createAttribute(type, value);
          if (level === "+") {
            asn[asn.length - 1].push(attr);
          } else {
            asn.push(new asn1X509.RelativeDistinguishedName([attr]));
          }
          level = next;
        }
        return asn;
      }
      fromJSON(data) {
        const asn = new asn1X509.Name();
        for (const item of data) {
          const asnRdn = new asn1X509.RelativeDistinguishedName();
          for (const type in item) {
            const typeId = this.getTypeOid(type);
            const values = item[type];
            for (const value of values) {
              const asnAttr = this.createAttribute(typeId, value);
              asnRdn.push(asnAttr);
            }
          }
          asn.push(asnRdn);
        }
        return asn;
      }
      getTypeOid(type) {
        if (!/[\d.]+/.test(type)) {
          type = this.getName(type) || "";
        }
        if (!type) {
          throw new Error(`Cannot get OID for name type '${type}'`);
        }
        return type;
      }
      createAttribute(type, value) {
        const attr = new asn1X509.AttributeTypeAndValue({ type });
        if (typeof value === "object") {
          for (const key in value) {
            switch (key) {
              case "ia5String":
                attr.value.ia5String = value[key];
                break;
              case "utf8String":
                attr.value.utf8String = value[key];
                break;
              case "universalString":
                attr.value.universalString = value[key];
                break;
              case "bmpString":
                attr.value.bmpString = value[key];
                break;
              case "printableString":
                attr.value.printableString = value[key];
                break;
            }
          }
        } else if (value[0] === "#") {
          attr.value.anyValue = pvtsutils.Convert.FromHex(value.slice(1));
        } else {
          const processedValue = this.processStringValue(value);
          if (type === this.getName("E") || type === this.getName("DC")) {
            attr.value.ia5String = processedValue;
          } else {
            if (_Name.isPrintableString(processedValue)) {
              attr.value.printableString = processedValue;
            } else {
              attr.value.utf8String = processedValue;
            }
          }
        }
        return attr;
      }
      processStringValue(value) {
        const quotedMatches = /"(.*?[^\\])?"/.exec(value);
        if (quotedMatches) {
          value = quotedMatches[1];
        }
        return value.replace(/\\0a/ig, "\n").replace(/\\0d/ig, "\r").replace(/\\0g/ig, "	").replace(/\\(.)/g, "$1");
      }
      toArrayBuffer() {
        return asn1Schema.AsnConvert.serialize(this.asn);
      }
      async getThumbprint(...args) {
        var _a2;
        let crypto2;
        let algorithm = "SHA-1";
        if (args.length >= 1 && !((_a2 = args[0]) === null || _a2 === void 0 ? void 0 : _a2.subtle)) {
          algorithm = args[0] || algorithm;
          crypto2 = args[1] || cryptoProvider.get();
        } else {
          crypto2 = args[0] || cryptoProvider.get();
        }
        return await crypto2.subtle.digest(algorithm, this.toArrayBuffer());
      }
    };
    var ERR_GN_CONSTRUCTOR = "Cannot initialize GeneralName from ASN.1 data.";
    var ERR_GN_STRING_FORMAT = `${ERR_GN_CONSTRUCTOR} Unsupported string format in use.`;
    var ERR_GUID = `${ERR_GN_CONSTRUCTOR} Value doesn't match to GUID regular expression.`;
    var GUID_REGEX = /^([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})$/i;
    var id_GUID = "1.3.6.1.4.1.311.25.1";
    var id_UPN = "1.3.6.1.4.1.311.20.2.3";
    var DNS = "dns";
    var DN = "dn";
    var EMAIL = "email";
    var IP = "ip";
    var URL2 = "url";
    var GUID = "guid";
    var UPN = "upn";
    var REGISTERED_ID = "id";
    var GeneralName = class extends AsnData {
      constructor(...args) {
        let name;
        if (args.length === 2) {
          switch (args[0]) {
            case DN: {
              const derName = new Name(args[1]).toArrayBuffer();
              const asnName = asn1Schema.AsnConvert.parse(derName, asn1X509__namespace.Name);
              name = new asn1X509__namespace.GeneralName({ directoryName: asnName });
              break;
            }
            case DNS:
              name = new asn1X509__namespace.GeneralName({ dNSName: args[1] });
              break;
            case EMAIL:
              name = new asn1X509__namespace.GeneralName({ rfc822Name: args[1] });
              break;
            case GUID: {
              const matches2 = new RegExp(GUID_REGEX, "i").exec(args[1]);
              if (!matches2) {
                throw new Error("Cannot parse GUID value. Value doesn't match to regular expression");
              }
              const hex = matches2.slice(1).map((o, i) => {
                if (i < 3) {
                  return pvtsutils.Convert.ToHex(new Uint8Array(pvtsutils.Convert.FromHex(o)).reverse());
                }
                return o;
              }).join("");
              name = new asn1X509__namespace.GeneralName({
                otherName: new asn1X509__namespace.OtherName({
                  typeId: id_GUID,
                  value: asn1Schema.AsnConvert.serialize(new asn1Schema.OctetString(pvtsutils.Convert.FromHex(hex)))
                })
              });
              break;
            }
            case IP:
              name = new asn1X509__namespace.GeneralName({ iPAddress: args[1] });
              break;
            case REGISTERED_ID:
              name = new asn1X509__namespace.GeneralName({ registeredID: args[1] });
              break;
            case UPN: {
              name = new asn1X509__namespace.GeneralName({
                otherName: new asn1X509__namespace.OtherName({
                  typeId: id_UPN,
                  value: asn1Schema.AsnConvert.serialize(asn1Schema.AsnUtf8StringConverter.toASN(args[1]))
                })
              });
              break;
            }
            case URL2:
              name = new asn1X509__namespace.GeneralName({ uniformResourceIdentifier: args[1] });
              break;
            default:
              throw new Error("Cannot create GeneralName. Unsupported type of the name");
          }
        } else if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          name = asn1Schema.AsnConvert.parse(args[0], asn1X509__namespace.GeneralName);
        } else {
          name = args[0];
        }
        super(name);
      }
      onInit(asn) {
        if (asn.dNSName != void 0) {
          this.type = DNS;
          this.value = asn.dNSName;
        } else if (asn.rfc822Name != void 0) {
          this.type = EMAIL;
          this.value = asn.rfc822Name;
        } else if (asn.iPAddress != void 0) {
          this.type = IP;
          this.value = asn.iPAddress;
        } else if (asn.uniformResourceIdentifier != void 0) {
          this.type = URL2;
          this.value = asn.uniformResourceIdentifier;
        } else if (asn.registeredID != void 0) {
          this.type = REGISTERED_ID;
          this.value = asn.registeredID;
        } else if (asn.directoryName != void 0) {
          this.type = DN;
          this.value = new Name(asn.directoryName).toString();
        } else if (asn.otherName != void 0) {
          if (asn.otherName.typeId === id_GUID) {
            this.type = GUID;
            const guid = asn1Schema.AsnConvert.parse(asn.otherName.value, asn1Schema.OctetString);
            const matches2 = new RegExp(GUID_REGEX, "i").exec(pvtsutils.Convert.ToHex(guid));
            if (!matches2) {
              throw new Error(ERR_GUID);
            }
            this.value = matches2.slice(1).map((o, i) => {
              if (i < 3) {
                return pvtsutils.Convert.ToHex(new Uint8Array(pvtsutils.Convert.FromHex(o)).reverse());
              }
              return o;
            }).join("-");
          } else if (asn.otherName.typeId === id_UPN) {
            this.type = UPN;
            this.value = asn1Schema.AsnConvert.parse(asn.otherName.value, asn1X509__namespace.DirectoryString).toString();
          } else {
            throw new Error(ERR_GN_STRING_FORMAT);
          }
        } else {
          throw new Error(ERR_GN_STRING_FORMAT);
        }
      }
      toJSON() {
        return {
          type: this.type,
          value: this.value
        };
      }
      toTextObject() {
        let type;
        switch (this.type) {
          case DN:
          case DNS:
          case GUID:
          case IP:
          case REGISTERED_ID:
          case UPN:
          case URL2:
            type = this.type.toUpperCase();
            break;
          case EMAIL:
            type = "Email";
            break;
          default:
            throw new Error("Unsupported GeneralName type");
        }
        let value = this.value;
        if (this.type === REGISTERED_ID) {
          value = OidSerializer.toString(value);
        }
        return new TextObject(type, void 0, value);
      }
    };
    var GeneralNames = class extends AsnData {
      constructor(params) {
        let names2;
        if (params instanceof asn1X509__namespace.GeneralNames) {
          names2 = params;
        } else if (Array.isArray(params)) {
          const items = [];
          for (const name of params) {
            if (name instanceof asn1X509__namespace.GeneralName) {
              items.push(name);
            } else {
              const asnName = asn1Schema.AsnConvert.parse(new GeneralName(name.type, name.value).rawData, asn1X509__namespace.GeneralName);
              items.push(asnName);
            }
          }
          names2 = new asn1X509__namespace.GeneralNames(items);
        } else if (pvtsutils.BufferSourceConverter.isBufferSource(params)) {
          names2 = asn1Schema.AsnConvert.parse(params, asn1X509__namespace.GeneralNames);
        } else {
          throw new Error("Cannot initialize GeneralNames. Incorrect incoming arguments");
        }
        super(names2);
      }
      onInit(asn) {
        const items = [];
        for (const asnName of asn) {
          let name = null;
          try {
            name = new GeneralName(asnName);
          } catch {
            continue;
          }
          items.push(name);
        }
        this.items = items;
      }
      toJSON() {
        return this.items.map((o) => o.toJSON());
      }
      toTextObject() {
        const res = super.toTextObjectEmpty();
        for (const name of this.items) {
          const nameObj = name.toTextObject();
          let field = res[nameObj[TextObject.NAME]];
          if (!Array.isArray(field)) {
            field = [];
            res[nameObj[TextObject.NAME]] = field;
          }
          field.push(nameObj);
        }
        return res;
      }
    };
    GeneralNames.NAME = "GeneralNames";
    var rPaddingTag = "-{5}";
    var rEolChars = "\\n";
    var rNameTag = `[^${rEolChars}]+`;
    var rBeginTag = `${rPaddingTag}BEGIN (${rNameTag}(?=${rPaddingTag}))${rPaddingTag}`;
    var rEndTag = `${rPaddingTag}END \\1${rPaddingTag}`;
    var rEolGroup = "\\n";
    var rHeaderKey = `[^:${rEolChars}]+`;
    var rHeaderValue = `(?:[^${rEolChars}]+${rEolGroup}(?: +[^${rEolChars}]+${rEolGroup})*)`;
    var rBase64Chars = "[a-zA-Z0-9=+/]+";
    var rBase64 = `(?:${rBase64Chars}${rEolGroup})+`;
    var rPem = `${rBeginTag}${rEolGroup}(?:((?:${rHeaderKey}: ${rHeaderValue})+))?${rEolGroup}?(${rBase64})${rEndTag}`;
    var PemConverter = class {
      static isPem(data) {
        return typeof data === "string" && new RegExp(rPem, "g").test(data.replace(/\r/g, ""));
      }
      static decodeWithHeaders(pem) {
        pem = pem.replace(/\r/g, "");
        const pattern = new RegExp(rPem, "g");
        const res = [];
        let matches2 = null;
        while (matches2 = pattern.exec(pem)) {
          const base64 = matches2[3].replace(new RegExp(`[${rEolChars}]+`, "g"), "");
          const pemStruct = {
            type: matches2[1],
            headers: [],
            rawData: pvtsutils.Convert.FromBase64(base64)
          };
          const headersString = matches2[2];
          if (headersString) {
            const headers = headersString.split(new RegExp(rEolGroup, "g"));
            let lastHeader = null;
            for (const header of headers) {
              const [key, value] = header.split(/:(.*)/);
              if (value === void 0) {
                if (!lastHeader) {
                  throw new Error("Cannot parse PEM string. Incorrect header value");
                }
                lastHeader.value += key.trim();
              } else {
                if (lastHeader) {
                  pemStruct.headers.push(lastHeader);
                }
                lastHeader = {
                  key,
                  value: value.trim()
                };
              }
            }
            if (lastHeader) {
              pemStruct.headers.push(lastHeader);
            }
          }
          res.push(pemStruct);
        }
        return res;
      }
      static decode(pem) {
        const blocks = this.decodeWithHeaders(pem);
        return blocks.map((o) => o.rawData);
      }
      static decodeFirst(pem) {
        const items = this.decode(pem);
        if (!items.length) {
          throw new RangeError("PEM string doesn't contain any objects");
        }
        return items[0];
      }
      static encode(rawData, tag) {
        if (Array.isArray(rawData)) {
          const raws = new Array();
          if (tag) {
            rawData.forEach((element) => {
              if (!pvtsutils.BufferSourceConverter.isBufferSource(element)) {
                throw new TypeError("Cannot encode array of BufferSource in PEM format. Not all items of the array are BufferSource");
              }
              raws.push(this.encodeStruct({
                type: tag,
                rawData: pvtsutils.BufferSourceConverter.toArrayBuffer(element)
              }));
            });
          } else {
            rawData.forEach((element) => {
              if (!("type" in element)) {
                throw new TypeError("Cannot encode array of PemStruct in PEM format. Not all items of the array are PemStrut");
              }
              raws.push(this.encodeStruct(element));
            });
          }
          return raws.join("\n");
        } else {
          if (!tag) {
            throw new Error("Required argument 'tag' is missed");
          }
          return this.encodeStruct({
            type: tag,
            rawData: pvtsutils.BufferSourceConverter.toArrayBuffer(rawData)
          });
        }
      }
      static encodeStruct(pem) {
        var _a2;
        const upperCaseType = pem.type.toLocaleUpperCase();
        const res = [];
        res.push(`-----BEGIN ${upperCaseType}-----`);
        if ((_a2 = pem.headers) === null || _a2 === void 0 ? void 0 : _a2.length) {
          for (const header of pem.headers) {
            res.push(`${header.key}: ${header.value}`);
          }
          res.push("");
        }
        const base64 = pvtsutils.Convert.ToBase64(pem.rawData);
        let sliced;
        let offset = 0;
        const rows = Array();
        while (offset < base64.length) {
          if (base64.length - offset < 64) {
            sliced = base64.substring(offset);
          } else {
            sliced = base64.substring(offset, offset + 64);
            offset += 64;
          }
          if (sliced.length !== 0) {
            rows.push(sliced);
            if (sliced.length < 64) {
              break;
            }
          } else {
            break;
          }
        }
        res.push(...rows);
        res.push(`-----END ${upperCaseType}-----`);
        return res.join("\n");
      }
    };
    PemConverter.CertificateTag = "CERTIFICATE";
    PemConverter.CrlTag = "CRL";
    PemConverter.CertificateRequestTag = "CERTIFICATE REQUEST";
    PemConverter.PublicKeyTag = "PUBLIC KEY";
    PemConverter.PrivateKeyTag = "PRIVATE KEY";
    var PemData = class _PemData extends AsnData {
      static isAsnEncoded(data) {
        return pvtsutils.BufferSourceConverter.isBufferSource(data) || typeof data === "string";
      }
      static toArrayBuffer(raw) {
        if (typeof raw === "string") {
          if (PemConverter.isPem(raw)) {
            return PemConverter.decode(raw)[0];
          } else if (pvtsutils.Convert.isHex(raw)) {
            return pvtsutils.Convert.FromHex(raw);
          } else if (pvtsutils.Convert.isBase64(raw)) {
            return pvtsutils.Convert.FromBase64(raw);
          } else if (pvtsutils.Convert.isBase64Url(raw)) {
            return pvtsutils.Convert.FromBase64Url(raw);
          } else {
            throw new TypeError("Unsupported format of 'raw' argument. Must be one of DER, PEM, HEX, Base64, or Base4Url");
          }
        } else {
          const buffer = pvtsutils.BufferSourceConverter.toUint8Array(raw);
          if (buffer.length > 0 && buffer[0] === 48) {
            return pvtsutils.BufferSourceConverter.toArrayBuffer(raw);
          }
          const stringRaw = pvtsutils.Convert.ToBinary(raw);
          if (PemConverter.isPem(stringRaw)) {
            return PemConverter.decode(stringRaw)[0];
          } else if (pvtsutils.Convert.isHex(stringRaw)) {
            return pvtsutils.Convert.FromHex(stringRaw);
          } else if (pvtsutils.Convert.isBase64(stringRaw)) {
            return pvtsutils.Convert.FromBase64(stringRaw);
          } else if (pvtsutils.Convert.isBase64Url(stringRaw)) {
            return pvtsutils.Convert.FromBase64Url(stringRaw);
          }
          throw new TypeError("Unsupported format of 'raw' argument. Must be one of DER, PEM, HEX, Base64, or Base4Url");
        }
      }
      constructor(...args) {
        if (_PemData.isAsnEncoded(args[0])) {
          super(_PemData.toArrayBuffer(args[0]), args[1]);
        } else {
          super(args[0]);
        }
      }
      toString(format = "pem") {
        switch (format) {
          case "pem":
            return PemConverter.encode(this.rawData, this.tag);
          default:
            return super.toString(format);
        }
      }
    };
    var PublicKey = class _PublicKey extends PemData {
      static async create(data, crypto2 = cryptoProvider.get()) {
        if (data instanceof _PublicKey) {
          return data;
        } else if (CryptoProvider.isCryptoKey(data)) {
          if (data.type !== "public") {
            throw new TypeError("Public key is required");
          }
          const spki = await crypto2.subtle.exportKey("spki", data);
          return new _PublicKey(spki);
        } else if (data.publicKey) {
          return data.publicKey;
        } else if (pvtsutils.BufferSourceConverter.isBufferSource(data)) {
          return new _PublicKey(data);
        } else {
          throw new TypeError("Unsupported PublicKeyType");
        }
      }
      constructor(param) {
        if (PemData.isAsnEncoded(param)) {
          super(param, asn1X509.SubjectPublicKeyInfo);
        } else {
          super(param);
        }
        this.tag = PemConverter.PublicKeyTag;
      }
      async export(...args) {
        let crypto2;
        let keyUsages = ["verify"];
        let algorithm = {
          hash: "SHA-256",
          ...this.algorithm
        };
        if (args.length > 1) {
          algorithm = args[0] || algorithm;
          keyUsages = args[1] || keyUsages;
          crypto2 = args[2] || cryptoProvider.get();
        } else {
          crypto2 = args[0] || cryptoProvider.get();
        }
        let raw = this.rawData;
        const asnSpki = asn1Schema.AsnConvert.parse(this.rawData, asn1X509.SubjectPublicKeyInfo);
        if (asnSpki.algorithm.algorithm === asn1Rsa.id_RSASSA_PSS) {
          raw = convertSpkiToRsaPkcs1(asnSpki, raw);
        }
        return crypto2.subtle.importKey("spki", raw, algorithm, true, keyUsages);
      }
      onInit(asn) {
        const algProv = tsyringe.container.resolve(diAlgorithmProvider);
        const algorithm = this.algorithm = algProv.toWebAlgorithm(asn.algorithm);
        switch (asn.algorithm.algorithm) {
          case asn1Rsa.id_rsaEncryption: {
            const rsaPublicKey = asn1Schema.AsnConvert.parse(asn.subjectPublicKey, asn1Rsa.RSAPublicKey);
            const modulus = pvtsutils.BufferSourceConverter.toUint8Array(rsaPublicKey.modulus);
            algorithm.publicExponent = pvtsutils.BufferSourceConverter.toUint8Array(rsaPublicKey.publicExponent);
            algorithm.modulusLength = (!modulus[0] ? modulus.slice(1) : modulus).byteLength << 3;
            break;
          }
        }
      }
      async getThumbprint(...args) {
        var _a2;
        let crypto2;
        let algorithm = "SHA-1";
        if (args.length >= 1 && !((_a2 = args[0]) === null || _a2 === void 0 ? void 0 : _a2.subtle)) {
          algorithm = args[0] || algorithm;
          crypto2 = args[1] || cryptoProvider.get();
        } else {
          crypto2 = args[0] || cryptoProvider.get();
        }
        return await crypto2.subtle.digest(algorithm, this.rawData);
      }
      async getKeyIdentifier(...args) {
        let crypto2;
        let algorithm = "SHA-1";
        if (args.length === 1) {
          if (typeof args[0] === "string") {
            algorithm = args[0];
            crypto2 = cryptoProvider.get();
          } else {
            crypto2 = args[0];
          }
        } else if (args.length === 2) {
          algorithm = args[0];
          crypto2 = args[1];
        } else {
          crypto2 = cryptoProvider.get();
        }
        const asn = asn1Schema.AsnConvert.parse(this.rawData, asn1X509.SubjectPublicKeyInfo);
        return await crypto2.subtle.digest(algorithm, asn.subjectPublicKey);
      }
      toTextObject() {
        const obj = this.toTextObjectEmpty();
        const asn = asn1Schema.AsnConvert.parse(this.rawData, asn1X509.SubjectPublicKeyInfo);
        obj["Algorithm"] = TextConverter.serializeAlgorithm(asn.algorithm);
        switch (asn.algorithm.algorithm) {
          case asn1Ecc.id_ecPublicKey:
            obj["EC Point"] = asn.subjectPublicKey;
            break;
          case asn1Rsa.id_rsaEncryption:
          default:
            obj["Raw Data"] = asn.subjectPublicKey;
        }
        return obj;
      }
    };
    function convertSpkiToRsaPkcs1(asnSpki, raw) {
      asnSpki.algorithm = new asn1X509.AlgorithmIdentifier({
        algorithm: asn1Rsa.id_rsaEncryption,
        parameters: null
      });
      raw = asn1Schema.AsnConvert.serialize(asnSpki);
      return raw;
    }
    var AuthorityKeyIdentifierExtension = class _AuthorityKeyIdentifierExtension extends Extension {
      static async create(param, critical = false, crypto2 = cryptoProvider.get()) {
        if ("name" in param && "serialNumber" in param) {
          return new _AuthorityKeyIdentifierExtension(param, critical);
        }
        const key = await PublicKey.create(param, crypto2);
        const id = await key.getKeyIdentifier(crypto2);
        return new _AuthorityKeyIdentifierExtension(pvtsutils.Convert.ToHex(id), critical);
      }
      constructor(...args) {
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          super(args[0]);
        } else if (typeof args[0] === "string") {
          const value = new asn1X509__namespace.AuthorityKeyIdentifier({ keyIdentifier: new asn1X509__namespace.KeyIdentifier(pvtsutils.Convert.FromHex(args[0])) });
          super(asn1X509__namespace.id_ce_authorityKeyIdentifier, args[1], asn1Schema.AsnConvert.serialize(value));
        } else {
          const certId = args[0];
          const certIdName = certId.name instanceof GeneralNames ? asn1Schema.AsnConvert.parse(certId.name.rawData, asn1X509__namespace.GeneralNames) : certId.name;
          const value = new asn1X509__namespace.AuthorityKeyIdentifier({
            authorityCertIssuer: certIdName,
            authorityCertSerialNumber: pvtsutils.Convert.FromHex(certId.serialNumber)
          });
          super(asn1X509__namespace.id_ce_authorityKeyIdentifier, args[1], asn1Schema.AsnConvert.serialize(value));
        }
      }
      onInit(asn) {
        super.onInit(asn);
        const aki = asn1Schema.AsnConvert.parse(asn.extnValue, asn1X509__namespace.AuthorityKeyIdentifier);
        if (aki.keyIdentifier) {
          this.keyId = pvtsutils.Convert.ToHex(aki.keyIdentifier);
        }
        if (aki.authorityCertIssuer || aki.authorityCertSerialNumber) {
          this.certId = {
            name: aki.authorityCertIssuer || [],
            serialNumber: aki.authorityCertSerialNumber ? pvtsutils.Convert.ToHex(aki.authorityCertSerialNumber) : ""
          };
        }
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        const asn = asn1Schema.AsnConvert.parse(this.value, asn1X509__namespace.AuthorityKeyIdentifier);
        if (asn.authorityCertIssuer) {
          obj["Authority Issuer"] = new GeneralNames(asn.authorityCertIssuer).toTextObject();
        }
        if (asn.authorityCertSerialNumber) {
          obj["Authority Serial Number"] = asn.authorityCertSerialNumber;
        }
        if (asn.keyIdentifier) {
          obj[""] = asn.keyIdentifier;
        }
        return obj;
      }
    };
    AuthorityKeyIdentifierExtension.NAME = "Authority Key Identifier";
    var BasicConstraintsExtension = class extends Extension {
      constructor(...args) {
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          super(args[0]);
          const value = asn1Schema.AsnConvert.parse(this.value, asn1X509.BasicConstraints);
          this.ca = value.cA;
          this.pathLength = value.pathLenConstraint;
        } else {
          const value = new asn1X509.BasicConstraints({
            cA: args[0],
            pathLenConstraint: args[1]
          });
          super(asn1X509.id_ce_basicConstraints, args[2], asn1Schema.AsnConvert.serialize(value));
          this.ca = args[0];
          this.pathLength = args[1];
        }
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        if (this.ca) {
          obj["CA"] = this.ca;
        }
        if (this.pathLength !== void 0) {
          obj["Path Length"] = this.pathLength;
        }
        return obj;
      }
    };
    BasicConstraintsExtension.NAME = "Basic Constraints";
    exports.ExtendedKeyUsage = void 0;
    (function(ExtendedKeyUsage) {
      ExtendedKeyUsage["serverAuth"] = "1.3.6.1.5.5.7.3.1";
      ExtendedKeyUsage["clientAuth"] = "1.3.6.1.5.5.7.3.2";
      ExtendedKeyUsage["codeSigning"] = "1.3.6.1.5.5.7.3.3";
      ExtendedKeyUsage["emailProtection"] = "1.3.6.1.5.5.7.3.4";
      ExtendedKeyUsage["timeStamping"] = "1.3.6.1.5.5.7.3.8";
      ExtendedKeyUsage["ocspSigning"] = "1.3.6.1.5.5.7.3.9";
    })(exports.ExtendedKeyUsage || (exports.ExtendedKeyUsage = {}));
    var ExtendedKeyUsageExtension = class extends Extension {
      constructor(...args) {
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          super(args[0]);
          const value = asn1Schema.AsnConvert.parse(this.value, asn1X509__namespace.ExtendedKeyUsage);
          this.usages = value.map((o) => o);
        } else {
          const value = new asn1X509__namespace.ExtendedKeyUsage(args[0]);
          super(asn1X509__namespace.id_ce_extKeyUsage, args[1], asn1Schema.AsnConvert.serialize(value));
          this.usages = args[0];
        }
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        obj[""] = this.usages.map((o) => OidSerializer.toString(o)).join(", ");
        return obj;
      }
    };
    ExtendedKeyUsageExtension.NAME = "Extended Key Usages";
    exports.KeyUsageFlags = void 0;
    (function(KeyUsageFlags) {
      KeyUsageFlags[KeyUsageFlags["digitalSignature"] = 1] = "digitalSignature";
      KeyUsageFlags[KeyUsageFlags["nonRepudiation"] = 2] = "nonRepudiation";
      KeyUsageFlags[KeyUsageFlags["keyEncipherment"] = 4] = "keyEncipherment";
      KeyUsageFlags[KeyUsageFlags["dataEncipherment"] = 8] = "dataEncipherment";
      KeyUsageFlags[KeyUsageFlags["keyAgreement"] = 16] = "keyAgreement";
      KeyUsageFlags[KeyUsageFlags["keyCertSign"] = 32] = "keyCertSign";
      KeyUsageFlags[KeyUsageFlags["cRLSign"] = 64] = "cRLSign";
      KeyUsageFlags[KeyUsageFlags["encipherOnly"] = 128] = "encipherOnly";
      KeyUsageFlags[KeyUsageFlags["decipherOnly"] = 256] = "decipherOnly";
    })(exports.KeyUsageFlags || (exports.KeyUsageFlags = {}));
    var KeyUsagesExtension = class extends Extension {
      constructor(...args) {
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          super(args[0]);
          const value = asn1Schema.AsnConvert.parse(this.value, asn1X509.KeyUsage);
          this.usages = value.toNumber();
        } else {
          const value = new asn1X509.KeyUsage(args[0]);
          super(asn1X509.id_ce_keyUsage, args[1], asn1Schema.AsnConvert.serialize(value));
          this.usages = args[0];
        }
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        const asn = asn1Schema.AsnConvert.parse(this.value, asn1X509.KeyUsage);
        obj[""] = asn.toJSON().join(", ");
        return obj;
      }
    };
    KeyUsagesExtension.NAME = "Key Usages";
    var SubjectKeyIdentifierExtension = class _SubjectKeyIdentifierExtension extends Extension {
      static async create(publicKey, critical = false, crypto2 = cryptoProvider.get()) {
        const key = await PublicKey.create(publicKey, crypto2);
        const id = await key.getKeyIdentifier(crypto2);
        return new _SubjectKeyIdentifierExtension(pvtsutils.Convert.ToHex(id), critical);
      }
      constructor(...args) {
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          super(args[0]);
          const value = asn1Schema.AsnConvert.parse(this.value, asn1X509__namespace.SubjectKeyIdentifier);
          this.keyId = pvtsutils.Convert.ToHex(value);
        } else {
          const identifier = typeof args[0] === "string" ? pvtsutils.Convert.FromHex(args[0]) : args[0];
          const value = new asn1X509__namespace.SubjectKeyIdentifier(identifier);
          super(asn1X509__namespace.id_ce_subjectKeyIdentifier, args[1], asn1Schema.AsnConvert.serialize(value));
          this.keyId = pvtsutils.Convert.ToHex(identifier);
        }
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        const asn = asn1Schema.AsnConvert.parse(this.value, asn1X509__namespace.SubjectKeyIdentifier);
        obj[""] = asn;
        return obj;
      }
    };
    SubjectKeyIdentifierExtension.NAME = "Subject Key Identifier";
    var SubjectAlternativeNameExtension = class extends Extension {
      constructor(...args) {
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          super(args[0]);
        } else {
          super(asn1X509__namespace.id_ce_subjectAltName, args[1], new GeneralNames(args[0] || []).rawData);
        }
      }
      onInit(asn) {
        super.onInit(asn);
        const value = asn1Schema.AsnConvert.parse(asn.extnValue, asn1X509__namespace.SubjectAlternativeName);
        this.names = new GeneralNames(value);
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        const namesObj = this.names.toTextObject();
        for (const key in namesObj) {
          obj[key] = namesObj[key];
        }
        return obj;
      }
    };
    SubjectAlternativeNameExtension.NAME = "Subject Alternative Name";
    var ExtensionFactory = class {
      static register(id, type) {
        this.items.set(id, type);
      }
      static create(data) {
        const extension2 = new Extension(data);
        const Type = this.items.get(extension2.type);
        if (Type) {
          return new Type(data);
        }
        return extension2;
      }
    };
    ExtensionFactory.items = /* @__PURE__ */ new Map();
    var CertificatePolicyExtension = class extends Extension {
      constructor(...args) {
        var _a2;
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          super(args[0]);
          const asnPolicies = asn1Schema.AsnConvert.parse(this.value, asn1X509__namespace.CertificatePolicies);
          this.policies = asnPolicies.map((o) => o.policyIdentifier);
        } else {
          const policies = args[0];
          const critical = (_a2 = args[1]) !== null && _a2 !== void 0 ? _a2 : false;
          const value = new asn1X509__namespace.CertificatePolicies(policies.map((o) => new asn1X509__namespace.PolicyInformation({ policyIdentifier: o })));
          super(asn1X509__namespace.id_ce_certificatePolicies, critical, asn1Schema.AsnConvert.serialize(value));
          this.policies = policies;
        }
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        obj["Policy"] = this.policies.map((o) => new TextObject("", {}, OidSerializer.toString(o)));
        return obj;
      }
    };
    CertificatePolicyExtension.NAME = "Certificate Policies";
    ExtensionFactory.register(asn1X509__namespace.id_ce_certificatePolicies, CertificatePolicyExtension);
    var CRLDistributionPointsExtension = class extends Extension {
      constructor(...args) {
        var _a2;
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          super(args[0]);
        } else if (Array.isArray(args[0]) && typeof args[0][0] === "string") {
          const urls = args[0];
          const dps = urls.map((url) => {
            return new asn1X509__namespace.DistributionPoint({
              distributionPoint: new asn1X509__namespace.DistributionPointName({ fullName: [new asn1X509__namespace.GeneralName({ uniformResourceIdentifier: url })] })
            });
          });
          const value = new asn1X509__namespace.CRLDistributionPoints(dps);
          super(asn1X509__namespace.id_ce_cRLDistributionPoints, args[1], asn1Schema.AsnConvert.serialize(value));
        } else {
          const value = new asn1X509__namespace.CRLDistributionPoints(args[0]);
          super(asn1X509__namespace.id_ce_cRLDistributionPoints, args[1], asn1Schema.AsnConvert.serialize(value));
        }
        (_a2 = this.distributionPoints) !== null && _a2 !== void 0 ? _a2 : this.distributionPoints = [];
      }
      onInit(asn) {
        super.onInit(asn);
        const crlExt = asn1Schema.AsnConvert.parse(asn.extnValue, asn1X509__namespace.CRLDistributionPoints);
        this.distributionPoints = crlExt;
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        obj["Distribution Point"] = this.distributionPoints.map((dp) => {
          var _a2;
          const dpObj = {};
          if (dp.distributionPoint) {
            dpObj[""] = (_a2 = dp.distributionPoint.fullName) === null || _a2 === void 0 ? void 0 : _a2.map((name) => new GeneralName(name).toString()).join(", ");
          }
          if (dp.reasons) {
            dpObj["Reasons"] = dp.reasons.toString();
          }
          if (dp.cRLIssuer) {
            dpObj["CRL Issuer"] = dp.cRLIssuer.map((issuer) => issuer.toString()).join(", ");
          }
          return dpObj;
        });
        return obj;
      }
    };
    CRLDistributionPointsExtension.NAME = "CRL Distribution Points";
    var AuthorityInfoAccessExtension = class extends Extension {
      constructor(...args) {
        var _a2, _b, _c, _d;
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          super(args[0]);
        } else if (args[0] instanceof asn1X509__namespace.AuthorityInfoAccessSyntax) {
          const value = new asn1X509__namespace.AuthorityInfoAccessSyntax(args[0]);
          super(asn1X509__namespace.id_pe_authorityInfoAccess, args[1], asn1Schema.AsnConvert.serialize(value));
        } else {
          const params = args[0];
          const value = new asn1X509__namespace.AuthorityInfoAccessSyntax();
          addAccessDescriptions(value, params, asn1X509__namespace.id_ad_ocsp, "ocsp");
          addAccessDescriptions(value, params, asn1X509__namespace.id_ad_caIssuers, "caIssuers");
          addAccessDescriptions(value, params, asn1X509__namespace.id_ad_timeStamping, "timeStamping");
          addAccessDescriptions(value, params, asn1X509__namespace.id_ad_caRepository, "caRepository");
          super(asn1X509__namespace.id_pe_authorityInfoAccess, args[1], asn1Schema.AsnConvert.serialize(value));
        }
        (_a2 = this.ocsp) !== null && _a2 !== void 0 ? _a2 : this.ocsp = [];
        (_b = this.caIssuers) !== null && _b !== void 0 ? _b : this.caIssuers = [];
        (_c = this.timeStamping) !== null && _c !== void 0 ? _c : this.timeStamping = [];
        (_d = this.caRepository) !== null && _d !== void 0 ? _d : this.caRepository = [];
      }
      onInit(asn) {
        super.onInit(asn);
        this.ocsp = [];
        this.caIssuers = [];
        this.timeStamping = [];
        this.caRepository = [];
        const aia = asn1Schema.AsnConvert.parse(asn.extnValue, asn1X509__namespace.AuthorityInfoAccessSyntax);
        aia.forEach((accessDescription) => {
          switch (accessDescription.accessMethod) {
            case asn1X509__namespace.id_ad_ocsp:
              this.ocsp.push(new GeneralName(accessDescription.accessLocation));
              break;
            case asn1X509__namespace.id_ad_caIssuers:
              this.caIssuers.push(new GeneralName(accessDescription.accessLocation));
              break;
            case asn1X509__namespace.id_ad_timeStamping:
              this.timeStamping.push(new GeneralName(accessDescription.accessLocation));
              break;
            case asn1X509__namespace.id_ad_caRepository:
              this.caRepository.push(new GeneralName(accessDescription.accessLocation));
              break;
          }
        });
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        if (this.ocsp.length) {
          addUrlsToObject(obj, "OCSP", this.ocsp);
        }
        if (this.caIssuers.length) {
          addUrlsToObject(obj, "CA Issuers", this.caIssuers);
        }
        if (this.timeStamping.length) {
          addUrlsToObject(obj, "Time Stamping", this.timeStamping);
        }
        if (this.caRepository.length) {
          addUrlsToObject(obj, "CA Repository", this.caRepository);
        }
        return obj;
      }
    };
    AuthorityInfoAccessExtension.NAME = "Authority Info Access";
    function addUrlsToObject(obj, key, urls) {
      if (urls.length === 1) {
        obj[key] = urls[0].toTextObject();
      } else {
        const names2 = new TextObject("");
        urls.forEach((name, index) => {
          const nameObj = name.toTextObject();
          const indexedKey = `${nameObj[TextObject.NAME]} ${index + 1}`;
          let field = names2[indexedKey];
          if (!Array.isArray(field)) {
            field = [];
            names2[indexedKey] = field;
          }
          field.push(nameObj);
        });
        obj[key] = names2;
      }
    }
    function addAccessDescriptions(value, params, method, key) {
      const items = params[key];
      if (items) {
        const array = Array.isArray(items) ? items : [items];
        array.forEach((url) => {
          if (typeof url === "string") {
            url = new GeneralName("url", url);
          }
          value.push(new asn1X509__namespace.AccessDescription({
            accessMethod: method,
            accessLocation: asn1Schema.AsnConvert.parse(url.rawData, asn1X509__namespace.GeneralName)
          }));
        });
      }
    }
    var IssuerAlternativeNameExtension = class extends Extension {
      constructor(...args) {
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          super(args[0]);
        } else {
          super(asn1X509__namespace.id_ce_issuerAltName, args[1], new GeneralNames(args[0] || []).rawData);
        }
      }
      onInit(asn) {
        super.onInit(asn);
        const value = asn1Schema.AsnConvert.parse(asn.extnValue, asn1X509__namespace.GeneralNames);
        this.names = new GeneralNames(value);
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        const namesObj = this.names.toTextObject();
        for (const key in namesObj) {
          obj[key] = namesObj[key];
        }
        return obj;
      }
    };
    IssuerAlternativeNameExtension.NAME = "Issuer Alternative Name";
    var Attribute = class _Attribute extends AsnData {
      constructor(...args) {
        let raw;
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          raw = pvtsutils.BufferSourceConverter.toArrayBuffer(args[0]);
        } else {
          const type = args[0];
          const values = Array.isArray(args[1]) ? args[1].map((o) => pvtsutils.BufferSourceConverter.toArrayBuffer(o)) : [];
          raw = asn1Schema.AsnConvert.serialize(new asn1X509.Attribute({
            type,
            values
          }));
        }
        super(raw, asn1X509.Attribute);
      }
      onInit(asn) {
        this.type = asn.type;
        this.values = asn.values;
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        obj["Value"] = this.values.map((o) => new TextObject("", { "": o }));
        return obj;
      }
      toTextObjectWithoutValue() {
        const obj = this.toTextObjectEmpty();
        if (obj[TextObject.NAME] === _Attribute.NAME) {
          obj[TextObject.NAME] = OidSerializer.toString(this.type);
        }
        return obj;
      }
    };
    Attribute.NAME = "Attribute";
    var ChallengePasswordAttribute = class extends Attribute {
      constructor(...args) {
        var _a2;
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          super(args[0]);
        } else {
          const value = new asnPkcs9__namespace.ChallengePassword({ printableString: args[0] });
          super(asnPkcs9__namespace.id_pkcs9_at_challengePassword, [asn1Schema.AsnConvert.serialize(value)]);
        }
        (_a2 = this.password) !== null && _a2 !== void 0 ? _a2 : this.password = "";
      }
      onInit(asn) {
        super.onInit(asn);
        if (this.values[0]) {
          const value = asn1Schema.AsnConvert.parse(this.values[0], asnPkcs9__namespace.ChallengePassword);
          this.password = value.toString();
        }
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        obj[TextObject.VALUE] = this.password;
        return obj;
      }
    };
    ChallengePasswordAttribute.NAME = "Challenge Password";
    var ExtensionsAttribute = class extends Attribute {
      constructor(...args) {
        var _a2;
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          super(args[0]);
        } else {
          const extensions = args[0];
          const value = new asn1X509__namespace.Extensions();
          for (const extension2 of extensions) {
            value.push(asn1Schema.AsnConvert.parse(extension2.rawData, asn1X509__namespace.Extension));
          }
          super(asnPkcs9__namespace.id_pkcs9_at_extensionRequest, [asn1Schema.AsnConvert.serialize(value)]);
        }
        (_a2 = this.items) !== null && _a2 !== void 0 ? _a2 : this.items = [];
      }
      onInit(asn) {
        super.onInit(asn);
        if (this.values[0]) {
          const value = asn1Schema.AsnConvert.parse(this.values[0], asn1X509__namespace.Extensions);
          this.items = value.map((o) => ExtensionFactory.create(asn1Schema.AsnConvert.serialize(o)));
        }
      }
      toTextObject() {
        const obj = this.toTextObjectWithoutValue();
        const extensions = this.items.map((o) => o.toTextObject());
        for (const extension2 of extensions) {
          obj[extension2[TextObject.NAME]] = extension2;
        }
        return obj;
      }
    };
    ExtensionsAttribute.NAME = "Extensions";
    var AttributeFactory = class {
      static register(id, type) {
        this.items.set(id, type);
      }
      static create(data) {
        const attribute = new Attribute(data);
        const Type = this.items.get(attribute.type);
        if (Type) {
          return new Type(data);
        }
        return attribute;
      }
    };
    AttributeFactory.items = /* @__PURE__ */ new Map();
    var diAsnSignatureFormatter = "crypto.signatureFormatter";
    var AsnDefaultSignatureFormatter = class {
      toAsnSignature(algorithm, signature) {
        return pvtsutils.BufferSourceConverter.toArrayBuffer(signature);
      }
      toWebSignature(algorithm, signature) {
        return pvtsutils.BufferSourceConverter.toArrayBuffer(signature);
      }
    };
    var RsaAlgorithm_1;
    exports.RsaAlgorithm = RsaAlgorithm_1 = class RsaAlgorithm {
      static createPssParams(hash, saltLength) {
        const hashAlgorithm = RsaAlgorithm_1.getHashAlgorithm(hash);
        if (!hashAlgorithm) {
          return null;
        }
        return new asn1Rsa__namespace.RsaSaPssParams({
          hashAlgorithm,
          maskGenAlgorithm: new asn1X509.AlgorithmIdentifier({
            algorithm: asn1Rsa__namespace.id_mgf1,
            parameters: asn1Schema.AsnConvert.serialize(hashAlgorithm)
          }),
          saltLength
        });
      }
      static getHashAlgorithm(alg) {
        const algProv = tsyringe.container.resolve(diAlgorithmProvider);
        if (typeof alg === "string") {
          return algProv.toAsnAlgorithm({ name: alg });
        }
        if (typeof alg === "object" && alg && "name" in alg) {
          return algProv.toAsnAlgorithm(alg);
        }
        return null;
      }
      toAsnAlgorithm(alg) {
        switch (alg.name.toLowerCase()) {
          case "rsassa-pkcs1-v1_5":
            if ("hash" in alg) {
              let hash;
              if (typeof alg.hash === "string") {
                hash = alg.hash;
              } else if (alg.hash && typeof alg.hash === "object" && "name" in alg.hash && typeof alg.hash.name === "string") {
                hash = alg.hash.name.toUpperCase();
              } else {
                throw new Error("Cannot get hash algorithm name");
              }
              switch (hash.toLowerCase()) {
                case "sha-1":
                  return new asn1X509.AlgorithmIdentifier({
                    algorithm: asn1Rsa__namespace.id_sha1WithRSAEncryption,
                    parameters: null
                  });
                case "sha-256":
                  return new asn1X509.AlgorithmIdentifier({
                    algorithm: asn1Rsa__namespace.id_sha256WithRSAEncryption,
                    parameters: null
                  });
                case "sha-384":
                  return new asn1X509.AlgorithmIdentifier({
                    algorithm: asn1Rsa__namespace.id_sha384WithRSAEncryption,
                    parameters: null
                  });
                case "sha-512":
                  return new asn1X509.AlgorithmIdentifier({
                    algorithm: asn1Rsa__namespace.id_sha512WithRSAEncryption,
                    parameters: null
                  });
              }
            } else {
              return new asn1X509.AlgorithmIdentifier({
                algorithm: asn1Rsa__namespace.id_rsaEncryption,
                parameters: null
              });
            }
            break;
          case "rsa-pss":
            if ("hash" in alg) {
              if (!("saltLength" in alg && typeof alg.saltLength === "number")) {
                throw new Error("Cannot get 'saltLength' from 'alg' argument");
              }
              const pssParams = RsaAlgorithm_1.createPssParams(alg.hash, alg.saltLength);
              if (!pssParams) {
                throw new Error("Cannot create PSS parameters");
              }
              return new asn1X509.AlgorithmIdentifier({
                algorithm: asn1Rsa__namespace.id_RSASSA_PSS,
                parameters: asn1Schema.AsnConvert.serialize(pssParams)
              });
            } else {
              return new asn1X509.AlgorithmIdentifier({
                algorithm: asn1Rsa__namespace.id_RSASSA_PSS,
                parameters: null
              });
            }
        }
        return null;
      }
      toWebAlgorithm(alg) {
        switch (alg.algorithm) {
          case asn1Rsa__namespace.id_rsaEncryption:
            return { name: "RSASSA-PKCS1-v1_5" };
          case asn1Rsa__namespace.id_sha1WithRSAEncryption:
            return {
              name: "RSASSA-PKCS1-v1_5",
              hash: { name: "SHA-1" }
            };
          case asn1Rsa__namespace.id_sha256WithRSAEncryption:
            return {
              name: "RSASSA-PKCS1-v1_5",
              hash: { name: "SHA-256" }
            };
          case asn1Rsa__namespace.id_sha384WithRSAEncryption:
            return {
              name: "RSASSA-PKCS1-v1_5",
              hash: { name: "SHA-384" }
            };
          case asn1Rsa__namespace.id_sha512WithRSAEncryption:
            return {
              name: "RSASSA-PKCS1-v1_5",
              hash: { name: "SHA-512" }
            };
          case asn1Rsa__namespace.id_RSASSA_PSS:
            if (alg.parameters) {
              const pssParams = asn1Schema.AsnConvert.parse(alg.parameters, asn1Rsa__namespace.RsaSaPssParams);
              const algProv = tsyringe.container.resolve(diAlgorithmProvider);
              const hashAlg = algProv.toWebAlgorithm(pssParams.hashAlgorithm);
              return {
                name: "RSA-PSS",
                hash: hashAlg,
                saltLength: pssParams.saltLength
              };
            } else {
              return { name: "RSA-PSS" };
            }
        }
        return null;
      }
    };
    exports.RsaAlgorithm = RsaAlgorithm_1 = tslib.__decorate([
      tsyringe.injectable()
    ], exports.RsaAlgorithm);
    tsyringe.container.registerSingleton(diAlgorithm, exports.RsaAlgorithm);
    exports.ShaAlgorithm = class ShaAlgorithm {
      toAsnAlgorithm(alg) {
        switch (alg.name.toLowerCase()) {
          case "sha-1":
            return new asn1X509.AlgorithmIdentifier({ algorithm: asn1Rsa.id_sha1 });
          case "sha-256":
            return new asn1X509.AlgorithmIdentifier({ algorithm: asn1Rsa.id_sha256 });
          case "sha-384":
            return new asn1X509.AlgorithmIdentifier({ algorithm: asn1Rsa.id_sha384 });
          case "sha-512":
            return new asn1X509.AlgorithmIdentifier({ algorithm: asn1Rsa.id_sha512 });
        }
        return null;
      }
      toWebAlgorithm(alg) {
        switch (alg.algorithm) {
          case asn1Rsa.id_sha1:
            return { name: "SHA-1" };
          case asn1Rsa.id_sha256:
            return { name: "SHA-256" };
          case asn1Rsa.id_sha384:
            return { name: "SHA-384" };
          case asn1Rsa.id_sha512:
            return { name: "SHA-512" };
        }
        return null;
      }
    };
    exports.ShaAlgorithm = tslib.__decorate([
      tsyringe.injectable()
    ], exports.ShaAlgorithm);
    tsyringe.container.registerSingleton(diAlgorithm, exports.ShaAlgorithm);
    var AsnEcSignatureFormatter = class _AsnEcSignatureFormatter {
      addPadding(pointSize, data) {
        const bytes = pvtsutils.BufferSourceConverter.toUint8Array(data);
        const res = new Uint8Array(pointSize);
        res.set(bytes, pointSize - bytes.length);
        return res.buffer;
      }
      removePadding(data, positive = false) {
        let bytes = pvtsutils.BufferSourceConverter.toUint8Array(data);
        for (let i = 0; i < bytes.length; i++) {
          if (!bytes[i]) {
            continue;
          }
          bytes = bytes.slice(i);
          break;
        }
        if (positive && bytes[0] > 127) {
          const result = new Uint8Array(bytes.length + 1);
          result.set(bytes, 1);
          return result.buffer;
        }
        return bytes.buffer;
      }
      toAsnSignature(algorithm, signature) {
        if (algorithm.name === "ECDSA") {
          const namedCurve = algorithm.namedCurve;
          const pointSize = _AsnEcSignatureFormatter.namedCurveSize.get(namedCurve) || _AsnEcSignatureFormatter.defaultNamedCurveSize;
          const ecSignature = new asn1Ecc.ECDSASigValue();
          const uint8Signature = pvtsutils.BufferSourceConverter.toUint8Array(signature);
          ecSignature.r = this.removePadding(uint8Signature.slice(0, pointSize), true);
          ecSignature.s = this.removePadding(uint8Signature.slice(pointSize, pointSize + pointSize), true);
          return asn1Schema.AsnConvert.serialize(ecSignature);
        }
        return null;
      }
      toWebSignature(algorithm, signature) {
        if (algorithm.name === "ECDSA") {
          const ecSigValue = asn1Schema.AsnConvert.parse(signature, asn1Ecc.ECDSASigValue);
          const namedCurve = algorithm.namedCurve;
          const pointSize = _AsnEcSignatureFormatter.namedCurveSize.get(namedCurve) || _AsnEcSignatureFormatter.defaultNamedCurveSize;
          const r = this.addPadding(pointSize, this.removePadding(ecSigValue.r));
          const s = this.addPadding(pointSize, this.removePadding(ecSigValue.s));
          return pvtsutils.combine(r, s);
        }
        return null;
      }
    };
    AsnEcSignatureFormatter.namedCurveSize = /* @__PURE__ */ new Map();
    AsnEcSignatureFormatter.defaultNamedCurveSize = 32;
    var idX25519 = "1.3.101.110";
    var idX448 = "1.3.101.111";
    var idEd25519 = "1.3.101.112";
    var idEd448 = "1.3.101.113";
    exports.EdAlgorithm = class EdAlgorithm {
      toAsnAlgorithm(alg) {
        let algorithm = null;
        switch (alg.name.toLowerCase()) {
          case "ed25519":
            algorithm = idEd25519;
            break;
          case "x25519":
            algorithm = idX25519;
            break;
          case "eddsa":
            switch (alg.namedCurve.toLowerCase()) {
              case "ed25519":
                algorithm = idEd25519;
                break;
              case "ed448":
                algorithm = idEd448;
                break;
            }
            break;
          case "ecdh-es":
            switch (alg.namedCurve.toLowerCase()) {
              case "x25519":
                algorithm = idX25519;
                break;
              case "x448":
                algorithm = idX448;
                break;
            }
        }
        if (algorithm) {
          return new asn1X509.AlgorithmIdentifier({ algorithm });
        }
        return null;
      }
      toWebAlgorithm(alg) {
        switch (alg.algorithm) {
          case idEd25519:
            return { name: "Ed25519" };
          case idEd448:
            return {
              name: "EdDSA",
              namedCurve: "Ed448"
            };
          case idX25519:
            return { name: "X25519" };
          case idX448:
            return {
              name: "ECDH-ES",
              namedCurve: "X448"
            };
        }
        return null;
      }
    };
    exports.EdAlgorithm = tslib.__decorate([
      tsyringe.injectable()
    ], exports.EdAlgorithm);
    tsyringe.container.registerSingleton(diAlgorithm, exports.EdAlgorithm);
    var _Pkcs10CertificateRequest_tbs;
    var _Pkcs10CertificateRequest_subjectName;
    var _Pkcs10CertificateRequest_subject;
    var _Pkcs10CertificateRequest_signatureAlgorithm;
    var _Pkcs10CertificateRequest_signature;
    var _Pkcs10CertificateRequest_publicKey;
    var _Pkcs10CertificateRequest_attributes;
    var _Pkcs10CertificateRequest_extensions;
    var Pkcs10CertificateRequest = class extends PemData {
      get subjectName() {
        if (!tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_subjectName, "f")) {
          tslib.__classPrivateFieldSet(this, _Pkcs10CertificateRequest_subjectName, new Name(this.asn.certificationRequestInfo.subject), "f");
        }
        return tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_subjectName, "f");
      }
      get subject() {
        if (!tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_subject, "f")) {
          tslib.__classPrivateFieldSet(this, _Pkcs10CertificateRequest_subject, this.subjectName.toString(), "f");
        }
        return tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_subject, "f");
      }
      get signatureAlgorithm() {
        if (!tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_signatureAlgorithm, "f")) {
          const algProv = tsyringe.container.resolve(diAlgorithmProvider);
          tslib.__classPrivateFieldSet(this, _Pkcs10CertificateRequest_signatureAlgorithm, algProv.toWebAlgorithm(this.asn.signatureAlgorithm), "f");
        }
        return tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_signatureAlgorithm, "f");
      }
      get signature() {
        if (!tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_signature, "f")) {
          tslib.__classPrivateFieldSet(this, _Pkcs10CertificateRequest_signature, this.asn.signature, "f");
        }
        return tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_signature, "f");
      }
      get publicKey() {
        if (!tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_publicKey, "f")) {
          tslib.__classPrivateFieldSet(this, _Pkcs10CertificateRequest_publicKey, new PublicKey(this.asn.certificationRequestInfo.subjectPKInfo), "f");
        }
        return tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_publicKey, "f");
      }
      get attributes() {
        if (!tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_attributes, "f")) {
          tslib.__classPrivateFieldSet(this, _Pkcs10CertificateRequest_attributes, this.asn.certificationRequestInfo.attributes.map((o) => AttributeFactory.create(asn1Schema.AsnConvert.serialize(o))), "f");
        }
        return tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_attributes, "f");
      }
      get extensions() {
        if (!tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_extensions, "f")) {
          tslib.__classPrivateFieldSet(this, _Pkcs10CertificateRequest_extensions, [], "f");
          const extensions = this.getAttribute(asnPkcs9.id_pkcs9_at_extensionRequest);
          if (extensions instanceof ExtensionsAttribute) {
            tslib.__classPrivateFieldSet(this, _Pkcs10CertificateRequest_extensions, extensions.items, "f");
          }
        }
        return tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_extensions, "f");
      }
      get tbs() {
        if (!tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_tbs, "f")) {
          tslib.__classPrivateFieldSet(this, _Pkcs10CertificateRequest_tbs, this.asn.certificationRequestInfoRaw || asn1Schema.AsnConvert.serialize(this.asn.certificationRequestInfo), "f");
        }
        return tslib.__classPrivateFieldGet(this, _Pkcs10CertificateRequest_tbs, "f");
      }
      constructor(param) {
        const args = PemData.isAsnEncoded(param) ? [param, asn1Csr.CertificationRequest] : [param];
        super(args[0], args[1]);
        _Pkcs10CertificateRequest_tbs.set(this, void 0);
        _Pkcs10CertificateRequest_subjectName.set(this, void 0);
        _Pkcs10CertificateRequest_subject.set(this, void 0);
        _Pkcs10CertificateRequest_signatureAlgorithm.set(this, void 0);
        _Pkcs10CertificateRequest_signature.set(this, void 0);
        _Pkcs10CertificateRequest_publicKey.set(this, void 0);
        _Pkcs10CertificateRequest_attributes.set(this, void 0);
        _Pkcs10CertificateRequest_extensions.set(this, void 0);
        this.tag = PemConverter.CertificateRequestTag;
      }
      onInit(_asn) {
      }
      getAttribute(type) {
        for (const attr of this.attributes) {
          if (attr.type === type) {
            return attr;
          }
        }
        return null;
      }
      getAttributes(type) {
        return this.attributes.filter((o) => o.type === type);
      }
      getExtension(type) {
        for (const ext of this.extensions) {
          if (ext.type === type) {
            return ext;
          }
        }
        return null;
      }
      getExtensions(type) {
        return this.extensions.filter((o) => o.type === type);
      }
      async verify(crypto2 = cryptoProvider.get()) {
        const algorithm = {
          ...this.publicKey.algorithm,
          ...this.signatureAlgorithm
        };
        const publicKey = await this.publicKey.export(algorithm, ["verify"], crypto2);
        const signatureFormatters = tsyringe.container.resolveAll(diAsnSignatureFormatter).reverse();
        let signature = null;
        for (const signatureFormatter of signatureFormatters) {
          signature = signatureFormatter.toWebSignature(algorithm, this.signature);
          if (signature) {
            break;
          }
        }
        if (!signature) {
          throw Error("Cannot convert WebCrypto signature value to ASN.1 format");
        }
        const ok = await crypto2.subtle.verify(this.signatureAlgorithm, publicKey, signature, this.tbs);
        return ok;
      }
      toTextObject() {
        const obj = this.toTextObjectEmpty();
        const req = asn1Schema.AsnConvert.parse(this.rawData, asn1Csr.CertificationRequest);
        const tbs = req.certificationRequestInfo;
        const data = new TextObject("", {
          Version: `${asn1X509.Version[tbs.version]} (${tbs.version})`,
          Subject: this.subject,
          "Subject Public Key Info": this.publicKey
        });
        if (this.attributes.length) {
          const attrs = new TextObject("");
          for (const ext of this.attributes) {
            const attrObj = ext.toTextObject();
            attrs[attrObj[TextObject.NAME]] = attrObj;
          }
          data["Attributes"] = attrs;
        }
        obj["Data"] = data;
        obj["Signature"] = new TextObject("", {
          Algorithm: TextConverter.serializeAlgorithm(req.signatureAlgorithm),
          "": req.signature
        });
        return obj;
      }
    };
    _Pkcs10CertificateRequest_tbs = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_subjectName = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_subject = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_signatureAlgorithm = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_signature = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_publicKey = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_attributes = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_extensions = /* @__PURE__ */ new WeakMap();
    Pkcs10CertificateRequest.NAME = "PKCS#10 Certificate Request";
    var Pkcs10CertificateRequestGenerator = class {
      static async create(params, crypto2 = cryptoProvider.get()) {
        if (!params.keys.privateKey) {
          throw new Error("Bad field 'keys' in 'params' argument. 'privateKey' is empty");
        }
        if (!params.keys.publicKey) {
          throw new Error("Bad field 'keys' in 'params' argument. 'publicKey' is empty");
        }
        const spki = await crypto2.subtle.exportKey("spki", params.keys.publicKey);
        const asnReq = new asn1Csr.CertificationRequest({
          certificationRequestInfo: new asn1Csr.CertificationRequestInfo({ subjectPKInfo: asn1Schema.AsnConvert.parse(spki, asn1X509.SubjectPublicKeyInfo) })
        });
        if (params.name) {
          const name = params.name instanceof Name ? params.name : new Name(params.name);
          asnReq.certificationRequestInfo.subject = asn1Schema.AsnConvert.parse(name.toArrayBuffer(), asn1X509.Name);
        }
        if (params.attributes) {
          for (const o of params.attributes) {
            asnReq.certificationRequestInfo.attributes.push(asn1Schema.AsnConvert.parse(o.rawData, asn1X509.Attribute));
          }
        }
        if (params.extensions && params.extensions.length) {
          const attr = new asn1X509.Attribute({ type: asnPkcs9.id_pkcs9_at_extensionRequest });
          const extensions = new asn1X509.Extensions();
          for (const o of params.extensions) {
            extensions.push(asn1Schema.AsnConvert.parse(o.rawData, asn1X509.Extension));
          }
          attr.values.push(asn1Schema.AsnConvert.serialize(extensions));
          asnReq.certificationRequestInfo.attributes.push(attr);
        }
        const signingAlgorithm = {
          ...params.signingAlgorithm,
          ...params.keys.privateKey.algorithm
        };
        const algProv = tsyringe.container.resolve(diAlgorithmProvider);
        asnReq.signatureAlgorithm = algProv.toAsnAlgorithm(signingAlgorithm);
        const tbs = asn1Schema.AsnConvert.serialize(asnReq.certificationRequestInfo);
        const signature = await crypto2.subtle.sign(signingAlgorithm, params.keys.privateKey, tbs);
        const signatureFormatters = tsyringe.container.resolveAll(diAsnSignatureFormatter).reverse();
        let asnSignature = null;
        for (const signatureFormatter of signatureFormatters) {
          asnSignature = signatureFormatter.toAsnSignature(signingAlgorithm, signature);
          if (asnSignature) {
            break;
          }
        }
        if (!asnSignature) {
          throw Error("Cannot convert WebCrypto signature value to ASN.1 format");
        }
        asnReq.signature = asnSignature;
        return new Pkcs10CertificateRequest(asn1Schema.AsnConvert.serialize(asnReq));
      }
    };
    var _X509Certificate_tbs;
    var _X509Certificate_serialNumber;
    var _X509Certificate_subjectName;
    var _X509Certificate_subject;
    var _X509Certificate_issuerName;
    var _X509Certificate_issuer;
    var _X509Certificate_notBefore;
    var _X509Certificate_notAfter;
    var _X509Certificate_signatureAlgorithm;
    var _X509Certificate_signature;
    var _X509Certificate_extensions;
    var _X509Certificate_publicKey;
    var X509Certificate2 = class extends PemData {
      get publicKey() {
        if (!tslib.__classPrivateFieldGet(this, _X509Certificate_publicKey, "f")) {
          tslib.__classPrivateFieldSet(this, _X509Certificate_publicKey, new PublicKey(this.asn.tbsCertificate.subjectPublicKeyInfo), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Certificate_publicKey, "f");
      }
      get serialNumber() {
        if (!tslib.__classPrivateFieldGet(this, _X509Certificate_serialNumber, "f")) {
          const tbs = this.asn.tbsCertificate;
          let serialNumberBytes = new Uint8Array(tbs.serialNumber);
          if (serialNumberBytes.length > 1 && serialNumberBytes[0] === 0 && serialNumberBytes[1] > 127) {
            serialNumberBytes = serialNumberBytes.slice(1);
          }
          tslib.__classPrivateFieldSet(this, _X509Certificate_serialNumber, pvtsutils.Convert.ToHex(serialNumberBytes), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Certificate_serialNumber, "f");
      }
      get subjectName() {
        if (!tslib.__classPrivateFieldGet(this, _X509Certificate_subjectName, "f")) {
          tslib.__classPrivateFieldSet(this, _X509Certificate_subjectName, new Name(this.asn.tbsCertificate.subject), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Certificate_subjectName, "f");
      }
      get subject() {
        if (!tslib.__classPrivateFieldGet(this, _X509Certificate_subject, "f")) {
          tslib.__classPrivateFieldSet(this, _X509Certificate_subject, this.subjectName.toString(), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Certificate_subject, "f");
      }
      get issuerName() {
        if (!tslib.__classPrivateFieldGet(this, _X509Certificate_issuerName, "f")) {
          tslib.__classPrivateFieldSet(this, _X509Certificate_issuerName, new Name(this.asn.tbsCertificate.issuer), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Certificate_issuerName, "f");
      }
      get issuer() {
        if (!tslib.__classPrivateFieldGet(this, _X509Certificate_issuer, "f")) {
          tslib.__classPrivateFieldSet(this, _X509Certificate_issuer, this.issuerName.toString(), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Certificate_issuer, "f");
      }
      get notBefore() {
        if (!tslib.__classPrivateFieldGet(this, _X509Certificate_notBefore, "f")) {
          const notBefore = this.asn.tbsCertificate.validity.notBefore.utcTime || this.asn.tbsCertificate.validity.notBefore.generalTime;
          if (!notBefore) {
            throw new Error("Cannot get 'notBefore' value");
          }
          tslib.__classPrivateFieldSet(this, _X509Certificate_notBefore, notBefore, "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Certificate_notBefore, "f");
      }
      get notAfter() {
        if (!tslib.__classPrivateFieldGet(this, _X509Certificate_notAfter, "f")) {
          const notAfter = this.asn.tbsCertificate.validity.notAfter.utcTime || this.asn.tbsCertificate.validity.notAfter.generalTime;
          if (!notAfter) {
            throw new Error("Cannot get 'notAfter' value");
          }
          tslib.__classPrivateFieldSet(this, _X509Certificate_notAfter, notAfter, "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Certificate_notAfter, "f");
      }
      get signatureAlgorithm() {
        if (!tslib.__classPrivateFieldGet(this, _X509Certificate_signatureAlgorithm, "f")) {
          const algProv = tsyringe.container.resolve(diAlgorithmProvider);
          tslib.__classPrivateFieldSet(this, _X509Certificate_signatureAlgorithm, algProv.toWebAlgorithm(this.asn.signatureAlgorithm), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Certificate_signatureAlgorithm, "f");
      }
      get signature() {
        if (!tslib.__classPrivateFieldGet(this, _X509Certificate_signature, "f")) {
          tslib.__classPrivateFieldSet(this, _X509Certificate_signature, this.asn.signatureValue, "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Certificate_signature, "f");
      }
      get extensions() {
        if (!tslib.__classPrivateFieldGet(this, _X509Certificate_extensions, "f")) {
          tslib.__classPrivateFieldSet(this, _X509Certificate_extensions, [], "f");
          if (this.asn.tbsCertificate.extensions) {
            tslib.__classPrivateFieldSet(this, _X509Certificate_extensions, this.asn.tbsCertificate.extensions.map((o) => ExtensionFactory.create(asn1Schema.AsnConvert.serialize(o))), "f");
          }
        }
        return tslib.__classPrivateFieldGet(this, _X509Certificate_extensions, "f");
      }
      get tbs() {
        if (!tslib.__classPrivateFieldGet(this, _X509Certificate_tbs, "f")) {
          tslib.__classPrivateFieldSet(this, _X509Certificate_tbs, this.asn.tbsCertificateRaw || asn1Schema.AsnConvert.serialize(this.asn.tbsCertificate), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Certificate_tbs, "f");
      }
      constructor(param) {
        const args = PemData.isAsnEncoded(param) ? [param, asn1X509.Certificate] : [param];
        super(args[0], args[1]);
        _X509Certificate_tbs.set(this, void 0);
        _X509Certificate_serialNumber.set(this, void 0);
        _X509Certificate_subjectName.set(this, void 0);
        _X509Certificate_subject.set(this, void 0);
        _X509Certificate_issuerName.set(this, void 0);
        _X509Certificate_issuer.set(this, void 0);
        _X509Certificate_notBefore.set(this, void 0);
        _X509Certificate_notAfter.set(this, void 0);
        _X509Certificate_signatureAlgorithm.set(this, void 0);
        _X509Certificate_signature.set(this, void 0);
        _X509Certificate_extensions.set(this, void 0);
        _X509Certificate_publicKey.set(this, void 0);
        this.tag = PemConverter.CertificateTag;
      }
      onInit(_asn) {
      }
      getExtension(type) {
        for (const ext of this.extensions) {
          if (typeof type === "string") {
            if (ext.type === type) {
              return ext;
            }
          } else {
            if (ext instanceof type) {
              return ext;
            }
          }
        }
        return null;
      }
      getExtensions(type) {
        return this.extensions.filter((o) => {
          if (typeof type === "string") {
            return o.type === type;
          } else {
            return o instanceof type;
          }
        });
      }
      async verify(params = {}, crypto2 = cryptoProvider.get()) {
        let keyAlgorithm;
        let publicKey;
        const paramsKey = params.publicKey;
        try {
          if (!paramsKey) {
            keyAlgorithm = {
              ...this.publicKey.algorithm,
              ...this.signatureAlgorithm
            };
            publicKey = await this.publicKey.export(keyAlgorithm, ["verify"], crypto2);
          } else if ("publicKey" in paramsKey) {
            keyAlgorithm = {
              ...paramsKey.publicKey.algorithm,
              ...this.signatureAlgorithm
            };
            publicKey = await paramsKey.publicKey.export(keyAlgorithm, ["verify"], crypto2);
          } else if (paramsKey instanceof PublicKey) {
            keyAlgorithm = {
              ...paramsKey.algorithm,
              ...this.signatureAlgorithm
            };
            publicKey = await paramsKey.export(keyAlgorithm, ["verify"], crypto2);
          } else if (pvtsutils.BufferSourceConverter.isBufferSource(paramsKey)) {
            const key = new PublicKey(paramsKey);
            keyAlgorithm = {
              ...key.algorithm,
              ...this.signatureAlgorithm
            };
            publicKey = await key.export(keyAlgorithm, ["verify"], crypto2);
          } else {
            keyAlgorithm = {
              ...paramsKey.algorithm,
              ...this.signatureAlgorithm
            };
            publicKey = paramsKey;
          }
        } catch {
          return false;
        }
        const signatureFormatters = tsyringe.container.resolveAll(diAsnSignatureFormatter).reverse();
        let signature = null;
        for (const signatureFormatter of signatureFormatters) {
          signature = signatureFormatter.toWebSignature(keyAlgorithm, this.signature);
          if (signature) {
            break;
          }
        }
        if (!signature) {
          throw Error("Cannot convert ASN.1 signature value to WebCrypto format");
        }
        const ok = await crypto2.subtle.verify(this.signatureAlgorithm, publicKey, signature, this.tbs);
        if (params.signatureOnly) {
          return ok;
        } else {
          const date = params.date || /* @__PURE__ */ new Date();
          const time = date.getTime();
          return ok && this.notBefore.getTime() < time && time < this.notAfter.getTime();
        }
      }
      async getThumbprint(...args) {
        let crypto2;
        let algorithm = "SHA-1";
        if (args[0]) {
          if (!args[0].subtle) {
            algorithm = args[0] || algorithm;
            crypto2 = args[1];
          } else {
            crypto2 = args[0];
          }
        }
        crypto2 !== null && crypto2 !== void 0 ? crypto2 : crypto2 = cryptoProvider.get();
        return await crypto2.subtle.digest(algorithm, this.rawData);
      }
      async isSelfSigned(crypto2 = cryptoProvider.get()) {
        return this.subject === this.issuer && await this.verify({ signatureOnly: true }, crypto2);
      }
      toTextObject() {
        const obj = this.toTextObjectEmpty();
        const cert = asn1Schema.AsnConvert.parse(this.rawData, asn1X509.Certificate);
        const tbs = cert.tbsCertificate;
        const data = new TextObject("", {
          Version: `${asn1X509.Version[tbs.version]} (${tbs.version})`,
          "Serial Number": tbs.serialNumber,
          "Signature Algorithm": TextConverter.serializeAlgorithm(tbs.signature),
          Issuer: this.issuer,
          Validity: new TextObject("", {
            "Not Before": tbs.validity.notBefore.getTime(),
            "Not After": tbs.validity.notAfter.getTime()
          }),
          Subject: this.subject,
          "Subject Public Key Info": this.publicKey
        });
        if (tbs.issuerUniqueID) {
          data["Issuer Unique ID"] = tbs.issuerUniqueID;
        }
        if (tbs.subjectUniqueID) {
          data["Subject Unique ID"] = tbs.subjectUniqueID;
        }
        if (this.extensions.length) {
          const extensions = new TextObject("");
          for (const ext of this.extensions) {
            const extObj = ext.toTextObject();
            extensions[extObj[TextObject.NAME]] = extObj;
          }
          data["Extensions"] = extensions;
        }
        obj["Data"] = data;
        obj["Signature"] = new TextObject("", {
          Algorithm: TextConverter.serializeAlgorithm(cert.signatureAlgorithm),
          "": cert.signatureValue
        });
        return obj;
      }
    };
    _X509Certificate_tbs = /* @__PURE__ */ new WeakMap(), _X509Certificate_serialNumber = /* @__PURE__ */ new WeakMap(), _X509Certificate_subjectName = /* @__PURE__ */ new WeakMap(), _X509Certificate_subject = /* @__PURE__ */ new WeakMap(), _X509Certificate_issuerName = /* @__PURE__ */ new WeakMap(), _X509Certificate_issuer = /* @__PURE__ */ new WeakMap(), _X509Certificate_notBefore = /* @__PURE__ */ new WeakMap(), _X509Certificate_notAfter = /* @__PURE__ */ new WeakMap(), _X509Certificate_signatureAlgorithm = /* @__PURE__ */ new WeakMap(), _X509Certificate_signature = /* @__PURE__ */ new WeakMap(), _X509Certificate_extensions = /* @__PURE__ */ new WeakMap(), _X509Certificate_publicKey = /* @__PURE__ */ new WeakMap();
    X509Certificate2.NAME = "Certificate";
    var X509Certificates = class extends Array {
      constructor(param) {
        super();
        if (PemData.isAsnEncoded(param)) {
          this.import(param);
        } else if (param instanceof X509Certificate2) {
          this.push(param);
        } else if (Array.isArray(param)) {
          for (const item of param) {
            this.push(item);
          }
        }
      }
      export(format) {
        const signedData = new asn1Cms__namespace.SignedData();
        signedData.version = 1;
        signedData.encapContentInfo.eContentType = asn1Cms__namespace.id_data;
        signedData.encapContentInfo.eContent = new asn1Cms__namespace.EncapsulatedContent({ single: new asn1Schema.OctetString() });
        signedData.certificates = new asn1Cms__namespace.CertificateSet(this.map((o) => new asn1Cms__namespace.CertificateChoices({ certificate: asn1Schema.AsnConvert.parse(o.rawData, asn1X509.Certificate) })));
        const cms = new asn1Cms__namespace.ContentInfo({
          contentType: asn1Cms__namespace.id_signedData,
          content: asn1Schema.AsnConvert.serialize(signedData)
        });
        const raw = asn1Schema.AsnConvert.serialize(cms);
        if (format === "raw") {
          return raw;
        }
        return this.toString(format);
      }
      import(data) {
        const raw = PemData.toArrayBuffer(data);
        const cms = asn1Schema.AsnConvert.parse(raw, asn1Cms__namespace.ContentInfo);
        if (cms.contentType !== asn1Cms__namespace.id_signedData) {
          throw new TypeError("Cannot parse CMS package. Incoming data is not a SignedData object.");
        }
        const signedData = asn1Schema.AsnConvert.parse(cms.content, asn1Cms__namespace.SignedData);
        this.clear();
        for (const item of signedData.certificates || []) {
          if (item.certificate) {
            this.push(new X509Certificate2(item.certificate));
          }
        }
      }
      clear() {
        while (this.pop()) {
        }
      }
      toString(format = "pem") {
        const raw = this.export("raw");
        switch (format) {
          case "pem":
            return PemConverter.encode(raw, "CMS");
          case "pem-chain":
            return this.map((o) => o.toString("pem")).join("\n");
          case "asn":
            return asn1Schema.AsnConvert.toString(raw);
          case "hex":
            return pvtsutils.Convert.ToHex(raw);
          case "base64":
            return pvtsutils.Convert.ToBase64(raw);
          case "base64url":
            return pvtsutils.Convert.ToBase64Url(raw);
          case "text":
            return TextConverter.serialize(this.toTextObject());
          default:
            throw TypeError("Argument 'format' is unsupported value");
        }
      }
      toTextObject() {
        const contentInfo = asn1Schema.AsnConvert.parse(this.export("raw"), asn1Cms__namespace.ContentInfo);
        const signedData = asn1Schema.AsnConvert.parse(contentInfo.content, asn1Cms__namespace.SignedData);
        const obj = new TextObject("X509Certificates", {
          "Content Type": OidSerializer.toString(contentInfo.contentType),
          Content: new TextObject("", {
            Version: `${asn1Cms__namespace.CMSVersion[signedData.version]} (${signedData.version})`,
            Certificates: new TextObject("", { Certificate: this.map((o) => o.toTextObject()) })
          })
        });
        return obj;
      }
    };
    var X509ChainBuilder = class {
      constructor(params = {}) {
        this.certificates = [];
        if (params.certificates) {
          this.certificates = params.certificates;
        }
      }
      async build(cert, crypto2 = cryptoProvider.get()) {
        const chain = new X509Certificates(cert);
        let current = cert;
        while (current = await this.findIssuer(current, crypto2)) {
          const thumbprint = await current.getThumbprint(crypto2);
          for (const item of chain) {
            const thumbprint2 = await item.getThumbprint(crypto2);
            if (pvtsutils.isEqual(thumbprint, thumbprint2)) {
              throw new Error("Cannot build a certificate chain. Circular dependency.");
            }
          }
          chain.push(current);
        }
        return chain;
      }
      async findIssuer(cert, crypto2 = cryptoProvider.get()) {
        if (!await cert.isSelfSigned(crypto2)) {
          const akiExt = cert.getExtension(asn1X509__namespace.id_ce_authorityKeyIdentifier);
          for (const item of this.certificates) {
            if (item.subject !== cert.issuer) {
              continue;
            }
            if (akiExt) {
              if (akiExt.keyId) {
                const skiExt = item.getExtension(asn1X509__namespace.id_ce_subjectKeyIdentifier);
                if (skiExt && skiExt.keyId !== akiExt.keyId) {
                  continue;
                }
              } else if (akiExt.certId) {
                const sanExt = item.getExtension(asn1X509__namespace.id_ce_subjectAltName);
                if (sanExt && !(akiExt.certId.serialNumber === item.serialNumber && pvtsutils.isEqual(asn1Schema.AsnConvert.serialize(akiExt.certId.name), asn1Schema.AsnConvert.serialize(sanExt)))) {
                  continue;
                }
              }
            }
            try {
              const algorithm = {
                ...item.publicKey.algorithm,
                ...cert.signatureAlgorithm
              };
              const publicKey = await item.publicKey.export(algorithm, ["verify"], crypto2);
              const ok = await cert.verify({
                publicKey,
                signatureOnly: true
              }, crypto2);
              if (!ok) {
                continue;
              }
            } catch {
              continue;
            }
            return item;
          }
        }
        return null;
      }
    };
    function generateCertificateSerialNumber(input, crypto2 = cryptoProvider.get()) {
      const inputView = pvtsutils.BufferSourceConverter.toUint8Array(pvtsutils.Convert.FromHex(input || ""));
      let serialNumber = inputView && inputView.length && inputView.some((o) => o > 0) ? new Uint8Array(inputView) : void 0;
      if (!serialNumber) {
        serialNumber = crypto2.getRandomValues(new Uint8Array(16));
      }
      let firstNonZero = 0;
      while (firstNonZero < serialNumber.length - 1 && serialNumber[firstNonZero] === 0) {
        firstNonZero++;
      }
      serialNumber = serialNumber.slice(firstNonZero);
      if (serialNumber[0] > 127) {
        const newSerialNumber = new Uint8Array(serialNumber.length + 1);
        newSerialNumber[0] = 0;
        newSerialNumber.set(serialNumber, 1);
        serialNumber = newSerialNumber;
      }
      return serialNumber.buffer;
    }
    var X509CertificateGenerator = class {
      static async createSelfSigned(params, crypto2 = cryptoProvider.get()) {
        if (!params.keys.privateKey) {
          throw new Error("Bad field 'keys' in 'params' argument. 'privateKey' is empty");
        }
        if (!params.keys.publicKey) {
          throw new Error("Bad field 'keys' in 'params' argument. 'publicKey' is empty");
        }
        return this.create({
          serialNumber: params.serialNumber,
          subject: params.name,
          issuer: params.name,
          notBefore: params.notBefore,
          notAfter: params.notAfter,
          publicKey: params.keys.publicKey,
          signingKey: params.keys.privateKey,
          signingAlgorithm: params.signingAlgorithm,
          extensions: params.extensions
        }, crypto2);
      }
      static async create(params, crypto2 = cryptoProvider.get()) {
        var _a2;
        let spki;
        if (params.publicKey instanceof PublicKey) {
          spki = params.publicKey.rawData;
        } else if ("publicKey" in params.publicKey) {
          spki = params.publicKey.publicKey.rawData;
        } else if (pvtsutils.BufferSourceConverter.isBufferSource(params.publicKey)) {
          spki = params.publicKey;
        } else {
          spki = await crypto2.subtle.exportKey("spki", params.publicKey);
        }
        const serialNumber = generateCertificateSerialNumber(params.serialNumber, crypto2);
        const notBefore = params.notBefore || /* @__PURE__ */ new Date();
        const notAfter = params.notAfter || new Date(notBefore.getTime() + 31536e6);
        const asnX509 = new asn1X509__namespace.Certificate({
          tbsCertificate: new asn1X509__namespace.TBSCertificate({
            version: asn1X509__namespace.Version.v3,
            serialNumber,
            validity: new asn1X509__namespace.Validity({
              notBefore,
              notAfter
            }),
            extensions: new asn1X509__namespace.Extensions(((_a2 = params.extensions) === null || _a2 === void 0 ? void 0 : _a2.map((o) => asn1Schema.AsnConvert.parse(o.rawData, asn1X509__namespace.Extension))) || []),
            subjectPublicKeyInfo: asn1Schema.AsnConvert.parse(spki, asn1X509__namespace.SubjectPublicKeyInfo)
          })
        });
        if (params.subject) {
          const name = params.subject instanceof Name ? params.subject : new Name(params.subject);
          asnX509.tbsCertificate.subject = asn1Schema.AsnConvert.parse(name.toArrayBuffer(), asn1X509__namespace.Name);
        }
        if (params.issuer) {
          const name = params.issuer instanceof Name ? params.issuer : new Name(params.issuer);
          asnX509.tbsCertificate.issuer = asn1Schema.AsnConvert.parse(name.toArrayBuffer(), asn1X509__namespace.Name);
        }
        const defaultSigningAlgorithm = { hash: "SHA-256" };
        const signatureAlgorithm = "signingKey" in params ? {
          ...defaultSigningAlgorithm,
          ...params.signingAlgorithm,
          ...params.signingKey.algorithm
        } : {
          ...defaultSigningAlgorithm,
          ...params.signingAlgorithm
        };
        const algProv = tsyringe.container.resolve(diAlgorithmProvider);
        asnX509.tbsCertificate.signature = asnX509.signatureAlgorithm = algProv.toAsnAlgorithm(signatureAlgorithm);
        const tbs = asn1Schema.AsnConvert.serialize(asnX509.tbsCertificate);
        const signatureValue = "signingKey" in params ? await crypto2.subtle.sign(signatureAlgorithm, params.signingKey, tbs) : params.signature;
        const signatureFormatters = tsyringe.container.resolveAll(diAsnSignatureFormatter).reverse();
        let asnSignature = null;
        for (const signatureFormatter of signatureFormatters) {
          asnSignature = signatureFormatter.toAsnSignature(signatureAlgorithm, signatureValue);
          if (asnSignature) {
            break;
          }
        }
        if (!asnSignature) {
          throw Error("Cannot convert ASN.1 signature value to WebCrypto format");
        }
        asnX509.signatureValue = asnSignature;
        return new X509Certificate2(asn1Schema.AsnConvert.serialize(asnX509));
      }
    };
    var _X509CrlEntry_serialNumber;
    var _X509CrlEntry_revocationDate;
    var _X509CrlEntry_reason;
    var _X509CrlEntry_invalidity;
    var _X509CrlEntry_extensions;
    exports.X509CrlReason = void 0;
    (function(X509CrlReason) {
      X509CrlReason[X509CrlReason["unspecified"] = 0] = "unspecified";
      X509CrlReason[X509CrlReason["keyCompromise"] = 1] = "keyCompromise";
      X509CrlReason[X509CrlReason["cACompromise"] = 2] = "cACompromise";
      X509CrlReason[X509CrlReason["affiliationChanged"] = 3] = "affiliationChanged";
      X509CrlReason[X509CrlReason["superseded"] = 4] = "superseded";
      X509CrlReason[X509CrlReason["cessationOfOperation"] = 5] = "cessationOfOperation";
      X509CrlReason[X509CrlReason["certificateHold"] = 6] = "certificateHold";
      X509CrlReason[X509CrlReason["removeFromCRL"] = 8] = "removeFromCRL";
      X509CrlReason[X509CrlReason["privilegeWithdrawn"] = 9] = "privilegeWithdrawn";
      X509CrlReason[X509CrlReason["aACompromise"] = 10] = "aACompromise";
    })(exports.X509CrlReason || (exports.X509CrlReason = {}));
    var X509CrlEntry = class extends AsnData {
      get serialNumber() {
        if (!tslib.__classPrivateFieldGet(this, _X509CrlEntry_serialNumber, "f")) {
          tslib.__classPrivateFieldSet(this, _X509CrlEntry_serialNumber, pvtsutils.Convert.ToHex(this.asn.userCertificate), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509CrlEntry_serialNumber, "f");
      }
      get revocationDate() {
        if (!tslib.__classPrivateFieldGet(this, _X509CrlEntry_revocationDate, "f")) {
          tslib.__classPrivateFieldSet(this, _X509CrlEntry_revocationDate, this.asn.revocationDate.getTime(), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509CrlEntry_revocationDate, "f");
      }
      get reason() {
        if (tslib.__classPrivateFieldGet(this, _X509CrlEntry_reason, "f") === void 0) {
          void this.extensions;
        }
        return tslib.__classPrivateFieldGet(this, _X509CrlEntry_reason, "f");
      }
      get invalidity() {
        if (tslib.__classPrivateFieldGet(this, _X509CrlEntry_invalidity, "f") === void 0) {
          void this.extensions;
        }
        return tslib.__classPrivateFieldGet(this, _X509CrlEntry_invalidity, "f");
      }
      get extensions() {
        if (!tslib.__classPrivateFieldGet(this, _X509CrlEntry_extensions, "f")) {
          tslib.__classPrivateFieldSet(this, _X509CrlEntry_extensions, [], "f");
          if (this.asn.crlEntryExtensions) {
            tslib.__classPrivateFieldSet(this, _X509CrlEntry_extensions, this.asn.crlEntryExtensions.map((o) => {
              const extension2 = ExtensionFactory.create(asn1Schema.AsnConvert.serialize(o));
              switch (extension2.type) {
                case asn1X509.id_ce_cRLReasons:
                  if (tslib.__classPrivateFieldGet(this, _X509CrlEntry_reason, "f") === void 0) {
                    tslib.__classPrivateFieldSet(this, _X509CrlEntry_reason, asn1Schema.AsnConvert.parse(extension2.value, asn1X509.CRLReason).reason, "f");
                  }
                  break;
                case asn1X509.id_ce_invalidityDate:
                  if (tslib.__classPrivateFieldGet(this, _X509CrlEntry_invalidity, "f") === void 0) {
                    tslib.__classPrivateFieldSet(this, _X509CrlEntry_invalidity, asn1Schema.AsnConvert.parse(extension2.value, asn1X509.InvalidityDate).value, "f");
                  }
                  break;
              }
              return extension2;
            }), "f");
          }
        }
        return tslib.__classPrivateFieldGet(this, _X509CrlEntry_extensions, "f");
      }
      constructor(...args) {
        let raw;
        if (pvtsutils.BufferSourceConverter.isBufferSource(args[0])) {
          raw = pvtsutils.BufferSourceConverter.toArrayBuffer(args[0]);
        } else if (typeof args[0] === "string") {
          raw = asn1Schema.AsnConvert.serialize(new asn1X509.RevokedCertificate({
            userCertificate: generateCertificateSerialNumber(args[0]),
            revocationDate: new asn1X509.Time(args[1]),
            crlEntryExtensions: args[2]
          }));
        } else if (args[0] instanceof asn1X509.RevokedCertificate) {
          raw = args[0];
        }
        if (!raw) {
          throw new TypeError("Cannot create X509CrlEntry instance. Wrong constructor arguments.");
        }
        super(raw, asn1X509.RevokedCertificate);
        _X509CrlEntry_serialNumber.set(this, void 0);
        _X509CrlEntry_revocationDate.set(this, void 0);
        _X509CrlEntry_reason.set(this, void 0);
        _X509CrlEntry_invalidity.set(this, void 0);
        _X509CrlEntry_extensions.set(this, void 0);
      }
      onInit(_asn) {
      }
    };
    _X509CrlEntry_serialNumber = /* @__PURE__ */ new WeakMap(), _X509CrlEntry_revocationDate = /* @__PURE__ */ new WeakMap(), _X509CrlEntry_reason = /* @__PURE__ */ new WeakMap(), _X509CrlEntry_invalidity = /* @__PURE__ */ new WeakMap(), _X509CrlEntry_extensions = /* @__PURE__ */ new WeakMap();
    var _X509Crl_tbs;
    var _X509Crl_signatureAlgorithm;
    var _X509Crl_issuerName;
    var _X509Crl_thisUpdate;
    var _X509Crl_nextUpdate;
    var _X509Crl_entries;
    var _X509Crl_extensions;
    var X509Crl = class extends PemData {
      get version() {
        return this.asn.tbsCertList.version;
      }
      get signatureAlgorithm() {
        if (!tslib.__classPrivateFieldGet(this, _X509Crl_signatureAlgorithm, "f")) {
          const algProv = tsyringe.container.resolve(diAlgorithmProvider);
          tslib.__classPrivateFieldSet(this, _X509Crl_signatureAlgorithm, algProv.toWebAlgorithm(this.asn.signatureAlgorithm), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Crl_signatureAlgorithm, "f");
      }
      get signature() {
        return this.asn.signature;
      }
      get issuer() {
        return this.issuerName.toString();
      }
      get issuerName() {
        if (!tslib.__classPrivateFieldGet(this, _X509Crl_issuerName, "f")) {
          tslib.__classPrivateFieldSet(this, _X509Crl_issuerName, new Name(this.asn.tbsCertList.issuer), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Crl_issuerName, "f");
      }
      get thisUpdate() {
        if (!tslib.__classPrivateFieldGet(this, _X509Crl_thisUpdate, "f")) {
          const thisUpdate = this.asn.tbsCertList.thisUpdate.getTime();
          if (!thisUpdate) {
            throw new Error("Cannot get 'thisUpdate' value");
          }
          tslib.__classPrivateFieldSet(this, _X509Crl_thisUpdate, thisUpdate, "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Crl_thisUpdate, "f");
      }
      get nextUpdate() {
        var _a2;
        if (tslib.__classPrivateFieldGet(this, _X509Crl_nextUpdate, "f") === void 0) {
          tslib.__classPrivateFieldSet(this, _X509Crl_nextUpdate, ((_a2 = this.asn.tbsCertList.nextUpdate) === null || _a2 === void 0 ? void 0 : _a2.getTime()) || void 0, "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Crl_nextUpdate, "f");
      }
      get entries() {
        var _a2;
        if (!tslib.__classPrivateFieldGet(this, _X509Crl_entries, "f")) {
          tslib.__classPrivateFieldSet(this, _X509Crl_entries, ((_a2 = this.asn.tbsCertList.revokedCertificates) === null || _a2 === void 0 ? void 0 : _a2.map((o) => new X509CrlEntry(o))) || [], "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Crl_entries, "f");
      }
      get extensions() {
        if (!tslib.__classPrivateFieldGet(this, _X509Crl_extensions, "f")) {
          tslib.__classPrivateFieldSet(this, _X509Crl_extensions, [], "f");
          if (this.asn.tbsCertList.crlExtensions) {
            tslib.__classPrivateFieldSet(this, _X509Crl_extensions, this.asn.tbsCertList.crlExtensions.map((o) => ExtensionFactory.create(asn1Schema.AsnConvert.serialize(o))), "f");
          }
        }
        return tslib.__classPrivateFieldGet(this, _X509Crl_extensions, "f");
      }
      get tbs() {
        if (!tslib.__classPrivateFieldGet(this, _X509Crl_tbs, "f")) {
          tslib.__classPrivateFieldSet(this, _X509Crl_tbs, this.asn.tbsCertListRaw || asn1Schema.AsnConvert.serialize(this.asn.tbsCertList), "f");
        }
        return tslib.__classPrivateFieldGet(this, _X509Crl_tbs, "f");
      }
      get tbsCertListSignatureAlgorithm() {
        return this.asn.tbsCertList.signature;
      }
      get certListSignatureAlgorithm() {
        return this.asn.signatureAlgorithm;
      }
      constructor(param) {
        super(param, PemData.isAsnEncoded(param) ? asn1X509.CertificateList : void 0);
        this.tag = PemConverter.CrlTag;
        _X509Crl_tbs.set(this, void 0);
        _X509Crl_signatureAlgorithm.set(this, void 0);
        _X509Crl_issuerName.set(this, void 0);
        _X509Crl_thisUpdate.set(this, void 0);
        _X509Crl_nextUpdate.set(this, void 0);
        _X509Crl_entries.set(this, void 0);
        _X509Crl_extensions.set(this, void 0);
      }
      onInit(_asn) {
      }
      getExtension(type) {
        for (const ext of this.extensions) {
          if (typeof type === "string") {
            if (ext.type === type) {
              return ext;
            }
          } else {
            if (ext instanceof type) {
              return ext;
            }
          }
        }
        return null;
      }
      getExtensions(type) {
        return this.extensions.filter((o) => {
          if (typeof type === "string") {
            return o.type === type;
          } else {
            return o instanceof type;
          }
        });
      }
      async verify(params, crypto2 = cryptoProvider.get()) {
        if (!this.certListSignatureAlgorithm.isEqual(this.tbsCertListSignatureAlgorithm)) {
          throw new Error("algorithm identifier in the sequence tbsCertList and CertificateList mismatch");
        }
        let keyAlgorithm;
        let publicKey;
        const paramsKey = params.publicKey;
        try {
          if (paramsKey instanceof X509Certificate2) {
            keyAlgorithm = {
              ...paramsKey.publicKey.algorithm,
              ...paramsKey.signatureAlgorithm
            };
            publicKey = await paramsKey.publicKey.export(keyAlgorithm, ["verify"]);
          } else if (paramsKey instanceof PublicKey) {
            keyAlgorithm = {
              ...paramsKey.algorithm,
              ...this.signatureAlgorithm
            };
            publicKey = await paramsKey.export(keyAlgorithm, ["verify"]);
          } else {
            keyAlgorithm = {
              ...paramsKey.algorithm,
              ...this.signatureAlgorithm
            };
            publicKey = paramsKey;
          }
        } catch {
          return false;
        }
        const signatureFormatters = tsyringe.container.resolveAll(diAsnSignatureFormatter).reverse();
        let signature = null;
        for (const signatureFormatter of signatureFormatters) {
          signature = signatureFormatter.toWebSignature(keyAlgorithm, this.signature);
          if (signature) {
            break;
          }
        }
        if (!signature) {
          throw Error("Cannot convert ASN.1 signature value to WebCrypto format");
        }
        return await crypto2.subtle.verify(this.signatureAlgorithm, publicKey, signature, this.tbs);
      }
      async getThumbprint(...args) {
        let crypto2;
        let algorithm = "SHA-1";
        if (args[0]) {
          if (!args[0].subtle) {
            algorithm = args[0] || algorithm;
            crypto2 = args[1];
          } else {
            crypto2 = args[0];
          }
        }
        crypto2 !== null && crypto2 !== void 0 ? crypto2 : crypto2 = cryptoProvider.get();
        return await crypto2.subtle.digest(algorithm, this.rawData);
      }
      findRevoked(certOrSerialNumber) {
        const serialNumber = typeof certOrSerialNumber === "string" ? certOrSerialNumber : certOrSerialNumber.serialNumber;
        const serialBuffer = generateCertificateSerialNumber(serialNumber);
        for (const revoked of this.asn.tbsCertList.revokedCertificates || []) {
          if (pvtsutils.BufferSourceConverter.isEqual(revoked.userCertificate, serialBuffer)) {
            return new X509CrlEntry(asn1Schema.AsnConvert.serialize(revoked));
          }
        }
        return null;
      }
    };
    _X509Crl_tbs = /* @__PURE__ */ new WeakMap(), _X509Crl_signatureAlgorithm = /* @__PURE__ */ new WeakMap(), _X509Crl_issuerName = /* @__PURE__ */ new WeakMap(), _X509Crl_thisUpdate = /* @__PURE__ */ new WeakMap(), _X509Crl_nextUpdate = /* @__PURE__ */ new WeakMap(), _X509Crl_entries = /* @__PURE__ */ new WeakMap(), _X509Crl_extensions = /* @__PURE__ */ new WeakMap();
    var X509CrlGenerator = class {
      static async create(params, crypto2 = cryptoProvider.get()) {
        var _a2;
        const name = params.issuer instanceof Name ? params.issuer : new Name(params.issuer);
        const asnX509Crl = new asn1X509__namespace.CertificateList({
          tbsCertList: new asn1X509__namespace.TBSCertList({
            version: asn1X509__namespace.Version.v2,
            issuer: asn1Schema.AsnConvert.parse(name.toArrayBuffer(), asn1X509__namespace.Name),
            thisUpdate: new asn1X509.Time(params.thisUpdate || /* @__PURE__ */ new Date())
          })
        });
        if (params.nextUpdate) {
          asnX509Crl.tbsCertList.nextUpdate = new asn1X509.Time(params.nextUpdate);
        }
        if (params.extensions && params.extensions.length) {
          asnX509Crl.tbsCertList.crlExtensions = new asn1X509__namespace.Extensions(params.extensions.map((o) => asn1Schema.AsnConvert.parse(o.rawData, asn1X509__namespace.Extension)) || []);
        }
        if (params.entries && params.entries.length) {
          asnX509Crl.tbsCertList.revokedCertificates = [];
          for (const entry of params.entries) {
            const userCertificate = PemData.toArrayBuffer(entry.serialNumber);
            const index = asnX509Crl.tbsCertList.revokedCertificates.findIndex((cert) => pvtsutils.isEqual(cert.userCertificate, userCertificate));
            if (index > -1) {
              throw new Error(`Certificate serial number ${entry.serialNumber} already exists in tbsCertList`);
            }
            const revokedCert = new asn1X509.RevokedCertificate({
              userCertificate,
              revocationDate: new asn1X509.Time(entry.revocationDate || /* @__PURE__ */ new Date())
            });
            if ("extensions" in entry && ((_a2 = entry.extensions) === null || _a2 === void 0 ? void 0 : _a2.length)) {
              revokedCert.crlEntryExtensions = entry.extensions.map((o) => asn1Schema.AsnConvert.parse(o.rawData, asn1X509__namespace.Extension));
            } else {
              revokedCert.crlEntryExtensions = [];
            }
            if (!(entry instanceof X509CrlEntry)) {
              if (entry.reason) {
                revokedCert.crlEntryExtensions.push(new asn1X509__namespace.Extension({
                  extnID: asn1X509__namespace.id_ce_cRLReasons,
                  critical: false,
                  extnValue: new asn1Schema.OctetString(asn1Schema.AsnConvert.serialize(new asn1X509__namespace.CRLReason(entry.reason)))
                }));
              }
              if (entry.invalidity) {
                revokedCert.crlEntryExtensions.push(new asn1X509__namespace.Extension({
                  extnID: asn1X509__namespace.id_ce_invalidityDate,
                  critical: false,
                  extnValue: new asn1Schema.OctetString(asn1Schema.AsnConvert.serialize(new asn1X509__namespace.InvalidityDate(entry.invalidity)))
                }));
              }
              if (entry.issuer) {
                const name2 = params.issuer instanceof Name ? params.issuer : new Name(params.issuer);
                revokedCert.crlEntryExtensions.push(new asn1X509__namespace.Extension({
                  extnID: asn1X509__namespace.id_ce_certificateIssuer,
                  critical: false,
                  extnValue: new asn1Schema.OctetString(asn1Schema.AsnConvert.serialize(asn1Schema.AsnConvert.parse(name2.toArrayBuffer(), asn1X509__namespace.Name)))
                }));
              }
            }
            asnX509Crl.tbsCertList.revokedCertificates.push(revokedCert);
          }
        }
        const signingAlgorithm = {
          ...params.signingAlgorithm,
          ...params.signingKey.algorithm
        };
        const algProv = tsyringe.container.resolve(diAlgorithmProvider);
        asnX509Crl.tbsCertList.signature = asnX509Crl.signatureAlgorithm = algProv.toAsnAlgorithm(signingAlgorithm);
        const tbs = asn1Schema.AsnConvert.serialize(asnX509Crl.tbsCertList);
        const signature = await crypto2.subtle.sign(signingAlgorithm, params.signingKey, tbs);
        const signatureFormatters = tsyringe.container.resolveAll(diAsnSignatureFormatter).reverse();
        let asnSignature = null;
        for (const signatureFormatter of signatureFormatters) {
          asnSignature = signatureFormatter.toAsnSignature(signingAlgorithm, signature);
          if (asnSignature) {
            break;
          }
        }
        if (!asnSignature) {
          throw Error("Cannot convert ASN.1 signature value to WebCrypto format");
        }
        asnX509Crl.signature = asnSignature;
        return new X509Crl(asn1Schema.AsnConvert.serialize(asnX509Crl));
      }
    };
    ExtensionFactory.register(asn1X509__namespace.id_ce_basicConstraints, BasicConstraintsExtension);
    ExtensionFactory.register(asn1X509__namespace.id_ce_extKeyUsage, ExtendedKeyUsageExtension);
    ExtensionFactory.register(asn1X509__namespace.id_ce_keyUsage, KeyUsagesExtension);
    ExtensionFactory.register(asn1X509__namespace.id_ce_subjectKeyIdentifier, SubjectKeyIdentifierExtension);
    ExtensionFactory.register(asn1X509__namespace.id_ce_authorityKeyIdentifier, AuthorityKeyIdentifierExtension);
    ExtensionFactory.register(asn1X509__namespace.id_ce_subjectAltName, SubjectAlternativeNameExtension);
    ExtensionFactory.register(asn1X509__namespace.id_ce_cRLDistributionPoints, CRLDistributionPointsExtension);
    ExtensionFactory.register(asn1X509__namespace.id_pe_authorityInfoAccess, AuthorityInfoAccessExtension);
    ExtensionFactory.register(asn1X509__namespace.id_ce_issuerAltName, IssuerAlternativeNameExtension);
    AttributeFactory.register(asnPkcs9__namespace.id_pkcs9_at_challengePassword, ChallengePasswordAttribute);
    AttributeFactory.register(asnPkcs9__namespace.id_pkcs9_at_extensionRequest, ExtensionsAttribute);
    tsyringe.container.registerSingleton(diAsnSignatureFormatter, AsnDefaultSignatureFormatter);
    tsyringe.container.registerSingleton(diAsnSignatureFormatter, AsnEcSignatureFormatter);
    AsnEcSignatureFormatter.namedCurveSize.set("P-256", 32);
    AsnEcSignatureFormatter.namedCurveSize.set("K-256", 32);
    AsnEcSignatureFormatter.namedCurveSize.set("P-384", 48);
    AsnEcSignatureFormatter.namedCurveSize.set("P-521", 66);
    exports.AlgorithmProvider = AlgorithmProvider;
    exports.AsnData = AsnData;
    exports.AsnDefaultSignatureFormatter = AsnDefaultSignatureFormatter;
    exports.AsnEcSignatureFormatter = AsnEcSignatureFormatter;
    exports.Attribute = Attribute;
    exports.AttributeFactory = AttributeFactory;
    exports.AuthorityInfoAccessExtension = AuthorityInfoAccessExtension;
    exports.AuthorityKeyIdentifierExtension = AuthorityKeyIdentifierExtension;
    exports.BasicConstraintsExtension = BasicConstraintsExtension;
    exports.CRLDistributionPointsExtension = CRLDistributionPointsExtension;
    exports.CertificatePolicyExtension = CertificatePolicyExtension;
    exports.ChallengePasswordAttribute = ChallengePasswordAttribute;
    exports.CryptoProvider = CryptoProvider;
    exports.DN = DN;
    exports.DNS = DNS;
    exports.DefaultAlgorithmSerializer = DefaultAlgorithmSerializer;
    exports.EMAIL = EMAIL;
    exports.ExtendedKeyUsageExtension = ExtendedKeyUsageExtension;
    exports.Extension = Extension;
    exports.ExtensionFactory = ExtensionFactory;
    exports.ExtensionsAttribute = ExtensionsAttribute;
    exports.GUID = GUID;
    exports.GeneralName = GeneralName;
    exports.GeneralNames = GeneralNames;
    exports.IP = IP;
    exports.IssuerAlternativeNameExtension = IssuerAlternativeNameExtension;
    exports.KeyUsagesExtension = KeyUsagesExtension;
    exports.Name = Name;
    exports.NameIdentifier = NameIdentifier;
    exports.OidSerializer = OidSerializer;
    exports.PemConverter = PemConverter;
    exports.PemData = PemData;
    exports.Pkcs10CertificateRequest = Pkcs10CertificateRequest;
    exports.Pkcs10CertificateRequestGenerator = Pkcs10CertificateRequestGenerator;
    exports.PublicKey = PublicKey;
    exports.REGISTERED_ID = REGISTERED_ID;
    exports.SubjectAlternativeNameExtension = SubjectAlternativeNameExtension;
    exports.SubjectKeyIdentifierExtension = SubjectKeyIdentifierExtension;
    exports.TextConverter = TextConverter;
    exports.TextObject = TextObject;
    exports.UPN = UPN;
    exports.URL = URL2;
    exports.X509Certificate = X509Certificate2;
    exports.X509CertificateGenerator = X509CertificateGenerator;
    exports.X509Certificates = X509Certificates;
    exports.X509ChainBuilder = X509ChainBuilder;
    exports.X509Crl = X509Crl;
    exports.X509CrlEntry = X509CrlEntry;
    exports.X509CrlGenerator = X509CrlGenerator;
    exports.cryptoProvider = cryptoProvider;
    exports.diAlgorithm = diAlgorithm;
    exports.diAlgorithmProvider = diAlgorithmProvider;
    exports.diAsnSignatureFormatter = diAsnSignatureFormatter;
    exports.idEd25519 = idEd25519;
    exports.idEd448 = idEd448;
    exports.idX25519 = idX25519;
    exports.idX448 = idX448;
  }
});

// node_modules/selfsigned/index.js
var require_selfsigned = __commonJS({
  "node_modules/selfsigned/index.js"(exports) {
    var { X509CertificateGenerator, X509Certificate: X509Certificate2, cryptoProvider, X509ChainBuilder, BasicConstraintsExtension, KeyUsagesExtension, KeyUsageFlags, ExtendedKeyUsageExtension, ExtendedKeyUsage, SubjectAlternativeNameExtension, GeneralName } = require_x509_cjs();
    var nodeCrypto = __require("crypto");
    var crypto2 = nodeCrypto.webcrypto;
    cryptoProvider.set(crypto2);
    function toPositiveHex(hexString) {
      var mostSiginficativeHexAsInt = parseInt(hexString[0], 16);
      if (mostSiginficativeHexAsInt < 8) {
        return hexString;
      }
      mostSiginficativeHexAsInt -= 8;
      return mostSiginficativeHexAsInt.toString() + hexString.substring(1);
    }
    function getAlgorithmName(key) {
      switch (key) {
        case "sha256":
          return "SHA-256";
        case "sha384":
          return "SHA-384";
        case "sha512":
          return "SHA-512";
        default:
          return "SHA-1";
      }
    }
    function getSigningAlgorithm(hashKey, keyType) {
      const hashAlg = getAlgorithmName(hashKey);
      if (keyType === "ec") {
        return {
          name: "ECDSA",
          hash: hashAlg
        };
      }
      return {
        name: "RSASSA-PKCS1-v1_5",
        hash: hashAlg
      };
    }
    function getKeyAlgorithm(options) {
      const keyType = options.keyType || "rsa";
      const hashAlg = getAlgorithmName(options.algorithm || "sha1");
      if (keyType === "ec") {
        const curve = options.curve || "P-256";
        return {
          name: "ECDSA",
          namedCurve: curve
        };
      }
      return {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: options.keySize || 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: hashAlg
      };
    }
    function buildExtensions(userExtensions, commonName) {
      if (!userExtensions || userExtensions.length === 0) {
        return [
          new BasicConstraintsExtension(false, void 0, true),
          new KeyUsagesExtension(KeyUsageFlags.digitalSignature | KeyUsageFlags.keyEncipherment, true),
          new ExtendedKeyUsageExtension([ExtendedKeyUsage.serverAuth, ExtendedKeyUsage.clientAuth], false),
          new SubjectAlternativeNameExtension([
            { type: "dns", value: commonName },
            ...commonName === "localhost" ? [{ type: "ip", value: "127.0.0.1" }] : []
          ], false)
        ];
      }
      const extensions = [];
      for (const ext of userExtensions) {
        const critical = ext.critical || false;
        switch (ext.name) {
          case "basicConstraints":
            extensions.push(new BasicConstraintsExtension(
              ext.cA || false,
              ext.pathLenConstraint,
              critical
            ));
            break;
          case "keyUsage":
            let flags = 0;
            if (ext.digitalSignature) flags |= KeyUsageFlags.digitalSignature;
            if (ext.nonRepudiation || ext.contentCommitment) flags |= KeyUsageFlags.nonRepudiation;
            if (ext.keyEncipherment) flags |= KeyUsageFlags.keyEncipherment;
            if (ext.dataEncipherment) flags |= KeyUsageFlags.dataEncipherment;
            if (ext.keyAgreement) flags |= KeyUsageFlags.keyAgreement;
            if (ext.keyCertSign) flags |= KeyUsageFlags.keyCertSign;
            if (ext.cRLSign) flags |= KeyUsageFlags.cRLSign;
            if (ext.encipherOnly) flags |= KeyUsageFlags.encipherOnly;
            if (ext.decipherOnly) flags |= KeyUsageFlags.decipherOnly;
            extensions.push(new KeyUsagesExtension(flags, critical));
            break;
          case "extKeyUsage":
            const usages = [];
            if (ext.serverAuth) usages.push(ExtendedKeyUsage.serverAuth);
            if (ext.clientAuth) usages.push(ExtendedKeyUsage.clientAuth);
            if (ext.codeSigning) usages.push(ExtendedKeyUsage.codeSigning);
            if (ext.emailProtection) usages.push(ExtendedKeyUsage.emailProtection);
            if (ext.timeStamping) usages.push(ExtendedKeyUsage.timeStamping);
            extensions.push(new ExtendedKeyUsageExtension(usages, critical));
            break;
          case "subjectAltName":
            const altNames = (ext.altNames || []).map((alt) => {
              switch (alt.type) {
                case 1:
                  return { type: "email", value: alt.value };
                case 2:
                  return { type: "dns", value: alt.value };
                case 6:
                  return { type: "url", value: alt.value };
                case 7:
                  return { type: "ip", value: alt.ip || alt.value };
                default:
                  if (alt.ip) return { type: "ip", value: alt.ip };
                  if (alt.dns) return { type: "dns", value: alt.dns };
                  if (alt.email) return { type: "email", value: alt.email };
                  if (alt.uri || alt.url) return { type: "url", value: alt.uri || alt.url };
                  return { type: "dns", value: alt.value };
              }
            });
            extensions.push(new SubjectAlternativeNameExtension(altNames, critical));
            break;
          default:
            console.warn(`Unknown extension "${ext.name}" ignored`);
        }
      }
      return extensions;
    }
    function convertAttributes(attrs) {
      const nameMap = {
        "commonName": "CN",
        "countryName": "C",
        "ST": "ST",
        "localityName": "L",
        "organizationName": "O",
        "OU": "OU"
      };
      return attrs.map((attr) => {
        const key = attr.name || attr.shortName;
        const oid = nameMap[key] || key;
        return `${oid}=${attr.value}`;
      }).join(", ");
    }
    function normalizeECCurve(curveName) {
      const curveMap = {
        "prime256v1": "P-256",
        "secp384r1": "P-384",
        "secp521r1": "P-521",
        "P-256": "P-256",
        "P-384": "P-384",
        "P-521": "P-521"
      };
      return curveMap[curveName] || curveName;
    }
    function getECCurve(keyObject) {
      const details = keyObject.asymmetricKeyDetails;
      if (details && details.namedCurve) {
        return normalizeECCurve(details.namedCurve);
      }
      return "P-256";
    }
    async function importPrivateKey(pemKey, algorithm, keyType) {
      const keyObject = nodeCrypto.createPrivateKey(pemKey);
      const detectedKeyType = keyObject.asymmetricKeyType;
      const actualKeyType = keyType || detectedKeyType;
      const pkcs8Pem = keyObject.export({ type: "pkcs8", format: "pem" });
      const pemContents = pkcs8Pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
      const binaryDer = Buffer.from(pemContents, "base64");
      let importAlgorithm;
      if (actualKeyType === "ec") {
        const curve = getECCurve(keyObject);
        importAlgorithm = {
          name: "ECDSA",
          namedCurve: curve
        };
      } else {
        importAlgorithm = {
          name: "RSASSA-PKCS1-v1_5",
          hash: getAlgorithmName(algorithm)
        };
      }
      return await crypto2.subtle.importKey(
        "pkcs8",
        binaryDer,
        importAlgorithm,
        true,
        ["sign"]
      );
    }
    async function importPublicKey(pemKey, algorithm, keyType, curve) {
      const pemContents = pemKey.replace(/-----BEGIN PUBLIC KEY-----/, "").replace(/-----END PUBLIC KEY-----/, "").replace(/\s/g, "");
      const binaryDer = Buffer.from(pemContents, "base64");
      let importAlgorithm;
      if (keyType === "ec") {
        importAlgorithm = {
          name: "ECDSA",
          namedCurve: curve || "P-256"
        };
      } else {
        importAlgorithm = {
          name: "RSASSA-PKCS1-v1_5",
          hash: getAlgorithmName(algorithm)
        };
      }
      return await crypto2.subtle.importKey(
        "spki",
        binaryDer,
        importAlgorithm,
        true,
        ["verify"]
      );
    }
    async function generatePemAsync(keyPair, attrs, options, ca) {
      const { privateKey, publicKey } = keyPair;
      const serialBytes = crypto2.getRandomValues(new Uint8Array(9));
      const serialHex = toPositiveHex(Buffer.from(serialBytes).toString("hex"));
      const notBefore = options.notBeforeDate || /* @__PURE__ */ new Date();
      let notAfter;
      if (options.notAfterDate) {
        notAfter = options.notAfterDate;
      } else {
        notAfter = new Date(notBefore);
        notAfter.setDate(notAfter.getDate() + 365);
      }
      attrs = attrs || [
        {
          name: "commonName",
          value: "example.org"
        },
        {
          name: "countryName",
          value: "US"
        },
        {
          shortName: "ST",
          value: "Virginia"
        },
        {
          name: "localityName",
          value: "Blacksburg"
        },
        {
          name: "organizationName",
          value: "Test"
        },
        {
          shortName: "OU",
          value: "Test"
        }
      ];
      const subjectName = convertAttributes(attrs);
      const keyType = options.keyType || "rsa";
      const signingAlg = getSigningAlgorithm(options.algorithm, keyType);
      const commonNameAttr = attrs.find((attr) => attr.name === "commonName" || attr.shortName === "CN");
      const commonName = commonNameAttr ? commonNameAttr.value : "localhost";
      const extensions = buildExtensions(options.extensions, commonName);
      let cert;
      if (ca) {
        const caCert = new X509Certificate2(ca.cert);
        const caPrivateKey = await importPrivateKey(ca.key, options.algorithm || "sha256", keyType);
        cert = await X509CertificateGenerator.create({
          serialNumber: serialHex,
          subject: subjectName,
          issuer: caCert.subject,
          notBefore,
          notAfter,
          signingAlgorithm: signingAlg,
          publicKey,
          signingKey: caPrivateKey,
          extensions
        });
      } else {
        cert = await X509CertificateGenerator.createSelfSigned({
          serialNumber: serialHex,
          name: subjectName,
          notBefore,
          notAfter,
          signingAlgorithm: signingAlg,
          keys: {
            privateKey,
            publicKey
          },
          extensions
        });
      }
      const certRaw = cert.rawData;
      const fingerprintBuffer = await crypto2.subtle.digest("SHA-1", certRaw);
      const fingerprint = Buffer.from(fingerprintBuffer).toString("hex").match(/.{2}/g).join(":");
      const privateKeyDer = await crypto2.subtle.exportKey("pkcs8", privateKey);
      const publicKeyDer = await crypto2.subtle.exportKey("spki", publicKey);
      let privatePem;
      if (options.passphrase) {
        const keyObject = nodeCrypto.createPrivateKey({
          key: Buffer.from(privateKeyDer),
          format: "der",
          type: "pkcs8"
        });
        privatePem = keyObject.export({
          type: "pkcs8",
          format: "pem",
          cipher: "aes-256-cbc",
          passphrase: options.passphrase
        });
      } else {
        privatePem = "-----BEGIN PRIVATE KEY-----\n" + Buffer.from(privateKeyDer).toString("base64").match(/.{1,64}/g).join("\n") + "\n-----END PRIVATE KEY-----\n";
      }
      const publicPem = "-----BEGIN PUBLIC KEY-----\n" + Buffer.from(publicKeyDer).toString("base64").match(/.{1,64}/g).join("\n") + "\n-----END PUBLIC KEY-----\n";
      const certPem = cert.toString("pem");
      const pem = {
        private: privatePem,
        public: publicPem,
        cert: certPem,
        fingerprint
      };
      if (options && options.clientCertificate) {
        const clientOpts = typeof options.clientCertificate === "object" ? options.clientCertificate : {};
        const clientKeySize = clientOpts.keySize || options.clientCertificateKeySize || 2048;
        const clientAlgorithm = clientOpts.algorithm || options.algorithm || "sha1";
        const clientCN = clientOpts.cn || options.clientCertificateCN || "John Doe jdoe123";
        const clientKeyType = clientOpts.keyType || keyType;
        const clientCurve = clientOpts.curve || options.curve || "P-256";
        const clientKeyAlg = getKeyAlgorithm({
          keyType: clientKeyType,
          keySize: clientKeySize,
          algorithm: clientAlgorithm,
          curve: clientCurve
        });
        const clientKeyPair = await crypto2.subtle.generateKey(
          clientKeyAlg,
          true,
          ["sign", "verify"]
        );
        const clientSerialBytes = crypto2.getRandomValues(new Uint8Array(9));
        const clientSerialHex = toPositiveHex(Buffer.from(clientSerialBytes).toString("hex"));
        const clientNotBefore = clientOpts.notBeforeDate || /* @__PURE__ */ new Date();
        let clientNotAfter;
        if (clientOpts.notAfterDate) {
          clientNotAfter = clientOpts.notAfterDate;
        } else {
          clientNotAfter = new Date(clientNotBefore);
          clientNotAfter.setFullYear(clientNotBefore.getFullYear() + 1);
        }
        const clientAttrs = JSON.parse(JSON.stringify(attrs));
        for (let i = 0; i < clientAttrs.length; i++) {
          if (clientAttrs[i].name === "commonName") {
            clientAttrs[i] = {
              name: "commonName",
              value: clientCN
            };
          }
        }
        const clientSubjectName = convertAttributes(clientAttrs);
        const issuerName = convertAttributes(attrs);
        const clientSigningAlg = getSigningAlgorithm(clientAlgorithm, keyType);
        const clientCertRaw = await X509CertificateGenerator.create({
          serialNumber: clientSerialHex,
          subject: clientSubjectName,
          issuer: issuerName,
          notBefore: clientNotBefore,
          notAfter: clientNotAfter,
          signingAlgorithm: clientSigningAlg,
          publicKey: clientKeyPair.publicKey,
          signingKey: privateKey
          // Sign with root private key
        });
        const clientPrivateKeyDer = await crypto2.subtle.exportKey("pkcs8", clientKeyPair.privateKey);
        const clientPublicKeyDer = await crypto2.subtle.exportKey("spki", clientKeyPair.publicKey);
        pem.clientprivate = "-----BEGIN PRIVATE KEY-----\n" + Buffer.from(clientPrivateKeyDer).toString("base64").match(/.{1,64}/g).join("\n") + "\n-----END PRIVATE KEY-----\n";
        pem.clientpublic = "-----BEGIN PUBLIC KEY-----\n" + Buffer.from(clientPublicKeyDer).toString("base64").match(/.{1,64}/g).join("\n") + "\n-----END PUBLIC KEY-----\n";
        pem.clientcert = clientCertRaw.toString("pem");
      }
      const x509Cert = new X509Certificate2(cert.rawData);
      const certificates = [x509Cert];
      if (ca) {
        const caCert = new X509Certificate2(ca.cert);
        certificates.push(caCert);
      }
      const chainBuilder = new X509ChainBuilder({
        certificates
      });
      const chain = await chainBuilder.build(x509Cert);
      if (chain.length === 0) {
        throw new Error("Certificate could not be verified.");
      }
      return pem;
    }
    exports.generate = async function generate(attrs, options) {
      attrs = attrs || void 0;
      options = options || {};
      const keyType = options.keyType || "rsa";
      const curve = options.curve || "P-256";
      let keyPair;
      if (options.keyPair) {
        keyPair = {
          privateKey: await importPrivateKey(options.keyPair.privateKey, options.algorithm || "sha1", keyType),
          publicKey: await importPublicKey(options.keyPair.publicKey, options.algorithm || "sha1", keyType, curve)
        };
      } else {
        const keyAlg = getKeyAlgorithm(options);
        keyPair = await crypto2.subtle.generateKey(
          keyAlg,
          true,
          ["sign", "verify"]
        );
      }
      return await generatePemAsync(keyPair, attrs, options, options.ca);
    };
  }
});

// src/agentd/main.ts
import fs4 from "node:fs";
import path5 from "node:path";
import { randomBytes as randomBytes3 } from "node:crypto";

// src/agentd/config.ts
import os from "node:os";
import path from "node:path";
function num(name, def) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : def;
}
function sanitize(s) {
  return s.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 64) || "user";
}
function homeDir() {
  if (process.env.AGENTLINK_HOME) return process.env.AGENTLINK_HOME;
  const base = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
  return path.join(base, "AgentLink");
}
function pipePath() {
  if (process.env.AGENTLINK_PIPE) return process.env.AGENTLINK_PIPE;
  return `\\\\.\\pipe\\agentlink-${sanitize(os.userInfo().username)}`;
}
function hostName() {
  return sanitize(process.env.AGENTLINK_HOST ?? os.hostname()).toLowerCase();
}
function loadConfig() {
  return {
    leaseMs: num("AGENTLINK_LEASE_MS", 3e4),
    sweepMs: num("AGENTLINK_SWEEP_MS", 5e3),
    rateBurst: num("AGENTLINK_RATE_BURST", 10),
    ratePerMin: num("AGENTLINK_RATE_PER_MIN", 60),
    dupWindowMs: num("AGENTLINK_DUP_WINDOW_MS", 2e3),
    peerReconnectMinMs: num("AGENTLINK_PEER_RECONNECT_MIN_MS", 1e3),
    peerReconnectMaxMs: num("AGENTLINK_PEER_RECONNECT_MAX_MS", 3e4),
    peerPingMs: num("AGENTLINK_PEER_PING_MS", 1e4),
    ackWaitMs: num("AGENTLINK_ACK_WAIT_MS", 2e3),
    outboxTtlMs: num("AGENTLINK_OUTBOX_TTL_MS", 24 * 60 * 60 * 1e3),
    directoryMs: num("AGENTLINK_DIRECTORY_MS", 3e3)
  };
}

// src/agentd/core.ts
import { randomBytes, randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";

// src/agentd/protocol.ts
var PROTOCOL_VERSION = 1;
var LIMITS = {
  maxMessageBytes: 64 * 1024,
  maxSummaryChars: 200,
  maxLineBytes: 512 * 1024,
  inboxMax: 1e3,
  inboxDefaultLimit: 20,
  inboxMaxLimit: 100,
  maxWaitMs: 3e4,
  idleSubTtlMs: 12 * 60 * 60 * 1e3,
  ackedRetentionMs: 24 * 60 * 60 * 1e3,
  inactiveAgentGcMs: 60 * 60 * 1e3
};
var NAME_RE = /^[A-Za-z0-9_-]{1,64}$/;
var REF_RE = /^[0-9a-f]{4,12}$/;
var TO_RE = /^([A-Za-z0-9_-]{1,64})(?:@([A-Za-z0-9._-]{1,253}))?(?:\s*\[([0-9a-f]{4,12})\])?$/;
var ApiError = class extends Error {
  code;
  data;
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
};

// src/version.ts
var VERSION = true ? "0.2.2" : JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

// src/agentd/core.ts
function str(p, name, opts = {}) {
  const v = p[name];
  if (v === void 0 || v === null) {
    if (opts.required) throw new ApiError("BAD_REQUEST", `"${name}" is required`);
    return void 0;
  }
  if (typeof v !== "string") throw new ApiError("BAD_REQUEST", `"${name}" must be a string`);
  if (opts.max !== void 0 && v.length > opts.max) throw new ApiError("BAD_REQUEST", `"${name}" is longer than ${opts.max} characters`);
  return v;
}
function int(p, name, def, min, max) {
  const v = p[name];
  if (v === void 0 || v === null) return def;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new ApiError("BAD_REQUEST", `"${name}" must be a number`);
  return Math.min(max, Math.max(min, Math.floor(v)));
}
var Core = class {
  events = new EventEmitter();
  host;
  store;
  cfg;
  buckets = /* @__PURE__ */ new Map();
  recent = /* @__PURE__ */ new Map();
  remote = null;
  acl = null;
  constructor(store, host, cfg2) {
    this.store = store;
    this.host = host;
    this.cfg = cfg2;
    this.events.setMaxListeners(0);
  }
  setRemote(remote) {
    this.remote = remote;
  }
  setAcl(acl) {
    this.acl = acl;
  }
  /** F-14: throws FORBIDDEN when the ACL does not allow `from` to reach `to`. */
  checkAcl(from, to) {
    if (!this.acl) return;
    const d = this.acl.check(from, to);
    if (!d.allowed) throw new ApiError("FORBIDDEN", `blocked by the ACL of host ${this.host}: ${d.reason}`);
  }
  // --- helpers ----------------------------------------------------------------
  isLive(a) {
    return a.active === 1 && Date.now() - a.last_seen <= this.cfg.leaseMs;
  }
  statusOf(a) {
    return this.isLive(a) ? a.status : "offline";
  }
  address(a) {
    return `${a.name}@${this.host}`;
  }
  fromAddress(a) {
    return `${a.name}@${this.host} [${a.ref}]`;
  }
  requireAgent(p) {
    const id = str(p, "agent", { required: true });
    const a = this.store.getAgent(id);
    if (!a || a.active !== 1) throw new ApiError("NOT_REGISTERED", "unknown or unregistered agent; call register first");
    this.store.touch(a.agent, Date.now());
    return a;
  }
  toWire(m, state) {
    return {
      id: m.id,
      from: m.from_addr,
      to: m.to_addr,
      kind: m.kind,
      summary: m.summary,
      message: m.message,
      ts: m.ts,
      reply_to: m.reply_to,
      state: state ?? m.state
    };
  }
  parseTo(to) {
    const m = TO_RE.exec(to.trim());
    if (!m) throw new ApiError("BAD_REQUEST", `invalid address "${to}" (use name, name@host or name@host [ref])`);
    return { name: m[1], host: m[2] ? m[2].toLowerCase() : null, ref: m[3] ? m[3].toLowerCase() : null };
  }
  resolve(to) {
    const t = this.parseTo(to);
    if (t.host && t.host !== this.host) {
      throw new ApiError("UNKNOWN_HOST", `host "${t.host}" is not this host; this operation only works for agents on this host`);
    }
    return this.resolveLocal(t.name, t.ref);
  }
  resolveLocal(name, ref) {
    let cands = this.store.agentsByName(name);
    if (ref) cands = cands.filter((a) => a.ref === ref);
    if (cands.length === 0) throw new ApiError("UNKNOWN_AGENT", `no agent named "${name}"${ref ? ` with ref ${ref}` : ""} on host ${this.host}`);
    const live = cands.filter((a) => this.isLive(a));
    const pool = live.length > 0 ? live : cands;
    if (pool.length > 1) {
      const list = pool.map((a) => `${this.address(a)} [${a.ref}]`);
      throw new ApiError("AMBIGUOUS_NAME", `several agents answer to "${name}": ${list.join(", ")}; add a [ref]`, { candidates: list });
    }
    return pool[0];
  }
  takeToken(agent) {
    const now = Date.now();
    const perMs = this.cfg.ratePerMin / 6e4;
    const b = this.buckets.get(agent) ?? { tokens: this.cfg.rateBurst, last: now };
    b.tokens = Math.min(this.cfg.rateBurst, b.tokens + (now - b.last) * perMs);
    b.last = now;
    this.buckets.set(agent, b);
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  }
  ensureRoom(agent, force) {
    if (this.store.countInbox(agent) < LIMITS.inboxMax) return true;
    this.store.dropOldest(agent, "acked", 1);
    if (this.store.countInbox(agent) < LIMITS.inboxMax) return true;
    if (!force) return false;
    this.store.dropOldest(agent, "delivered", 1);
    if (this.store.countInbox(agent) < LIMITS.inboxMax) return true;
    this.store.dropOldest(agent, "new", 1);
    return true;
  }
  deliver(target, fields, force, id) {
    if (!this.ensureRoom(target.agent, force)) return void 0;
    const row = this.store.insertMessage({
      id: id ?? randomUUID(),
      to_agent: target.agent,
      from_addr: fields.from,
      to_addr: this.fromAddress(target),
      kind: fields.kind,
      summary: fields.summary,
      message: fields.message,
      ts: Math.floor(Date.now() / 1e3),
      reply_to: fields.reply_to,
      ttl: 3,
      created_ms: Date.now()
    });
    this.events.emit("message", target.agent, row);
    return row;
  }
  fireIdle(target, reason) {
    const subs = this.store.takeIdleSubs(target.agent);
    for (const sub of subs) {
      if (Date.now() - sub.created_at > LIMITS.idleSubTtlMs) continue;
      const requester = this.store.getAgent(sub.requester);
      if (!requester) continue;
      const text = reason === "idle" ? `${this.address(target)} is idle` : `${this.address(target)} exited or went offline`;
      this.deliver(requester, { from: `agentlink@${this.host}`, kind: "idle_notice", summary: text, message: text, reply_to: null }, true);
    }
    for (const sub of this.store.takeRemoteIdleSubs(target.agent)) {
      if (Date.now() - sub.created_at > LIMITS.idleSubTtlMs) continue;
      this.sendNotice(sub.host, sub.requester_addr, target, reason);
    }
  }
  /** Tell a watcher on another host that `target` is idle (best effort, persisted in the outbox until acknowledged). */
  sendNotice(host, requesterAddr, target, reason) {
    if (!this.remote) return;
    const frame = { t: "notice", id: randomUUID(), to: requesterAddr, kind: "idle_notice", target: this.fromAddress(target), reason };
    this.remote.send(host, frame, "", requesterAddr).catch(() => {
    });
  }
  // --- methods ------------------------------------------------------------------
  hello(p) {
    const v = p.v;
    if (v !== PROTOCOL_VERSION) throw new ApiError("BAD_REQUEST", `unsupported protocol version ${String(v)} (server speaks ${PROTOCOL_VERSION})`);
    return {
      server_version: VERSION,
      protocol: PROTOCOL_VERSION,
      host: this.host,
      lease_ms: this.cfg.leaseMs,
      pid: process.pid
    };
  }
  register(p) {
    const name = str(p, "name", { required: true });
    if (!NAME_RE.test(name)) throw new ApiError("BAD_REQUEST", 'name may only contain letters, digits, "-" and "_" (max 64)');
    const kind = str(p, "kind", { max: 64 }) ?? "generic";
    if (!NAME_RE.test(kind)) throw new ApiError("BAD_REQUEST", 'kind may only contain letters, digits, "-" and "_" (max 64)');
    const cwd = str(p, "cwd", { max: 1024 }) ?? null;
    const pidRaw = p.pid;
    const pid = typeof pidRaw === "number" && Number.isInteger(pidRaw) ? pidRaw : null;
    const key = str(p, "key", { max: 256 }) ?? `anon:${randomBytes(8).toString("hex")}`;
    const now = Date.now();
    const existing = this.store.getAgentByKey(key);
    if (existing) {
      const status = this.isLive(existing) ? existing.status : "idle";
      this.store.reviveAgent(existing.agent, { name, kind, cwd, pid, status }, now);
      const a2 = this.store.getAgent(existing.agent);
      return { agent: a2.agent, name: a2.name, ref: a2.ref, address: this.address(a2), resumed: true, unread: this.store.countState(a2.agent, "new") };
    }
    let ref = randomBytes(3).toString("hex");
    while (this.store.agentsByName(name).some((a2) => a2.ref === ref)) ref = randomBytes(3).toString("hex");
    const a = {
      agent: `ag_${randomBytes(6).toString("hex")}`,
      key,
      name,
      ref,
      kind,
      cwd,
      pid,
      status: "idle",
      active: 1,
      last_seen: now,
      registered_at: now
    };
    this.store.insertAgent(a);
    return { agent: a.agent, name, ref, address: this.address(a), resumed: false, unread: 0 };
  }
  unregister(p) {
    const a = this.requireAgent(p);
    this.store.deactivate(a.agent);
    this.fireIdle(a, "offline");
    return {};
  }
  heartbeat(p) {
    const a = this.requireAgent(p);
    const s = p.status;
    if (s !== void 0 && s !== null) {
      if (s !== "busy" && s !== "idle") throw new ApiError("BAD_REQUEST", 'status must be "busy" or "idle"');
      const wasIdle = this.statusOf(a) === "idle";
      this.store.setStatus(a.agent, s);
      if (s === "idle" && !wasIdle) this.fireIdle(a, "idle");
    }
    return { unread: this.store.countState(a.agent, "new") };
  }
  async send(p) {
    const from = this.requireAgent(p);
    const to = str(p, "to", { required: true });
    const message = str(p, "message", { required: true });
    const summary = str(p, "summary", { max: LIMITS.maxSummaryChars }) ?? null;
    const replyTo = str(p, "reply_to", { max: 64 }) ?? null;
    if (message.length === 0) throw new ApiError("BAD_REQUEST", '"message" must not be empty');
    const bytes = Buffer.byteLength(message, "utf8");
    if (bytes > LIMITS.maxMessageBytes) {
      throw new ApiError("TOO_LARGE", `message is ${bytes} bytes; the limit is ${LIMITS.maxMessageBytes}`);
    }
    const t = this.parseTo(to);
    const isRemote = t.host !== null && t.host !== this.host;
    let local;
    if (isRemote) {
      if (!this.remote?.knownHost(t.host)) {
        throw new ApiError("UNKNOWN_HOST", `host "${t.host}" is not in peers.json (${this.remote ? 'see "agentctl peers"' : "LAN is not configured"})`);
      }
    } else {
      local = this.resolveLocal(t.name, t.ref);
    }
    this.checkAcl({ name: from.name, host: this.host }, { name: local ? local.name : t.name, host: local ? this.host : t.host });
    if (!this.takeToken(from.agent)) {
      throw new ApiError("RATE_LIMITED", "too many messages from this agent just now; batch them into one message or wait a moment", {
        retry_after_ms: Math.ceil(6e4 / this.cfg.ratePerMin)
      });
    }
    const targetKey = local ? local.agent : `${t.host}|${t.name}|${t.ref ?? ""}`;
    const dupKey = `${from.agent}|${targetKey}|${message}`;
    const seen = this.recent.get(dupKey);
    const now = Date.now();
    if (seen !== void 0 && now - seen < this.cfg.dupWindowMs) {
      throw new ApiError("LOOP_DETECTED", "an identical message was just sent to this agent; dropped");
    }
    this.recent.set(dupKey, now);
    if (local) {
      const row = this.deliver(local, { from: this.fromAddress(from), kind: "message", summary, message, reply_to: replyTo }, false);
      if (!row) throw new ApiError("RATE_LIMITED", `the inbox of ${this.address(local)} is full`);
      return { id: row.id, status: "stored", to: this.fromAddress(local) };
    }
    const display = `${t.name}@${t.host}${t.ref ? ` [${t.ref}]` : ""}`;
    const frame = {
      t: "msg",
      id: randomUUID(),
      from: this.fromAddress(from),
      to: display,
      kind: "message",
      summary,
      message,
      ts: Math.floor(now / 1e3),
      reply_to: replyTo,
      ttl: 3
    };
    const status = await this.remote.send(t.host, frame, from.agent, display);
    return { id: frame.id, status, to: display };
  }
  /** A message arrived over an authenticated peer link. Throws ApiError, which the peer receives as an error ack. */
  receiveRemote(peerHost, f) {
    const id = f.id;
    if (typeof id !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new ApiError("BAD_REQUEST", "invalid message id");
    if (this.store.hasMessageId(id)) return;
    const from = f.from;
    const hostPattern = peerHost.replace(/[.]/g, "\\.");
    const fromRe = new RegExp("^[A-Za-z0-9_-]{1,64}@" + hostPattern + " \\[[0-9a-f]{4,12}\\]$");
    if (typeof from !== "string" || !fromRe.test(from)) {
      throw new ApiError("FORBIDDEN", `sender address does not belong to host "${peerHost}"`);
    }
    if (f.kind !== "message") throw new ApiError("BAD_REQUEST", "only plain messages can be sent between hosts");
    const message = f.message;
    if (typeof message !== "string" || message.length === 0) throw new ApiError("BAD_REQUEST", '"message" is required');
    const bytes = Buffer.byteLength(message, "utf8");
    if (bytes > LIMITS.maxMessageBytes) throw new ApiError("TOO_LARGE", `message is ${bytes} bytes; the limit is ${LIMITS.maxMessageBytes}`);
    const summary = typeof f.summary === "string" ? f.summary.slice(0, LIMITS.maxSummaryChars) : null;
    const replyTo = typeof f.reply_to === "string" ? f.reply_to.slice(0, 64) : null;
    if (typeof f.ttl !== "number" || !Number.isInteger(f.ttl) || f.ttl <= 0) throw new ApiError("LOOP_DETECTED", "message ttl is exhausted");
    if (typeof f.to !== "string") throw new ApiError("BAD_REQUEST", '"to" is required');
    if (!this.takeToken(`peer:${peerHost}`)) throw new ApiError("RATE_LIMITED", `too many messages from host "${peerHost}" just now`);
    const t = this.parseTo(f.to);
    if (t.host !== null && t.host !== this.host) throw new ApiError("UNKNOWN_HOST", `this host is "${this.host}", not "${t.host}"`);
    const target = this.resolveLocal(t.name, t.ref);
    this.checkAcl({ name: from.slice(0, from.indexOf("@")), host: peerHost }, { name: target.name, host: this.host });
    const row = this.deliver(target, { from, kind: "message", summary, message, reply_to: replyTo }, false, id);
    if (!row) throw new ApiError("RATE_LIMITED", `the inbox of ${this.address(target)} is full`);
  }
  /** A system notice for one of our agents (for example a delivery failure reported later by a peer). */
  deliverNotice(agentId, text) {
    const a = this.store.getAgent(agentId);
    if (!a) return;
    this.deliver(a, { from: `agentlink@${this.host}`, kind: "delivery_notice", summary: text.slice(0, LIMITS.maxSummaryChars), message: text, reply_to: null }, true);
  }
  /** What this host tells its peers about its agents. */
  localDirectory() {
    return this.store.allAgents().filter((a) => a.active === 1).map((a) => ({
      name: a.name,
      ref: a.ref,
      kind: a.kind,
      status: this.statusOf(a),
      cwd: a.cwd,
      unread: this.store.countState(a.agent, "new"),
      last_seen: Math.floor(a.last_seen / 1e3)
    }));
  }
  list(p) {
    const self2 = this.requireAgent(p);
    const scope = str(p, "scope") ?? "all";
    if (scope !== "local" && scope !== "all") throw new ApiError("BAD_REQUEST", 'scope must be "local" or "all"');
    const agents = this.store.allAgents().filter((a) => a.agent !== self2.agent).map((a) => ({
      address: this.address(a),
      name: a.name,
      ref: a.ref,
      host: this.host,
      kind: a.kind,
      status: this.statusOf(a),
      cwd: a.cwd,
      unread: this.store.countState(a.agent, "new"),
      last_seen: Math.floor(a.last_seen / 1e3)
    }));
    const remoteAgents = scope === "all" && this.remote ? this.remote.directory().flatMap(
      (d) => d.agents.map((a) => ({
        address: `${a.name}@${d.host}`,
        name: a.name,
        ref: a.ref,
        host: d.host,
        kind: a.kind,
        status: a.status,
        cwd: a.cwd,
        unread: a.unread,
        last_seen: a.last_seen
      }))
    ) : [];
    return { self: this.fromAddress(self2), agents: [...agents, ...remoteAgents], hosts: this.remote ? this.remote.hosts() : [] };
  }
  async inbox(p) {
    const a = this.requireAgent(p);
    const mode = str(p, "mode") ?? "take";
    if (mode !== "peek" && mode !== "take") throw new ApiError("BAD_REQUEST", 'mode must be "peek" or "take"');
    const state = str(p, "state") ?? "new";
    if (state !== "new" && state !== "delivered" && state !== "acked" && state !== "any") {
      throw new ApiError("BAD_REQUEST", "state must be new, delivered, acked or any");
    }
    const limit = int(p, "limit", LIMITS.inboxDefaultLimit, 1, LIMITS.inboxMaxLimit);
    const waitMs = int(p, "wait_ms", 0, 0, LIMITS.maxWaitMs);
    let rows = this.store.messagesFor(a.agent, state, limit);
    if (rows.length === 0 && waitMs > 0 && state === "new") {
      await new Promise((resolve) => {
        const done = () => {
          clearTimeout(timer);
          this.events.off("message", onMsg);
          resolve();
        };
        const onMsg = (agent) => {
          if (agent === a.agent) done();
        };
        const timer = setTimeout(done, waitMs);
        this.events.on("message", onMsg);
      });
      this.store.touch(a.agent, Date.now());
      rows = this.store.messagesFor(a.agent, state, limit);
    }
    let out;
    if (mode === "take") {
      const newIds = rows.filter((r) => r.state === "new").map((r) => r.id);
      this.store.markState(newIds, a.agent, "delivered", ["new"]);
      out = rows.map((r) => this.toWire(r, r.state === "new" ? "delivered" : r.state));
    } else {
      out = rows.map((r) => this.toWire(r));
    }
    return { messages: out, remaining: this.store.countState(a.agent, "new") };
  }
  ack(p) {
    const a = this.requireAgent(p);
    const ids = p.ids;
    if (!Array.isArray(ids) || ids.some((i) => typeof i !== "string") || ids.length > 100) {
      throw new ApiError("BAD_REQUEST", '"ids" must be an array of up to 100 message ids');
    }
    return { acked: this.store.markState(ids, a.agent, "acked", ["new", "delivered"]) };
  }
  async notifyWhenIdle(p) {
    const a = this.requireAgent(p);
    const t = this.parseTo(str(p, "target", { required: true }));
    if (t.host !== null && t.host !== this.host) {
      if (!this.remote?.knownHost(t.host)) throw new ApiError("UNKNOWN_HOST", `host "${t.host}" is not in peers.json`);
      this.checkAcl({ name: a.name, host: this.host }, { name: t.name, host: t.host });
      const display = `${t.name}@${t.host}${t.ref ? ` [${t.ref}]` : ""}`;
      const frame = { t: "watch", id: randomUUID(), target: display, requester: this.fromAddress(a) };
      const status = await this.remote.send(t.host, frame, a.agent, display);
      return { immediate: false, status };
    }
    const target = this.resolveLocal(t.name, t.ref);
    if (target.agent === a.agent) throw new ApiError("BAD_REQUEST", "cannot watch yourself");
    this.checkAcl({ name: a.name, host: this.host }, { name: target.name, host: this.host });
    if (this.statusOf(target) === "idle") {
      this.fireImmediate(a, target);
      return { immediate: true };
    }
    this.store.upsertIdleSub(a.agent, target.agent, Date.now());
    return { immediate: false };
  }
  /** A watcher on another host asks to be told when one of our agents becomes idle. */
  receiveWatch(peerHost, f) {
    const id = f.id;
    if (typeof id !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new ApiError("BAD_REQUEST", "invalid message id");
    const requester = f.requester;
    const hostPattern = peerHost.replace(/[.]/g, "\\.");
    const reqRe = new RegExp("^[A-Za-z0-9_-]{1,64}@" + hostPattern + " \\[[0-9a-f]{4,12}\\]$");
    if (typeof requester !== "string" || !reqRe.test(requester)) {
      throw new ApiError("FORBIDDEN", `requester address does not belong to host "${peerHost}"`);
    }
    if (typeof f.target !== "string") throw new ApiError("BAD_REQUEST", '"target" is required');
    if (!this.takeToken(`peer:${peerHost}`)) throw new ApiError("RATE_LIMITED", `too many requests from host "${peerHost}" just now`);
    const t = this.parseTo(f.target);
    if (t.host !== null && t.host !== this.host) throw new ApiError("UNKNOWN_HOST", `this host is "${this.host}", not "${t.host}"`);
    const target = this.resolveLocal(t.name, t.ref);
    this.checkAcl({ name: requester.slice(0, requester.indexOf("@")), host: peerHost }, { name: target.name, host: this.host });
    if (this.statusOf(target) === "idle") this.sendNotice(peerHost, requester, target, "idle");
    else this.store.upsertRemoteIdleSub(peerHost, requester, target.agent, Date.now());
  }
  /** The host of an agent we watch says it became idle. The notice text is written here, never taken from the peer. */
  receiveNotice(peerHost, f) {
    const id = f.id;
    if (typeof id !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new ApiError("BAD_REQUEST", "invalid message id");
    if (this.store.hasMessageId(id)) return;
    if (f.kind !== "idle_notice") throw new ApiError("BAD_REQUEST", "unsupported notice");
    if (f.reason !== "idle" && f.reason !== "offline") throw new ApiError("BAD_REQUEST", "unsupported notice reason");
    const hostPattern = peerHost.replace(/[.]/g, "\\.");
    const targetRe = new RegExp("^([A-Za-z0-9_-]{1,64})@" + hostPattern + " \\[([0-9a-f]{4,12})\\]$");
    const m = typeof f.target === "string" ? targetRe.exec(f.target) : null;
    if (!m) throw new ApiError("FORBIDDEN", `target address does not belong to host "${peerHost}"`);
    if (typeof f.to !== "string") throw new ApiError("BAD_REQUEST", '"to" is required');
    if (!this.takeToken(`peer:${peerHost}`)) throw new ApiError("RATE_LIMITED", `too many notices from host "${peerHost}" just now`);
    const t = this.parseTo(f.to);
    if (t.host !== null && t.host !== this.host) throw new ApiError("UNKNOWN_HOST", `this host is "${this.host}", not "${t.host}"`);
    const requester = this.resolveLocal(t.name, t.ref);
    const who = `${m[1]}@${peerHost}`;
    const text = f.reason === "idle" ? `${who} is idle` : `${who} exited or went offline`;
    this.deliver(requester, { from: `agentlink@${peerHost}`, kind: "idle_notice", summary: text, message: text, reply_to: null }, true, id);
  }
  fireImmediate(requester, target) {
    const text = `${this.address(target)} is idle`;
    this.deliver(requester, { from: `agentlink@${this.host}`, kind: "idle_notice", summary: text, message: text, reply_to: null }, true);
  }
  /** Called by the server when a subscribed connection receives a message. */
  markDelivered(agent, id) {
    this.store.markState([id], agent, "delivered", ["new"]);
  }
  sweep() {
    const now = Date.now();
    for (const target of this.store.idleSubTargets()) {
      const a = this.store.getAgent(target);
      if (!a) continue;
      if (this.statusOf(a) === "offline") this.fireIdle(a, "offline");
    }
    this.store.deleteAckedBefore(now - LIMITS.ackedRetentionMs);
    for (const id of this.store.inactiveAgentsWithoutMessages(now - LIMITS.inactiveAgentGcMs)) this.store.deleteAgent(id);
    for (const [k, t] of this.recent) if (now - t > this.cfg.dupWindowMs) this.recent.delete(k);
    for (const [k, b] of this.buckets) if (now - b.last > 12e4) this.buckets.delete(k);
  }
};

// src/agentd/peers.ts
import https from "node:https";
import { randomBytes as randomBytes2, timingSafeEqual as timingSafeEqual2 } from "node:crypto";

// node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);

// src/agentd/peers-config.ts
import fs2 from "node:fs";
import path3 from "node:path";

// src/agentd/tls.ts
var import_selfsigned = __toESM(require_selfsigned(), 1);
import fs from "node:fs";
import path2 from "node:path";
import { X509Certificate } from "node:crypto";
function normalizeFingerprint(fp) {
  return fp.replace(/^sha-?256[:=]?/i, "").replace(/[^0-9a-fA-F]/g, "").toLowerCase();
}
function fingerprintOf(certPem) {
  return normalizeFingerprint(new X509Certificate(certPem).fingerprint256);
}
function displayFingerprint(fp) {
  return "sha256:" + (normalizeFingerprint(fp).match(/.{2}/g) ?? []).join(":").toUpperCase();
}
async function ensureTls(home2, host) {
  const dir = path2.join(home2, "tls");
  const keyFile = path2.join(dir, "key.pem");
  const certFile = path2.join(dir, "cert.pem");
  try {
    const key = fs.readFileSync(keyFile, "utf8");
    const cert = fs.readFileSync(certFile, "utf8");
    return { key, cert, fingerprint: fingerprintOf(cert) };
  } catch {
  }
  fs.mkdirSync(dir, { recursive: true });
  const pems = await import_selfsigned.default.generate([{ name: "commonName", value: `agentlink-${host}` }], {
    keySize: 2048,
    days: 3650,
    algorithm: "sha256"
  });
  try {
    fs.writeFileSync(keyFile, pems.private, { flag: "wx" });
    fs.writeFileSync(certFile, pems.cert, { flag: "wx" });
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }
  for (let i = 0; i < 20; i++) {
    try {
      const key = fs.readFileSync(keyFile, "utf8");
      const cert = fs.readFileSync(certFile, "utf8");
      if (key && cert) return { key, cert, fingerprint: fingerprintOf(cert) };
    } catch {
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`cannot read the TLS identity in ${dir}`);
}

// src/agentd/peers-config.ts
var HOST_RE = /^[a-z0-9][a-z0-9._-]{0,62}$/;
var DEFAULT_PORT = 7420;
var MIN_TOKEN_LENGTH = 16;
function isPort(n) {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 65535;
}
function parsePeersConfig(raw, selfHost) {
  const out = { listen: null, peers: [], errors: [] };
  if (typeof raw !== "object" || raw === null) {
    out.errors.push("peers.json must contain a JSON object");
    return out;
  }
  const obj = raw;
  const peersRaw = Array.isArray(obj.peers) ? obj.peers : [];
  if (obj.peers !== void 0 && !Array.isArray(obj.peers)) out.errors.push('"peers" must be an array');
  const seen = /* @__PURE__ */ new Set();
  peersRaw.forEach((p, i) => {
    const where = `peers[${i}]`;
    if (typeof p !== "object" || p === null) return void out.errors.push(`${where}: must be an object`);
    const e = p;
    const name = typeof e.name === "string" ? e.name.toLowerCase() : "";
    if (!HOST_RE.test(name)) return void out.errors.push(`${where}: "name" must be the peer's host name (letters, digits, ".", "-", "_")`);
    if (name === selfHost) return void out.errors.push(`${where}: "${name}" is this host itself`);
    if (seen.has(name)) return void out.errors.push(`${where}: duplicate peer "${name}"`);
    const token2 = typeof e.token === "string" ? e.token : "";
    if (token2.length < MIN_TOKEN_LENGTH) return void out.errors.push(`${where} (${name}): "token" must be a shared secret of at least ${MIN_TOKEN_LENGTH} characters`);
    const dial = e.dial !== false;
    const fingerprint = typeof e.fingerprint === "string" ? normalizeFingerprint(e.fingerprint) : "";
    let address = "";
    let port = DEFAULT_PORT;
    if (dial) {
      if (typeof e.address !== "string" || e.address.trim() === "") return void out.errors.push(`${where} (${name}): "address" is required unless "dial" is false`);
      address = e.address.trim();
      if (fingerprint.length !== 64) return void out.errors.push(`${where} (${name}): "fingerprint" (SHA-256 of the peer certificate) is required unless "dial" is false`);
      if (e.port !== void 0) {
        if (!isPort(e.port)) return void out.errors.push(`${where} (${name}): "port" must be 1-65535`);
        port = e.port;
      }
    }
    seen.add(name);
    out.peers.push({ name, address, port, token: token2, fingerprint, dial });
  });
  if (out.peers.length > 0) {
    const l = obj.listen ?? {};
    const host = typeof l.host === "string" && l.host.trim() ? l.host.trim() : "127.0.0.1";
    const port = l.port === void 0 ? DEFAULT_PORT : l.port;
    if (!isPort(port)) out.errors.push("listen.port must be 1-65535");
    else out.listen = { host, port };
  }
  return out;
}
function peersFile(home2) {
  return path3.join(home2, "peers.json");
}
var LOOPBACK_RE = /^(127\.|localhost$|::1$)/i;
function upsertPeerFile(home2, peer, listen) {
  const file = peersFile(home2);
  let raw = {};
  let text = null;
  try {
    text = fs2.readFileSync(file, "utf8");
  } catch (e) {
    if (e.code !== "ENOENT") throw new Error(`cannot read peers.json: ${String(e)}`);
  }
  if (text !== null) {
    try {
      const parsed = JSON.parse(text.replace(/^﻿/, ""));
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
      raw = parsed;
    } catch {
      throw new Error(`peers.json exists but is not valid JSON; fix or delete ${file} and pair again`);
    }
  }
  const peers = Array.isArray(raw.peers) ? [...raw.peers] : [];
  const at = peers.findIndex((p) => typeof p === "object" && p !== null && typeof p.name === "string" && p.name.toLowerCase() === peer.name);
  if (at >= 0) peers[at] = peer;
  else peers.push(peer);
  raw.peers = peers;
  if (listen) {
    const l = raw.listen;
    const usable = l && typeof l.host === "string" && l.host.trim() !== "" && !LOOPBACK_RE.test(l.host.trim());
    if (!usable) raw.listen = { host: listen.host, port: listen.port };
  }
  const tmp = `${file}.${process.pid}.tmp`;
  fs2.writeFileSync(tmp, JSON.stringify(raw, null, 2) + "\n", { mode: 384 });
  fs2.renameSync(tmp, file);
}
function loadPeersConfig(home2, selfHost) {
  let text;
  try {
    text = fs2.readFileSync(peersFile(home2), "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return { listen: null, peers: [], errors: [] };
    return { listen: null, peers: [], errors: [`cannot read peers.json: ${String(e)}`] };
  }
  try {
    return parsePeersConfig(JSON.parse(text.replace(/^﻿/, "")), selfHost);
  } catch (e) {
    return { listen: null, peers: [], errors: [`peers.json is not valid JSON: ${String(e instanceof Error ? e.message : e)}`] };
  }
}

// src/agentd/pair.ts
import os2 from "node:os";
import { createHmac, timingSafeEqual } from "node:crypto";
var CODE_PREFIX = "AL1-";
var DEFAULT_PAIR_TTL_S = 600;
var MAX_PAIR_FAILURES = 5;
function encodeCode(c) {
  return CODE_PREFIX + Buffer.from(`${c.address}
${c.port}
${c.fingerprint}
${c.secret}`, "utf8").toString("base64url");
}
function decodeCode(text) {
  const t = text.trim();
  if (!t.startsWith(CODE_PREFIX)) return `a pairing code starts with "${CODE_PREFIX}"`;
  let parts;
  try {
    parts = Buffer.from(t.slice(CODE_PREFIX.length), "base64url").toString("utf8").split("\n");
  } catch {
    return "the pairing code is damaged";
  }
  if (parts.length !== 4) return "the pairing code is damaged (was it copied completely?)";
  const [address, portText, fingerprint, secret] = parts;
  const port = Number(portText);
  if (!address || address.length > 253 || /\s/.test(address)) return "the pairing code is damaged";
  if (!Number.isInteger(port) || port < 1 || port > 65535) return "the pairing code is damaged";
  if (!/^[0-9a-f]{64}$/.test(fingerprint)) return "the pairing code is damaged";
  if (!/^[0-9a-f]{32}$/.test(secret)) return "the pairing code is damaged";
  return { address, port, fingerprint: normalizeFingerprint(fingerprint), secret };
}
function pairProof(secret, joinerHost) {
  return createHmac("sha256", secret).update(`agentlink-pair-v1|${joinerHost}`).digest("hex");
}
function linkToken(secret) {
  return createHmac("sha256", secret).update("agentlink-link-v1").digest("hex");
}
function proofMatches(given, expected) {
  if (typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function lanAddresses() {
  const out = [];
  for (const addrs of Object.values(os2.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== "IPv4" || a.internal || a.address.startsWith("169.254.")) continue;
      out.push(a.address);
    }
  }
  return out;
}

// src/agentd/peers.ts
var MAX_FRAME = 512 * 1024;
var HANDSHAKE_MS = 5e3;
var MAX_REMOTE_AGENTS = 200;
var KNOWN_CODES = /* @__PURE__ */ new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "NOT_REGISTERED",
  "UNKNOWN_AGENT",
  "AMBIGUOUS_NAME",
  "UNKNOWN_HOST",
  "TOO_LARGE",
  "RATE_LIMITED",
  "FORBIDDEN",
  "LOOP_DETECTED",
  "INTERNAL"
]);
var isWildcard = (h) => h === "0.0.0.0" || h === "::";
function tokenMatches(given, expected) {
  if (typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual2(a, b);
}
function parseFrame(data, isBinary) {
  if (isBinary) return null;
  try {
    const f = JSON.parse(data.toString());
    return typeof f === "object" && f !== null && !Array.isArray(f) ? f : null;
  } catch {
    return null;
  }
}
function cleanAgents(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const a of raw.slice(0, MAX_REMOTE_AGENTS)) {
    if (typeof a !== "object" || a === null) continue;
    const e = a;
    if (typeof e.name !== "string" || !NAME_RE.test(e.name)) continue;
    if (typeof e.ref !== "string" || !REF_RE.test(e.ref)) continue;
    const kind = typeof e.kind === "string" && NAME_RE.test(e.kind) ? e.kind : "generic";
    const status = e.status === "busy" || e.status === "idle" ? e.status : "offline";
    out.push({
      name: e.name,
      ref: e.ref,
      kind,
      status,
      cwd: typeof e.cwd === "string" ? e.cwd.slice(0, 1024) : null,
      unread: typeof e.unread === "number" && Number.isFinite(e.unread) ? Math.max(0, Math.floor(e.unread)) : 0,
      last_seen: typeof e.last_seen === "number" && Number.isFinite(e.last_seen) ? Math.floor(e.last_seen) : 0
    });
  }
  return out;
}
var PeerManager = class {
  core;
  store;
  cfg;
  home;
  tls;
  selfHost;
  log;
  config = { listen: null, peers: [], errors: [] };
  links = /* @__PURE__ */ new Map();
  dialers = /* @__PURE__ */ new Map();
  pending = /* @__PURE__ */ new Map();
  httpsServer = null;
  wss = null;
  listening = null;
  listenError = null;
  directoryTimer = null;
  pairing = null;
  constructor(opts) {
    this.core = opts.core;
    this.store = opts.store;
    this.cfg = opts.cfg;
    this.home = opts.home;
    this.tls = opts.tls;
    this.selfHost = opts.selfHost;
    this.log = opts.log;
  }
  // --- RemoteGateway ---------------------------------------------------------------
  knownHost(host) {
    return this.config.peers.some((p) => p.name === host);
  }
  directory() {
    return [...this.links.values()].map((l) => ({ host: l.host, agents: l.agents }));
  }
  hosts() {
    return this.config.peers.map((p) => {
      const link = this.links.get(p.name);
      return {
        host: p.name,
        link: link ? "up" : "down",
        since: link ? Math.floor(link.since / 1e3) : null,
        queued: this.store.countOutbox(p.name),
        error: link ? null : this.dialers.get(p.name)?.lastError ?? null
      };
    });
  }
  async send(host, frame, senderAgent, toDisplay) {
    this.store.insertOutbox({
      id: frame.id,
      peer: host,
      frame: JSON.stringify(frame),
      sender_agent: senderAgent,
      to_display: toDisplay,
      created_ms: Date.now()
    });
    const link = this.links.get(host);
    if (!link) return "queued_remote";
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(frame.id);
        resolve("queued_remote");
      }, this.cfg.ackWaitMs);
      this.pending.set(frame.id, {
        resolve: () => {
          clearTimeout(timer);
          resolve("stored");
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        }
      });
      try {
        link.ws.send(JSON.stringify(frame));
      } catch {
        clearTimeout(timer);
        this.pending.delete(frame.id);
        resolve("queued_remote");
      }
    });
  }
  // --- configuration -----------------------------------------------------------------
  status() {
    return {
      host: this.selfHost,
      fingerprint: displayFingerprint(this.tls.fingerprint),
      listening: this.listening,
      listen_error: this.listenError,
      config_errors: this.config.errors,
      peers: this.hosts()
    };
  }
  async apply(next) {
    const prev = this.config;
    this.config = next;
    for (const [name, d] of [...this.dialers]) {
      const n = next.peers.find((p) => p.name === name);
      const same = n && n.dial && n.address === d.peer.address && n.port === d.peer.port && n.token === d.peer.token && n.fingerprint === d.peer.fingerprint;
      if (!same) this.stopDialer(name);
    }
    for (const [name, link] of [...this.links]) {
      const before = prev.peers.find((p) => p.name === name);
      const n = next.peers.find((p) => p.name === name);
      if (!n || !before || n.token !== before.token) link.ws.close(1e3, "peer configuration changed");
    }
    for (const p of next.peers) if (p.dial && !this.dialers.has(p.name)) this.startDialer(p);
    const want = next.listen;
    const have = this.listening;
    if (!want || !have || want.host !== have.host || want.port !== have.port) {
      await this.stopListener();
      if (want) await this.startListener(want);
    }
    if (next.peers.length > 0 && !this.directoryTimer) {
      this.directoryTimer = setInterval(() => this.broadcastDirectory(), this.cfg.directoryMs);
      this.directoryTimer.unref();
    }
    if (next.peers.length === 0 && this.directoryTimer) {
      clearInterval(this.directoryTimer);
      this.directoryTimer = null;
    }
    for (const e of next.errors) this.log(`peers.json: ${e}`);
  }
  async stop() {
    if (this.pairing) clearTimeout(this.pairing.timer);
    if (this.directoryTimer) clearInterval(this.directoryTimer);
    this.directoryTimer = null;
    for (const name of [...this.dialers.keys()]) this.stopDialer(name);
    for (const l of this.links.values()) l.ws.terminate();
    await this.stopListener();
  }
  /** Called periodically by the daemon: expires undeliverable messages. */
  sweep() {
    const expired = this.store.outboxExpired(Date.now() - this.cfg.outboxTtlMs);
    for (const row of expired) {
      this.store.deleteOutbox(row.id);
      this.core.deliverNotice(row.sender_agent, `Message to ${row.to_display} could not be delivered within ${Math.round(this.cfg.outboxTtlMs / 36e5)}h and was dropped.`);
    }
  }
  // --- pairing (see pair.ts) ---------------------------------------------------------------------------
  /** Host side: opens the LAN port for one joining PC and returns the code to type there. */
  async startPairing(opts) {
    const l = this.listening;
    const port = opts.port ?? l?.port ?? DEFAULT_PORT;
    let address = opts.address;
    if (!address) address = l && !isWildcard(l.host) && l.host !== "127.0.0.1" ? l.host : lanAddresses()[0];
    if (!address) throw new ApiError("BAD_REQUEST", "no LAN address of this PC found; pass --address <IP of this PC>");
    const ttlS = Math.min(Math.max(opts.ttlS ?? DEFAULT_PAIR_TTL_S, 10), 3600);
    if (this.pairing) {
      clearTimeout(this.pairing.timer);
      this.pairing.state = "cancelled";
      this.pairing.secret = "";
    }
    const reachable = this.listening && this.listening.port === port && (this.listening.host === address || isWildcard(this.listening.host));
    if (!reachable) {
      await this.stopListener();
      await this.startListener({ host: address, port });
      if (!this.listening) {
        const why = this.listenError ?? "unknown error";
        await this.restoreListener();
        throw new ApiError("INTERNAL", `cannot listen on ${address}:${port}: ${why}`);
      }
    }
    const secret = randomBytes2(16).toString("hex");
    const timer = setTimeout(() => this.endPairing("expired"), ttlS * 1e3);
    timer.unref();
    this.pairing = { secret, address, port, expiresAt: Date.now() + ttlS * 1e3, failures: 0, state: "waiting", host: null, detail: null, timer };
    this.log(`pairing opened on ${address}:${port} for ${ttlS}s`);
    return { code: encodeCode({ address, port, fingerprint: this.tls.fingerprint, secret }), address, port, expires_s: ttlS, host: this.selfHost };
  }
  pairStatus() {
    const p = this.pairing;
    if (!p) return { state: "none" };
    return { state: p.state, host: p.host, detail: p.detail, expires_s: Math.max(0, Math.round((p.expiresAt - Date.now()) / 1e3)) };
  }
  cancelPairing() {
    if (this.pairing?.state === "waiting") this.endPairing("cancelled");
    return this.pairStatus();
  }
  endPairing(state, host = null, detail = null) {
    const p = this.pairing;
    if (!p || p.state !== "waiting") return;
    clearTimeout(p.timer);
    p.state = state;
    p.host = host;
    p.detail = detail;
    p.secret = "";
    this.log(`pairing ${state}${host ? ` with ${host}` : ""}${detail ? `: ${detail}` : ""}`);
    if (state !== "paired") void this.restoreListener();
  }
  async restoreListener() {
    try {
      await this.apply(loadPeersConfig(this.home, this.selfHost));
    } catch (e) {
      this.log(`could not restore the listener: ${String(e)}`);
    }
  }
  /** Host side: a joining PC sent a `pair` frame. */
  onPair(ws, f) {
    const refuse = (code) => {
      try {
        ws.send(JSON.stringify({ t: "error", code }));
      } catch {
      }
      ws.close(1008, "refused");
    };
    const p = this.pairing;
    if (!p || p.state !== "waiting" || Date.now() > p.expiresAt) return refuse("UNAUTHORIZED");
    const host = typeof f.host === "string" ? f.host.toLowerCase() : "";
    if (f.v !== 1 || !HOST_RE.test(host) || host === this.selfHost) return refuse("BAD_REQUEST");
    if (!proofMatches(f.proof, pairProof(p.secret, host))) {
      p.failures++;
      this.log(`pairing: wrong proof from "${host.slice(0, 64)}" (${p.failures}/${MAX_PAIR_FAILURES})`);
      if (p.failures >= MAX_PAIR_FAILURES) this.endPairing("failed", null, "too many wrong attempts");
      return refuse("UNAUTHORIZED");
    }
    try {
      upsertPeerFile(this.home, { name: host, token: linkToken(p.secret), dial: false }, { host: p.address, port: p.port });
    } catch (e) {
      this.endPairing("failed", null, e instanceof Error ? e.message : String(e));
      return refuse("INTERNAL");
    }
    this.endPairing("paired", host);
    ws.send(JSON.stringify({ t: "paired", v: 1, host: this.selfHost }), () => {
      ws.close(1e3, "paired");
      void this.restoreListener();
    });
  }
  /** Joining side: connects to the host that made `codeText`, proves the code and records the host in peers.json. */
  joinPairing(codeText) {
    const c = decodeCode(codeText);
    if (typeof c === "string") throw new ApiError("BAD_REQUEST", c);
    if (c.fingerprint === this.tls.fingerprint) throw new ApiError("BAD_REQUEST", 'this code was made by this PC; run "agentctl pair <code>" on the other PC');
    return new Promise((resolve, reject) => {
      const ws = new import_websocket.default(`wss://${c.address}:${c.port}`, { rejectUnauthorized: false, handshakeTimeout: HANDSHAKE_MS, maxPayload: MAX_FRAME, minVersion: "TLSv1.2" });
      let settled = false;
      const finish = (err, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err) {
          try {
            ws.terminate();
          } catch {
          }
          reject(err);
        } else {
          ws.close(1e3, "paired");
          resolve(value);
        }
      };
      const timer = setTimeout(() => finish(new ApiError("INTERNAL", `no answer from ${c.address}:${c.port} within 15 s`)), 15e3);
      ws.on("open", () => {
        const sock = ws._socket;
        const got = normalizeFingerprint(sock?.getPeerCertificate?.().fingerprint256 ?? "");
        if (got !== c.fingerprint) {
          return finish(new ApiError("FORBIDDEN", `the certificate at ${c.address}:${c.port} does not match the code (wrong code, or another PC answers on that address)`));
        }
        ws.send(JSON.stringify({ t: "pair", v: 1, host: this.selfHost, proof: pairProof(c.secret, this.selfHost) }));
      });
      ws.on("message", (data, isBinary) => {
        const f = parseFrame(data, isBinary);
        if (!f) return finish(new ApiError("INTERNAL", "unexpected reply from the other PC"));
        if (f.t === "error") return finish(new ApiError("FORBIDDEN", `the other PC refused the code (${String(f.code)}): it may have expired, been used already, or be mistyped`));
        const peerHost = f.t === "paired" && typeof f.host === "string" ? f.host.toLowerCase() : "";
        if (!HOST_RE.test(peerHost) || peerHost === this.selfHost) return finish(new ApiError("INTERNAL", "unexpected reply from the other PC"));
        try {
          upsertPeerFile(this.home, { name: peerHost, address: c.address, port: c.port, token: linkToken(c.secret), fingerprint: displayFingerprint(c.fingerprint), dial: true });
        } catch (e) {
          return finish(new ApiError("INTERNAL", e instanceof Error ? e.message : String(e)));
        }
        this.apply(loadPeersConfig(this.home, this.selfHost)).then(
          () => finish(null, { host: peerHost, address: c.address, port: c.port }),
          (e) => finish(new ApiError("INTERNAL", String(e)))
        );
      });
      ws.on("error", (e) => finish(new ApiError("INTERNAL", `cannot reach ${c.address}:${c.port}: ${e.message}. Is TCP ${c.port} open in the firewall of that PC?`)));
      ws.on("close", () => finish(new ApiError("INTERNAL", "the other PC closed the connection before pairing finished")));
    });
  }
  // --- listener (inbound links) ------------------------------------------------------------
  startListener(l) {
    return new Promise((resolve) => {
      const server2 = https.createServer({ key: this.tls.key, cert: this.tls.cert, minVersion: "TLSv1.2" });
      const wss = new import_websocket_server.default({ server: server2, maxPayload: MAX_FRAME });
      wss.on("connection", (ws) => this.bind(ws, "peer", null));
      server2.once("error", (e) => {
        this.listenError = `${e.code ?? "error"}: ${e.message}`;
        this.log(`listener ${l.host}:${l.port} failed: ${this.listenError}`);
        wss.close();
        resolve();
      });
      server2.listen(l.port, l.host, () => {
        this.httpsServer = server2;
        this.wss = wss;
        this.listening = { host: l.host, port: server2.address().port };
        this.listenError = null;
        this.log(`listening for peers on ${l.host}:${this.listening.port}`);
        resolve();
      });
    });
  }
  stopListener() {
    const server2 = this.httpsServer;
    const wss = this.wss;
    this.httpsServer = null;
    this.wss = null;
    this.listening = null;
    if (!server2 || !wss) return Promise.resolve();
    for (const c of wss.clients) c.terminate();
    return new Promise((resolve) => wss.close(() => server2.close(() => resolve())));
  }
  // --- dialers (outbound links) ---------------------------------------------------------------
  /** The link initiated by the host with the smaller name is the one both sides keep. */
  winnerInitiator(host) {
    return this.selfHost < host ? "self" : "peer";
  }
  startDialer(peer) {
    const d = { peer, stopped: false, timer: void 0, backoff: this.cfg.peerReconnectMinMs, ws: void 0, lastError: null };
    this.dialers.set(peer.name, d);
    this.attempt(d);
  }
  stopDialer(name) {
    const d = this.dialers.get(name);
    if (!d) return;
    d.stopped = true;
    if (d.timer) clearTimeout(d.timer);
    try {
      d.ws?.terminate();
    } catch {
    }
    this.dialers.delete(name);
  }
  schedule(d, ms) {
    if (d.stopped) return;
    d.timer = setTimeout(() => this.attempt(d), ms);
    d.timer.unref();
  }
  attempt(d) {
    if (d.stopped) return;
    const existing = this.links.get(d.peer.name);
    if (existing && existing.initiator === this.winnerInitiator(d.peer.name)) {
      this.schedule(d, this.cfg.peerReconnectMinMs);
      return;
    }
    const { peer } = d;
    const ws = new import_websocket.default(`wss://${peer.address}:${peer.port}`, {
      rejectUnauthorized: false,
      // self-signed: trust comes from the pinned fingerprint below
      handshakeTimeout: HANDSHAKE_MS,
      maxPayload: MAX_FRAME,
      minVersion: "TLSv1.2"
    });
    d.ws = ws;
    let opened = false;
    ws.on("open", () => {
      opened = true;
      const sock = ws._socket;
      const got = normalizeFingerprint(sock?.getPeerCertificate?.().fingerprint256 ?? "");
      if (got !== peer.fingerprint) {
        d.lastError = `certificate fingerprint mismatch (pinned ${displayFingerprint(peer.fingerprint)}, got ${got ? displayFingerprint(got) : "none"})`;
        this.log(`peer ${peer.name}: ${d.lastError}`);
        ws.terminate();
        return;
      }
      ws.send(JSON.stringify({ t: "hello", v: 1, host: this.selfHost, token: peer.token }));
      this.bind(ws, "self", peer.name, () => {
        d.backoff = this.cfg.peerReconnectMinMs;
        d.lastError = null;
      }, (msg) => {
        d.lastError = msg;
      });
    });
    ws.on("error", (e) => {
      if (!opened || !d.lastError) d.lastError = e.message;
    });
    ws.on("close", () => {
      if (d.ws === ws) d.ws = void 0;
      this.schedule(d, d.backoff);
      d.backoff = Math.min(d.backoff * 2, this.cfg.peerReconnectMaxMs);
    });
  }
  // --- one socket, both directions -----------------------------------------------------------------
  bind(ws, initiator, expectHost, onUp, onProblem) {
    let host = null;
    const authTimer = setTimeout(() => ws.terminate(), HANDSHAKE_MS);
    ws.on("close", () => clearTimeout(authTimer));
    ws.on("error", () => {
    });
    ws.on("message", (data, isBinary) => {
      const f = parseFrame(data, isBinary);
      if (!f) {
        ws.terminate();
        return;
      }
      if (host === null) {
        if (initiator === "peer") {
          if (f.t === "pair") return this.onPair(ws, f);
          const peer = f.t === "hello" && f.v === 1 && typeof f.host === "string" ? this.config.peers.find((p) => p.name === f.host) : void 0;
          if (!peer || !tokenMatches(f.token, peer.token)) {
            this.log(`rejected inbound peer "${String(f.host).slice(0, 64)}": ${peer ? "bad token" : "not in peers.json"}`);
            ws.send(JSON.stringify({ t: "error", code: "UNAUTHORIZED" }));
            ws.close(1008, "unauthorized");
            return;
          }
          ws.send(JSON.stringify({ t: "welcome", v: 1, host: this.selfHost }));
          host = peer.name;
        } else {
          if (f.t === "error") {
            onProblem?.(`peer refused the connection: ${String(f.code)}`);
            ws.terminate();
            return;
          }
          if (f.t !== "welcome" || f.host !== expectHost) {
            onProblem?.("unexpected handshake reply");
            ws.terminate();
            return;
          }
          host = expectHost;
        }
        clearTimeout(authTimer);
        if (!this.establish(host, ws, initiator)) return;
        onUp?.();
        return;
      }
      const link = this.links.get(host);
      if (!link || link.ws !== ws) return;
      link.alive = true;
      switch (f.t) {
        case "agents":
          link.agents = cleanAgents(f.agents);
          break;
        case "msg":
        case "watch":
        case "notice":
          this.onTransfer(link, f);
          break;
        case "ack":
          this.onAck(host, f);
          break;
        default:
          break;
      }
    });
  }
  establish(host, ws, initiator) {
    const existing = this.links.get(host);
    if (existing) {
      if (initiator === this.winnerInitiator(host)) {
        existing.ws.close(1e3, "replaced");
        this.dropLink(existing);
      } else {
        ws.close(1e3, "duplicate link");
        return false;
      }
    }
    const link = {
      host,
      ws,
      initiator,
      since: Date.now(),
      alive: true,
      agents: [],
      pingTimer: setInterval(() => {
        if (!link.alive) {
          ws.terminate();
          return;
        }
        link.alive = false;
        try {
          ws.ping();
        } catch {
          ws.terminate();
        }
      }, this.cfg.peerPingMs)
    };
    link.pingTimer.unref();
    ws.on("pong", () => link.alive = true);
    ws.on("close", () => this.dropLink(link));
    this.links.set(host, link);
    this.log(`link to ${host} is up (${initiator === "self" ? "outbound" : "inbound"})`);
    this.sendDirectory(link);
    this.flush(link);
    return true;
  }
  dropLink(link) {
    clearInterval(link.pingTimer);
    if (this.links.get(link.host) === link) {
      this.links.delete(link.host);
      this.log(`link to ${link.host} is down`);
    }
  }
  // --- frames ------------------------------------------------------------------------------------------
  sendDirectory(link) {
    try {
      link.ws.send(JSON.stringify({ t: "agents", agents: this.core.localDirectory() }));
    } catch {
    }
  }
  broadcastDirectory() {
    for (const l of this.links.values()) this.sendDirectory(l);
  }
  flush(link) {
    for (const row of this.store.outboxForPeer(link.host)) {
      try {
        link.ws.send(row.frame);
      } catch {
        return;
      }
    }
  }
  onTransfer(link, f) {
    const id = typeof f.id === "string" ? f.id.slice(0, 64) : "";
    let reply;
    try {
      if (f.t === "msg") this.core.receiveRemote(link.host, f);
      else if (f.t === "watch") this.core.receiveWatch(link.host, f);
      else this.core.receiveNotice(link.host, f);
      reply = { t: "ack", id, status: "stored" };
    } catch (e) {
      if (e instanceof ApiError) reply = { t: "ack", id, status: "error", code: e.code, message: e.message.slice(0, 300) };
      else {
        this.log(`error while receiving from ${link.host}: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
        reply = { t: "ack", id, status: "error", code: "INTERNAL", message: "internal error" };
      }
    }
    try {
      link.ws.send(JSON.stringify(reply));
    } catch {
    }
  }
  onAck(host, f) {
    const id = typeof f.id === "string" ? f.id : "";
    const row = this.store.getOutbox(id);
    if (!row || row.peer !== host) return;
    this.store.deleteOutbox(id);
    const waiter = this.pending.get(id);
    this.pending.delete(id);
    if (f.status === "stored") {
      waiter?.resolve();
      return;
    }
    const code = typeof f.code === "string" && KNOWN_CODES.has(f.code) ? f.code : "INTERNAL";
    const message = typeof f.message === "string" ? f.message.slice(0, 300) : "delivery failed";
    if (waiter) waiter.reject(new ApiError(code, `${message} (reported by ${host})`));
    else this.core.deliverNotice(row.sender_agent, `Message to ${row.to_display} could not be delivered: ${code}: ${message}`);
  }
};

// src/agentd/server.ts
import net from "node:net";
import { timingSafeEqual as timingSafeEqual3 } from "node:crypto";
import { EventEmitter as EventEmitter2 } from "node:events";
function tokenMatches2(given, expected) {
  if (typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual3(a, b);
}
var Server = class extends EventEmitter2 {
  core;
  token;
  log;
  srv;
  conns = /* @__PURE__ */ new Set();
  admin;
  constructor(core, token2, log2, admin = null) {
    super();
    this.core = core;
    this.token = token2;
    this.log = log2;
    this.admin = admin;
    this.srv = net.createServer((socket) => this.onConnection(socket));
    core.events.on("message", (agent, row) => this.push(agent, row));
  }
  listen(pipe) {
    return new Promise((resolve, reject) => {
      this.srv.once("error", reject);
      this.srv.listen(pipe, () => {
        this.srv.off("error", reject);
        resolve();
      });
    });
  }
  close() {
    for (const c of this.conns) c.socket.destroy();
    return new Promise((resolve) => this.srv.close(() => resolve()));
  }
  write(c, obj) {
    if (!c.socket.destroyed) c.socket.write(JSON.stringify(obj) + "\n");
  }
  push(agent, row) {
    const eventName = row.kind === "idle_notice" ? "idle" : "message";
    for (const c of this.conns) {
      const events = c.subs.get(agent);
      if (!events || !events.has(eventName)) continue;
      this.core.markDelivered(agent, row.id);
      this.write(c, {
        event: eventName,
        data: {
          id: row.id,
          from: row.from_addr,
          to: row.to_addr,
          kind: row.kind,
          summary: row.summary,
          message: row.message,
          ts: row.ts,
          reply_to: row.reply_to,
          state: "delivered"
        }
      });
      return;
    }
  }
  onConnection(socket) {
    const conn = { socket, authed: false, subs: /* @__PURE__ */ new Map() };
    this.conns.add(conn);
    let buf = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buf += chunk;
      if (buf.length > LIMITS.maxLineBytes && !buf.includes("\n")) {
        this.write(conn, { id: null, error: { code: "BAD_REQUEST", message: "request line too long" } });
        socket.destroy();
        return;
      }
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) void this.handleLine(conn, line);
      }
    });
    socket.on("error", () => {
    });
    socket.on("close", () => this.conns.delete(conn));
  }
  async handleLine(conn, line) {
    let req;
    try {
      req = JSON.parse(line);
      if (typeof req !== "object" || req === null) throw new Error("not an object");
    } catch {
      this.write(conn, { id: null, error: { code: "BAD_REQUEST", message: "invalid JSON" } });
      return;
    }
    const id = req.id ?? null;
    try {
      if (typeof req.method !== "string") throw new ApiError("BAD_REQUEST", '"method" is required');
      const params = req.params && typeof req.params === "object" ? req.params : {};
      const result = await this.dispatch(conn, req.method, params);
      this.write(conn, { id, result });
      if (req.method === "shutdown") this.emit("shutdown");
    } catch (e) {
      if (e instanceof ApiError) {
        this.write(conn, { id, error: { code: e.code, message: e.message, ...e.data !== void 0 ? { data: e.data } : {} } });
        if (e.code === "UNAUTHORIZED") conn.socket.end();
      } else {
        this.log(`internal error in ${String(req.method)}: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
        this.write(conn, { id, error: { code: "INTERNAL", message: "internal error" } });
      }
    }
  }
  async dispatch(conn, method, p) {
    if (method === "hello") {
      if (!tokenMatches2(p.token, this.token)) throw new ApiError("UNAUTHORIZED", "invalid token");
      conn.authed = true;
      return this.core.hello(p);
    }
    if (!conn.authed) throw new ApiError("UNAUTHORIZED", "send hello with a valid token first");
    switch (method) {
      case "register":
        return this.core.register(p);
      case "unregister":
        return this.core.unregister(p);
      case "heartbeat":
        return this.core.heartbeat(p);
      case "send":
        return this.core.send(p);
      case "list":
        return this.core.list(p);
      case "inbox":
        return this.core.inbox(p);
      case "ack":
        return this.core.ack(p);
      case "notify_when_idle":
        return await this.core.notifyWhenIdle(p);
      case "subscribe": {
        const agent = p.agent;
        if (typeof agent !== "string") throw new ApiError("BAD_REQUEST", '"agent" is required');
        this.core.heartbeat({ agent });
        const events = p.events;
        if (!Array.isArray(events) || events.some((e) => e !== "message" && e !== "idle")) {
          throw new ApiError("BAD_REQUEST", '"events" must be an array of "message" and/or "idle"');
        }
        conn.subs.set(agent, new Set(events));
        return {};
      }
      case "acl":
        return this.admin ? this.admin.aclStatus() : {};
      case "reload_acl":
        return this.admin ? this.admin.reloadAcl() : {};
      case "acl_check":
        return this.admin ? this.admin.aclCheck(String(p.from ?? ""), String(p.to ?? "")) : {};
      case "peers":
        return this.admin ? await this.admin.peersStatus() : { peers: [] };
      case "reload_peers":
        return this.admin ? await this.admin.reloadPeers() : {};
      case "pair_start": {
        if (!this.admin) return {};
        const port = p.port === void 0 ? void 0 : Number(p.port);
        if (port !== void 0 && (!Number.isInteger(port) || port < 1 || port > 65535)) throw new ApiError("BAD_REQUEST", '"port" must be 1-65535');
        const ttlS = p.ttl_s === void 0 ? void 0 : Number(p.ttl_s);
        if (ttlS !== void 0 && !Number.isFinite(ttlS)) throw new ApiError("BAD_REQUEST", '"ttl_s" must be a number');
        return await this.admin.pairStart({ address: typeof p.address === "string" && p.address.trim() ? p.address.trim() : void 0, port, ttlS });
      }
      case "pair_status":
        return this.admin ? await this.admin.pairStatus() : {};
      case "pair_cancel":
        return this.admin ? await this.admin.pairCancel() : {};
      case "pair_join":
        if (typeof p.code !== "string" || p.code.trim() === "") throw new ApiError("BAD_REQUEST", '"code" is required');
        return this.admin ? await this.admin.pairJoin(p.code) : {};
      case "shutdown":
        return {};
      default:
        throw new ApiError("BAD_REQUEST", `unknown method "${method}"`);
    }
  }
};

// src/agentd/acl.ts
import fs3 from "node:fs";
import path4 from "node:path";
function parsePattern(raw, selfHost) {
  if (typeof raw !== "string" || raw.trim() === "") return "must be a non-empty string";
  const s = raw.trim();
  if (s === "*") return { name: "*", host: "*" };
  const at = s.lastIndexOf("@");
  const name = at < 0 ? s : s.slice(0, at);
  const host = at < 0 ? selfHost : s.slice(at + 1).toLowerCase();
  if (name !== "*" && !NAME_RE.test(name)) return `"${name}" is not a valid agent name`;
  if (host !== "*" && !HOST_RE.test(host)) return `"${host}" is not a valid host name`;
  return { name, host };
}
function parseAcl(raw, selfHost) {
  const out = { default: "allow", rules: [], errors: [], failClosed: false };
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    out.errors.push("acl.json must contain a JSON object");
    return out;
  }
  const o = raw;
  if (o.default !== void 0) {
    if (o.default === "allow" || o.default === "deny") out.default = o.default;
    else out.errors.push('"default" must be "allow" or "deny"');
  }
  if (o.rules !== void 0 && !Array.isArray(o.rules)) out.errors.push('"rules" must be an array');
  const rules = Array.isArray(o.rules) ? o.rules : [];
  rules.forEach((r, i) => {
    const where = `rules[${i}]`;
    if (typeof r !== "object" || r === null) return void out.errors.push(`${where}: must be an object`);
    const e = r;
    const from = parsePattern(e.from, selfHost);
    if (typeof from === "string") return void out.errors.push(`${where}.from: ${from}`);
    const to = parsePattern(e.to, selfHost);
    if (typeof to === "string") return void out.errors.push(`${where}.to: ${to}`);
    if (e.action !== "allow" && e.action !== "deny") return void out.errors.push(`${where}.action: must be "allow" or "deny"`);
    out.rules.push({ from, to, action: e.action, text: `${String(e.from)} -> ${String(e.to)}: ${e.action}` });
  });
  return out;
}
function matches(p, name, host) {
  return (p.name === "*" || p.name === name) && (p.host === "*" || p.host === host);
}
var Acl = class {
  selfHost;
  file;
  state = { default: "allow", rules: [], errors: [], failClosed: false };
  constructor(home2, selfHost) {
    this.file = path4.join(home2, "acl.json");
    this.selfHost = selfHost;
  }
  /** Reads acl.json. A broken file keeps the previous rules on reload and fails closed at startup. */
  load(startup) {
    let text;
    try {
      text = fs3.readFileSync(this.file, "utf8");
    } catch (e) {
      if (e.code === "ENOENT") {
        this.state = { default: "allow", rules: [], errors: [], failClosed: false };
        return this.state;
      }
      return this.broken(startup, `cannot read acl.json: ${String(e)}`);
    }
    let raw;
    try {
      raw = JSON.parse(text.replace(/^﻿/, ""));
    } catch (e) {
      return this.broken(startup, `acl.json is not valid JSON: ${String(e instanceof Error ? e.message : e)}`);
    }
    const parsed = parseAcl(raw, this.selfHost);
    if (parsed.errors.length > 0) {
      return this.broken(startup, parsed.errors.join("; "));
    }
    this.state = parsed;
    return this.state;
  }
  broken(startup, why) {
    if (startup) {
      this.state = { default: "deny", rules: [], errors: [why], failClosed: true };
    } else {
      this.state = { ...this.state, errors: [`kept the previous rules because the new acl.json is unusable: ${why}`] };
    }
    return this.state;
  }
  status() {
    return this.state;
  }
  check(from, to) {
    if (this.state.failClosed) {
      return { allowed: false, rule: null, reason: `acl.json is unusable (${this.state.errors[0]}); all sending is blocked until it is fixed` };
    }
    for (let i = 0; i < this.state.rules.length; i++) {
      const r = this.state.rules[i];
      if (matches(r.from, from.name, from.host) && matches(r.to, to.name, to.host)) {
        return { allowed: r.action === "allow", rule: i + 1, reason: `rule ${i + 1} (${r.text})` };
      }
    }
    return { allowed: this.state.default === "allow", rule: null, reason: `default "${this.state.default}"` };
  }
};

// src/agentd/store.ts
import { DatabaseSync } from "node:sqlite";
function plain(row) {
  return { ...row };
}
var Store = class {
  db;
  constructor(file) {
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA busy_timeout = 3000");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        agent TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        ref TEXT NOT NULL,
        kind TEXT NOT NULL,
        cwd TEXT,
        pid INTEGER,
        status TEXT NOT NULL,
        active INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        registered_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS agents_name ON agents(name);
      CREATE TABLE IF NOT EXISTS messages (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        to_agent TEXT NOT NULL,
        from_addr TEXT NOT NULL,
        to_addr TEXT NOT NULL,
        kind TEXT NOT NULL,
        summary TEXT,
        message TEXT NOT NULL,
        ts INTEGER NOT NULL,
        reply_to TEXT,
        ttl INTEGER NOT NULL,
        state TEXT NOT NULL,
        created_ms INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS messages_inbox ON messages(to_agent, state, seq);
      CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY,
        peer TEXT NOT NULL,
        frame TEXT NOT NULL,
        sender_agent TEXT NOT NULL,
        to_display TEXT NOT NULL,
        created_ms INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS outbox_peer ON outbox(peer, created_ms);
      CREATE TABLE IF NOT EXISTS remote_idle_subs (
        host TEXT NOT NULL,
        requester_addr TEXT NOT NULL,
        target_agent TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (host, requester_addr, target_agent)
      );
      CREATE TABLE IF NOT EXISTS idle_subs (
        requester TEXT NOT NULL,
        target TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (requester, target)
      );
    `);
  }
  close() {
    this.db.close();
  }
  // --- agents ---------------------------------------------------------------
  getAgent(id) {
    const r = this.db.prepare("SELECT * FROM agents WHERE agent = ?").get(id);
    return r ? plain(r) : void 0;
  }
  getAgentByKey(key) {
    const r = this.db.prepare("SELECT * FROM agents WHERE key = ?").get(key);
    return r ? plain(r) : void 0;
  }
  agentsByName(name) {
    return this.db.prepare("SELECT * FROM agents WHERE name = ? ORDER BY registered_at").all(name).map((r) => plain(r));
  }
  allAgents() {
    return this.db.prepare("SELECT * FROM agents ORDER BY name, registered_at").all().map((r) => plain(r));
  }
  insertAgent(a) {
    this.db.prepare(
      "INSERT INTO agents (agent,key,name,ref,kind,cwd,pid,status,active,last_seen,registered_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
    ).run(a.agent, a.key, a.name, a.ref, a.kind, a.cwd, a.pid, a.status, a.active, a.last_seen, a.registered_at);
  }
  reviveAgent(id, fields, now) {
    this.db.prepare("UPDATE agents SET name=?, kind=?, cwd=?, pid=?, status=?, active=1, last_seen=? WHERE agent=?").run(fields.name, fields.kind, fields.cwd, fields.pid, fields.status, now, id);
  }
  touch(id, now) {
    this.db.prepare("UPDATE agents SET last_seen=? WHERE agent=?").run(now, id);
  }
  setStatus(id, status) {
    this.db.prepare("UPDATE agents SET status=? WHERE agent=?").run(status, id);
  }
  deactivate(id) {
    this.db.prepare("UPDATE agents SET active=0 WHERE agent=?").run(id);
  }
  deleteAgent(id) {
    this.db.prepare("DELETE FROM messages WHERE to_agent=?").run(id);
    this.db.prepare("DELETE FROM idle_subs WHERE requester=? OR target=?").run(id, id);
    this.db.prepare("DELETE FROM remote_idle_subs WHERE target_agent=?").run(id);
    this.db.prepare("DELETE FROM agents WHERE agent=?").run(id);
  }
  // --- messages -------------------------------------------------------------
  insertMessage(m) {
    const r = this.db.prepare(
      "INSERT INTO messages (id,to_agent,from_addr,to_addr,kind,summary,message,ts,reply_to,ttl,state,created_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
    ).run(m.id, m.to_agent, m.from_addr, m.to_addr, m.kind, m.summary, m.message, m.ts, m.reply_to, m.ttl, "new", m.created_ms);
    return { ...m, seq: Number(r.lastInsertRowid), state: "new" };
  }
  messagesFor(agent, state, limit) {
    const rows = state === "any" ? this.db.prepare("SELECT * FROM messages WHERE to_agent=? ORDER BY seq LIMIT ?").all(agent, limit) : this.db.prepare("SELECT * FROM messages WHERE to_agent=? AND state=? ORDER BY seq LIMIT ?").all(agent, state, limit);
    return rows.map((r) => plain(r));
  }
  countState(agent, state) {
    const r = this.db.prepare("SELECT COUNT(*) AS n FROM messages WHERE to_agent=? AND state=?").get(agent, state);
    return Number(r.n);
  }
  countInbox(agent) {
    const r = this.db.prepare("SELECT COUNT(*) AS n FROM messages WHERE to_agent=?").get(agent);
    return Number(r.n);
  }
  markState(ids, agent, to, from) {
    if (ids.length === 0) return 0;
    const marks = ids.map(() => "?").join(",");
    const fromMarks = from.map(() => "?").join(",");
    const r = this.db.prepare(`UPDATE messages SET state=? WHERE to_agent=? AND id IN (${marks}) AND state IN (${fromMarks})`).run(to, agent, ...ids, ...from);
    return Number(r.changes);
  }
  /** Delete the oldest messages of the given state until the inbox has room. */
  dropOldest(agent, state, count) {
    const r = this.db.prepare("DELETE FROM messages WHERE seq IN (SELECT seq FROM messages WHERE to_agent=? AND state=? ORDER BY seq LIMIT ?)").run(agent, state, count);
    return Number(r.changes);
  }
  deleteAckedBefore(cutoffMs) {
    const r = this.db.prepare("DELETE FROM messages WHERE state='acked' AND created_ms < ?").run(cutoffMs);
    return Number(r.changes);
  }
  hasMessageId(id) {
    return this.db.prepare("SELECT 1 AS x FROM messages WHERE id=?").get(id) !== void 0;
  }
  // --- outbox (messages for other hosts that are not acknowledged yet) ----------
  insertOutbox(r) {
    this.db.prepare("INSERT OR REPLACE INTO outbox (id,peer,frame,sender_agent,to_display,created_ms) VALUES (?,?,?,?,?,?)").run(r.id, r.peer, r.frame, r.sender_agent, r.to_display, r.created_ms);
  }
  getOutbox(id) {
    const r = this.db.prepare("SELECT * FROM outbox WHERE id=?").get(id);
    return r ? plain(r) : void 0;
  }
  outboxForPeer(peer) {
    return this.db.prepare("SELECT * FROM outbox WHERE peer=? ORDER BY created_ms, id").all(peer).map((r) => plain(r));
  }
  countOutbox(peer) {
    const r = this.db.prepare("SELECT COUNT(*) AS n FROM outbox WHERE peer=?").get(peer);
    return Number(r.n);
  }
  deleteOutbox(id) {
    this.db.prepare("DELETE FROM outbox WHERE id=?").run(id);
  }
  outboxExpired(cutoffMs) {
    return this.db.prepare("SELECT * FROM outbox WHERE created_ms < ?").all(cutoffMs).map((r) => plain(r));
  }
  // --- idle subscriptions -----------------------------------------------------
  upsertIdleSub(requester, target, now) {
    this.db.prepare("INSERT OR REPLACE INTO idle_subs (requester,target,created_at) VALUES (?,?,?)").run(requester, target, now);
  }
  takeIdleSubs(target) {
    const rows = this.db.prepare("SELECT * FROM idle_subs WHERE target=?").all(target).map((r) => plain(r));
    this.db.prepare("DELETE FROM idle_subs WHERE target=?").run(target);
    return rows;
  }
  upsertRemoteIdleSub(host, requesterAddr, targetAgent, now) {
    this.db.prepare("INSERT OR REPLACE INTO remote_idle_subs (host,requester_addr,target_agent,created_at) VALUES (?,?,?,?)").run(host, requesterAddr, targetAgent, now);
  }
  takeRemoteIdleSubs(targetAgent) {
    const rows = this.db.prepare("SELECT * FROM remote_idle_subs WHERE target_agent=?").all(targetAgent).map((r) => plain(r));
    this.db.prepare("DELETE FROM remote_idle_subs WHERE target_agent=?").run(targetAgent);
    return rows;
  }
  idleSubTargets() {
    const local = this.db.prepare("SELECT DISTINCT target FROM idle_subs").all().map((r) => r.target);
    const remote = this.db.prepare("SELECT DISTINCT target_agent FROM remote_idle_subs").all().map((r) => r.target_agent);
    return [.../* @__PURE__ */ new Set([...local, ...remote])];
  }
  // --- gc ---------------------------------------------------------------------
  inactiveAgentsWithoutMessages(cutoffMs) {
    return this.db.prepare(
      "SELECT agent FROM agents WHERE active=0 AND last_seen < ? AND NOT EXISTS (SELECT 1 FROM messages WHERE to_agent=agents.agent)"
    ).all(cutoffMs).map((r) => r.agent);
  }
};

// src/agentd/main.ts
var home = homeDir();
fs4.mkdirSync(home, { recursive: true });
var logFile = path5.join(home, "agentd.log");
function log(line) {
  try {
    fs4.appendFileSync(logFile, `${(/* @__PURE__ */ new Date()).toISOString()} ${line}
`);
  } catch {
  }
}
function ensureToken(file) {
  try {
    const t = randomBytes3(32).toString("hex");
    fs4.writeFileSync(file, t, { flag: "wx" });
    return t;
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    return fs4.readFileSync(file, "utf8").trim();
  }
}
var token = ensureToken(path5.join(home, "token"));
var cfg = loadConfig();
var server = await (async () => {
  const store = new Store(path5.join(home, "agentd.db"));
  const host = hostName();
  const core = new Core(store, host, cfg);
  const acl = new Acl(home, host);
  const aclState = acl.load(true);
  core.setAcl(acl);
  if (aclState.errors.length > 0) log(`acl.json: ${aclState.errors.join("; ")}${aclState.failClosed ? " (all sending is blocked until it is fixed)" : ""}`);
  const aclStatus = () => ({ default: acl.status().default, rules: acl.status().rules.map((r) => r.text), errors: acl.status().errors, fail_closed: acl.status().failClosed });
  let peers = null;
  let markReady = () => {
  };
  const lanReady = new Promise((resolve) => markReady = resolve);
  const waitForLan = () => Promise.race([lanReady, new Promise((r) => setTimeout(r, 5e3))]);
  const srv = new Server(core, token, log, {
    aclStatus,
    reloadAcl: () => {
      const st = acl.load(false);
      if (st.errors.length > 0) log(`acl.json: ${st.errors.join("; ")}`);
      return aclStatus();
    },
    aclCheck: (from, to) => {
      const f = parsePattern(from, host);
      const t = parsePattern(to, host);
      if (typeof f === "string") throw new ApiError("BAD_REQUEST", `from: ${f}`);
      if (typeof t === "string") throw new ApiError("BAD_REQUEST", `to: ${t}`);
      if (f.name === "*" || f.host === "*" || t.name === "*" || t.host === "*") throw new ApiError("BAD_REQUEST", "acl_check needs concrete name@host addresses");
      const d = acl.check({ name: f.name, host: f.host }, { name: t.name, host: t.host });
      return { allowed: d.allowed, rule: d.rule, reason: d.reason };
    },
    peersStatus: async () => {
      await waitForLan();
      return peers ? peers.status() : { starting: true, peers: [] };
    },
    reloadPeers: async () => {
      await waitForLan();
      if (!peers) throw new ApiError("INTERNAL", "the LAN layer did not start; see agentd.log");
      await peers.apply(loadPeersConfig(home, host));
      return peers.status();
    },
    pairStart: async (o) => {
      await waitForLan();
      if (!peers) throw new ApiError("INTERNAL", "the LAN layer did not start; see agentd.log");
      return peers.startPairing(o);
    },
    pairStatus: async () => peers ? peers.pairStatus() : { state: "none" },
    pairCancel: async () => peers ? peers.cancelPairing() : { state: "none" },
    pairJoin: async (code) => {
      await waitForLan();
      if (!peers) throw new ApiError("INTERNAL", "the LAN layer did not start; see agentd.log");
      const r = await peers.joinPairing(code);
      return { ...r, self: host };
    }
  });
  try {
    await srv.listen(pipePath());
  } catch (e) {
    store.close();
    if (e.code === "EADDRINUSE") process.exit(0);
    throw e;
  }
  const timer = setInterval(() => {
    try {
      core.sweep();
      peers?.sweep();
    } catch (err) {
      log(`sweep failed: ${String(err)}`);
    }
  }, cfg.sweepMs);
  timer.unref();
  srv.once("shutdown", () => {
    clearInterval(timer);
    setTimeout(() => process.exit(0), 2e3).unref();
    setTimeout(async () => {
      const upTo = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
      await upTo(srv.close(), 500);
      await upTo(peers?.stop() ?? Promise.resolve(), 500);
      try {
        store.close();
      } catch {
      }
      log("shutdown");
      process.exit(0);
    }, 50);
  });
  const tls = await ensureTls(home, host);
  peers = new PeerManager({ core, store, cfg, home, tls, selfHost: host, log });
  core.setRemote(peers);
  await peers.apply(loadPeersConfig(home, host));
  markReady();
  return srv;
})();
log(`agentd started pid=${process.pid} pipe=${pipePath()} host=${hostName()}`);
