(function() {
  var Client, Mapper, Meta, Pool, ProtobufClient, Utils;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; }, __slice = Array.prototype.slice;

  Client = require('./client');

  Pool = require('./protobuf');

  Meta = require('./protobuf_meta');

  Mapper = require('./mapper');

  Utils = require('./utils');

  ProtobufClient = (function() {

    __extends(ProtobufClient, Client);

    function ProtobufClient(options) {
      options = Utils.mixin(true, {}, Meta.defaults, options);
      ProtobufClient.__super__.constructor.call(this, options);
    }

    ProtobufClient.prototype.get = function() {
      var bucket, callback, key, meta, options, _ref;
      bucket = arguments[0], key = arguments[1], options = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      meta = new Meta(bucket, key, options);
      meta.serializable = true;
      return this.execute('GetReq', meta, callback);
    };

    ProtobufClient.prototype.save = function() {
      var bucket, callback, data, key, meta, options, _ref;
      bucket = arguments[0], key = arguments[1], data = arguments[2], options = 4 <= arguments.length ? __slice.call(arguments, 3) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      meta = new Meta(bucket, key, options);
      meta.serializable = true;
      meta.data = data || {};
      return this.execute('PutReq', meta, callback);
    };

    ProtobufClient.prototype.remove = function() {
      var bucket, callback, key, meta, options, _ref;
      bucket = arguments[0], key = arguments[1], options = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      meta = new Meta(bucket, key, options);
      meta.serializable = true;
      return this.execute('DelReq', meta, callback);
    };

    ProtobufClient.prototype.keys = function() {
      var bucket, callback, cb, meta, options, processChunk, _ref;
      bucket = arguments[0], options = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      _ref = this.ensure(options), options = _ref[0], callback = _ref[1];
      meta = new Meta(options);
      meta.bucket = bucket;
      meta.serializable = true;
      processChunk = function(data) {
        return data.keys;
      };
      cb = function(err, data) {
        var chunk, key, result, _i, _j, _len, _len2;
        result = [];
        for (_i = 0, _len = data.length; _i < _len; _i++) {
          chunk = data[_i];
          for (_j = 0, _len2 = chunk.length; _j < _len2; _j++) {
            key = chunk[_j];
            result.push(key.toString());
          }
        }
        return callback(null, result, meta);
      };
      return this.execute('ListKeysReq', meta, cb, processChunk);
    };

    ProtobufClient.prototype.add = function(inputs) {
      return new Mapper(this, inputs);
    };

    ProtobufClient.prototype.runJob = function() {
      var callback, cb, meta, options, processChunk, _ref;
      _ref = this.ensure(arguments), options = _ref[0], callback = _ref[1];
      meta = new Meta(void 0, void 0, options);
      meta.request = JSON.stringify(meta.data);
      meta.contentType = 'application/json';
      meta.serializable = true;
      processChunk = function(data) {
        var result;
        if (data.phase != null) {
          result = (function() {
            try {
              return JSON.parse(data.response);
            } catch (err) {
              return err;
            }
          })();
          return [data.phase, result];
        }
      };
      cb = function(err, data) {
        var elem, phase, result, _i, _len, _ref2;
        result = [];
        for (_i = 0, _len = data.length; _i < _len; _i++) {
          _ref2 = data[_i], phase = _ref2[0], elem = _ref2[1];
          if (!result[phase]) result[phase] = [];
          result[phase] = result[phase].concat(elem);
        }
        return callback(err, result, meta);
      };
      return this.execute('MapRedReq', meta, cb, processChunk);
    };

    ProtobufClient.prototype.ping = function() {
      var callback, meta, options, _ref;
      _ref = this.ensure(arguments), options = _ref[0], callback = _ref[1];
      meta = new Meta(options);
      meta.serializable = false;
      return this.execute('PingReq', meta, callback);
    };

    ProtobufClient.prototype.buckets = function() {
      var callback, meta, options, _ref;
      _ref = this.ensure(arguments), options = _ref[0], callback = _ref[1];
      meta = new Meta(options);
      meta.serializable = false;
      return this.execute('ListBucketsReq', meta, function(err, data, meta) {
        var p;
        if (!err) {
          data = (function() {
            var _i, _len, _ref2, _results;
            _ref2 = data.buckets;
            _results = [];
            for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
              p = _ref2[_i];
              _results.push(p.toString());
            }
            return _results;
          })();
        }
        return callback(err, data, meta);
      });
    };

    ProtobufClient.prototype.send = function(verb, data, cb) {
      var doSend;
      var _this = this;
      doSend = function() {
        var serializable;
        serializable = data.serializable;
        delete data.serializable;
        if (!serializable) data = void 0;
        return _this.connection.send(verb, data, cb);
      };
      if ((this.connection != null) && this.connection.writable) {
        return doSend();
      } else {
        return this.pool.start(function(connection) {
          _this.connection = connection;
          return doSend();
        });
      }
    };

    ProtobufClient.prototype.execute = function(verb, meta, callback, processChunk) {
      var buffer, cb;
      cb = function(response) {
        var err;
        if ((verb === 'GetReq') || (verb === 'PutReq' && meta.returnBody)) {
          meta = meta.loadResponse(response);
          response = meta.response;
          delete meta.response;
        }
        err = null;
        return callback(err, response, meta);
      };
      meta.loadData();
      if (processChunk != null) {
        buffer = [];
        this.send(verb, meta, function(data) {
          var result;
          if (data.errcode) cb(data);
          result = processChunk(data);
          if (result) buffer.push(result);
          if (data.done) return cb(buffer);
        });
      } else {
        this.send(verb, meta, cb);
      }
    };

    ProtobufClient.prototype.end = function() {
      if (this.connection) return this.connection.end();
    };

    ProtobufClient.prototype.Meta = Meta;

    return ProtobufClient;

  })();

  module.exports = ProtobufClient;

}).call(this);
