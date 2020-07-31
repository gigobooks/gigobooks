/**
 * Copyright (c) 2020-present Beng Tan
 */

const allsettled = require('promise.allsettled')
allsettled.shim()

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
