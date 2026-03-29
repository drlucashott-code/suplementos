"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
var _BrowseNodeAncestor = _interopRequireDefault(require("./BrowseNodeAncestor"));
var _BrowseNodeChild = _interopRequireDefault(require("./BrowseNodeChild"));
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
 * The BrowseNode model module.
 * @module model/BrowseNode
 * @version 1.0.0
 */
var BrowseNode = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>BrowseNode</code>.
   * Container for BrowseNode information which includes BrowseNodeId, DisplayName, ContextFreeName, IsRoot, Ancestor, Children, SalesRank associated, etc.
   * @alias module:model/BrowseNode
   */
  function BrowseNode() {
    _classCallCheck(this, BrowseNode);
    BrowseNode.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(BrowseNode, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>BrowseNode</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/BrowseNode} obj Optional instance to populate.
     * @return {module:model/BrowseNode} The populated <code>BrowseNode</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new BrowseNode();
        if (data.hasOwnProperty('ancestor')) {
          obj['ancestor'] = _BrowseNodeAncestor["default"].constructFromObject(data['ancestor']);
        }
        if (data.hasOwnProperty('children')) {
          obj['children'] = _ApiClient["default"].convertToType(data['children'], [_BrowseNodeChild["default"]]);
        }
        if (data.hasOwnProperty('contextFreeName')) {
          obj['contextFreeName'] = _ApiClient["default"].convertToType(data['contextFreeName'], 'String');
        }
        if (data.hasOwnProperty('displayName')) {
          obj['displayName'] = _ApiClient["default"].convertToType(data['displayName'], 'String');
        }
        if (data.hasOwnProperty('id')) {
          obj['id'] = _ApiClient["default"].convertToType(data['id'], 'String');
        }
        if (data.hasOwnProperty('isRoot')) {
          obj['isRoot'] = _ApiClient["default"].convertToType(data['isRoot'], 'Boolean');
        }
        if (data.hasOwnProperty('salesRank')) {
          obj['salesRank'] = _ApiClient["default"].convertToType(data['salesRank'], 'Number');
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>BrowseNode</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>BrowseNode</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // validate the optional field `ancestor`
      if (data['ancestor']) {
        // data not null
        _BrowseNodeAncestor["default"].validateJSON(data['ancestor']);
      }
      if (data['children']) {
        // data not null
        // ensure the json data is an array
        if (!Array.isArray(data['children'])) {
          throw new Error("Expected the field `children` to be an array in the JSON data but got " + data['children']);
        }
        // validate the optional field `children` (array)
        var _iterator = _createForOfIteratorHelper(data['children']),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var item = _step.value;
            _BrowseNodeChild["default"].validateJSON(item);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
        ;
      }
      // ensure the json data is a string
      if (data['contextFreeName'] && !(typeof data['contextFreeName'] === 'string' || data['contextFreeName'] instanceof String)) {
        throw new Error("Expected the field `contextFreeName` to be a primitive type in the JSON string but got " + data['contextFreeName']);
      }
      // ensure the json data is a string
      if (data['displayName'] && !(typeof data['displayName'] === 'string' || data['displayName'] instanceof String)) {
        throw new Error("Expected the field `displayName` to be a primitive type in the JSON string but got " + data['displayName']);
      }
      // ensure the json data is a string
      if (data['id'] && !(typeof data['id'] === 'string' || data['id'] instanceof String)) {
        throw new Error("Expected the field `id` to be a primitive type in the JSON string but got " + data['id']);
      }
      return true;
    }
  }]);
}();
/**
 * @member {module:model/BrowseNodeAncestor} ancestor
 */
BrowseNode.prototype['ancestor'] = undefined;

/**
 * List of BrowseNode Children for a particular BrowseNode.
 * @member {Array.<module:model/BrowseNodeChild>} children
 */
BrowseNode.prototype['children'] = undefined;

/**
 * Indicates a displayable name for a BrowseNode that is fully context free. For e.g. DisplayName of BrowseNodeId: 3060 in US marketplace is 'Orphans & Foster Homes'. One can not infer which root category this browse node belongs to unless we have the ancestry ladder for this browse node i.e. it requires a 'context' for being intuitive. However, the ContextFreeName of this browse node is 'Children's Orphans & Foster Homes Books'. Note that, for a BrowseNode whose DisplayName is already context free will have the same ContextFreeName as DisplayName.
 * @member {String} contextFreeName
 */
BrowseNode.prototype['contextFreeName'] = undefined;

/**
 * The display name of the BrowseNode as visible on the Amazon retail website.
 * @member {String} displayName
 */
BrowseNode.prototype['displayName'] = undefined;

/**
 * Indicates the unique identifier of the BrowseNode
 * @member {String} id
 */
BrowseNode.prototype['id'] = undefined;

/**
 * Indicates if the current BrowseNode is a root category.
 * @member {Boolean} isRoot
 */
BrowseNode.prototype['isRoot'] = undefined;

/**
 * @member {Number} salesRank
 */
BrowseNode.prototype['salesRank'] = undefined;
var _default = exports["default"] = BrowseNode;