/**
 * Copyright (c) 2020-present Beng Tan
 */

// pdfjs-dist uses globalThis which might be undefined
if (typeof window !== "undefined" && !("globalThis" in window)) {
    window.globalThis = window
}

Object.defineProperty(String.prototype, 'isEnum', {
    value(_enum) {
        for (let k in _enum) {
            if (_enum[k] == this) {
                return true
            }
        }
        return false
    }
})

// https://gist.github.com/hanayashiki/8dac237671343e7f0b15de617b0051bd
if ('File' in  self) {
    File.prototype.arrayBuffer = File.prototype.arrayBuffer || myArrayBuffer;
}
Blob.prototype.arrayBuffer = Blob.prototype.arrayBuffer || myArrayBuffer;

function myArrayBuffer() {
    // this: File or Blob
    return new Promise((resolve) => {
        let fr = new FileReader();
        fr.onload = () => {
            resolve(fr.result);
        };
        fr.readAsArrayBuffer(this);
    })
}
