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
 * The OfferAvailabilityV2 model module.
 * @module model/OfferAvailabilityV2
 * @version 1.0.0
 */
var OfferAvailabilityV2 = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>OfferAvailabilityV2</code>.
   * Specifies availability information about an offer.
   * @alias module:model/OfferAvailabilityV2
   */
  function OfferAvailabilityV2() {
    _classCallCheck(this, OfferAvailabilityV2);
    OfferAvailabilityV2.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(OfferAvailabilityV2, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>OfferAvailabilityV2</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/OfferAvailabilityV2} obj Optional instance to populate.
     * @return {module:model/OfferAvailabilityV2} The populated <code>OfferAvailabilityV2</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new OfferAvailabilityV2();
        if (data.hasOwnProperty('message')) {
          obj['message'] = _ApiClient["default"].convertToType(data['message'], 'String');
        }
        if (data.hasOwnProperty('maxOrderQuantity')) {
          obj['maxOrderQuantity'] = _ApiClient["default"].convertToType(data['maxOrderQuantity'], 'Number');
        }
        if (data.hasOwnProperty('minOrderQuantity')) {
          obj['minOrderQuantity'] = _ApiClient["default"].convertToType(data['minOrderQuantity'], 'Number');
        }
        if (data.hasOwnProperty('type')) {
          obj['type'] = _ApiClient["default"].convertToType(data['type'], 'String');
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>OfferAvailabilityV2</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>OfferAvailabilityV2</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // ensure the json data is a string
      if (data['message'] && !(typeof data['message'] === 'string' || data['message'] instanceof String)) {
        throw new Error("Expected the field `message` to be a primitive type in the JSON string but got " + data['message']);
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
 * @member {String} message
 */
OfferAvailabilityV2.prototype['message'] = undefined;

/**
 * @member {Number} maxOrderQuantity
 */
OfferAvailabilityV2.prototype['maxOrderQuantity'] = undefined;

/**
 * @member {Number} minOrderQuantity
 */
OfferAvailabilityV2.prototype['minOrderQuantity'] = undefined;

/**
 * @member {String} type
 */
OfferAvailabilityV2.prototype['type'] = undefined;
var _default = exports["default"] = OfferAvailabilityV2;