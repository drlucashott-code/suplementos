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
 * The LanguageType model module.
 * @module model/LanguageType
 * @version 1.0.0
 */
var LanguageType = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>LanguageType</code>.
   * Container for language type used to describe the language value associated with the item.
   * @alias module:model/LanguageType
   */
  function LanguageType() {
    _classCallCheck(this, LanguageType);
    LanguageType.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(LanguageType, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>LanguageType</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/LanguageType} obj Optional instance to populate.
     * @return {module:model/LanguageType} The populated <code>LanguageType</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new LanguageType();
        if (data.hasOwnProperty('displayValue')) {
          obj['displayValue'] = _ApiClient["default"].convertToType(data['displayValue'], 'String');
        }
        if (data.hasOwnProperty('type')) {
          obj['type'] = _ApiClient["default"].convertToType(data['type'], 'String');
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>LanguageType</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>LanguageType</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // ensure the json data is a string
      if (data['displayValue'] && !(typeof data['displayValue'] === 'string' || data['displayValue'] instanceof String)) {
        throw new Error("Expected the field `displayValue` to be a primitive type in the JSON string but got " + data['displayValue']);
      }
      // ensure the json data is a string
      if (data['type'] && !(typeof data['type'] === 'string' || data['type'] instanceof String)) {
        throw new Error("Expected the field `type` to be a primitive type in the JSON string but got " + data['type']);
      }
      return true;
    }
  }]);
}();
/**
 * @member {String} displayValue
 */
LanguageType.prototype['displayValue'] = undefined;

/**
 * @member {String} type
 */
LanguageType.prototype['type'] = undefined;
var _default = exports["default"] = LanguageType;