/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as CurrencyCodes from 'currency-codes'
import { orderByField } from '../util/util'

type Info = {
    code: string        // ISO 4217 code
    scale: number       // number of subunits in main unit
    separator: string   // decimal separator, if exists, usually `.` or `,`
    grouper: string     // grouping separator, usually ` `, `,` or `,`
    formatter: Intl.NumberFormat
}

const locale = 'en'
const cache: Record<string, Record<string, Info>> = {}

export function getCurrencyInfo(currency: string, loc = locale): Info {
    cache[loc] = cache[loc] || []

    if (!cache[loc][currency]) {
        const data = CurrencyCodes.code(currency)

        if (data) {
            const formatter = new Intl.NumberFormat(loc, {
                style: 'currency',
                currency: currency,
                currencyDisplay: 'code',
            })

            // Some yuckiness here. We format the values with currency code but
            // then strip out the code and trim whitespace and do other processing.
            const separator = data.digits > 0 ? formatter.format(1.1)
                .replace(/[A-Z]/g, '').trim().replace(/\d/g, '') : ''
            const grouper = formatter.format(Number.MAX_SAFE_INTEGER)
                .replace(/[A-Z]/g, '').trim().replace(/[0-9]/g, '')[0]

            cache[loc][currency] = {
                code: currency,
                scale: 10**(data.digits),
                separator,
                grouper,
                formatter,
            }
        }
        else {
            throw new Error(`Unknown currency: ${currency}`)
        }
    }

    return cache[loc][currency]
}

// Formats a monetary amount of the specified currency
// Space is used as the group separator
// amount is in subunits
export function toFormatted(amount: number, currency: string, loc = locale): string {
    const info = getCurrencyInfo(currency, loc)
    if (!info) {
        throw new Error(`toFormatted: Unknown currency code: ${currency}`)
    }

    // This is yucky. Render the number into something like '1,234 USD'
    // and then: delete the currency code (ie. uppercase letters),
    // replace the group separator with space, and then trim whitespace.
    return info.formatter.format(amount / info.scale)
        .replace(new RegExp(`[A-Z]`, 'g'), '')
        .replace(new RegExp(`${info.grouper}`, 'g'), ' ').trim()

    // Convert `group` parts to space. Omit `currency` parts
    // This can't be used because `.formatToParts` seems to be missing from
    // typescript declarations and WebKitGTK
    /*
    return (nf as any).formatToParts(amount / info.scale)
        .reduce((acc: string, part: {type: string, value: string}) => {
            switch (part.type) {
                case 'currency': return acc
                case 'group': return acc + ' '
                default: return acc + part.value
            }
    }, '')
    */
}

// Like toFormatted(), but display negative values with a bracket instead of negative sign
export function toFormattedAbs(amount: number, currency: string, loc = locale): string {
    return amount >= 0 ? toFormatted(amount, currency, loc) : `(${toFormatted(-amount, currency, loc)})`
}

// Parses a formatted string into a number which is the amount in currency subunits
// Spaces are allowed (as alternative group separators)
export function parseFormatted(formatted: string | undefined, currency: string, loc = locale): number {
    if (!formatted) {
        return 0
    }

    const info = getCurrencyInfo(currency, loc)
    if (!info) {
        throw new Error(`parseFormatted: Unknown currency code: ${currency}`)
    }

    // Validate the string only contains digits, space, grouper, separator (max 1)
    const pattern = info.separator ?
        `^[0-9 \\${info.grouper}]*\\${info.separator}?[0-9 ]*$` :
        `^[0-9 \\${info.grouper}]*$`
    if (new RegExp(pattern).test(formatted) == false) {
        throw new Error(`Invalid amount: ${formatted}`)
    }

    // Strip out spaces and grouper
    const s1 = formatted.replace(new RegExp(`[ ${info.grouper}]`, 'g'), '')

    // Ensure decimal separator, if exists, is decimal point
    const s2 = (info.separator && info.separator != '.') ?
        s1.replace(info.separator, '.') : s1

    return s2 ? Math.round(parseFloat(s2) * info.scale) : 0
}

export type Money = {
    amount: number
    currency: string
}

// Performs addition/subtraction of (vector) money values
export function addSubtractMoney(add: Money[], subtract: Money[] = []): Money[] {
    const hash: Record<string, number> = {}

    add.forEach(money => {
        if (!hash[money.currency]) {
            hash[money.currency] = 0
        }

        hash[money.currency] += money.amount
    })

    subtract.forEach(money => {
        if (!hash[money.currency]) {
            hash[money.currency] = 0
        }

        hash[money.currency] -= money.amount
    })

    return Object.keys(hash).map(currency => ({amount: hash[currency], currency}))
        .sort(orderByField('currency'))
}
