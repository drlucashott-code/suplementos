"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
var _ByLineInfo = _interopRequireDefault(require("./ByLineInfo"));
var _Classifications = _interopRequireDefault(require("./Classifications"));
var _ContentInfo = _interopRequireDefault(require("./ContentInfo"));
var _ContentRating = _interopRequireDefault(require("./ContentRating"));
var _ExternalIds = _interopRequireDefault(require("./ExternalIds"));
var _ManufactureInfo = _interopRequireDefault(require("./ManufactureInfo"));
var _MultiValuedAttribute = _interopRequireDefault(require("./MultiValuedAttribute"));
var _ProductInfo = _interopRequireDefault(require("./ProductInfo"));
var _SingleStringValuedAttribute = _interopRequireDefault(require("./SingleStringValuedAttribute"));
var _TechnicalInfo = _interopRequireDefault(require("./TechnicalInfo"));
var _TradeInInfo = _interopRequireDefault(require("./TradeInInfo"));
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
 * The ItemInfo model module.
 * @module model/ItemInfo
 * @version 1.0.0
 */
var ItemInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ItemInfo</code>.
   * Container for ItemInfo high level resource which is a collection of large number of attributes describing a product.
   * @alias module:model/ItemInfo
   */
  function ItemInfo() {
    _classCallCheck(this, ItemInfo);
    ItemInfo.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(ItemInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>ItemInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ItemInfo} obj Optional instance to populate.
     * @return {module:model/ItemInfo} The populated <code>ItemInfo</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ItemInfo();
        if (data.hasOwnProperty('byLineInfo')) {
          obj['byLineInfo'] = _ByLineInfo["default"].constructFromObject(data['byLineInfo']);
        }
        if (data.hasOwnProperty('classifications')) {
          obj['classifications'] = _Classifications["default"].constructFromObject(data['classifications']);
        }
        if (data.hasOwnProperty('contentInfo')) {
          obj['contentInfo'] = _ContentInfo["default"].constructFromObject(data['contentInfo']);
        }
        if (data.hasOwnProperty('contentRating')) {
          obj['contentRating'] = _ContentRating["default"].constructFromObject(data['contentRating']);
        }
        if (data.hasOwnProperty('externalIds')) {
          obj['externalIds'] = _ExternalIds["default"].constructFromObject(data['externalIds']);
        }
        if (data.hasOwnProperty('features')) {
          obj['features'] = _MultiValuedAttribute["default"].constructFromObject(data['features']);
        }
        if (data.hasOwnProperty('manufactureInfo')) {
          obj['manufactureInfo'] = _ManufactureInfo["default"].constructFromObject(data['manufactureInfo']);
        }
        if (data.hasOwnProperty('productInfo')) {
          obj['productInfo'] = _ProductInfo["default"].constructFromObject(data['productInfo']);
        }
        if (data.hasOwnProperty('technicalInfo')) {
          obj['technicalInfo'] = _TechnicalInfo["default"].constructFromObject(data['technicalInfo']);
        }
        if (data.hasOwnProperty('title')) {
          obj['title'] = _SingleStringValuedAttribute["default"].constructFromObject(data['title']);
        }
        if (data.hasOwnProperty('tradeInInfo')) {
          obj['tradeInInfo'] = _TradeInInfo["default"].constructFromObject(data['tradeInInfo']);
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ItemInfo</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ItemInfo</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // validate the optional field `byLineInfo`
      if (data['byLineInfo']) {
        // data not null
        _ByLineInfo["default"].validateJSON(data['byLineInfo']);
      }
      // validate the optional field `classifications`
      if (data['classifications']) {
        // data not null
        _Classifications["default"].validateJSON(data['classifications']);
      }
      // validate the optional field `contentInfo`
      if (data['contentInfo']) {
        // data not null
        _ContentInfo["default"].validateJSON(data['contentInfo']);
      }
      // validate the optional field `contentRating`
      if (data['contentRating']) {
        // data not null
        _ContentRating["default"].validateJSON(data['contentRating']);
      }
      // validate the optional field `externalIds`
      if (data['externalIds']) {
        // data not null
        _ExternalIds["default"].validateJSON(data['externalIds']);
      }
      // validate the optional field `features`
      if (data['features']) {
        // data not null
        _MultiValuedAttribute["default"].validateJSON(data['features']);
      }
      // validate the optional field `manufactureInfo`
      if (data['manufactureInfo']) {
        // data not null
        _ManufactureInfo["default"].validateJSON(data['manufactureInfo']);
      }
      // validate the optional field `productInfo`
      if (data['productInfo']) {
        // data not null
        _ProductInfo["default"].validateJSON(data['productInfo']);
      }
      // validate the optional field `technicalInfo`
      if (data['technicalInfo']) {
        // data not null
        _TechnicalInfo["default"].validateJSON(data['technicalInfo']);
      }
      // validate the optional field `title`
      if (data['title']) {
        // data not null
        _SingleStringValuedAttribute["default"].validateJSON(data['title']);
      }
      // validate the optional field `tradeInInfo`
      if (data['tradeInInfo']) {
        // data not null
        _TradeInInfo["default"].validateJSON(data['tradeInInfo']);
      }
      return true;
    }
  }]);
}();
/**
 * @member {module:model/ByLineInfo} byLineInfo
 */
ItemInfo.prototype['byLineInfo'] = undefined;

/**
 * @member {module:model/Classifications} classifications
 */
ItemInfo.prototype['classifications'] = undefined;

/**
 * @member {module:model/ContentInfo} contentInfo
 */
ItemInfo.prototype['contentInfo'] = undefined;

/**
 * @member {module:model/ContentRating} contentRating
 */
ItemInfo.prototype['contentRating'] = undefined;

/**
 * @member {module:model/ExternalIds} externalIds
 */
ItemInfo.prototype['externalIds'] = undefined;

/**
 * @member {module:model/MultiValuedAttribute} features
 */
ItemInfo.prototype['features'] = undefined;

/**
 * @member {module:model/ManufactureInfo} manufactureInfo
 */
ItemInfo.prototype['manufactureInfo'] = undefined;

/**
 * @member {module:model/ProductInfo} productInfo
 */
ItemInfo.prototype['productInfo'] = undefined;

/**
 * @member {module:model/TechnicalInfo} technicalInfo
 */
ItemInfo.prototype['technicalInfo'] = undefined;

/**
 * @member {module:model/SingleStringValuedAttribute} title
 */
ItemInfo.prototype['title'] = undefined;

/**
 * @member {module:model/TradeInInfo} tradeInInfo
 */
ItemInfo.prototype['tradeInInfo'] = undefined;
var _default = exports["default"] = ItemInfo;