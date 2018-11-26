#!/usr/bin/env node
import UnZipModule from './unzip';
import ProgressBar from 'progress';

var args = process.argv;

function main(){
    let current = 0;
    if(args.length < 4) {
        console.log('note enough params');
        return;
    }
    let inputFile = args[2];
    let outDir = args[3];

    var bar = new ProgressBar('unzip [:bar] :percent :etas', { total: 100, width: 20 });
    let unzip = new UnZipModule(inputFile, outDir);
    unzip.startAsync((rate: number) => {
        let tick = rate - current;
        current = rate;
        bar.tick(tick);
    });
}

main();

