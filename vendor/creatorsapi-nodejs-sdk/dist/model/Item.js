"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
var _BrowseNodeInfo = _interopRequireDefault(require("./BrowseNodeInfo"));
var _CustomerReviews = _interopRequireDefault(require("./CustomerReviews"));
var _Images = _interopRequireDefault(require("./Images"));
var _ItemInfo = _interopRequireDefault(require("./ItemInfo"));
var _OffersV = _interopRequireDefault(require("./OffersV2"));
var _VariationAttribute = _interopRequireDefault(require("./VariationAttribute"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
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
 * The Item model module.
 * @module model/Item
 * @version 1.0.0
 */
var Item = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>Item</code>.
   * Container for item information such as ASIN, Detail Page URL and other attributes. It also includes containers for various item related resources like Images, ItemInfo, etc.
   * @alias module:model/Item
   */
  function Item() {
    _classCallCheck(this, Item);
    Item.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(Item, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>Item</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Item} obj Optional instance to populate.
     * @return {module:model/Item} The populated <code>Item</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new Item();
        if (data.hasOwnProperty('asin')) {
          obj['asin'] = _ApiClient["default"].convertToType(data['asin'], 'String');
        }
        if (data.hasOwnProperty('browseNodeInfo')) {
          obj['browseNodeInfo'] = _BrowseNodeInfo["default"].constructFromObject(data['browseNodeInfo']);
        }
        if (data.hasOwnProperty('customerReviews')) {
          obj['customerReviews'] = _CustomerReviews["default"].constructFromObject(data['customerReviews']);
        }
        if (data.hasOwnProperty('detailPageURL')) {
          obj['detailPageURL'] = _ApiClient["default"].convertToType(data['detailPageURL'], 'String');
        }
        if (data.hasOwnProperty('images')) {
          obj['images'] = _Images["default"].constructFromObject(data['images']);
        }
        if (data.hasOwnProperty('itemInfo')) {
          obj['itemInfo'] = _ItemInfo["default"].constructFromObject(data['itemInfo']);
        }
        if (data.hasOwnProperty('offersV2')) {
          obj['offersV2'] = _OffersV["default"].constructFromObject(data['offersV2']);
        }
        if (data.hasOwnProperty('parentASIN')) {
          obj['parentASIN'] = _ApiClient["default"].convertToType(data['parentASIN'], 'String');
        }
        if (data.hasOwnProperty('score')) {
          obj['score'] = _ApiClient["default"].convertToType(data['score'], 'Number');
        }
        if (data.hasOwnProperty('variationAttributes')) {
          obj['variationAttributes'] = _ApiClient["default"].convertToType(data['variationAttributes'], [_VariationAttribute["default"]]);
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>Item</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>Item</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // ensure the json data is a string
      if (data['asin'] && !(typeof data['asin'] === 'string' || data['asin'] instanceof String)) {
        throw new Error("Expected the field `asin` to be a primitive type in the JSON string but got " + data['asin']);
      }
      // validate the optional field `browseNodeInfo`
      if (data['browseNodeInfo']) {
        // data not null
        _BrowseNodeInfo["default"].validateJSON(data['browseNodeInfo']);
      }
      // validate the optional field `customerReviews`
      if (data['customerReviews']) {
        // data not null
        _CustomerReviews["default"].validateJSON(data['customerReviews']);
      }
      // ensure the json data is a string
      if (data['detailPageURL'] && !(typeof data['detailPageURL'] === 'string' || data['detailPageURL'] instanceof String)) {
        throw new Error("Expected the field `detailPageURL` to be a primitive type in the JSON string but got " + data['detailPageURL']);
      }
      // validate the optional field `images`
      if (data['images']) {
        // data not null
        _Images["default"].validateJSON(data['images']);
      }
      // validate the optional field `itemInfo`
      if (data['itemInfo']) {
        // data not null
        _ItemInfo["default"].validateJSON(data['itemInfo']);
      }
      // validate the optional field `offersV2`
      if (data['offersV2']) {
        // data not null
        _OffersV["default"].validateJSON(data['offersV2']);
      }
      // ensure the json data is a string
      if (data['parentASIN'] && !(typeof data['parentASIN'] === 'string' || data['parentASIN'] instanceof String)) {
        throw new Error("Expected the field `parentASIN` to be a primitive type in the JSON string but got " + data['parentASIN']);
      }
      if (data['variationAttributes']) {
        // data not null
        // ensure the json data is an array
        if (!Array.isArray(data['variationAttributes'])) {
          throw new Error("Expected the field `variationAttributes` to be an array in the JSON data but got " + data['variationAttributes']);
        }
        // validate the optional field `variationAttributes` (array)
        var _iterator = _createForOfIteratorHelper(data['variationAttributes']),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var item = _step.value;
            _VariationAttribute["default"].validateJSON(item);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
        ;
      }
      return true;
    }
  }]);
}();
/**
 * @member {String} asin
 */
Item.prototype['asin'] = undefined;

/**
 * @member {module:model/BrowseNodeInfo} browseNodeInfo
 */
Item.prototype['browseNodeInfo'] = undefined;

/**
 * @member {module:model/CustomerReviews} customerReviews
 */
Item.prototype['customerReviews'] = undefined;

/**
 * @member {String} detailPageURL
 */
Item.prototype['detailPageURL'] = undefined;

/**
 * @member {module:model/Images} images
 */
Item.prototype['images'] = undefined;

/**
 * @member {module:model/ItemInfo} itemInfo
 */
Item.prototype['itemInfo'] = undefined;

/**
 * @member {module:model/OffersV2} offersV2
 */
Item.prototype['offersV2'] = undefined;

/**
 * @member {String} parentASIN
 */
Item.prototype['parentASIN'] = undefined;

/**
 * @member {Number} score
 */
Item.prototype['score'] = undefined;

/**
 * List of offer listing associated with a product.
 * @member {Array.<module:model/VariationAttribute>} variationAttributes
 */
Item.prototype['variationAttributes'] = undefined;
var _default = exports["default"] = Item;