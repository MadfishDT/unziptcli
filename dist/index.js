#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const unzip_1 = require("./unzip");
const progress_1 = __importDefault(require("progress"));
var args = process.argv;
function main() {
    let current = 0;
    if (args.length < 4) {
        console.log('note enough params');
        return;
    }
    let inputFile = args[2];
    let outDir = args[3];
    var bar = new progress_1.default('unzip [:bar] :percent :etas', { total: 100, width: 20 });
    let unzip = new unzip_1.UnZipModule(inputFile, outDir);
    unzip.startAsync((rate) => {
        let tick = rate - current;
        current = rate;
        bar.tick(tick);
    });
}
main();
