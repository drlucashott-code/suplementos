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
 * The ResourceNotFoundExceptionResponseContent model module.
 * @module model/ResourceNotFoundExceptionResponseContent
 * @version 1.0.0
 */
var ResourceNotFoundExceptionResponseContent = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>ResourceNotFoundExceptionResponseContent</code>.
   * Request references a resource which does not exist.
   * @alias module:model/ResourceNotFoundExceptionResponseContent
   * @param message {String} 
   * @param resourceId {String} 
   * @param resourceType {String} 
   */
  function ResourceNotFoundExceptionResponseContent(message, resourceId, resourceType) {
    _classCallCheck(this, ResourceNotFoundExceptionResponseContent);
    ResourceNotFoundExceptionResponseContent.initialize(this, message, resourceId, resourceType);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(ResourceNotFoundExceptionResponseContent, null, [{
    key: "initialize",
    value: function initialize(obj, message, resourceId, resourceType) {
      obj['message'] = message;
      obj['resourceId'] = resourceId;
      obj['resourceType'] = resourceType;
    }

    /**
     * Constructs a <code>ResourceNotFoundExceptionResponseContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ResourceNotFoundExceptionResponseContent} obj Optional instance to populate.
     * @return {module:model/ResourceNotFoundExceptionResponseContent} The populated <code>ResourceNotFoundExceptionResponseContent</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new ResourceNotFoundExceptionResponseContent();
        if (data.hasOwnProperty('type')) {
          obj['type'] = _ApiClient["default"].convertToType(data['type'], 'String');
        }
        if (data.hasOwnProperty('message')) {
          obj['message'] = _ApiClient["default"].convertToType(data['message'], 'String');
        }
        if (data.hasOwnProperty('resourceId')) {
          obj['resourceId'] = _ApiClient["default"].convertToType(data['resourceId'], 'String');
        }
        if (data.hasOwnProperty('resourceType')) {
          obj['resourceType'] = _ApiClient["default"].convertToType(data['resourceType'], 'String');
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ResourceNotFoundExceptionResponseContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ResourceNotFoundExceptionResponseContent</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // check to make sure all required properties are present in the JSON string
      var _iterator = _createForOfIteratorHelper(ResourceNotFoundExceptionResponseContent.RequiredProperties),
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
      if (data['type'] && !(typeof data['type'] === 'string' || data['type'] instanceof String)) {
        throw new Error("Expected the field `type` to be a primitive type in the JSON string but got " + data['type']);
      }
      // ensure the json data is a string
      if (data['message'] && !(typeof data['message'] === 'string' || data['message'] instanceof String)) {
        throw new Error("Expected the field `message` to be a primitive type in the JSON string but got " + data['message']);
      }
      // ensure the json data is a string
      if (data['resourceId'] && !(typeof data['resourceId'] === 'string' || data['resourceId'] instanceof String)) {
        throw new Error("Expected the field `resourceId` to be a primitive type in the JSON string but got " + data['resourceId']);
      }
      // ensure the json data is a string
      if (data['resourceType'] && !(typeof data['resourceType'] === 'string' || data['resourceType'] instanceof String)) {
        throw new Error("Expected the field `resourceType` to be a primitive type in the JSON string but got " + data['resourceType']);
      }
      return true;
    }
  }]);
}();
ResourceNotFoundExceptionResponseContent.RequiredProperties = ["message", "resourceId", "resourceType"];

/**
 * The exception type identifier for clients to programmatically identify the exception
 * @member {String} type
 */
ResourceNotFoundExceptionResponseContent.prototype['type'] = undefined;

/**
 * @member {String} message
 */
ResourceNotFoundExceptionResponseContent.prototype['message'] = undefined;

/**
 * @member {String} resourceId
 */
ResourceNotFoundExceptionResponseContent.prototype['resourceId'] = undefined;

/**
 * @member {String} resourceType
 */
ResourceNotFoundExceptionResponseContent.prototype['resourceType'] = undefined;
var _default = exports["default"] = ResourceNotFoundExceptionResponseContent;