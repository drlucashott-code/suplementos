"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
var _Rating = _interopRequireDefault(require("./Rating"));
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
 * The CustomerReviews model module.
 * @module model/CustomerReviews
 * @version 1.0.0
 */
var CustomerReviews = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>CustomerReviews</code>.
   * Container for customer reviews information associated with a product. Includes weighted star rating and total reviews count.
   * @alias module:model/CustomerReviews
   */
  function CustomerReviews() {
    _classCallCheck(this, CustomerReviews);
    CustomerReviews.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(CustomerReviews, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>CustomerReviews</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/CustomerReviews} obj Optional instance to populate.
     * @return {module:model/CustomerReviews} The populated <code>CustomerReviews</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new CustomerReviews();
        if (data.hasOwnProperty('count')) {
          obj['count'] = _ApiClient["default"].convertToType(data['count'], 'Number');
        }
        if (data.hasOwnProperty('starRating')) {
          obj['starRating'] = _Rating["default"].constructFromObject(data['starRating']);
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>CustomerReviews</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>CustomerReviews</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // validate the optional field `starRating`
      if (data['starRating']) {
        // data not null
        _Rating["default"].validateJSON(data['starRating']);
      }
      return true;
    }
  }]);
}();
/**
 * @member {Number} count
 */
CustomerReviews.prototype['count'] = undefined;

/**
 * @member {module:model/Rating} starRating
 */
CustomerReviews.prototype['starRating'] = undefined;
var _default = exports["default"] = CustomerReviews;