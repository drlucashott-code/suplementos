"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
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
 * The ReportMetadata model module.
 * @module model/ReportMetadata
 * @version 1.0.0
 */
var ReportMetadata = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ReportMetadata</code>.
   * @alias module:model/ReportMetadata
   * @param filename {String} 
   * @param md5 {String} 
   * @param size {Number} 
   * @param lastModified {String} 
   */
  function ReportMetadata(filename, md5, size, lastModified) {
    _classCallCheck(this, ReportMetadata);
    ReportMetadata.initialize(this, filename, md5, size, lastModified);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(ReportMetadata, null, [{
    key: "initialize",
    value: function initialize(obj, filename, md5, size, lastModified) {
      obj['filename'] = filename;
      obj['md5'] = md5;
      obj['size'] = size;
      obj['lastModified'] = lastModified;
    }

    /**
     * Constructs a <code>ReportMetadata</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ReportMetadata} obj Optional instance to populate.
     * @return {module:model/ReportMetadata} The populated <code>ReportMetadata</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ReportMetadata();
        if (data.hasOwnProperty('filename')) {
          obj['filename'] = _ApiClient["default"].convertToType(data['filename'], 'String');
        }
        if (data.hasOwnProperty('md5')) {
          obj['md5'] = _ApiClient["default"].convertToType(data['md5'], 'String');
        }
        if (data.hasOwnProperty('size')) {
          obj['size'] = _ApiClient["default"].convertToType(data['size'], 'Number');
        }
        if (data.hasOwnProperty('lastModified')) {
          obj['lastModified'] = _ApiClient["default"].convertToType(data['lastModified'], 'String');
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ReportMetadata</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ReportMetadata</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // check to make sure all required properties are present in the JSON string
      var _iterator = _createForOfIteratorHelper(ReportMetadata.RequiredProperties),
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
      if (data['filename'] && !(typeof data['filename'] === 'string' || data['filename'] instanceof String)) {
        throw new Error("Expected the field `filename` to be a primitive type in the JSON string but got " + data['filename']);
      }
      // ensure the json data is a string
      if (data['md5'] && !(typeof data['md5'] === 'string' || data['md5'] instanceof String)) {
        throw new Error("Expected the field `md5` to be a primitive type in the JSON string but got " + data['md5']);
      }
      // ensure the json data is a string
      if (data['lastModified'] && !(typeof data['lastModified'] === 'string' || data['lastModified'] instanceof String)) {
        throw new Error("Expected the field `lastModified` to be a primitive type in the JSON string but got " + data['lastModified']);
      }
      return true;
    }
  }]);
}();
ReportMetadata.RequiredProperties = ["filename", "md5", "size", "lastModified"];

/**
 * @member {String} filename
 */
ReportMetadata.prototype['filename'] = undefined;

/**
 * @member {String} md5
 */
ReportMetadata.prototype['md5'] = undefined;

/**
 * @member {Number} size
 */
ReportMetadata.prototype['size'] = undefined;

/**
 * @member {String} lastModified
 */
ReportMetadata.prototype['lastModified'] = undefined;
var _default = exports["default"] = ReportMetadata;