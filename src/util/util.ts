import { parseFormatted } from '../core/currency'

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

// Returns true if the supplied string is an ISO-8601-ish 'date-only' string.
// ie. a ten character string like '2020-01-01'
export function isDateOnly(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

// Converts the supplied date into an iSO-8601-ish 'date-only' string according 
// to local time
export function toDateOnly(date: Date): string {
    const m = date.getMonth() + 1
    const d = date.getDate()
    return `${date.getFullYear()}-${m < 10 ? '0' : ''}${m}-${d < 10 ? '0' : ''}${d}`
}

type ValidationOptions = {
    listField: string
    formListField: string
    validateFields: string[]
    currency: string | false
}

const defaultValidationOptions: ValidationOptions = {
    listField: 'elements',
    formListField: 'elements',
    validateFields: ['amount', 'grossAmount'],
    currency: false,
}

// A helper function for validating monetary amounts
// Returns true if validation succeeded, false otherwise
export function validateAmounts(form: any, data: any, options0: Partial<ValidationOptions> = {}) {
    const options = {
        ...defaultValidationOptions,
        ...options0,
    }

    for (let index in data[options.listField]) {
        for (let field of options.validateFields) {
            try {
                const currency = options.currency ? options.currency : data[options.listField][index].currency
                parseFormatted(data[options.listField][index][field], currency)
            }
            catch (e) {
                form.setError(`${[options.formListField]}[${index}].${field}`, '', 'Invalid amount')
                return false
            }
        }
    }
    return true
}

export function validateElementAmounts(form: any, data: any) {
    return validateAmounts(form, data, {
        currency: data.elements[0].currency
    })
}

// Like validateElementAmounts() but validates `.dr` and `.cr`
export function validateElementDrCr(form: any, data: any) {
    return validateAmounts(form, data, {
        validateFields: ['dr', 'cr'],
    })
}

export function validateElementTaxAmounts(form: any, data: any) {
    for (let index in data.elements) {
        if (data.elements[index].taxes) {
            const success = validateAmounts(form, data.elements[index], {
                listField: 'taxes',
                formListField: `elements[${index}].taxes`,
                currency: data.elements[0].currency
            })

            if (!success) {
                return false
            }
        }
    }

    return true
}
