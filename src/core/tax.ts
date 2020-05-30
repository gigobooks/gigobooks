/**
Breakdown of tax codes

A tax code comprises a tuple (colon delimited) of 3 or 4 parts:

[geography]:<type[;flags]>:[rate]
[geography]:<type[;flags]>:[variant]:[rate]

The `geography` loosely denotes the geographical area in a hierarchical form
(hyphen delimited) ie. `EU-AT`, `AU`, `US-CA`, `CA-BC`, `IN-AP`, `CN-AH`.

Country indicators are either EU VAT codes or ISO 3166-1 ish.
State or subdivision indicators are ISO 3166-2-ish.

The second field itself is also a tuple (semi-colon delimited) of 1 or 2 parts:

<type>[;flags]

where `type` is one of the following: `GST`, `VAT`, `st` (sales tax) and some others.

`flags` is a string of zero or more characters in lexicographical order. Each character is a flag which indicates a feature or modification. Ordering of the flags is important to ensure a consistent canonical representation.

Currently, two flags are defined: `r` and `x`.

The flag `r` indicates a reverse charge (ie. EU reverse charge).
The flag `x` indicates that the tax rate can be modified/supplied/overridden by the user

The `variant` field is for EU VAT and is one of the following: `reduced`, `super-reduced`, `parking`. If `variant` is missing, then it the standard VAT rate is presumed. Generally, `variant` is used to handle multiple tax rates.

The `rate` field is the tax rate percentage in string form, and can include up to three decimal places. This field can be empty.

Examples:

`EU-AT:VAT:20` - Austria VAT standard rate of 20%
`EU-AT:VAT:reduced:10` - Austria VAT reduced rate of 10%
`EU-AT:VAT:reduced:13` - Austria VAT reduced rate of 13%
`EU-AT:VAT:parking:13` - Austria VAT parking rate of 13%
`EU-FR:VAT:super-reduced:2.1` - France VAT super-reduced rate of 2.1%

'EU-EL:VAT:24` - Greece VAT standard rate of 24% (Non-standard country code)
'EU-UK:VAT:20` - UK VAT standard rate of 20% (Non-standard country code)

`EU-FR:VAT;r:20` - France VAT standard rate of 20% (when applying a reverse charge on self)
`EU-FR:VAT;r:super-reduced:2.1` - France VAT super-reduced rate of 2.1% (when applying a reverse charge on self)

`AU:GST:10` - Australia GST rate of 10%
`US-CA:st;x:7.25` - US California state tax of 7.25% (default)

`CA:GST:5` - Canada GST rate of 5%
`CA-BC:PST:7` - Canada British Columbia PST rate of 7%
`CA-MB:RST:7` - Canada British Columbia RST rate of 7%
`CA-ON:HST:13` - Canada Ontario HST of 13%
`CA-QC:QST:9.975` - Canada Quebec QST of 9.975%

There are also some special tax codes:

`EU:VAT;r:0` - EU VAT reverse charge (for B2B customers)
`:zero:0` - GST/VAT zero rated, or just zero tax
`:exempt:0` - tax exempt
`:user;x:` - User defined
`:user;x:10` - User defined rate of 10% (but can be changed by the user)

Notice that `geography` can be undefined.
*/

var iso3166 = require('iso-3166-2')
import { Project } from './Project'

// Since some tax rates have three decimal places, scale up by 1000 before calculating
const TaxRateScale = 1000

export type TaxCodeInfo = {
    code: string
    geography: string
    geoParts: string[]
    type: string
    typeParts: string[]
    variant: string
    rate: string    // Tax rate percentage as a string. Up to three decimal places
    reverse: boolean    // True if this is EU reverse charge. This is flag `r`.
    variable: boolean   // True if variable rate. This is flag `x`.
    label: string
}
type TaxCodeInfoPartial = Omit<TaxCodeInfo, 'label'>

export function taxCodeInfo(code: string): TaxCodeInfo {
    const parts = (code || '').split(':')
    const info: any = {
        code,
        geography: parts.length < 1 ? '' : parts[0],
        type: parts.length < 2 ? '' : parts[1],
        variant: (parts.length < 4) ? '' : parts[2],
        rate: parts[parts.length - 1],
    }
    info.geoParts = info.geography.split('-')
    info.typeParts = info.type.split(';')
    info.reverse = info.typeParts.length > 1 && info.typeParts[1].indexOf('r') >= 0
    info.variable = info.typeParts.length > 1 && info.typeParts[1].indexOf('x') >= 0
    info.label = makeLabel(info)

    return info
}

