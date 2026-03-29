"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
var _Money = _interopRequireDefault(require("./Money"));
var _OfferSavingBasis = _interopRequireDefault(require("./OfferSavingBasis"));
var _OfferSavings = _interopRequireDefault(require("./OfferSavings"));
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
 * The OfferPriceV2 model module.
 * @module model/OfferPriceV2
 * @version 1.0.0
 */
var OfferPriceV2 = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>OfferPriceV2</code>.
   * Specifies buying price of an offer.
   * @alias module:model/OfferPriceV2
   */
  function OfferPriceV2() {
    _classCallCheck(this, OfferPriceV2);
    OfferPriceV2.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(OfferPriceV2, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>OfferPriceV2</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/OfferPriceV2} obj Optional instance to populate.
     * @return {module:model/OfferPriceV2} The populated <code>OfferPriceV2</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new OfferPriceV2();
        if (data.hasOwnProperty('money')) {
          obj['money'] = _Money["default"].constructFromObject(data['money']);
        }
        if (data.hasOwnProperty('pricePerUnit')) {
          obj['pricePerUnit'] = _Money["default"].constructFromObject(data['pricePerUnit']);
        }
        if (data.hasOwnProperty('savings')) {
          obj['savings'] = _OfferSavings["default"].constructFromObject(data['savings']);
        }
        if (data.hasOwnProperty('savingBasis')) {
          obj['savingBasis'] = _OfferSavingBasis["default"].constructFromObject(data['savingBasis']);
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>OfferPriceV2</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>OfferPriceV2</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // validate the optional field `money`
      if (data['money']) {
        // data not null
        _Money["default"].validateJSON(data['money']);
      }
      // validate the optional field `pricePerUnit`
      if (data['pricePerUnit']) {
        // data not null
        _Money["default"].validateJSON(data['pricePerUnit']);
      }
      // validate the optional field `savings`
      if (data['savings']) {
        // data not null
        _OfferSavings["default"].validateJSON(data['savings']);
      }
      // validate the optional field `savingBasis`
      if (data['savingBasis']) {
        // data not null
        _OfferSavingBasis["default"].validateJSON(data['savingBasis']);
      }
      return true;
    }
  }]);
}();
/**
 * @member {module:model/Money} money
 */
OfferPriceV2.prototype['money'] = undefined;

/**
 * @member {module:model/Money} pricePerUnit
 */
OfferPriceV2.prototype['pricePerUnit'] = undefined;

/**
 * @member {module:model/OfferSavings} savings
 */
OfferPriceV2.prototype['savings'] = undefined;

/**
 * @member {module:model/OfferSavingBasis} savingBasis
 */
OfferPriceV2.prototype['savingBasis'] = undefined;
var _default = exports["default"] = OfferPriceV2;