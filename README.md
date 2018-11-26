# unziptcli
* **unzipt node js cli version**

**original zlibjs code**
* zlib min file: https://github.com/imaya/zlib.js.git

**version**
-
- 0.0.1: unzip file

**installation**
-
```
npm inatall unziptcli
```

**support features:**
-
* file unzip support
* typescript support
* keep file permission
* minium dependency
* if you using unzip api only, unzip module have dep about fs and path

**dependency:**
-
cli mode: 
- basic nodejs fs, path
- progress

api mode:
- basic nodejs fs, path


**Unzip APIS**
- JavaScript
    ```javascript
    const UnZipModule = requier('unzipcli').UnZipModule;
    const unzip = new UnZipModule('./a.zip', './outdir');
    unzip.startAsync((rate) => {
        console.log(rate);
    }).
    then(()=>console.log('success'));
    ```
- Typescript
    ```Typescript
    import {UnZipModule} from 'unzipcli';
    const unzip = new UnZipModule('./a.zip', './outdir');
    unzip.startAsync((rate: number) => {
        console.log(rate);
    }).
    then(()=>console.log('success'));
    ```

**Unzip CLI**

```
unzipcli {{zipfilepath}} {{outdir}}
```