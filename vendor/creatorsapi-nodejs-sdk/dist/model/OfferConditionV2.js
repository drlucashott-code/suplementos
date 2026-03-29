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
 * The OfferConditionV2 model module.
 * @module model/OfferConditionV2
 * @version 1.0.0
 */
var OfferConditionV2 = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>OfferConditionV2</code>.
   * Specifies the condition of the offer.
   * @alias module:model/OfferConditionV2
   */
  function OfferConditionV2() {
    _classCallCheck(this, OfferConditionV2);
    OfferConditionV2.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(OfferConditionV2, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>OfferConditionV2</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/OfferConditionV2} obj Optional instance to populate.
     * @return {module:model/OfferConditionV2} The populated <code>OfferConditionV2</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new OfferConditionV2();
        if (data.hasOwnProperty('value')) {
          obj['value'] = _ApiClient["default"].convertToType(data['value'], 'String');
        }
        if (data.hasOwnProperty('subCondition')) {
          obj['subCondition'] = _ApiClient["default"].convertToType(data['subCondition'], 'String');
        }
        if (data.hasOwnProperty('conditionNote')) {
          obj['conditionNote'] = _ApiClient["default"].convertToType(data['conditionNote'], 'String');
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>OfferConditionV2</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>OfferConditionV2</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // ensure the json data is a string
      if (data['value'] && !(typeof data['value'] === 'string' || data['value'] instanceof String)) {
        throw new Error("Expected the field `value` to be a primitive type in the JSON string but got " + data['value']);
      }
      // ensure the json data is a string
      if (data['subCondition'] && !(typeof data['subCondition'] === 'string' || data['subCondition'] instanceof String)) {
        throw new Error("Expected the field `subCondition` to be a primitive type in the JSON string but got " + data['subCondition']);
      }
      // ensure the json data is a string
      if (data['conditionNote'] && !(typeof data['conditionNote'] === 'string' || data['conditionNote'] instanceof String)) {
        throw new Error("Expected the field `conditionNote` to be a primitive type in the JSON string but got " + data['conditionNote']);
      }
      return true;
    }
  }]);
}();
/**
 * @member {String} value
 */
OfferConditionV2.prototype['value'] = undefined;

/**
 * @member {String} subCondition
 */
OfferConditionV2.prototype['subCondition'] = undefined;

/**
 * @member {String} conditionNote
 */
OfferConditionV2.prototype['conditionNote'] = undefined;
var _default = exports["default"] = OfferConditionV2;