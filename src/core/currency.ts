/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as CurrencyCodes from 'currency-codes'
import { LOCALE } from './locale'
import { Project } from './Project'
import { orderByField } from '../util/util'

type Info = {
    code: string        // ISO 4217 code
    scale: number       // number of subunits in main unit
    separator: string   // decimal separator, if exists, usually `.` or `,`
    grouper: string     // grouping separator, usually ` `, `,` or `,`
    formatter: Intl.NumberFormat
}

const cache: Record<string, Info> = {}

export function getCurrencyInfo(currency: string): Info {
    if (!cache[currency]) {
        const data = CurrencyCodes.code(currency)

        if (data) {
            const formatter = new Intl.NumberFormat(LOCALE, {
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

            cache[currency] = {
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

    return cache[currency]
}

// Formats a monetary amount of the specified currency
// amount is in subunits
export function toFormatted(amount: number, currency: string): string {
    const info = getCurrencyInfo(currency)
    if (!info) {
        throw new Error(`toFormatted: Unknown currency code: ${currency}`)
    }

    // Ugh, info.formatter.format() can return strings like '-USD 1,234.00'.
    // Only format positive amounts and then negate (if applicable) afterwards
    const negative = amount < 0
    const abs = negative ? -amount : amount

    // This is yucky. Render the number into something like '1,234 USD'
    // and then: delete the currency code (ie. uppercase letters), trim whitespace.
    const formatted = info.formatter.format(abs / info.scale)
        .replace(new RegExp(`[A-Z]`, 'g'), '').trim()

    return negative ? `-${formatted}` : formatted

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
export function toFormattedAbs(amount: number, currency: string): string {
    return amount >= 0 ? toFormatted(amount, currency) : `(${toFormatted(-amount, currency)})`
}

// Parses a formatted string into a number which is the amount in currency subunits
// Spaces are allowed (as alternative group separators)
export function parseFormatted(formatted: string | undefined, currency: string): number {
    if (!formatted) {
        return 0
    }

    const info = getCurrencyInfo(currency)
    if (!info) {
        throw new Error(`parseFormatted: Unknown currency code: ${currency}`)
    }

    // Validate the string only contains negative sign (optional), digits, space, grouper, separator (max 1)
    const pattern = info.separator ?
        `^-?[0-9 \\${info.grouper}]*\\${info.separator}?[0-9 ]*$` :
        `^-?[0-9 \\${info.grouper}]*$`
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

export type CurrencyConvertable = {
    amount?: number
    grossAmount?: number
    parentAmount?: number
    currency: string
}

// Converts an item to another currency in-place (ie. modifies the caller's value)
// Converts to integers only (ie. has rounding)
export function convertCurrency(item: CurrencyConvertable, dest: string) {
    const primary: string = Project.variables.get('currency')
    const rates: Record<string, Record<string, string>> = Project.variables.get('exchangeRates')
    const src = item.currency

    if (src != dest) {
        // Only use rates to/from the primary currency
        if (!rates[primary]) {
            throw new Error(`No exchange rates for primary currency ${primary}`)
        }

        let multRate = 1.0
        let divRate = 1.0

        if (dest != primary) {
            if (!rates[primary][dest]) {
                throw new Error(`No exchange rate for converting ${primary} to ${dest}`)
            }
            multRate = parseFloat(rates[primary][dest])
        }

        if (src != primary) {
            if (!rates[primary][src]) {
                throw new Error(`No exchange rate for converting ${src} to ${primary}`)
            }
            divRate = parseFloat(rates[primary][src])
        }

        ;['amount', 'grossAmount', 'parentAmount'].forEach((field: string) => {
            const record: Record<string, number> = item as any     // typecast
            if (typeof record[field] === 'number') {
                record[field] = Math.round(record[field] * multRate / divRate)
            }
        })

        item.currency = dest
    }

    return item
}

export function exchangeRates() {
    const currency: string = Project.variables.get('currency')
    const rates: Record<string, Record<string, string>> = Project.variables.get('exchangeRates')
    // Only return rates for the main currency
    return {
        [currency]: rates[currency]
    }
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
