import { Zlib } from 'unzipt';
interface UncompressFileInfo {
    entryFile: string;
    fullPath: string;
}
interface PrepareInstallInfo {
    entryList: UncompressFileInfo[];
    unzipObject: Zlib.Unzip;
    progressCallback: (rate: number) => void;
}
declare enum UnzipError {
    success = 0,
    fileWriteFail = 1,
    decompressFail = 2,
    clearanceFail = 3,
    known = 4
}
export interface InstallResult {
    code: number;
    message: string;
}
export default class UnZipModule {
    private zipfilePath;
    private installDir;
    private isCanceled;
    private currentRate;
    private totalLenth;
    constructor(zipFilePath: string, installDir: string);
    cancel(): void;
    removeDownloadFile(): void;
    private callProgress;
    private getResult;
    timeoutUnzip(info: PrepareInstallInfo, index: number, progressHandler: (rate: number) => void, successHandler: (error: UnzipError) => void): void;
    prepareUnZipFiles(progressHandler: (rate: number) => void): Promise<PrepareInstallInfo>;
    startAsync(progressHandler: (rate: number) => void): Promise<any>;
    private mkDirByPathSync;
}
export {};
