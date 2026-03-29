"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _superagent = _interopRequireDefault(require("superagent"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); } /**
 * Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
var OAuth2Config = require('./auth/OAuth2Config.js');
var OAuth2TokenManager = require('./auth/OAuth2TokenManager.js');

/**
* @module ApiClient
* @version 1.2.0
*/

/**
* Manages low level client-server communications, parameter marshalling, etc. There should not be any need for an
* application to use this class directly - the *Api and model classes provide the public API for the service. The
* contents of this file should be regarded as internal but are documented for completeness.
* @alias module:ApiClient
* @class
*/
var ApiClient = /*#__PURE__*/function () {
  /**
   * The base URL against which to resolve every API call's (relative) path.
   * Overrides the default value set in spec file if present 
   * @param {String} basePath 
   */
  function ApiClient() {
    var basePath = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'https://creatorsapi.amazon';
    _classCallCheck(this, ApiClient);
    /**
     * The base URL against which to resolve every API call's (relative) path.
     * @type {String}
     * @default https://creatorsapi.amazon
     */
    this.basePath = basePath.replace(/\/+$/, '');

    /**
     * The authentication methods to be included for all API calls.
     * @type {Array.<String>}
     */
    this.authentications = {};

    /**
            * The default HTTP headers to be included for all API calls.
            * @type {Array.<String>}
            * @default {}
            */
    this.defaultHeaders = {
      'User-Agent': 'creatorsapi-nodejs-sdk/1.2.0'
    };

    /**
     * The default HTTP timeout for all API calls.
     * @type {Number}
     * @default 60000
     */
    this.timeout = 60000;

    /**
     * If set to false an additional timestamp parameter is added to all API GET calls to
     * prevent browser caching
     * @type {Boolean}
     * @default true
     */
    this.cache = true;

    /**
            * If set to true, the client will save the cookies from each server
            * response, and return them in the next request.
            * @default false
            */
    this.enableCookies = false;

    /*
     * Used to save and return cookies in a node.js (non-browser) setting,
     * if this.enableCookies is set to true.
     */
    if (typeof window === 'undefined') {
      this.agent = new _superagent["default"].agent();
    }

    /*
     * Allow user to override superagent agent
     */
    this.requestAgent = null;

    /*
     * Allow user to add superagent plugins
     */
    this.plugins = null;

    /**
     * OAuth2 credential ID
     * @type {String}
     */
    this.credentialId = null;

    /**
     * OAuth2 credential secret
     * @type {String}
     */
    this.credentialSecret = null;

    /**
     * OAuth2 credential version
     * @type {String}
     */
    this.version = null;

    /**
     * Marketplace identifier
     * @type {String}
     */
    this.marketplace = null;

    /**
     * OAuth2 token manager instance
     * @type {OAuth2TokenManager}
     */
    this.tokenManager = null;

    /**
     * Custom OAuth2 auth endpoint URL
     * @type {String}
     */
    this.authEndpoint = null;
  }

  /**
   * Sets the OAuth2 credential ID
   * @param {String} credentialId The OAuth2 credential ID
   */
  return _createClass(ApiClient, [{
    key: "setCredentialId",
    value: function setCredentialId(credentialId) {
      // Credentials changed, invalidate token manager to force new token fetch
      if (this.credentialId !== credentialId) {
        this.tokenManager = null;
      }
      this.credentialId = credentialId;
    }

    /**
     * Gets the OAuth2 credential ID
     * @returns {String} The OAuth2 credential ID
     */
  }, {
    key: "getCredentialId",
    value: function getCredentialId() {
      return this.credentialId;
    }

    /**
     * Sets the OAuth2 credential secret
     * @param {String} credentialSecret The OAuth2 credential secret
     */
  }, {
    key: "setCredentialSecret",
    value: function setCredentialSecret(credentialSecret) {
      // Credentials changed, invalidate token manager to force new token fetch
      if (this.credentialSecret !== credentialSecret) {
        this.tokenManager = null;
      }
      this.credentialSecret = credentialSecret;
    }

    /**
     * Gets the OAuth2 credential secret
     * @returns {String} The OAuth2 credential secret
     */
  }, {
    key: "getCredentialSecret",
    value: function getCredentialSecret() {
      return this.credentialSecret;
    }

    /**
     * Sets the credential version
     * @param {String} version The credential version
     */
  }, {
    key: "setVersion",
    value: function setVersion(version) {
      // Version changed, invalidate token manager to force new token fetch
      if (this.version !== version) {
        this.tokenManager = null;
      }
      this.version = version;
    }

    /**
     * Gets the credential version
     * @returns {String} The credential version
     */
  }, {
    key: "getVersion",
    value: function getVersion() {
      return this.version;
    }

    /**
     * Sets the custom OAuth2 auth endpoint URL
     * @param {String} authEndpoint The custom OAuth2 auth endpoint URL
     */
  }, {
    key: "setAuthEndpoint",
    value: function setAuthEndpoint(authEndpoint) {
      // Auth endpoint changed, invalidate token manager to force new token fetch
      if (this.authEndpoint !== authEndpoint) {
        this.tokenManager = null;
      }
      this.authEndpoint = authEndpoint;
    }

    /**
     * Gets the custom OAuth2 auth endpoint URL
     * @returns {String} The custom OAuth2 auth endpoint URL
     */
  }, {
    key: "getAuthEndpoint",
    value: function getAuthEndpoint() {
      return this.authEndpoint;
    }

    /**
    * Returns a string representation for an actual parameter.
    * @param param The actual parameter.
    * @returns {String} The string representation of <code>param</code>.
    */
  }, {
    key: "paramToString",
    value: function paramToString(param) {
      if (param == undefined || param == null) {
        return '';
      }
      if (param instanceof Date) {
        return param.toJSON();
      }
      if (ApiClient.canBeJsonified(param)) {
        return JSON.stringify(param);
      }
      return param.toString();
    }

    /**
    * Returns a boolean indicating if the parameter could be JSON.stringified
    * @param param The actual parameter
    * @returns {Boolean} Flag indicating if <code>param</code> can be JSON.stringified
    */
  }, {
    key: "buildUrl",
    value:
    /**
     * Builds full URL by appending the given path to the base URL and replacing path parameter place-holders with parameter values.
     * NOTE: query parameters are not handled here.
     * @param {String} path The path to append to the base URL.
     * @param {Object} pathParams The parameter values to append.
     * @param {String} apiBasePath Base path defined in the path, operation level to override the default one
     * @returns {String} The encoded path with parameter values substituted.
     */
    function buildUrl(path, pathParams, apiBasePath) {
      var _this = this;
      if (!path.match(/^\//)) {
        path = '/' + path;
      }
      var url = this.basePath + path;

      // use API (operation, path) base path if defined
      if (apiBasePath !== null && apiBasePath !== undefined) {
        url = apiBasePath + path;
      }
      url = url.replace(/\{([\w-\.#]+)\}/g, function (fullMatch, key) {
        var value;
        if (pathParams.hasOwnProperty(key)) {
          value = _this.paramToString(pathParams[key]);
        } else {
          value = fullMatch;
        }
        return encodeURIComponent(value);
      });
      return url;
    }

    /**
    * Checks whether the given content type represents JSON.<br>
    * JSON content type examples:<br>
    * <ul>
    * <li>application/json</li>
    * <li>application/json; charset=UTF8</li>
    * <li>APPLICATION/JSON</li>
    * </ul>
    * @param {String} contentType The MIME content type to check.
    * @returns {Boolean} <code>true</code> if <code>contentType</code> represents JSON, otherwise <code>false</code>.
    */
  }, {
    key: "isJsonMime",
    value: function isJsonMime(contentType) {
      return Boolean(contentType != null && contentType.match(/^application\/json(;.*)?$/i));
    }

    /**
    * Chooses a content type from the given array, with JSON preferred; i.e. return JSON if included, otherwise return the first.
    * @param {Array.<String>} contentTypes
    * @returns {String} The chosen content type, preferring JSON.
    */
  }, {
    key: "jsonPreferredMime",
    value: function jsonPreferredMime(contentTypes) {
      for (var i = 0; i < contentTypes.length; i++) {
        if (this.isJsonMime(contentTypes[i])) {
          return contentTypes[i];
        }
      }
      return contentTypes[0];
    }

    /**
    * Checks whether the given parameter value represents file-like content.
    * @param param The parameter to check.
    * @returns {Boolean} <code>true</code> if <code>param</code> represents a file.
    */
  }, {
    key: "isFileParam",
    value: function isFileParam(param) {
      // fs.ReadStream in Node.js and Electron (but not in runtime like browserify)
      if (typeof require === 'function') {
        var fs;
        try {
          fs = require('fs');
        } catch (err) {}
        if (fs && fs.ReadStream && param instanceof fs.ReadStream) {
          return true;
        }
      }

      // Buffer in Node.js
      if (typeof Buffer === 'function' && param instanceof Buffer) {
        return true;
      }

      // Blob in browser
      if (typeof Blob === 'function' && param instanceof Blob) {
        return true;
      }

      // File in browser (it seems File object is also instance of Blob, but keep this for safe)
      if (typeof File === 'function' && param instanceof File) {
        return true;
      }
      return false;
    }

    /**
    * Normalizes parameter values:
    * <ul>
    * <li>remove nils</li>
    * <li>keep files and arrays</li>
    * <li>format to string with `paramToString` for other cases</li>
    * </ul>
    * @param {Object.<String, Object>} params The parameters as object properties.
    * @returns {Object.<String, Object>} normalized parameters.
    */
  }, {
    key: "normalizeParams",
    value: function normalizeParams(params) {
      var newParams = {};
      for (var key in params) {
        if (params.hasOwnProperty(key) && params[key] != undefined && params[key] != null) {
          var value = params[key];
          if (this.isFileParam(value) || Array.isArray(value)) {
            newParams[key] = value;
          } else {
            newParams[key] = this.paramToString(value);
          }
        }
      }
      return newParams;
    }

    /**
    * Builds a string representation of an array-type actual parameter, according to the given collection format.
    * @param {Array} param An array parameter.
    * @param {module:ApiClient.CollectionFormatEnum} collectionFormat The array element separator strategy.
    * @returns {String|Array} A string representation of the supplied collection, using the specified delimiter. Returns
    * <code>param</code> as is if <code>collectionFormat</code> is <code>multi</code>.
    */
  }, {
    key: "buildCollectionParam",
    value: function buildCollectionParam(param, collectionFormat) {
      if (param == null) {
        return null;
      }
      switch (collectionFormat) {
        case 'csv':
          return param.map(this.paramToString, this).join(',');
        case 'ssv':
          return param.map(this.paramToString, this).join(' ');
        case 'tsv':
          return param.map(this.paramToString, this).join('\t');
        case 'pipes':
          return param.map(this.paramToString, this).join('|');
        case 'multi':
          //return the array directly as SuperAgent will handle it as expected
          return param.map(this.paramToString, this);
        case 'passthrough':
          return param;
        default:
          throw new Error('Unknown collection format: ' + collectionFormat);
      }
    }

    /**
    * Applies authentication headers to the request.
    * @param {Object} request The request object created by a <code>superagent()</code> call.
    * @param {Array.<String>} authNames An array of authentication method names.
    */
  }, {
    key: "applyAuthToRequest",
    value: function applyAuthToRequest(request, authNames) {
      var _this2 = this;
      authNames.forEach(function (authName) {
        var auth = _this2.authentications[authName];
        switch (auth.type) {
          case 'basic':
            if (auth.username || auth.password) {
              request.auth(auth.username || '', auth.password || '');
            }
            break;
          case 'bearer':
            if (auth.accessToken) {
              var localVarBearerToken = typeof auth.accessToken === 'function' ? auth.accessToken() : auth.accessToken;
              request.set({
                'Authorization': 'Bearer ' + localVarBearerToken
              });
            }
            break;
          case 'apiKey':
            if (auth.apiKey) {
              var data = {};
              if (auth.apiKeyPrefix) {
                data[auth.name] = auth.apiKeyPrefix + ' ' + auth.apiKey;
              } else {
                data[auth.name] = auth.apiKey;
              }
              if (auth['in'] === 'header') {
                request.set(data);
              } else {
                request.query(data);
              }
            }
            break;
          case 'oauth2':
            if (auth.accessToken) {
              request.set({
                'Authorization': 'Bearer ' + auth.accessToken
              });
            }
            break;
          default:
            throw new Error('Unknown authentication type: ' + auth.type);
        }
      });
    }

    /**
     * Deserializes an HTTP response body into a value of the specified type.
     * @param {Object} response A SuperAgent response object.
     * @param {(String|Array.<String>|Object.<String, Object>|Function)} returnType The type to return. Pass a string for simple types
     * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
     * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
     * all properties on <code>data<code> will be converted to this type.
     * @returns A value of the specified type.
     */
  }, {
    key: "deserialize",
    value: function deserialize(response, returnType) {
      if (response == null || returnType == null || response.status == 204) {
        return null;
      }

      // Rely on SuperAgent for parsing response body.
      // See http://visionmedia.github.io/superagent/#parsing-response-bodies
      var data = response.body;
      if (data == null || _typeof(data) === 'object' && typeof data.length === 'undefined' && !Object.keys(data).length) {
        // SuperAgent does not always produce a body; use the unparsed response as a fallback
        data = response.text;
      }
      return ApiClient.convertToType(data, returnType);
    }

    /**
     * Invokes the REST service using the supplied settings and parameters.
     * @param {String} path The base URL to invoke.
     * @param {String} httpMethod The HTTP method to use.
     * @param {Object.<String, String>} pathParams A map of path parameters and their values.
     * @param {Object.<String, Object>} queryParams A map of query parameters and their values.
     * @param {Object.<String, Object>} headerParams A map of header parameters and their values.
     * @param {Object.<String, Object>} formParams A map of form parameters and their values.
     * @param {Object} bodyParam The value to pass as the request body.
     * @param {Array.<String>} authNames An array of authentication type names.
     * @param {Array.<String>} contentTypes An array of request MIME types.
     * @param {Array.<String>} accepts An array of acceptable response MIME types.
     * @param {(String|Array|ObjectFunction)} returnType The required type to return; can be a string for simple types or the
     * constructor for a complex type.
     * @param {String} apiBasePath base path defined in the operation/path level to override the default one
     * @returns {Promise} A {@link https://www.promisejs.org/|Promise} object.
     */
  }, {
    key: "callApi",
    value: (function () {
      var _callApi = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(path, httpMethod, pathParams, queryParams, headerParams, formParams, bodyParam, authNames, contentTypes, accepts, returnType, apiBasePath) {
        var _this3 = this;
        var config, token, url, request, index, contentType, _formParams, key, _formParamsValue, accept, _t;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.p = _context.n) {
            case 0:
              if (!(!this.credentialId || !this.credentialSecret || !this.version)) {
                _context.n = 1;
                break;
              }
              throw new Error("Missing configuration. Please specify credentialId, credentialSecret, and version in client object.");
            case 1:
              // Handle POST requests with null/undefined body - convert to empty object
              if (httpMethod.toUpperCase() === 'POST' && (bodyParam === null || bodyParam === undefined)) {
                bodyParam = {};
              }

              // Initialize headers
              if (!headerParams) {
                headerParams = {};
              }

              // Add Content-Type if not present
              if (!headerParams['Content-Type']) {
                headerParams['Content-Type'] = 'application/json; charset=utf-8';
              }

              // Get OAuth2 token and add Authorization header
              _context.p = 2;
              // Initialize OAuth2TokenManager
              if (!this.tokenManager) {
                config = new OAuth2Config(this.credentialId, this.credentialSecret, this.version, this.authEndpoint);
                this.tokenManager = new OAuth2TokenManager(config);
              }
              _context.n = 3;
              return this.tokenManager.getToken();
            case 3:
              token = _context.v;
              // Add Authorization headers - Version only for v2.x
              if (this.version.startsWith("3.")) {
                headerParams['Authorization'] = "Bearer ".concat(token);
              } else {
                headerParams['Authorization'] = "Bearer ".concat(token, ", Version ").concat(this.version);
              }
              _context.n = 5;
              break;
            case 4:
              _context.p = 4;
              _t = _context.v;
              throw _t;
            case 5:
              url = this.buildUrl(path, pathParams, apiBasePath);
              request = (0, _superagent["default"])(httpMethod, url);
              if (this.plugins !== null) {
                for (index in this.plugins) {
                  if (this.plugins.hasOwnProperty(index)) {
                    request.use(this.plugins[index]);
                  }
                }
              }

              // apply authentications
              this.applyAuthToRequest(request, authNames);

              // set query parameters
              if (httpMethod.toUpperCase() === 'GET' && this.cache === false) {
                queryParams['_'] = new Date().getTime();
              }
              request.query(this.normalizeParams(queryParams));

              // set header parameters
              request.set(this.defaultHeaders).set(this.normalizeParams(headerParams));

              // set requestAgent if it is set by user
              if (this.requestAgent) {
                request.agent(this.requestAgent);
              }

              // set request timeout
              request.timeout(this.timeout);
              contentType = this.jsonPreferredMime(contentTypes);
              if (contentType) {
                // Issue with superagent and multipart/form-data (https://github.com/visionmedia/superagent/issues/746)
                if (contentType != 'multipart/form-data') {
                  request.type(contentType);
                }
              }
              if (contentType === 'application/x-www-form-urlencoded') {
                request.send(querystring.stringify(this.normalizeParams(formParams)));
              } else if (contentType == 'multipart/form-data') {
                _formParams = this.normalizeParams(formParams);
                for (key in _formParams) {
                  if (_formParams.hasOwnProperty(key)) {
                    _formParamsValue = _formParams[key];
                    if (this.isFileParam(_formParamsValue)) {
                      // file field
                      request.attach(key, _formParamsValue);
                    } else if (Array.isArray(_formParamsValue) && _formParamsValue.length && this.isFileParam(_formParamsValue[0])) {
                      // multiple files
                      _formParamsValue.forEach(function (file) {
                        return request.attach(key, file);
                      });
                    } else {
                      request.field(key, _formParamsValue);
                    }
                  }
                }
              } else if (bodyParam !== null && bodyParam !== undefined) {
                if (!request.header['Content-Type']) {
                  request.type('application/json');
                }
                request.send(bodyParam);
              }
              accept = this.jsonPreferredMime(accepts);
              if (accept) {
                request.accept(accept);
              }
              if (returnType === 'Blob') {
                request.responseType('blob');
              } else if (returnType === 'String') {
                request.responseType('text');
              }

              // Attach previously saved cookies, if enabled
              if (this.enableCookies) {
                if (typeof window === 'undefined') {
                  this.agent._attachCookies(request);
                } else {
                  request.withCredentials();
                }
              }
              return _context.a(2, new Promise(function (resolve, reject) {
                request.end(function (error, response) {
                  if (error) {
                    var err = {};
                    if (response) {
                      err.status = response.status;
                      err.statusText = response.statusText;
                      err.body = response.body;
                      err.response = response;
                    }
                    err.error = error;
                    reject(err);
                  } else {
                    try {
                      var data = _this3.deserialize(response, returnType);
                      if (_this3.enableCookies && typeof window === 'undefined') {
                        _this3.agent._saveCookies(response);
                      }
                      resolve({
                        data: data,
                        response: response
                      });
                    } catch (err) {
                      reject(err);
                    }
                  }
                });
              }));
          }
        }, _callee, this, [[2, 4]]);
      }));
      function callApi(_x, _x2, _x3, _x4, _x5, _x6, _x7, _x8, _x9, _x0, _x1, _x10) {
        return _callApi.apply(this, arguments);
      }
      return callApi;
    }()
    /**
    * Parses an ISO-8601 string representation or epoch representation of a date value.
    * @param {String} str The date value as a string.
    * @returns {Date} The parsed date object.
    */
    )
  }, {
    key: "hostSettings",
    value:
    /**
      * Gets an array of host settings
      * @returns An array of host settings
      */
    function hostSettings() {
      return [{
        'url': "",
        'description': "No description provided"
      }];
    }
  }, {
    key: "getBasePathFromSettings",
    value: function getBasePathFromSettings(index) {
      var variables = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var servers = this.hostSettings();

      // check array index out of bound
      if (index < 0 || index >= servers.length) {
        throw new Error("Invalid index " + index + " when selecting the host settings. Must be less than " + servers.length);
      }
      var server = servers[index];
      var url = server['url'];

      // go through variable and assign a value
      for (var variable_name in server['variables']) {
        if (variable_name in variables) {
          var variable = server['variables'][variable_name];
          if (!('enum_values' in variable) || variable['enum_values'].includes(variables[variable_name])) {
            url = url.replace("{" + variable_name + "}", variables[variable_name]);
          } else {
            throw new Error("The variable `" + variable_name + "` in the host URL has invalid value " + variables[variable_name] + ". Must be " + server['variables'][variable_name]['enum_values'] + ".");
          }
        } else {
          // use default value
          url = url.replace("{" + variable_name + "}", server['variables'][variable_name]['default_value']);
        }
      }
      return url;
    }

    /**
    * Constructs a new map or array model from REST data.
    * @param data {Object|Array} The REST data.
    * @param obj {Object|Array} The target object or array.
    */
  }], [{
    key: "canBeJsonified",
    value: function canBeJsonified(str) {
      if (typeof str !== 'string' && _typeof(str) !== 'object') return false;
      try {
        var type = str.toString();
        return type === '[object Object]' || type === '[object Array]';
      } catch (err) {
        return false;
      }
    }
  }, {
    key: "parseDate",
    value: function parseDate(str) {
      if (isNaN(str)) {
        return new Date(str.replace(/(\d)(T)(\d)/i, '$1 $3'));
      }
      return new Date(+str);
    }

    /**
    * Converts a value to the specified type.
    * @param {(String|Object)} data The data to convert, as a string or object.
    * @param {(String|Array.<String>|Object.<String, Object>|Function)} type The type to return. Pass a string for simple types
    * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
    * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
    * all properties on <code>data<code> will be converted to this type.
    * @returns An instance of the specified type or null or undefined if data is null or undefined.
    */
  }, {
    key: "convertToType",
    value: function convertToType(data, type) {
      if (data === null || data === undefined) return data;
      switch (type) {
        case 'Boolean':
          return Boolean(data);
        case 'Integer':
          return parseInt(data, 10);
        case 'Number':
          return parseFloat(data);
        case 'String':
          return String(data);
        case 'Date':
          return ApiClient.parseDate(String(data));
        case 'Blob':
          return data;
        default:
          if (type === Object) {
            // generic object, return directly
            return data;
          } else if (typeof type.constructFromObject === 'function') {
            // for model type like User and enum class
            return type.constructFromObject(data);
          } else if (Array.isArray(type)) {
            // for array type like: ['String']
            var itemType = type[0];
            return data.map(function (item) {
              return ApiClient.convertToType(item, itemType);
            });
          } else if (_typeof(type) === 'object') {
            // for plain object type like: {'String': 'Integer'}
            var keyType, valueType;
            for (var k in type) {
              if (type.hasOwnProperty(k)) {
                keyType = k;
                valueType = type[k];
                break;
              }
            }
            var result = {};
            for (var k in data) {
              if (data.hasOwnProperty(k)) {
                var key = ApiClient.convertToType(k, keyType);
                var value = ApiClient.convertToType(data[k], valueType);
                result[key] = value;
              }
            }
            return result;
          } else {
            // for unknown type, return the data directly
            return data;
          }
      }
    }
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj, itemType) {
      if (Array.isArray(data)) {
        for (var i = 0; i < data.length; i++) {
          if (data.hasOwnProperty(i)) obj[i] = ApiClient.convertToType(data[i], itemType);
        }
      } else {
        for (var k in data) {
          if (data.hasOwnProperty(k)) obj[k] = ApiClient.convertToType(data[k], itemType);
        }
      }
    }
  }]);
}();
/**
 * Enumeration of collection format separator strategies.
 * @enum {String}
 * @readonly
 */
ApiClient.CollectionFormatEnum = {
  /**
   * Comma-separated values. Value: <code>csv</code>
   * @const
   */
  CSV: ',',
  /**
   * Space-separated values. Value: <code>ssv</code>
   * @const
   */
  SSV: ' ',
  /**
   * Tab-separated values. Value: <code>tsv</code>
   * @const
   */
  TSV: '\t',
  /**
   * Pipe(|)-separated values. Value: <code>pipes</code>
   * @const
   */
  PIPES: '|',
  /**
   * Native array. Value: <code>multi</code>
   * @const
   */
  MULTI: 'multi'
};

/**
* The default API client implementation.
* @type {module:ApiClient}
*/
ApiClient.instance = new ApiClient();
var _default = exports["default"] = ApiClient;