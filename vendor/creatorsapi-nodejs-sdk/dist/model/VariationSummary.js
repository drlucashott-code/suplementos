"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
var _VariationDimension = _interopRequireDefault(require("./VariationDimension"));
var _VariationSummaryPrice = _interopRequireDefault(require("./VariationSummaryPrice"));
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
 * The VariationSummary model module.
 * @module model/VariationSummary
 * @version 1.0.0
 */
var VariationSummary = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>VariationSummary</code>.
   * The container for Variations Summary response. It consists of metadata of variations response like page numbers, number of variations, Price range and Variation Dimensions.
   * @alias module:model/VariationSummary
   */
  function VariationSummary() {
    _classCallCheck(this, VariationSummary);
    VariationSummary.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(VariationSummary, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>VariationSummary</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/VariationSummary} obj Optional instance to populate.
     * @return {module:model/VariationSummary} The populated <code>VariationSummary</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new VariationSummary();
        if (data.hasOwnProperty('pageCount')) {
          obj['pageCount'] = _ApiClient["default"].convertToType(data['pageCount'], 'Number');
        }
        if (data.hasOwnProperty('price')) {
          obj['price'] = _VariationSummaryPrice["default"].constructFromObject(data['price']);
        }
        if (data.hasOwnProperty('variationCount')) {
          obj['variationCount'] = _ApiClient["default"].convertToType(data['variationCount'], 'Number');
        }
        if (data.hasOwnProperty('variationDimensions')) {
          obj['variationDimensions'] = _ApiClient["default"].convertToType(data['variationDimensions'], [_VariationDimension["default"]]);
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>VariationSummary</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>VariationSummary</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // validate the optional field `price`
      if (data['price']) {
        // data not null
        _VariationSummaryPrice["default"].validateJSON(data['price']);
      }
      if (data['variationDimensions']) {
        // data not null
        // ensure the json data is an array
        if (!Array.isArray(data['variationDimensions'])) {
          throw new Error("Expected the field `variationDimensions` to be an array in the JSON data but got " + data['variationDimensions']);
        }
        // validate the optional field `variationDimensions` (array)
        var _iterator = _createForOfIteratorHelper(data['variationDimensions']),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var item = _step.value;
            _VariationDimension["default"].validateJSON(item);
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
 * Number of pages in the variation result set.
 * @member {Number} pageCount
 */
VariationSummary.prototype['pageCount'] = undefined;

/**
 * @member {module:model/VariationSummaryPrice} price
 */
VariationSummary.prototype['price'] = undefined;

/**
 * Total number of variations available for the product. This represents the complete count of all child ASINs across all pages. Use this value along with pageCount to understand the full scope of available variations.
 * @member {Number} variationCount
 */
VariationSummary.prototype['variationCount'] = undefined;

/**
 * List of variation dimensions associated with the product. Variation dimensions define the attributes on which products vary (e.g., size, color). Each dimension includes: - Display name and locale for presentation - Dimension name (internal identifier) - List of all possible values for that dimension  For example, a clothing item might have two dimensions: 'Size' with values ['S', 'M', 'L'] and 'Color' with values ['Red', 'Blue', 'Green']. These dimensions help users understand how variations differ from each other.
 * @member {Array.<module:model/VariationDimension>} variationDimensions
 */
VariationSummary.prototype['variationDimensions'] = undefined;
var _default = exports["default"] = VariationSummary;