"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var index_1 = require("./index");
(0, vitest_1.describe)('addFive', function () {
    (0, vitest_1.test)('it adds 5', function () {
        (0, vitest_1.expect)((0, index_1.default)(3)).toEqual(8);
    });
});
