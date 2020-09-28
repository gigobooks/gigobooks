/**
 * Copyright (c) 2020-present Beng Tan
 */

import { APP_NAME, Project } from '../core'
import { parseFormatted } from '../core/currency'
import { useDebounce } from 'use-debounce'

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

function basename(path: string): string {
    const parts = path.split('/')
    return parts[parts.length - 1]
}

export function dirname(path: string) {
    const result = path.match(/(.*)\//)
    return result && result.length > 1 ? result[1] : ''
}

// Returns a function that orders objects (lexicographically) according to the
// member variable denoted by 'field'
export function orderByField(field: string) {
    return function (a: any, b: any) { return a[field] < b[field] ? -1 : 1 }
}

export function refreshWindowTitle() {
    let prefix = ''
    const parts: string[] = []

    if (Project.project) {
        if (Project.project.isModified) {
            prefix = '* '
        }

        const title = Project.variables.get('title')
        if (title) {
            parts.push(title)
        }

        parts.push(Project.project.filename ? basename(Project.project.filename) : '<untitled>')
    }

    parts.push(APP_NAME)

    const title = prefix + parts.join(' - ')
    document.title = title
    if (typeof native === 'object') {
        native.setTitle(title)
    }
}

// A convenience wrapper
export function debounce(values: any[], delay: number = 500) {
    return values.map(v => {
        return useDebounce(v, delay)[0]
    })
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
    return data.elements && data.elements.length > 0 ? validateAmounts(form, data, {
        currency: data.elements[0].currency
    }) : true
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

// This one is different from those above.
// It validates member variables instead of a list of elements.
// It returns a list of error messages (ie. an intermediate result) rather than a single boolean.
// It alters `data` (in-place) with the result(s) of the parse
export function validateAmountFieldsHelper(fields: string[], currency: string, data: Record<string, string>): Record<string, string> {
    const errors: Record<string, string> = {}
    fields.forEach(field => {
        try {
            (data as any)[field] = parseFormatted(data[field], currency)
        }
        catch (e) {
            errors[field] = 'Invalid amount'
        }    
    })

    return errors
}
