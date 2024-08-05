"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
(0, vitest_1.describe)('passing test', function () {
    (0, vitest_1.test)('it passes', function () {
        (0, vitest_1.expect)(true).toEqual(true);
    });
});
