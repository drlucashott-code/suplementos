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
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
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
* Enum class GetVariationsResource.
* @enum {}
* @readonly
*/
var GetVariationsResource = exports["default"] = /*#__PURE__*/function () {
  function GetVariationsResource() {
    _classCallCheck(this, GetVariationsResource);
    /**
     * value: "browseNodeInfo.browseNodes"
     * @const
     */
    _defineProperty(this, "browseNodeInfo.browseNodes", "browseNodeInfo.browseNodes");
    /**
     * value: "browseNodeInfo.browseNodes.ancestor"
     * @const
     */
    _defineProperty(this, "browseNodeInfo.browseNodes.ancestor", "browseNodeInfo.browseNodes.ancestor");
    /**
     * value: "browseNodeInfo.browseNodes.salesRank"
     * @const
     */
    _defineProperty(this, "browseNodeInfo.browseNodes.salesRank", "browseNodeInfo.browseNodes.salesRank");
    /**
     * value: "browseNodeInfo.websiteSalesRank"
     * @const
     */
    _defineProperty(this, "browseNodeInfo.websiteSalesRank", "browseNodeInfo.websiteSalesRank");
    /**
     * value: "customerReviews.count"
     * @const
     */
    _defineProperty(this, "customerReviews.count", "customerReviews.count");
    /**
     * value: "customerReviews.starRating"
     * @const
     */
    _defineProperty(this, "customerReviews.starRating", "customerReviews.starRating");
    /**
     * value: "images.primary.small"
     * @const
     */
    _defineProperty(this, "images.primary.small", "images.primary.small");
    /**
     * value: "images.primary.medium"
     * @const
     */
    _defineProperty(this, "images.primary.medium", "images.primary.medium");
    /**
     * value: "images.primary.large"
     * @const
     */
    _defineProperty(this, "images.primary.large", "images.primary.large");
    /**
     * value: "images.primary.highRes"
     * @const
     */
    _defineProperty(this, "images.primary.highRes", "images.primary.highRes");
    /**
     * value: "images.variants.small"
     * @const
     */
    _defineProperty(this, "images.variants.small", "images.variants.small");
    /**
     * value: "images.variants.medium"
     * @const
     */
    _defineProperty(this, "images.variants.medium", "images.variants.medium");
    /**
     * value: "images.variants.large"
     * @const
     */
    _defineProperty(this, "images.variants.large", "images.variants.large");
    /**
     * value: "images.variants.highRes"
     * @const
     */
    _defineProperty(this, "images.variants.highRes", "images.variants.highRes");
    /**
     * value: "itemInfo.byLineInfo"
     * @const
     */
    _defineProperty(this, "itemInfo.byLineInfo", "itemInfo.byLineInfo");
    /**
     * value: "itemInfo.contentInfo"
     * @const
     */
    _defineProperty(this, "itemInfo.contentInfo", "itemInfo.contentInfo");
    /**
     * value: "itemInfo.contentRating"
     * @const
     */
    _defineProperty(this, "itemInfo.contentRating", "itemInfo.contentRating");
    /**
     * value: "itemInfo.classifications"
     * @const
     */
    _defineProperty(this, "itemInfo.classifications", "itemInfo.classifications");
    /**
     * value: "itemInfo.externalIds"
     * @const
     */
    _defineProperty(this, "itemInfo.externalIds", "itemInfo.externalIds");
    /**
     * value: "itemInfo.features"
     * @const
     */
    _defineProperty(this, "itemInfo.features", "itemInfo.features");
    /**
     * value: "itemInfo.manufactureInfo"
     * @const
     */
    _defineProperty(this, "itemInfo.manufactureInfo", "itemInfo.manufactureInfo");
    /**
     * value: "itemInfo.productInfo"
     * @const
     */
    _defineProperty(this, "itemInfo.productInfo", "itemInfo.productInfo");
    /**
     * value: "itemInfo.technicalInfo"
     * @const
     */
    _defineProperty(this, "itemInfo.technicalInfo", "itemInfo.technicalInfo");
    /**
     * value: "itemInfo.title"
     * @const
     */
    _defineProperty(this, "itemInfo.title", "itemInfo.title");
    /**
     * value: "itemInfo.tradeInInfo"
     * @const
     */
    _defineProperty(this, "itemInfo.tradeInInfo", "itemInfo.tradeInInfo");
    /**
     * value: "parentASIN"
     * @const
     */
    _defineProperty(this, "parentASIN", "parentASIN");
    /**
     * value: "offersV2.listings.availability"
     * @const
     */
    _defineProperty(this, "offersV2.listings.availability", "offersV2.listings.availability");
    /**
     * value: "offersV2.listings.condition"
     * @const
     */
    _defineProperty(this, "offersV2.listings.condition", "offersV2.listings.condition");
    /**
     * value: "offersV2.listings.dealDetails"
     * @const
     */
    _defineProperty(this, "offersV2.listings.dealDetails", "offersV2.listings.dealDetails");
    /**
     * value: "offersV2.listings.isBuyBoxWinner"
     * @const
     */
    _defineProperty(this, "offersV2.listings.isBuyBoxWinner", "offersV2.listings.isBuyBoxWinner");
    /**
     * value: "offersV2.listings.loyaltyPoints"
     * @const
     */
    _defineProperty(this, "offersV2.listings.loyaltyPoints", "offersV2.listings.loyaltyPoints");
    /**
     * value: "offersV2.listings.merchantInfo"
     * @const
     */
    _defineProperty(this, "offersV2.listings.merchantInfo", "offersV2.listings.merchantInfo");
    /**
     * value: "offersV2.listings.price"
     * @const
     */
    _defineProperty(this, "offersV2.listings.price", "offersV2.listings.price");
    /**
     * value: "offersV2.listings.type"
     * @const
     */
    _defineProperty(this, "offersV2.listings.type", "offersV2.listings.type");
    /**
     * value: "variationSummary.price.highestPrice"
     * @const
     */
    _defineProperty(this, "variationSummary.price.highestPrice", "variationSummary.price.highestPrice");
    /**
     * value: "variationSummary.price.lowestPrice"
     * @const
     */
    _defineProperty(this, "variationSummary.price.lowestPrice", "variationSummary.price.lowestPrice");
    /**
     * value: "variationSummary.variationDimension"
     * @const
     */
    _defineProperty(this, "variationSummary.variationDimension", "variationSummary.variationDimension");
  }
  return _createClass(GetVariationsResource, null, [{
    key: "constructFromObject",
    value:
    /**
    * Returns a <code>GetVariationsResource</code> enum value from a Javascript object name.
    * @param {Object} data The plain JavaScript object containing the name of the enum value.
    * @return {module:model/GetVariationsResource} The enum <code>GetVariationsResource</code> value.
    */
    function constructFromObject(object) {
      return object;
    }
  }]);
}();