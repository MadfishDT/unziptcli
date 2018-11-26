import * as fs from 'fs';
import * as path from 'path';
import { Zlib } from 'unzipt'

interface UncompressFileInfo {
    entryFile: string;
    fullPath: string;
};
interface PrepareInstallInfo {
    entryList : UncompressFileInfo[];
    unzipObject: Zlib.Unzip;
    progressCallback: (rate: number) => void;
};

enum UnzipError {
    success = 0,
    fileWriteFail,
    decompressFail,
    clearanceFail,
    known
}

export interface InstallResult {
    code: number,
    message: string,
};

export default class UnZipModule {

    private zipfilePath: string ='';
    private installDir: string ='';
    private isCanceled: boolean = false;
    private currentRate: number =0;
    private totalLenth: number = 0;

    constructor(zipFilePath: string , installDir: string) {
      this.zipfilePath = zipFilePath;
      this.installDir = installDir;
      this.totalLenth = 0;
    }

    public cancel() {
        this.isCanceled = true;
    }

    public removeDownloadFile() {
        if(fs.existsSync(this.zipfilePath)) {
            fs.unlinkSync(this.zipfilePath);
        }
    }

    private callProgress(index: number, progressHandler: (rate: number) => void) {
        let calRate = Math.floor((index+1)/this.totalLenth*100);
        if(progressHandler && this.currentRate != calRate) {
            this.currentRate = calRate;
            progressHandler(calRate);
        }

    }

    private getResult(code: number, message: string = ''): InstallResult {
        return {'code': code, 'message': message};
    }

    public timeoutUnzip(info: PrepareInstallInfo,
                        index: number, progressHandler: (rate: number) => void,
                        successHandler: (error: UnzipError) => void) {

        this.callProgress(index,progressHandler);
        setTimeout(() => {
            if(index < info.entryList.length){
                let buffer = info.unzipObject.decompress(info.entryList[index].entryFile);
                if(!buffer) {
                    successHandler(UnzipError.decompressFail);
                } else {
                    let externalFileInfo =
                    info.unzipObject.getFileHeaderAttribute(info.entryList[index].entryFile,
                    'externalFileAttributes');
                    let filemode = (externalFileInfo >>> 16) & 0xffff;

                    fs.writeFile(info.entryList[index].fullPath, buffer, { mode: filemode } ,(err: any) => {
                        if(!err) {
                            let next = ++index;
                            this.timeoutUnzip(info, next, progressHandler, successHandler);
                        } else {
                            successHandler(UnzipError.fileWriteFail);
                        }
                    });
                }
            } else {
                progressHandler(100);
                successHandler(UnzipError.success);
            }
        },0);
    }

    public prepareUnZipFiles(progressHandler: (rate: number) => void): Promise<PrepareInstallInfo> {

        return new Promise((resolve, reject) => {
            let listOfEntryFiles: UncompressFileInfo[] = [];
            let installBinaryDir = path.resolve(this.installDir);

            if(!fs.existsSync(this.zipfilePath)) {
                reject(this.getResult(1103,`not exist install file ${this.zipfilePath}`));
                return;
            }

            let compressedBuffer = fs.readFileSync(this.zipfilePath);
            let unzip = new Zlib.Unzip(compressedBuffer, null);
            let zipFiles = unzip.getFilenames();
            this.totalLenth = zipFiles.length;

            if(!fs.existsSync(installBinaryDir)) {
                try{
                    this.mkDirByPathSync(installBinaryDir);
                } catch(e) {
                    reject(this.getResult(1101, 'make install directory error'));
                    return;
                }
            }

            for(let index =0;   index < zipFiles.length ; index++) {
                let value = zipFiles[index];
                if(this.isCanceled){
                    reject(this.getResult(1100, 'cancel operation'));
                    return;
                }
                let fullFilePath = path.resolve(installBinaryDir, value);
                let lastDiv = value.slice(-1);
                let valueDirName ='';
                let isDirectory = false;

                if(!lastDiv.includes(`/`) && !lastDiv.includes(`//`) && !lastDiv.includes('\\')) {
                    isDirectory = false;
                } else {
                    valueDirName = fullFilePath;
                    isDirectory = true;
                }

                if(isDirectory) {

                    if(!fs.existsSync(valueDirName)){
                        try {
                            this.mkDirByPathSync(valueDirName);
                        } catch(e){
                            reject(this.getResult(1101,`make directory error ${valueDirName}`));
                            return;
                        }
                    }
                    let calRate = Math.floor((this.currentRate+1)/this.totalLenth*100);
                    if(progressHandler && this.currentRate != calRate) {
                        this.currentRate = calRate;
                        progressHandler(calRate);
                    }
                    this.currentRate++;
                }

                if(!isDirectory) {
                    listOfEntryFiles.push({'entryFile' : value, 'fullPath': fullFilePath});
                }

            };
            resolve({'entryList' : listOfEntryFiles, 'unzipObject': unzip, 'progressCallback':progressHandler });
        });
    }

    public startAsync(progressHandler: (rate: number) => void) : Promise<any>{
        return new Promise((resolve, reject) => {
            this.prepareUnZipFiles(progressHandler)
            .then( (prepareInfo: PrepareInstallInfo) => {
                this.timeoutUnzip(prepareInfo, 0, prepareInfo.progressCallback, (error: UnzipError) => {
                    if(error == UnzipError.success) {
                        resolve(this.getResult(0,'success'));
                    } else{
                        reject(this.getResult(1102, `unzip process file error ${error}`));
                    }
                });
            }, reject);
        });
    }

    private mkDirByPathSync(targetDir : string, isRelativeToScript: boolean = false ) {
        const sep = path.sep;
        const initDir = path.isAbsolute(targetDir) ? sep : '';
        const baseDir = isRelativeToScript ? __dirname : '.';

        return targetDir.split(sep).reduce((parentDir, childDir) => {
          const curDir = path.resolve(baseDir, parentDir, childDir);
          try {
                fs.mkdirSync(curDir);
            }catch (err) {
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
