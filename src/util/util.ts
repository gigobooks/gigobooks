// Given a positive integer, returns the smallest integer that is strictly larger
// than n and also starts with the digit `prefix`.
// `prefix` must be between 1 and 9 inclusive
export function prefixPreservingIncrement(n: number, prefix: number): number {
    if (n < 1 || prefix < 1 || prefix > 9) {
        return -1
    }
    prefix = Math.floor(prefix)

    // Returns the first digit of a positive integer
    function getPrefix(n: number) {
        while (n >= 10) {
            n = Math.floor(n/10)
        }
        return n
    }

    n++
    if (getPrefix(n) == prefix) {
        return n
    }
    else {
        var candidate = prefix
        while (candidate <= n) {
            candidate *= 10
        }
        return candidate
    }
}

// To test, uncomment this function and call it
/*
function prefixPreservingIncrement_test() {
    // Returns the first digit of a positive integer
    function getPrefix(n: number) {
        while (n >= 10) {
            n = Math.floor(n/10)
        }
        return n
    }

    for (let prefix = 1; prefix <= 5; prefix++) {
        const tests: number[] = [1, 2, 3, 4, 5, 9, 10, 11, 19, 20, 21, 29, 30, 31, 39, 40, 49, 50, 51, 198, 199, 200, 3998, 3999, 4000]
        let n: number
        for (n of tests) {
            const result: number = prefixPreservingIncrement(n, prefix)
            const pass = n < result && getPrefix(result) == prefix
            console.log(`prefixPreservingIncrement(n=${n}, prefix=${prefix}): ${result} -`, pass ? 'pass' : 'fail')
        }
    }
}
*/
