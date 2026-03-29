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
 * The DealDetails model module.
 * @module model/DealDetails
 * @version 1.0.0
 */
var DealDetails = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>DealDetails</code>.
   * Specifies deal information about an offer.
   * @alias module:model/DealDetails
   */
  function DealDetails() {
    _classCallCheck(this, DealDetails);
    DealDetails.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(DealDetails, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>DealDetails</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/DealDetails} obj Optional instance to populate.
     * @return {module:model/DealDetails} The populated <code>DealDetails</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new DealDetails();
        if (data.hasOwnProperty('accessType')) {
          obj['accessType'] = _ApiClient["default"].convertToType(data['accessType'], 'String');
        }
        if (data.hasOwnProperty('badge')) {
          obj['badge'] = _ApiClient["default"].convertToType(data['badge'], 'String');
        }
        if (data.hasOwnProperty('earlyAccessDurationInMilliseconds')) {
          obj['earlyAccessDurationInMilliseconds'] = _ApiClient["default"].convertToType(data['earlyAccessDurationInMilliseconds'], 'Number');
        }
        if (data.hasOwnProperty('endTime')) {
          obj['endTime'] = _ApiClient["default"].convertToType(data['endTime'], 'String');
        }
        if (data.hasOwnProperty('percentClaimed')) {
          obj['percentClaimed'] = _ApiClient["default"].convertToType(data['percentClaimed'], 'Number');
        }
        if (data.hasOwnProperty('startTime')) {
          obj['startTime'] = _ApiClient["default"].convertToType(data['startTime'], 'String');
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>DealDetails</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>DealDetails</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // ensure the json data is a string
      if (data['accessType'] && !(typeof data['accessType'] === 'string' || data['accessType'] instanceof String)) {
        throw new Error("Expected the field `accessType` to be a primitive type in the JSON string but got " + data['accessType']);
      }
      // ensure the json data is a string
      if (data['badge'] && !(typeof data['badge'] === 'string' || data['badge'] instanceof String)) {
        throw new Error("Expected the field `badge` to be a primitive type in the JSON string but got " + data['badge']);
      }
      // ensure the json data is a string
      if (data['endTime'] && !(typeof data['endTime'] === 'string' || data['endTime'] instanceof String)) {
        throw new Error("Expected the field `endTime` to be a primitive type in the JSON string but got " + data['endTime']);
      }
      // ensure the json data is a string
      if (data['startTime'] && !(typeof data['startTime'] === 'string' || data['startTime'] instanceof String)) {
        throw new Error("Expected the field `startTime` to be a primitive type in the JSON string but got " + data['startTime']);
      }
      return true;
    }
  }]);
}();
/**
 * @member {String} accessType
 */
DealDetails.prototype['accessType'] = undefined;

/**
 * @member {String} badge
 */
DealDetails.prototype['badge'] = undefined;

/**
 * @member {Number} earlyAccessDurationInMilliseconds
 */
DealDetails.prototype['earlyAccessDurationInMilliseconds'] = undefined;

/**
 * @member {String} endTime
 */
DealDetails.prototype['endTime'] = undefined;

/**
 * @member {Number} percentClaimed
 */
DealDetails.prototype['percentClaimed'] = undefined;

/**
 * @member {String} startTime
 */
DealDetails.prototype['startTime'] = undefined;
var _default = exports["default"] = DealDetails;