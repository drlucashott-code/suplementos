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
 * The MultiValuedAttribute model module.
 * @module model/MultiValuedAttribute
 * @version 1.0.0
 */
var MultiValuedAttribute = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>MultiValuedAttribute</code>.
   * Container for attributes of multi-valued type.
   * @alias module:model/MultiValuedAttribute
   */
  function MultiValuedAttribute() {
    _classCallCheck(this, MultiValuedAttribute);
    MultiValuedAttribute.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(MultiValuedAttribute, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>MultiValuedAttribute</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/MultiValuedAttribute} obj Optional instance to populate.
     * @return {module:model/MultiValuedAttribute} The populated <code>MultiValuedAttribute</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new MultiValuedAttribute();
        if (data.hasOwnProperty('displayValues')) {
          obj['displayValues'] = _ApiClient["default"].convertToType(data['displayValues'], ['String']);
        }
        if (data.hasOwnProperty('label')) {
          obj['label'] = _ApiClient["default"].convertToType(data['label'], 'String');
        }
        if (data.hasOwnProperty('locale')) {
          obj['locale'] = _ApiClient["default"].convertToType(data['locale'], 'String');
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>MultiValuedAttribute</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>MultiValuedAttribute</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // ensure the json data is an array
      if (!Array.isArray(data['displayValues'])) {
        throw new Error("Expected the field `displayValues` to be an array in the JSON data but got " + data['displayValues']);
      }
      // ensure the json data is a string
      if (data['label'] && !(typeof data['label'] === 'string' || data['label'] instanceof String)) {
        throw new Error("Expected the field `label` to be a primitive type in the JSON string but got " + data['label']);
      }
      // ensure the json data is a string
      if (data['locale'] && !(typeof data['locale'] === 'string' || data['locale'] instanceof String)) {
        throw new Error("Expected the field `locale` to be a primitive type in the JSON string but got " + data['locale']);
      }
      return true;
    }
  }]);
}();
/**
 * List of primitive string type.
 * @member {Array.<String>} displayValues
 */
MultiValuedAttribute.prototype['displayValues'] = undefined;

/**
 * @member {String} label
 */
MultiValuedAttribute.prototype['label'] = undefined;

/**
 * @member {String} locale
 */
MultiValuedAttribute.prototype['locale'] = undefined;
var _default = exports["default"] = MultiValuedAttribute;