function makeLabel(info: TaxCodeInfoPartial): string {
    const parts: string[] = []

    let country, subdivision
    if (info.geoParts[0] == 'EU') {
        country = info.geoParts[1]
        if (info.geoParts.length > 2) {
            subdivision = info.geoParts[2]
        }

        if (country == 'EL') {
            // EL is the VAT country code for Greece
            country = 'GR'
        }
        else if (country == 'UK') {
            // UK is the VAT country code for Great Britain
            country = 'GB'
        }
    }
    else {
        country = info.geoParts[0]
        if (info.geoParts.length > 1) {
            subdivision = info.geoParts[1]
        }
    }

    if (country) {
        const countryInfo = iso3166.country(country)
        if (countryInfo) {
            let name = countryInfo.name

            if (subdivision) {
                const subdivisionInfo = iso3166.subdivision(country, subdivision)
                if (subdivisionInfo) {
                    name = subdivisionInfo.name
                }
            }
            parts.push(name)
        }
    }

    switch (info.typeParts[0]) {
        case 'zero': parts.push('Zero rated'); break
        case 'exempt': parts.push('Tax exempt'); break
        case 'user': parts.push('User defined'); break
        case 'st': parts.push('Sales Tax'); break
        default: parts.push(info.typeParts[0])
    }

    if (info.geoParts[0] == 'EU' && info.reverse) {
        parts.push('reverse charged')
    }

    if (info.variant) {
        switch (info.variant) {
            case 'super-reduced': parts.push('(super reduced)'); break
            // case 'reduced':
            // case 'parking':
            default: parts.push(`(${info.variant})`)
        }
    }

    if (info.rate) {
        parts.push(info.rate + '%')
    }

    return parts.join(' ')
}

export function taxCodesEU() {
    const data: Record<string, string[]> = {
        AT: ['20', 'reduced:10', 'reduced:13', 'parking:13'],
        BE: ['21', 'reduced:6', 'reduced:12', 'parking:12'],
        BG: ['20', 'reduced:9'],
        HR: ['25', 'reduced:5', 'reduced:13'],
        CY: ['19', 'reduced:5', 'reduced:9'],
        CZ: ['21', 'reduced:10', 'reduced:15'],
        DK: ['25'],
        EE: ['20', 'reduced:9'],
        DE: ['19', 'reduced:7'],
        EL: ['24', 'reduced:6', 'reduced:13'],
        FI: ['24', 'reduced:10', 'reduced:14'],
        FR: ['20', 'reduced:5.5', 'reduced:10', 'super-reduced:2.1'],
        HU: ['27', 'reduced:5', 'reduced:18'],
        IE: ['23', 'reduced:9', 'reduced:13.5', 'super-reduced:4.8', 'parking:13.5'],
        IT: ['22', 'reduced:5', 'reduced:10', 'super-reduced:4'],
        LV: ['21', 'reduced:12', 'super-reduced:5'],
        LT: ['21', 'reduced:5', 'reduced:9'],
        LU: ['17', 'reduced:8', 'super-reduced:3', 'parking:14'],
        MT: ['18', 'reduced:5', 'reduced:7'],
        NL: ['21', 'reduced:9'],
        PL: ['23', 'reduced:5', 'reduced:8'],
        PT: ['23', 'reduced:6', 'reduced:13', 'parking:13'],
        RO: ['19', 'reduced:5', 'reduced:9'],
        SK: ['20', 'reduced:10'],
        SI: ['22', 'reduced:9.5'],
        ES: ['21', 'reduced:10', 'super-reduced:4'],
        SE: ['25', 'reduced:6', 'reduced:12'],
        UK: ['20', 'reduced:5'],
    }
    const codes: string[] = ['EU:VAT;r:0']

    Object.keys(data).forEach(cc => {
        data[cc].forEach(suffix => {
            codes.push(`EU-${cc}:VAT:${suffix}`)
        })
    })

    return codes
}

