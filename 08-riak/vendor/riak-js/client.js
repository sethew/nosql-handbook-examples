(function() {
  var Client, CoreMeta, EventEmitter, Meta, Utils;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  CoreMeta = require('./meta');

  Utils = require('./utils');

  Meta = require('./meta');

  EventEmitter = require('events').EventEmitter;

  Client = (function() {

    __extends(Client, EventEmitter);

    function Client(options) {
      CoreMeta.defaults = Utils.mixin(true, {}, CoreMeta.defaults, options);
    }

    Client.prototype.ensure = function(options) {
      var callback, _ref;
      if (!Array.isArray(options)) options = Array.prototype.slice.call(options);
      _ref = options, options = _ref[0], callback = _ref[1];
      if (typeof options === 'function') {
        callback = options;
        options = void 0;
      }
      callback || (callback = function(err, data, meta) {
        return Client.log(data);
      });
      return [options || {}, callback];
    };

    Client.debug = function(string, options) {
      var _ref;
      if (options == null) options = {};
      if ((_ref = options.debug) != null ? _ref : CoreMeta.defaults.debug) {
        return console.log("[riak-js] " + string);
      }
    };

    Client.log = function(message) {
      if (message) return console.log(message);
    };

    Client.prototype.version = '0.4';

    Client.prototype.Meta = function() {
      throw new Error('APIs should override this function with their particular Meta implementation.');
    };

    return Client;

  })();

  module.exports = Client;

}).call(this);
