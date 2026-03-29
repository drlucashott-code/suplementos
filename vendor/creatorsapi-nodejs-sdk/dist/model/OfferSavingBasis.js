"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ApiClient = _interopRequireDefault(require("../ApiClient"));
var _Money = _interopRequireDefault(require("./Money"));
var _SavingBasisType = _interopRequireDefault(require("./SavingBasisType"));
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
 * The OfferSavingBasis model module.
 * @module model/OfferSavingBasis
 * @version 1.0.0
 */
var OfferSavingBasis = /*#__PURE__*/function () {
  /**
   * Constructs a new <code>OfferSavingBasis</code>.
   * Specifies Saving Basis of an offer
   * @alias module:model/OfferSavingBasis
   */
  function OfferSavingBasis() {
    _classCallCheck(this, OfferSavingBasis);
    OfferSavingBasis.initialize(this);
  }

  /**
   * Initializes the fields of this object.
   * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
   * Only for internal use.
   */
  return _createClass(OfferSavingBasis, null, [{
    key: "initialize",
    value: function initialize(obj) {}

    /**
     * Constructs a <code>OfferSavingBasis</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/OfferSavingBasis} obj Optional instance to populate.
     * @return {module:model/OfferSavingBasis} The populated <code>OfferSavingBasis</code> instance.
     */
  }, {
    key: "constructFromObject",
    value: function constructFromObject(data, obj) {
      if (data) {
        obj = obj || new OfferSavingBasis();
        if (data.hasOwnProperty('money')) {
          obj['money'] = _Money["default"].constructFromObject(data['money']);
        }
        if (data.hasOwnProperty('savingBasisType')) {
          obj['savingBasisType'] = _SavingBasisType["default"].constructFromObject(data['savingBasisType']);
        }
        if (data.hasOwnProperty('savingBasisTypeLabel')) {
          obj['savingBasisTypeLabel'] = _ApiClient["default"].convertToType(data['savingBasisTypeLabel'], 'String');
        }
      }
      return obj;
    }

    /**
     * Validates the JSON data with respect to <code>OfferSavingBasis</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>OfferSavingBasis</code>.
     */
  }, {
    key: "validateJSON",
    value: function validateJSON(data) {
      // validate the optional field `money`
      if (data['money']) {
        // data not null
        _Money["default"].validateJSON(data['money']);
      }
      // ensure the json data is a string
      if (data['savingBasisTypeLabel'] && !(typeof data['savingBasisTypeLabel'] === 'string' || data['savingBasisTypeLabel'] instanceof String)) {
        throw new Error("Expected the field `savingBasisTypeLabel` to be a primitive type in the JSON string but got " + data['savingBasisTypeLabel']);
      }
      return true;
    }
  }]);
}();
/**
 * @member {module:model/Money} money
 */
OfferSavingBasis.prototype['money'] = undefined;

/**
 * @member {module:model/SavingBasisType} savingBasisType
 */
OfferSavingBasis.prototype['savingBasisType'] = undefined;

/**
 * @member {String} savingBasisTypeLabel
 */
OfferSavingBasis.prototype['savingBasisTypeLabel'] = undefined;
var _default = exports["default"] = OfferSavingBasis;