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
