"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
var _GetBrowseNodesResource = _interopRequireDefault(require("./GetBrowseNodesResource"));
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
 * The GetBrowseNodesRequestContent model module.
 * @module model/GetBrowseNodesRequestContent
 * @version 1.0.0
 */
var GetBrowseNodesRequestContent = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>GetBrowseNodesRequestContent</code>.
   * Input for the GetBrowseNodes operation to retrieve browse node information.
   * @alias module:model/GetBrowseNodesRequestContent
   * @param partnerTag {String} Unique ID for a partner. Type: String (Non-Empty) Default Value: None Example: 'xyz-20'
   * @param browseNodeIds {Array.<String>} List of BrowseNodeIds. A BrowseNodeId is a unique ID assigned by Amazon that identifies a product category/sub-category. The BrowseNodeId is a positive Long having max value upto Long.MAX_VALUE i.e. 9223372036854775807 (inclusive). Type: List of Strings (Positive Long only) (up to 10) Default Value: None Example: ['283155', '3040']
   */
  function GetBrowseNodesRequestContent(partnerTag, browseNodeIds) {
    _classCallCheck(this, GetBrowseNodesRequestContent);
    GetBrowseNodesRequestContent.initialize(this, partnerTag, browseNodeIds);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(GetBrowseNodesRequestContent, null, [{
    key: "initialize",
    value: function initialize(obj, partnerTag, browseNodeIds) {
      obj['partnerTag'] = partnerTag;
      obj['browseNodeIds'] = browseNodeIds;
    }

    /**
     * Constructs a <code>GetBrowseNodesRequestContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/GetBrowseNodesRequestContent} obj Optional instance to populate.
     * @return {module:model/GetBrowseNodesRequestContent} The populated <code>GetBrowseNodesRequestContent</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new GetBrowseNodesRequestContent();
        if (data.hasOwnProperty('partnerTag')) {
          obj['partnerTag'] = _ApiClient["default"].convertToType(data['partnerTag'], 'String');
        }
        if (data.hasOwnProperty('browseNodeIds')) {
          obj['browseNodeIds'] = _ApiClient["default"].convertToType(data['browseNodeIds'], ['String']);
        }
        if (data.hasOwnProperty('languagesOfPreference')) {
          obj['languagesOfPreference'] = _ApiClient["default"].convertToType(data['languagesOfPreference'], ['String']);
        }
        if (data.hasOwnProperty('resources')) {
          obj['resources'] = _ApiClient["default"].convertToType(data['resources'], [_GetBrowseNodesResource["default"]]);
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>GetBrowseNodesRequestContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>GetBrowseNodesRequestContent</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // check to make sure all required properties are present in the JSON string
      var _iterator = _createForOfIteratorHelper(GetBrowseNodesRequestContent.RequiredProperties),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var property = _step.value;
          if (!data.hasOwnProperty(property)) {
            throw new Error("The required field `" + property + "` is not found in the JSON data: " + JSON.stringify(data));
          }
        }
        // ensure the json data is a string
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      if (data['partnerTag'] && !(typeof data['partnerTag'] === 'string' || data['partnerTag'] instanceof String)) {
        throw new Error("Expected the field `partnerTag` to be a primitive type in the JSON string but got " + data['partnerTag']);
      }
      // ensure the json data is an array
      if (!Array.isArray(data['browseNodeIds'])) {
        throw new Error("Expected the field `browseNodeIds` to be an array in the JSON data but got " + data['browseNodeIds']);
      }
      // ensure the json data is an array
      if (!Array.isArray(data['languagesOfPreference'])) {
        throw new Error("Expected the field `languagesOfPreference` to be an array in the JSON data but got " + data['languagesOfPreference']);
      }
      // ensure the json data is an array
      if (!Array.isArray(data['resources'])) {
        throw new Error("Expected the field `resources` to be an array in the JSON data but got " + data['resources']);
      }
      return true;
    }
  }]);
}();
GetBrowseNodesRequestContent.RequiredProperties = ["partnerTag", "browseNodeIds"];

/**
 * Unique ID for a partner. Type: String (Non-Empty) Default Value: None Example: 'xyz-20'
 * @member {String} partnerTag
 */
GetBrowseNodesRequestContent.prototype['partnerTag'] = undefined;

/**
 * List of BrowseNodeIds. A BrowseNodeId is a unique ID assigned by Amazon that identifies a product category/sub-category. The BrowseNodeId is a positive Long having max value upto Long.MAX_VALUE i.e. 9223372036854775807 (inclusive). Type: List of Strings (Positive Long only) (up to 10) Default Value: None Example: ['283155', '3040']
 * @member {Array.<String>} browseNodeIds
 */
GetBrowseNodesRequestContent.prototype['browseNodeIds'] = undefined;

/**
 * Languages of preference in which the information should be returned in response. By default the information is returned in the default language of the marketplace. Expected locale format is the ISO 639 language code followed by underscore followed by the ISO 3166 country code (i.e. en_US, fr_CA etc.). Currently only single language of preference is supported. Type: List of Strings (Non-Empty) Default Value: None Example: ['en_US']
 * @member {Array.<String>} languagesOfPreference
 */
GetBrowseNodesRequestContent.prototype['languagesOfPreference'] = undefined;

/**
 * Specifies the types of values to return. You can specify multiple resources in one request. For list of valid Resources for SearchItems operation, refer Resources Parameter. Type: List of String Default Value: ItemInfo.Title
 * @member {Array.<module:model/GetBrowseNodesResource>} resources
 */
GetBrowseNodesRequestContent.prototype['resources'] = undefined;
var _default = exports["default"] = GetBrowseNodesRequestContent;