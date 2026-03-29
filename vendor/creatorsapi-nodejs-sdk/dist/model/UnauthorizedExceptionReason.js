"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
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
/**
* Enum class UnauthorizedExceptionReason.
* @enum {}
* @readonly
*/
var UnauthorizedExceptionReason = exports["default"] = /*#__PURE__*/function () {
  function UnauthorizedExceptionReason() {
    _classCallCheck(this, UnauthorizedExceptionReason);
    /**
     * value: "TokenExpired"
     * @const
     */
    _defineProperty(this, "TokenExpired", "TokenExpired");
    /**
     * value: "InvalidToken"
     * @const
     */
    _defineProperty(this, "InvalidToken", "InvalidToken");
    /**
     * value: "InvalidIssuer"
     * @const
     */
    _defineProperty(this, "InvalidIssuer", "InvalidIssuer");
    /**
     * value: "MissingClaim"
     * @const
     */
    _defineProperty(this, "MissingClaim", "MissingClaim");
    /**
     * value: "MissingKeyId"
     * @const
     */
    _defineProperty(this, "MissingKeyId", "MissingKeyId");
    /**
     * value: "UnsupportedClient"
     * @const
     */
    _defineProperty(this, "UnsupportedClient", "UnsupportedClient");
    /**
     * value: "InvalidClient"
     * @const
     */
    _defineProperty(this, "InvalidClient", "InvalidClient");
    /**
     * value: "MissingCredential"
     * @const
     */
    _defineProperty(this, "MissingCredential", "MissingCredential");
    /**
     * value: "Other"
     * @const
     */
    _defineProperty(this, "Other", "Other");
  }
  return _createClass(UnauthorizedExceptionReason, null, [{
    key: "constructFromObject",
    value:
    /**
    * Returns a <code>UnauthorizedExceptionReason</code> enum value from a Javascript object name.
    * @param {Object} data The plain JavaScript object containing the name of the enum value.
    * @return {module:model/UnauthorizedExceptionReason} The enum <code>UnauthorizedExceptionReason</code> value.
    */
    function constructFromObject(object) {
      return object;
    }
  }]);
}();