"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
var _Languages = _interopRequireDefault(require("./Languages"));
var _SingleIntegerValuedAttribute = _interopRequireDefault(require("./SingleIntegerValuedAttribute"));
var _SingleStringValuedAttribute = _interopRequireDefault(require("./SingleStringValuedAttribute"));
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
 * The ContentInfo model module.
 * @module model/ContentInfo
 * @version 1.0.0
 */
var ContentInfo = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ContentInfo</code>.
   * Container for set of attributes that are specific to the content like books, movies.
   * @alias module:model/ContentInfo
   */
  function ContentInfo() {
    _classCallCheck(this, ContentInfo);
    ContentInfo.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(ContentInfo, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>ContentInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ContentInfo} obj Optional instance to populate.
     * @return {module:model/ContentInfo} The populated <code>ContentInfo</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ContentInfo();
        if (data.hasOwnProperty('edition')) {
          obj['edition'] = _SingleStringValuedAttribute["default"].constructFromObject(data['edition']);
        }
        if (data.hasOwnProperty('languages')) {
          obj['languages'] = _Languages["default"].constructFromObject(data['languages']);
        }
        if (data.hasOwnProperty('pagesCount')) {
          obj['pagesCount'] = _SingleIntegerValuedAttribute["default"].constructFromObject(data['pagesCount']);
        }
        if (data.hasOwnProperty('publicationDate')) {
          obj['publicationDate'] = _SingleStringValuedAttribute["default"].constructFromObject(data['publicationDate']);
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ContentInfo</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ContentInfo</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // validate the optional field `edition`
      if (data['edition']) {
        // data not null
        _SingleStringValuedAttribute["default"].validateJSON(data['edition']);
      }
      // validate the optional field `languages`
      if (data['languages']) {
        // data not null
        _Languages["default"].validateJSON(data['languages']);
      }
      // validate the optional field `pagesCount`
      if (data['pagesCount']) {
        // data not null
        _SingleIntegerValuedAttribute["default"].validateJSON(data['pagesCount']);
      }
      // validate the optional field `publicationDate`
      if (data['publicationDate']) {
        // data not null
        _SingleStringValuedAttribute["default"].validateJSON(data['publicationDate']);
      }
      return true;
    }
  }]);
}();
/**
 * @member {module:model/SingleStringValuedAttribute} edition
 */
ContentInfo.prototype['edition'] = undefined;

/**
 * @member {module:model/Languages} languages
 */
ContentInfo.prototype['languages'] = undefined;

/**
 * @member {module:model/SingleIntegerValuedAttribute} pagesCount
 */
ContentInfo.prototype['pagesCount'] = undefined;

/**
 * @member {module:model/SingleStringValuedAttribute} publicationDate
 */
ContentInfo.prototype['publicationDate'] = undefined;
var _default = exports["default"] = ContentInfo;