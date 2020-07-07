/**
 * Copyright (c) 2020-present Beng Tan
 */

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

if (window.native === undefined) {
    window.native = {
        setTitle: function (title) {
            document.title = title
        },
        exit: function(exitCode) {
            // No-op
        }
    }
}
