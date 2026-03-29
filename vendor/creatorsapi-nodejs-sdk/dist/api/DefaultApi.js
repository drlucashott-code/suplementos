"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
var _AccessDeniedExceptionResponseContent = _interopRequireDefault(require("../model/AccessDeniedExceptionResponseContent"));
var _GetBrowseNodesRequestContent = _interopRequireDefault(require("../model/GetBrowseNodesRequestContent"));
var _GetBrowseNodesResponseContent = _interopRequireDefault(require("../model/GetBrowseNodesResponseContent"));
var _GetFeedRequestContent = _interopRequireDefault(require("../model/GetFeedRequestContent"));
var _GetFeedResponseContent = _interopRequireDefault(require("../model/GetFeedResponseContent"));
var _GetItemsRequestContent = _interopRequireDefault(require("../model/GetItemsRequestContent"));
var _GetItemsResponseContent = _interopRequireDefault(require("../model/GetItemsResponseContent"));
var _GetReportRequestContent = _interopRequireDefault(require("../model/GetReportRequestContent"));
var _GetReportResponseContent = _interopRequireDefault(require("../model/GetReportResponseContent"));
var _GetVariationsRequestContent = _interopRequireDefault(require("../model/GetVariationsRequestContent"));
var _GetVariationsResponseContent = _interopRequireDefault(require("../model/GetVariationsResponseContent"));
var _InternalServerExceptionResponseContent = _interopRequireDefault(require("../model/InternalServerExceptionResponseContent"));
var _ListFeedsResponseContent = _interopRequireDefault(require("../model/ListFeedsResponseContent"));
var _ListReportsResponseContent = _interopRequireDefault(require("../model/ListReportsResponseContent"));
var _ResourceNotFoundExceptionResponseContent = _interopRequireDefault(require("../model/ResourceNotFoundExceptionResponseContent"));
var _SearchItemsRequestContent = _interopRequireDefault(require("../model/SearchItemsRequestContent"));
var _SearchItemsResponseContent = _interopRequireDefault(require("../model/SearchItemsResponseContent"));
var _ThrottleExceptionResponseContent = _interopRequireDefault(require("../model/ThrottleExceptionResponseContent"));
var _UnauthorizedExceptionResponseContent = _interopRequireDefault(require("../model/UnauthorizedExceptionResponseContent"));
var _ValidationExceptionResponseContent = _interopRequireDefault(require("../model/ValidationExceptionResponseContent"));
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
* Default service.
* @module api/DefaultApi
* @version 1.0.0
*/
var DefaultApi = exports["default"] = /*#__PURE__*/function () {
  /**
  * Constructs a new DefaultApi. 
  * @alias module:api/DefaultApi
  * @class
  * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
  * default to {@link module:ApiClient#instance} if unspecified.
  */
  function DefaultApi(apiClient) {
    _classCallCheck(this, DefaultApi);
    this.apiClient = apiClient || _ApiClient["default"].instance;
  }

  /**
   * Given a BrowseNodeId, GetBrowseNodes operation returns the specified browse node's information like name, children and ancestors depending on the resources specified in the request. The names and browse node IDs of the children and ancestor browse nodes are also returned. GetBrowseNodes enables you to traverse the browse node hierarchy to find a browse node.  GetBrowseNodes Operation returns Id, DisplayName, ContextFreeName and SalesRank response elements by default. For other response elements associated, with GetBrowseNodes supports the following high-level resources: - BrowseNodes  Available in all locales, however, parameter support varies by locale.
   * @param {String} xMarketplace Target Amazon Locale. Type: String Default Value: None Example: 'www.amazon.com'
   * @param {module:model/GetBrowseNodesRequestContent} getBrowseNodesRequestContent 
   * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/GetBrowseNodesResponseContent} and HTTP response
   */
  return _createClass(DefaultApi, [{
    key: "getBrowseNodesWithHttpInfo",
    value: function getBrowseNodesWithHttpInfo(xMarketplace, getBrowseNodesRequestContent) {
      var postBody = getBrowseNodesRequestContent;
      // verify the required parameter 'xMarketplace' is set
      if (xMarketplace === undefined || xMarketplace === null) {
        throw new Error("Missing the required parameter 'xMarketplace' when calling getBrowseNodes");
      }
      // verify the required parameter 'getBrowseNodesRequestContent' is set
      if (getBrowseNodesRequestContent === undefined || getBrowseNodesRequestContent === null) {
        throw new Error("Missing the required parameter 'getBrowseNodesRequestContent' when calling getBrowseNodes");
      }
      var pathParams = {};
      var queryParams = {};
      var headerParams = {
        'x-marketplace': xMarketplace
      };
      var formParams = {};
      var authNames = [];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = _GetBrowseNodesResponseContent["default"];
      return this.apiClient.callApi('/catalog/v1/getBrowseNodes', 'POST', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null);
    }

    /**
     * Given a BrowseNodeId, GetBrowseNodes operation returns the specified browse node's information like name, children and ancestors depending on the resources specified in the request. The names and browse node IDs of the children and ancestor browse nodes are also returned. GetBrowseNodes enables you to traverse the browse node hierarchy to find a browse node.  GetBrowseNodes Operation returns Id, DisplayName, ContextFreeName and SalesRank response elements by default. For other response elements associated, with GetBrowseNodes supports the following high-level resources: - BrowseNodes  Available in all locales, however, parameter support varies by locale.
     * @param {String} xMarketplace Target Amazon Locale. Type: String Default Value: None Example: 'www.amazon.com'
     * @param {module:model/GetBrowseNodesRequestContent} getBrowseNodesRequestContent 
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/GetBrowseNodesResponseContent}
     */
  }, {
    key: "getBrowseNodes",
    value: function getBrowseNodes(xMarketplace, getBrowseNodesRequestContent) {
      return this.getBrowseNodesWithHttpInfo(xMarketplace, getBrowseNodesRequestContent).then(function (response_and_data) {
        return response_and_data.data;
      });
    }

    /**
     * Get pre-signed S3 Url for a feed
     * @param {String} xMarketplace Target Amazon Locale.
     * @param {module:model/GetFeedRequestContent} getFeedRequestContent 
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/GetFeedResponseContent} and HTTP response
     */
  }, {
    key: "getFeedWithHttpInfo",
    value: function getFeedWithHttpInfo(xMarketplace, getFeedRequestContent) {
      var postBody = getFeedRequestContent;
      // verify the required parameter 'xMarketplace' is set
      if (xMarketplace === undefined || xMarketplace === null) {
        throw new Error("Missing the required parameter 'xMarketplace' when calling getFeed");
      }
      // verify the required parameter 'getFeedRequestContent' is set
      if (getFeedRequestContent === undefined || getFeedRequestContent === null) {
        throw new Error("Missing the required parameter 'getFeedRequestContent' when calling getFeed");
      }
      var pathParams = {};
      var queryParams = {};
      var headerParams = {
        'x-marketplace': xMarketplace
      };
      var formParams = {};
      var authNames = [];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = _GetFeedResponseContent["default"];
      return this.apiClient.callApi('/catalog/v1/getFeed', 'POST', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null);
    }

    /**
     * Get pre-signed S3 Url for a feed
     * @param {String} xMarketplace Target Amazon Locale.
     * @param {module:model/GetFeedRequestContent} getFeedRequestContent 
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/GetFeedResponseContent}
     */
  }, {
    key: "getFeed",
    value: function getFeed(xMarketplace, getFeedRequestContent) {
      return this.getFeedWithHttpInfo(xMarketplace, getFeedRequestContent).then(function (response_and_data) {
        return response_and_data.data;
      });
    }

    /**
     * @param {String} xMarketplace Target Amazon Locale.
     * @param {module:model/GetItemsRequestContent} getItemsRequestContent 
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/GetItemsResponseContent} and HTTP response
     */
  }, {
    key: "getItemsWithHttpInfo",
    value: function getItemsWithHttpInfo(xMarketplace, getItemsRequestContent) {
      var postBody = getItemsRequestContent;
      // verify the required parameter 'xMarketplace' is set
      if (xMarketplace === undefined || xMarketplace === null) {
        throw new Error("Missing the required parameter 'xMarketplace' when calling getItems");
      }
      // verify the required parameter 'getItemsRequestContent' is set
      if (getItemsRequestContent === undefined || getItemsRequestContent === null) {
        throw new Error("Missing the required parameter 'getItemsRequestContent' when calling getItems");
      }
      var pathParams = {};
      var queryParams = {};
      var headerParams = {
        'x-marketplace': xMarketplace
      };
      var formParams = {};
      var authNames = [];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = _GetItemsResponseContent["default"];
      return this.apiClient.callApi('/catalog/v1/getItems', 'POST', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null);
    }

    /**
     * @param {String} xMarketplace Target Amazon Locale.
     * @param {module:model/GetItemsRequestContent} getItemsRequestContent 
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/GetItemsResponseContent}
     */
  }, {
    key: "getItems",
    value: function getItems(xMarketplace, getItemsRequestContent) {
      return this.getItemsWithHttpInfo(xMarketplace, getItemsRequestContent).then(function (response_and_data) {
        return response_and_data.data;
      });
    }

    /**
     * Get pre-signed S3 Url for a report
     * @param {String} xMarketplace Target Amazon Locale.
     * @param {module:model/GetReportRequestContent} getReportRequestContent 
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/GetReportResponseContent} and HTTP response
     */
  }, {
    key: "getReportWithHttpInfo",
    value: function getReportWithHttpInfo(xMarketplace, getReportRequestContent) {
      var postBody = getReportRequestContent;
      // verify the required parameter 'xMarketplace' is set
      if (xMarketplace === undefined || xMarketplace === null) {
        throw new Error("Missing the required parameter 'xMarketplace' when calling getReport");
      }
      // verify the required parameter 'getReportRequestContent' is set
      if (getReportRequestContent === undefined || getReportRequestContent === null) {
        throw new Error("Missing the required parameter 'getReportRequestContent' when calling getReport");
      }
      var pathParams = {};
      var queryParams = {};
      var headerParams = {
        'x-marketplace': xMarketplace
      };
      var formParams = {};
      var authNames = [];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = _GetReportResponseContent["default"];
      return this.apiClient.callApi('/reports/v1/getReport', 'POST', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null);
    }

    /**
     * Get pre-signed S3 Url for a report
     * @param {String} xMarketplace Target Amazon Locale.
     * @param {module:model/GetReportRequestContent} getReportRequestContent 
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/GetReportResponseContent}
     */
  }, {
    key: "getReport",
    value: function getReport(xMarketplace, getReportRequestContent) {
      return this.getReportWithHttpInfo(xMarketplace, getReportRequestContent).then(function (response_and_data) {
        return response_and_data.data;
      });
    }

    /**
     * Given an ASIN, the GetVariations operation returns a set of items that are the same product, but differ according to a consistent theme, for example size and color. These items which differ according to a consistent theme are called variations. A variation is a child ASIN. The parent ASIN is an abstraction of the children items. For example, a shirt is a parent ASIN and parent ASINs cannot be sold. A child ASIN would be a blue shirt, size 16, sold by MyApparelStore. This child ASIN is one of potentially many variations. The ways in which variations differ are called dimensions. In the preceding example, size and color are the dimensions.  GetVariations supports the following high-level resources: - BrowseNodeInfo: Browse nodes associated with items - Images: Product images in various sizes - ItemInfo: Detailed item information including title, features, and specifications - OffersV2: Offer listings with availability, pricing, and merchant details - VariationSummary: Summary of variation dimensions and price ranges  By default, GetVariations returns 10 variations per page. Use VariationPage and VariationCount parameters to control pagination. The operation works with both parent ASINs (to retrieve all variations) and child ASINs (to retrieve sibling variations).  Available in all locales, however, parameter support varies by locale.
     * @param {String} xMarketplace Target Amazon Locale. This specifies the marketplace where the items should be searched. Example: 'www.amazon.com'
     * @param {module:model/GetVariationsRequestContent} getVariationsRequestContent 
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/GetVariationsResponseContent} and HTTP response
     */
  }, {
    key: "getVariationsWithHttpInfo",
    value: function getVariationsWithHttpInfo(xMarketplace, getVariationsRequestContent) {
      var postBody = getVariationsRequestContent;
      // verify the required parameter 'xMarketplace' is set
      if (xMarketplace === undefined || xMarketplace === null) {
        throw new Error("Missing the required parameter 'xMarketplace' when calling getVariations");
      }
      // verify the required parameter 'getVariationsRequestContent' is set
      if (getVariationsRequestContent === undefined || getVariationsRequestContent === null) {
        throw new Error("Missing the required parameter 'getVariationsRequestContent' when calling getVariations");
      }
      var pathParams = {};
      var queryParams = {};
      var headerParams = {
        'x-marketplace': xMarketplace
      };
      var formParams = {};
      var authNames = [];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = _GetVariationsResponseContent["default"];
      return this.apiClient.callApi('/catalog/v1/getVariations', 'POST', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null);
    }

    /**
     * Given an ASIN, the GetVariations operation returns a set of items that are the same product, but differ according to a consistent theme, for example size and color. These items which differ according to a consistent theme are called variations. A variation is a child ASIN. The parent ASIN is an abstraction of the children items. For example, a shirt is a parent ASIN and parent ASINs cannot be sold. A child ASIN would be a blue shirt, size 16, sold by MyApparelStore. This child ASIN is one of potentially many variations. The ways in which variations differ are called dimensions. In the preceding example, size and color are the dimensions.  GetVariations supports the following high-level resources: - BrowseNodeInfo: Browse nodes associated with items - Images: Product images in various sizes - ItemInfo: Detailed item information including title, features, and specifications - OffersV2: Offer listings with availability, pricing, and merchant details - VariationSummary: Summary of variation dimensions and price ranges  By default, GetVariations returns 10 variations per page. Use VariationPage and VariationCount parameters to control pagination. The operation works with both parent ASINs (to retrieve all variations) and child ASINs (to retrieve sibling variations).  Available in all locales, however, parameter support varies by locale.
     * @param {String} xMarketplace Target Amazon Locale. This specifies the marketplace where the items should be searched. Example: 'www.amazon.com'
     * @param {module:model/GetVariationsRequestContent} getVariationsRequestContent 
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/GetVariationsResponseContent}
     */
  }, {
    key: "getVariations",
    value: function getVariations(xMarketplace, getVariationsRequestContent) {
      return this.getVariationsWithHttpInfo(xMarketplace, getVariationsRequestContent).then(function (response_and_data) {
        return response_and_data.data;
      });
    }

    /**
     * Lists all Feeds
     * @param {String} xMarketplace Target Amazon Locale.
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/ListFeedsResponseContent} and HTTP response
     */
  }, {
    key: "listFeedsWithHttpInfo",
    value: function listFeedsWithHttpInfo(xMarketplace) {
      var postBody = null;
      // verify the required parameter 'xMarketplace' is set
      if (xMarketplace === undefined || xMarketplace === null) {
        throw new Error("Missing the required parameter 'xMarketplace' when calling listFeeds");
      }
      var pathParams = {};
      var queryParams = {};
      var headerParams = {
        'x-marketplace': xMarketplace
      };
      var formParams = {};
      var authNames = [];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _ListFeedsResponseContent["default"];
      return this.apiClient.callApi('/catalog/v1/listFeeds', 'POST', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null);
    }

    /**
     * Lists all Feeds
     * @param {String} xMarketplace Target Amazon Locale.
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/ListFeedsResponseContent}
     */
  }, {
    key: "listFeeds",
    value: function listFeeds(xMarketplace) {
      return this.listFeedsWithHttpInfo(xMarketplace).then(function (response_and_data) {
        return response_and_data.data;
      });
    }

    /**
     * Lists all available reports.
     * @param {String} xMarketplace Target Amazon Locale.
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/ListReportsResponseContent} and HTTP response
     */
  }, {
    key: "listReportsWithHttpInfo",
    value: function listReportsWithHttpInfo(xMarketplace) {
      var postBody = null;
      // verify the required parameter 'xMarketplace' is set
      if (xMarketplace === undefined || xMarketplace === null) {
        throw new Error("Missing the required parameter 'xMarketplace' when calling listReports");
      }
      var pathParams = {};
      var queryParams = {};
      var headerParams = {
        'x-marketplace': xMarketplace
      };
      var formParams = {};
      var authNames = [];
      var contentTypes = [];
      var accepts = ['application/json'];
      var returnType = _ListReportsResponseContent["default"];
      return this.apiClient.callApi('/reports/v1/listReports', 'POST', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null);
    }

    /**
     * Lists all available reports.
     * @param {String} xMarketplace Target Amazon Locale.
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/ListReportsResponseContent}
     */
  }, {
    key: "listReports",
    value: function listReports(xMarketplace) {
      return this.listReportsWithHttpInfo(xMarketplace).then(function (response_and_data) {
        return response_and_data.data;
      });
    }

    /**
     * @param {String} xMarketplace Target Amazon Locale.
     * @param {Object} opts Optional parameters
     * @param {module:model/SearchItemsRequestContent} [searchItemsRequestContent] 
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with an object containing data of type {@link module:model/SearchItemsResponseContent} and HTTP response
     */
  }, {
    key: "searchItemsWithHttpInfo",
    value: function searchItemsWithHttpInfo(xMarketplace, opts) {
      opts = opts || {};
      var postBody = opts['searchItemsRequestContent'];
      // verify the required parameter 'xMarketplace' is set
      if (xMarketplace === undefined || xMarketplace === null) {
        throw new Error("Missing the required parameter 'xMarketplace' when calling searchItems");
      }
      var pathParams = {};
      var queryParams = {};
      var headerParams = {
        'x-marketplace': xMarketplace
      };
      var formParams = {};
      var authNames = [];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = _SearchItemsResponseContent["default"];
      return this.apiClient.callApi('/catalog/v1/searchItems', 'POST', pathParams, queryParams, headerParams, formParams, postBody, authNames, contentTypes, accepts, returnType, null);
    }

    /**
     * @param {String} xMarketplace Target Amazon Locale.
     * @param {Object} opts Optional parameters
     * @param {module:model/SearchItemsRequestContent} opts.searchItemsRequestContent 
     * @return {Promise} a {@link https://www.promisejs.org/|Promise}, with data of type {@link module:model/SearchItemsResponseContent}
     */
  }, {
    key: "searchItems",
    value: function searchItems(xMarketplace, opts) {
      return this.searchItemsWithHttpInfo(xMarketplace, opts).then(function (response_and_data) {
        return response_and_data.data;
      });
    }
  }]);
}();