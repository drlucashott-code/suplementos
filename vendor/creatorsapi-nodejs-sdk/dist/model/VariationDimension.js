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
 * The VariationDimension model module.
 * @module model/VariationDimension
 * @version 1.0.0
 */
var VariationDimension = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>VariationDimension</code>.
   * The container for variation dimension which represent a dimension and all its possible values.
   * @alias module:model/VariationDimension
   */
  function VariationDimension() {
    _classCallCheck(this, VariationDimension);
    VariationDimension.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(VariationDimension, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>VariationDimension</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/VariationDimension} obj Optional instance to populate.
     * @return {module:model/VariationDimension} The populated <code>VariationDimension</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new VariationDimension();
        if (data.hasOwnProperty('displayName')) {
          obj['displayName'] = _ApiClient["default"].convertToType(data['displayName'], 'String');
        }
        if (data.hasOwnProperty('locale')) {
          obj['locale'] = _ApiClient["default"].convertToType(data['locale'], 'String');
        }
        if (data.hasOwnProperty('name')) {
          obj['name'] = _ApiClient["default"].convertToType(data['name'], 'String');
        }
        if (data.hasOwnProperty('values')) {
          obj['values'] = _ApiClient["default"].convertToType(data['values'], ['String']);
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>VariationDimension</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>VariationDimension</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // ensure the json data is a string
      if (data['displayName'] && !(typeof data['displayName'] === 'string' || data['displayName'] instanceof String)) {
        throw new Error("Expected the field `displayName` to be a primitive type in the JSON string but got " + data['displayName']);
      }
      // ensure the json data is a string
      if (data['locale'] && !(typeof data['locale'] === 'string' || data['locale'] instanceof String)) {
        throw new Error("Expected the field `locale` to be a primitive type in the JSON string but got " + data['locale']);
      }
      // ensure the json data is a string
      if (data['name'] && !(typeof data['name'] === 'string' || data['name'] instanceof String)) {
        throw new Error("Expected the field `name` to be a primitive type in the JSON string but got " + data['name']);
      }
      // ensure the json data is an array
      if (!Array.isArray(data['values'])) {
        throw new Error("Expected the field `values` to be an array in the JSON data but got " + data['values']);
      }
      return true;
    }
  }]);
}();
/**
 * Display name of the variation dimension, suitable for presentation to users.
 * @member {String} displayName
 */
VariationDimension.prototype['displayName'] = undefined;

/**
 * Locale of the variation dimension display name.
 * @member {String} locale
 */
VariationDimension.prototype['locale'] = undefined;

/**
 * Name of the variation dimension (e.g., 'Size', 'Color').
 * @member {String} name
 */
VariationDimension.prototype['name'] = undefined;

/**
 * List of possible values for this variation dimension.
 * @member {Array.<String>} values
 */
VariationDimension.prototype['values'] = undefined;
var _default = exports["default"] = VariationDimension;