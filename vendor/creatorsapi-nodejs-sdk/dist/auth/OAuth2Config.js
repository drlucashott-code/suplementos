"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
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
 * OAuth2 configuration class that manages version-specific cognito endpoints
 * @class OAuth2Config
 */
var OAuth2Config = /*#__PURE__*/function () {
  /**
   * Creates an OAuth2Config instance
   * @param {string} credentialId - The OAuth2 credential ID
   * @param {string} credentialSecret - The OAuth2 credential secret
   * @param {string} version - The OAuth2 token version (determines the token endpoint)
   * @param {string} authEndpoint - OAuth2 auth endpoint URL
   */
  function OAuth2Config(credentialId, credentialSecret, version, authEndpoint) {
    _classCallCheck(this, OAuth2Config);
    this.credentialId = credentialId;
    this.credentialSecret = credentialSecret;
    this.version = version;
    this.authEndpoint = authEndpoint;
    this.cognitoEndpoint = this.determineTokenEndpoint();
  }

  /**
   * Determines the token endpoint to use
   * @returns {string} The OAuth2 token endpoint URL
   * @throws {Error} If the version is not supported and no custom authEndpoint is provided
   */
  return _createClass(OAuth2Config, [{
    key: "determineTokenEndpoint",
    value: function determineTokenEndpoint() {
      // Custom authEndpoint used for testing
      if (this.authEndpoint) {
        return this.authEndpoint;
      }
      switch (this.version) {
        // Cognito endpoints (v2.x)
        case "2.1":
          return "https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token";
        case "2.2":
          return "https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token";
        case "2.3":
          return "https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token";
        // LWA endpoints (v3.x)
        case "3.1":
          return "https://api.amazon.com/auth/o2/token";
        case "3.2":
          return "https://api.amazon.co.uk/auth/o2/token";
        case "3.3":
          return "https://api.amazon.co.jp/auth/o2/token";
        default:
          throw new Error("Unsupported version: ".concat(this.version, ". Supported versions are: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3"));
      }
    }

    /**
     * Checks if this is an LWA (v3.x) configuration
     * @returns {boolean} True if using LWA authentication
     */
  }, {
    key: "isLwa",
    value: function isLwa() {
      return this.version.startsWith("3.");
    }

    /**
     * Gets the credential ID
     * @returns {string} The credential ID
     */
  }, {
    key: "getCredentialId",
    value: function getCredentialId() {
      return this.credentialId;
    }

    /**
     * Gets the credential secret
     * @returns {string} The credential secret
     */
  }, {
    key: "getCredentialSecret",
    value: function getCredentialSecret() {
      return this.credentialSecret;
    }

    /**
     * Gets the credential version
     * @returns {string} The credential version
     */
  }, {
    key: "getVersion",
    value: function getVersion() {
      return this.version;
    }

    /**
     * Gets the Cognito token endpoint URL
     * @returns {string} The token endpoint URL
     */
  }, {
    key: "getCognitoEndpoint",
    value: function getCognitoEndpoint() {
      return this.cognitoEndpoint;
    }

    /**
     * Gets the OAuth2 scope
     * @returns {string} The OAuth2 scope
     */
  }, {
    key: "getScope",
    value: function getScope() {
      return this.isLwa() ? OAuth2Config.LWA_SCOPE : OAuth2Config.COGNITO_SCOPE;
    }

    /**
     * Gets the OAuth2 grant type
     * @returns {string} The OAuth2 grant type
     */
  }, {
    key: "getGrantType",
    value: function getGrantType() {
      return OAuth2Config.GRANT_TYPE;
    }
  }]);
}();
// Constants
_defineProperty(OAuth2Config, "COGNITO_SCOPE", "creatorsapi/default");
_defineProperty(OAuth2Config, "LWA_SCOPE", "creatorsapi::default");
_defineProperty(OAuth2Config, "GRANT_TYPE", "client_credentials");
module.exports = OAuth2Config;