export function taxCodesUS() {
    const data: Record<string, string> = {
        AL: '4', AZ: '5.6', AR: '6.5', CA: '7.25', CO: '2.9', CT: '6.35',
        FL: '6', GA: '4', HI: '4.166', ID: '6', IL: '6.25', IN: '7',
        IA: '6', KS: '6.5', KY: '6', LA: '4.45', ME: '5.5', MD: '6',
        MA: '6.25', MI: '6', MN: '6.875', MS: '7', MO: '4.225', NE: '5.5', 
        NV: '6.85', NJ: '6.625', NM: '5.125', NY: '4', NC: '4.75', ND: '5', 
        OH: '5.75', OK: '4.5', PA: '6', RI: '7', SC: '6', SD: '4',
        TN: '7', TX: '6.25', UT: '5.95', VT: '6', VA: '5.3', WA: '6.5',
        WV: '6', WI: '5', WY: '4', DC: '5.75',
        GU: '4', PR: '10.5',
    }
    const codes: string[] = []

    Object.keys(data).forEach(ss => {
        codes.push(`US-${ss}:st;x:${data[ss]}`)
    })

    return codes
}

export function taxCodesCA() {
    return [
        'CA:GST:5',
        // 'CA-AB',
        'CA-BC:PST:7',
        'CA-MB:RST:7',
        'CA-NB:HST:15' ,
        'CA-NL:HST:15' ,
        'CA-NS:HST:15' ,
        'CA-ON:HST:13' ,
        'CA-PE:HST:15' ,
        'CA-QC:QST:9.975',
        'CA-SK:PST:6',
        // 'CA-NT',
        // 'CA-NU',
        // 'CA-YT',
    ]
}

export function taxCodes() {
    const codes = [
        ':zero:0',
        ':exempt:0',
        ':user;x:',
    ]

    Project.variables.get('taxEnable').forEach((prefix: string) => {
        switch (prefix) {
            case 'AU': codes.push('AU:GST:10'); break
            case 'CA': codes.push(...taxCodesCA()); break
            case 'EU': codes.push(...taxCodesEU()); break
            case 'US': codes.push(...taxCodesUS()); break
        }
    })

    Project.variables.get('customTaxCodes').split('\n').forEach((code: string) => {
        const trimmed = code.trim()
        if (trimmed) {
            codes.push(trimmed)
        }
    })

    // Remove duplicates
    return [...new Set(codes)]
}

export function taxRate(code: string) {
    return taxCodeInfo(code).rate
}

export function taxLabel(code: string) {
    return taxCodeInfo(code).label
}

// Given a tax code and a rate (as a string), merges the rate into the code
export function taxCodeWithRate(code: string, rate: string) {
    const parts = (code || '').split(':')

    switch (parts.length) {
        case 1: parts.push('')
        case 2: parts.push('')
    }

    // If `rate` has a colon, ignore it and any subsequent characters
    parts[parts.length - 1] = rate.split(':')[0]
    return parts.join(':')
}

export type TaxInputs = {
    amount: number
    useGross: number
    rates: string[]
}

export type TaxOutputs = {
    amount: number
    taxes: number[]
}

// Given a (gross or net) amount and a list of tax rates, calculate the corresponding
// (net or gross) amount and a list of tax amounts.
// `useGross` indicates whether the input amount is gross or net.
// `rates` is a list of tax rate percentages. Each tax rate is expressed as a string.
// Tax amounts are rounded to an integer
export function calculateTaxes(input: TaxInputs): TaxOutputs {
    const taxes = []
    let amount = input.amount

    if (input.useGross) {
        // gross -> net
        let total000 = 0
        const rates000 = []
        for (let r of input.rates) {
            let rate000 = parseFloat(r) * TaxRateScale
            if (Number.isNaN(rate000) || rate000 < 0) {
                rate000 = 0
            }

            rates000.push(rate000)
            total000 += rate000
        }

        for (let rate000 of rates000) {
            const taxAmount = Math.round((input.amount * rate000) / (100 * TaxRateScale + total000))
            taxes.push(taxAmount)
            amount -= taxAmount
        }
    }
    else {
        // net -> gross
        for (let r of input.rates) {
            let rate000 = parseFloat(r) * TaxRateScale
            if (Number.isNaN(rate000) || rate000 < 0) {
                rate000 = 0
            }

            const taxAmount = Math.round((input.amount * rate000) / (100 * TaxRateScale))
            taxes.push(taxAmount)
            amount += taxAmount
        }
    }

    return {amount, taxes}
}
