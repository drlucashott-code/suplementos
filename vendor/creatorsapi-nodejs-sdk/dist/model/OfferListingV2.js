"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
var _DealDetails = _interopRequireDefault(require("./DealDetails"));
var _OfferAvailabilityV = _interopRequireDefault(require("./OfferAvailabilityV2"));
var _OfferConditionV = _interopRequireDefault(require("./OfferConditionV2"));
var _OfferLoyaltyPointsV = _interopRequireDefault(require("./OfferLoyaltyPointsV2"));
var _OfferMerchantInfoV = _interopRequireDefault(require("./OfferMerchantInfoV2"));
var _OfferPriceV = _interopRequireDefault(require("./OfferPriceV2"));
var _OfferType = _interopRequireDefault(require("./OfferType"));
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
 * The OfferListingV2 model module.
 * @module model/OfferListingV2
 * @version 1.0.0
 */
var OfferListingV2 = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>OfferListingV2</code>.
   * Specifies about various offer listings associated with the product.
   * @alias module:model/OfferListingV2
   */
  function OfferListingV2() {
    _classCallCheck(this, OfferListingV2);
    OfferListingV2.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(OfferListingV2, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>OfferListingV2</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/OfferListingV2} obj Optional instance to populate.
     * @return {module:model/OfferListingV2} The populated <code>OfferListingV2</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new OfferListingV2();
        if (data.hasOwnProperty('availability')) {
          obj['availability'] = _OfferAvailabilityV["default"].constructFromObject(data['availability']);
        }
        if (data.hasOwnProperty('condition')) {
          obj['condition'] = _OfferConditionV["default"].constructFromObject(data['condition']);
        }
        if (data.hasOwnProperty('dealDetails')) {
          obj['dealDetails'] = _DealDetails["default"].constructFromObject(data['dealDetails']);
        }
        if (data.hasOwnProperty('isBuyBoxWinner')) {
          obj['isBuyBoxWinner'] = _ApiClient["default"].convertToType(data['isBuyBoxWinner'], 'Boolean');
        }
        if (data.hasOwnProperty('loyaltyPoints')) {
          obj['loyaltyPoints'] = _OfferLoyaltyPointsV["default"].constructFromObject(data['loyaltyPoints']);
        }
        if (data.hasOwnProperty('merchantInfo')) {
          obj['merchantInfo'] = _OfferMerchantInfoV["default"].constructFromObject(data['merchantInfo']);
        }
        if (data.hasOwnProperty('price')) {
          obj['price'] = _OfferPriceV["default"].constructFromObject(data['price']);
        }
        if (data.hasOwnProperty('type')) {
          obj['type'] = _OfferType["default"].constructFromObject(data['type']);
        }
        if (data.hasOwnProperty('violatesMAP')) {
          obj['violatesMAP'] = _ApiClient["default"].convertToType(data['violatesMAP'], 'Boolean');
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>OfferListingV2</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>OfferListingV2</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // validate the optional field `availability`
      if (data['availability']) {
        // data not null
        _OfferAvailabilityV["default"].validateJSON(data['availability']);
      }
      // validate the optional field `condition`
      if (data['condition']) {
        // data not null
        _OfferConditionV["default"].validateJSON(data['condition']);
      }
      // validate the optional field `dealDetails`
      if (data['dealDetails']) {
        // data not null
        _DealDetails["default"].validateJSON(data['dealDetails']);
      }
      // validate the optional field `loyaltyPoints`
      if (data['loyaltyPoints']) {
        // data not null
        _OfferLoyaltyPointsV["default"].validateJSON(data['loyaltyPoints']);
      }
      // validate the optional field `merchantInfo`
      if (data['merchantInfo']) {
        // data not null
        _OfferMerchantInfoV["default"].validateJSON(data['merchantInfo']);
      }
      // validate the optional field `price`
      if (data['price']) {
        // data not null
        _OfferPriceV["default"].validateJSON(data['price']);
      }
      return true;
    }
  }]);
}();
/**
 * @member {module:model/OfferAvailabilityV2} availability
 */
OfferListingV2.prototype['availability'] = undefined;

/**
 * @member {module:model/OfferConditionV2} condition
 */
OfferListingV2.prototype['condition'] = undefined;

/**
 * @member {module:model/DealDetails} dealDetails
 */
OfferListingV2.prototype['dealDetails'] = undefined;

/**
 * @member {Boolean} isBuyBoxWinner
 */
OfferListingV2.prototype['isBuyBoxWinner'] = undefined;

/**
 * @member {module:model/OfferLoyaltyPointsV2} loyaltyPoints
 */
OfferListingV2.prototype['loyaltyPoints'] = undefined;

/**
 * @member {module:model/OfferMerchantInfoV2} merchantInfo
 */
OfferListingV2.prototype['merchantInfo'] = undefined;

/**
 * @member {module:model/OfferPriceV2} price
 */
OfferListingV2.prototype['price'] = undefined;

/**
 * @member {module:model/OfferType} type
 */
OfferListingV2.prototype['type'] = undefined;

/**
 * @member {Boolean} violatesMAP
 */
OfferListingV2.prototype['violatesMAP'] = undefined;
var _default = exports["default"] = OfferListingV2;