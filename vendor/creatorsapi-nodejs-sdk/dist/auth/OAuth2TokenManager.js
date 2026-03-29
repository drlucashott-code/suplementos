"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
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

/**
 * OAuth2TokenManager
 * Manages OAuth2 token lifecycle including acquisition, caching, and refresh
 *
 */

var superagent = require("superagent");

/**
 * OAuth2 token manager that handles token acquisition, caching, and automatic refresh
 * Note: ApiClient automatically manages token caching for optimal performance.
 * Direct instantiation is only needed for advanced use cases.
 * @class OAuth2TokenManager
 */
var OAuth2TokenManager = /*#__PURE__*/function () {
  /**
   * Creates an OAuth2TokenManager instance
   * @param {OAuth2Config} config - The OAuth2 configuration
   */
  function OAuth2TokenManager(config) {
    _classCallCheck(this, OAuth2TokenManager);
    this.config = config;
    this.accessToken = null;
    this.expiresAt = null;
  }

  /**
   * Gets a valid OAuth2 access token, refreshing if necessary
   * @returns {Promise<string>} A promise that resolves to a valid access token
   * @throws {Error} If token acquisition fails
   */
  return _createClass(OAuth2TokenManager, [{
    key: "getToken",
    value: (function () {
      var _getToken = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              if (!this.isTokenValid()) {
                _context.n = 1;
                break;
              }
              return _context.a(2, this.accessToken);
            case 1:
              _context.n = 2;
              return this.refreshToken();
            case 2:
              return _context.a(2, _context.v);
          }
        }, _callee, this);
      }));
      function getToken() {
        return _getToken.apply(this, arguments);
      }
      return getToken;
    }()
    /**
     * Checks if the current token is valid and not expired
     * @returns {boolean} True if the token is valid, false otherwise
     */
    )
  }, {
    key: "isTokenValid",
    value: function isTokenValid() {
      return this.accessToken && this.expiresAt && Date.now() < this.expiresAt;
    }

    /**
     * Refreshes the OAuth2 access token using client credentials grant
     * @returns {Promise<string>} A promise that resolves to the new access token
     * @throws {Error} If token refresh fails
     */
  }, {
    key: "refreshToken",
    value: (function () {
      var _refreshToken = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
        var response, requestBody, data, expiresInMs, _t;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.p = _context2.n) {
            case 0:
              _context2.p = 0;
              if (!this.config.isLwa()) {
                _context2.n = 2;
                break;
              }
              _context2.n = 1;
              return superagent.post(this.config.getCognitoEndpoint()).set('Content-Type', 'application/json').send({
                grant_type: this.config.getGrantType(),
                client_id: this.config.getCredentialId(),
                client_secret: this.config.getCredentialSecret(),
                scope: this.config.getScope()
              });
            case 1:
              response = _context2.v;
              _context2.n = 4;
              break;
            case 2:
              // Cognito (v2.x) uses form-encoded
              requestBody = new URLSearchParams({
                'grant_type': this.config.getGrantType(),
                'client_id': this.config.getCredentialId(),
                'client_secret': this.config.getCredentialSecret(),
                'scope': this.config.getScope()
              }).toString();
              _context2.n = 3;
              return superagent.post(this.config.getCognitoEndpoint()).set('Content-Type', 'application/x-www-form-urlencoded').send(requestBody);
            case 3:
              response = _context2.v;
            case 4:
              data = response.body;
              if (data.access_token) {
                _context2.n = 5;
                break;
              }
              throw new Error('No access token received from OAuth2 endpoint');
            case 5:
              this.accessToken = data.access_token;
              // Set expiration time with a 30-second buffer to avoid edge cases
              expiresInMs = (data.expires_in - 30) * 1000;
              this.expiresAt = Date.now() + expiresInMs;
              return _context2.a(2, this.accessToken);
            case 6:
              _context2.p = 6;
              _t = _context2.v;
              // Clear existing token on failure
              this.clearToken();
              throw _t;
            case 7:
              return _context2.a(2);
          }
        }, _callee2, this, [[0, 6]]);
      }));
      function refreshToken() {
        return _refreshToken.apply(this, arguments);
      }
      return refreshToken;
    }()
    /**
     * Clears the cached token, forcing a refresh on the next getToken() call
     */
    )
  }, {
    key: "clearToken",
    value: function clearToken() {
      this.accessToken = null;
      this.expiresAt = null;
    }
  }]);
}();
module.exports = OAuth2TokenManager;