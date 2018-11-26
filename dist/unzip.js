"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const unzipt_1 = require("unzipt");
;
;
var UnzipError;
(function (UnzipError) {
    UnzipError[UnzipError["success"] = 0] = "success";
    UnzipError[UnzipError["fileWriteFail"] = 1] = "fileWriteFail";
    UnzipError[UnzipError["decompressFail"] = 2] = "decompressFail";
    UnzipError[UnzipError["clearanceFail"] = 3] = "clearanceFail";
    UnzipError[UnzipError["known"] = 4] = "known";
})(UnzipError || (UnzipError = {}));
;
class UnZipModule {
    constructor(zipFilePath, installDir) {
        this.zipfilePath = '';
        this.installDir = '';
        this.isCanceled = false;
        this.currentRate = 0;
        this.totalLenth = 0;
        this.zipfilePath = zipFilePath;
        this.installDir = installDir;
        this.totalLenth = 0;
    }
    cancel() {
        this.isCanceled = true;
    }
    removeDownloadFile() {
        if (fs.existsSync(this.zipfilePath)) {
            fs.unlinkSync(this.zipfilePath);
        }
    }
    callProgress(index, progressHandler) {
        let calRate = Math.floor((index + 1) / this.totalLenth * 100);
        if (progressHandler && this.currentRate != calRate) {
            this.currentRate = calRate;
            progressHandler(calRate);
        }
    }
    getResult(code, message = '') {
        return { 'code': code, 'message': message };
    }
    timeoutUnzip(info, index, progressHandler, successHandler) {
        this.callProgress(index, progressHandler);
        setTimeout(() => {
            if (index < info.entryList.length) {
                let buffer = info.unzipObject.decompress(info.entryList[index].entryFile);
                if (!buffer) {
                    successHandler(UnzipError.decompressFail);
                }
                else {
                    let externalFileInfo = info.unzipObject.getFileHeaderAttribute(info.entryList[index].entryFile, 'externalFileAttributes');
                    let filemode = (externalFileInfo >>> 16) & 0xffff;
                    fs.writeFile(info.entryList[index].fullPath, buffer, { mode: filemode }, (err) => {
                        if (!err) {
                            let next = ++index;
                            this.timeoutUnzip(info, next, progressHandler, successHandler);
                        }
                        else {
                            successHandler(UnzipError.fileWriteFail);
                        }
                    });
                }
            }
            else {
                progressHandler(100);
                successHandler(UnzipError.success);
            }
        }, 0);
    }
    prepareUnZipFiles(progressHandler) {
        return new Promise((resolve, reject) => {
            let listOfEntryFiles = [];
            let installBinaryDir = path.resolve(this.installDir);
            if (!fs.existsSync(this.zipfilePath)) {
                reject(this.getResult(1103, `not exist install file ${this.zipfilePath}`));
                return;
            }
            let compressedBuffer = fs.readFileSync(this.zipfilePath);
            let unzip = new unzipt_1.Zlib.Unzip(compressedBuffer, null);
            let zipFiles = unzip.getFilenames();
            this.totalLenth = zipFiles.length;
            if (!fs.existsSync(installBinaryDir)) {
                try {
                    this.mkDirByPathSync(installBinaryDir);
                }
                catch (e) {
                    reject(this.getResult(1101, 'make install directory error'));
                    return;
                }
            }
            for (let index = 0; index < zipFiles.length; index++) {
                let value = zipFiles[index];
                if (this.isCanceled) {
                    reject(this.getResult(1100, 'cancel operation'));
                    return;
                }
                let fullFilePath = path.resolve(installBinaryDir, value);
                let lastDiv = value.slice(-1);
                let valueDirName = '';
                let isDirectory = false;
                if (!lastDiv.includes(`/`) && !lastDiv.includes(`//`) && !lastDiv.includes('\\')) {
                    isDirectory = false;
                }
                else {
                    valueDirName = fullFilePath;
                    isDirectory = true;
                }
                if (isDirectory) {
                    if (!fs.existsSync(valueDirName)) {
                        try {
                            this.mkDirByPathSync(valueDirName);
                        }
                        catch (e) {
                            reject(this.getResult(1101, `make directory error ${valueDirName}`));
                            return;
                        }
                    }
                    let calRate = Math.floor((this.currentRate + 1) / this.totalLenth * 100);
                    if (progressHandler && this.currentRate != calRate) {
                        this.currentRate = calRate;
                        progressHandler(calRate);
                    }
                    this.currentRate++;
                }
                if (!isDirectory) {
                    listOfEntryFiles.push({ 'entryFile': value, 'fullPath': fullFilePath });
                }
            }
            ;
            resolve({ 'entryList': listOfEntryFiles, 'unzipObject': unzip, 'progressCallback': progressHandler });
        });
    }
    startAsync(progressHandler) {
        return new Promise((resolve, reject) => {
            this.prepareUnZipFiles(progressHandler)
                .then((prepareInfo) => {
                this.timeoutUnzip(prepareInfo, 0, prepareInfo.progressCallback, (error) => {
                    if (error == UnzipError.success) {
                        resolve(this.getResult(0, 'success'));
                    }
                    else {
                        reject(this.getResult(1102, `unzip process file error ${error}`));
                    }
                });
            }, reject);
        });
    }
    mkDirByPathSync(targetDir, isRelativeToScript = false) {
        const sep = path.sep;
        const initDir = path.isAbsolute(targetDir) ? sep : '';
        const baseDir = isRelativeToScript ? __dirname : '.';
        return targetDir.split(sep).reduce((parentDir, childDir) => {
            const curDir = path.resolve(baseDir, parentDir, childDir);
            try {
                fs.mkdirSync(curDir);
            }
            catch (err) {
                if (err.code === 'EEXIST') { // curDir already exists!
                    return curDir;
                }
                // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
                if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
                    throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
                }
                const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
                if (!caughtErr || caughtErr && curDir === path.resolve(targetDir)) {
                    throw err; // Throw if it's just the last created dir.
                }
            }
            return curDir;
        }, initDir);
    }
}
exports.UnZipModule = UnZipModule;
