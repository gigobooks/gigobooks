/**
 * Copyright (c) 2020-present Beng Tan
 */

/**
# String representation of tax codes

When written/represented as a string, a tax code comprises a tuple (colon delimited) of 3 or 4 parts:

<authority[;extra]>:<type[;flags-and-tags...]>:[rate]
<authority[;extra]>:<type[;flags-and-tags...]>:[variant]:[rate]

The first field, `authority`, indicates the tax authority or jurisdiction. It loosely corresponds to geographical area in a hierarchical form ie. `EU-AT`, `AU`, `US-CA`, `CA-BC`, `IN-AP`, `CN-AH`, but this might not always be true.

(Country indicators are either EU VAT codes or ISO 3166-1 ish. State or subdivision indicators are ISO 3166-2-ish.)

For some cases (ie. EU MOSS), there is an `extra` authority value whose meaning is dependent on the tax authority or system. This is appended onto the end of `authority`, delimited by a semi-colon. Hence, the first field is either a single string 'authority' or a tuple 'authority;extra'

The second field is a tuple (semi-colon delimited) of 1 or more parts:

<type>[;flags-and-tags...]

The first part, `type`, is one of the following: `GST`, `VAT`, `ST` (sales tax) and, maybe in the future, some others.

`flags-and-tags` is a (semi-colon delimited) list of strings. Single character strings are flags and four-or-more character strings are tags. (Two or three character strings are reserved.)

To ensure a consistent canonical representation, the strings in `flags-and-tags`  are ordered as followed: 

* Single character strings first (in lexicographical order), then
* Multiple characters strings last (in lexicographical order)

A flag indicates a feature or modification. Multiple flags are supported.

Currently, two flags are defined: `r` and `x`.

The flag `r` indicates a reverse charge (ie. EU reverse charge)
The flag `x` indicates that the tax rate can be modified/supplied/overridden by the user

A tag is any arbitrary four-or-more character string. The meaning of a tag is dependent on the tax authority or system albeit it's generally informational-only. Multiple tags are supported.

For more information about flags and tags, see below.

The `variant` field is one of the following: `zero`, `reduced`, `super-reduced`, `parking`. If `variant` is missing, then the standard/default rate is implied. Generally, `variant` is used to handle zero-ratings and (for EU VAT) multiple tax rates.

The `rate` field is the tax rate percentage in string form, and can include up to three decimal places. This field is optional and can be empty.

Some examples:

`EU-AT:VAT:20` - Austria VAT standard rate of 20%
`EU-AT:VAT:reduced:10` - Austria VAT reduced rate of 10%
`EU-AT:VAT:reduced:13` - Austria VAT reduced rate of 13%
`EU-AT:VAT:parking:13` - Austria VAT parking rate of 13%
`EU-FR:VAT:super-reduced:2.1` - France VAT super-reduced rate of 2.1%

'EU-EL:VAT:24` - Greece VAT standard rate of 24% (Non-standard country code)
'EU-UK:VAT:20` - UK VAT standard rate of 20% (Non-standard country code)

`EU-FR:VAT;r:20` - France VAT standard rate of 20% (reverse charge on own purchases)
`EU-FR:VAT;r:super-reduced:2.1` - France VAT super-reduced rate of 2.1% (reverse charge on own purchases)

`EU-IE:VAT;intra-eu;goods:23` - Ireland standard rate of 23%, A supply or acquisition of goods within the EU community.
`EU-IE:VAT;r;intra-eu:23` - Ireland standard rate of 23% applied as a reverse charge on own purchase of a service from within the EU community.
`EU-IE:VAT;export:zero:0` - Ireland zero-rated service, Exported outside of the EU community.

`EU-IE-MOSS;FR:VAT:20` - France standard rate of 20% transmitted via Ireland's MOSS

`AU:GST:10` - Australia GST rate of 10%
`AU:GST:zero:0` - Australia GST free/zero-rated
`AU:GST;capital:10` - Australia GST rate of 10%, Capital purchase
`AU:GST;input:zero:0` - Australia zero-rated input taxed sale
`AU:GST;export:zero:0` - Australia zero-rated export

Possible future examples (these are tentative and not confirmed):

`US-CA:ST;x:7.25` - US California state tax of 7.25% (default)

`CA:GST:5` - Canada GST rate of 5%
`CA-BC:PST:7` - Canada British Columbia PST rate of 7%
`CA-MB:RST:7` - Canada British Columbia RST rate of 7%
`CA-ON:HST:13` - Canada Ontario HST of 13%
`CA-QC:QST:9.975` - Canada Quebec QST of 9.975%


# Flag and tags

ToDo: Fill this in ??


# Other notes

A tax code which has no flags nor tags specified (ie. at default values) is also known as a base tax code.

*/

import { Project } from './Project'

// Since some tax rates have three decimal places, scale up by 1000 before calculating
const TaxRateScale = 1000

export class TaxCode {
    authority: string
    geoParts: string[]
    authorityExtra: string
    type: string
    reverse: boolean
    variable: boolean
    tags: string[]
    variant: string
    rate: string

    constructor(code?: string) {
        const parts = (code || '').split(':')

        const authorityList = parts[0].split(';')
        this.authority = authorityList[0]
        this.geoParts = this.authority.split('-', 2)
        this.authorityExtra = authorityList.length < 2 ? '' : authorityList[1]

        const typeList = parts.length < 2 ? [''] : parts[1].split(';')
        this.type = ''
        this.reverse = false
        this.variable = false
        this.tags = []

        typeList.forEach((s, index) => {
            if (index == 0) {
                this.type = s
            }
            else if (s == 'r') {
                this.reverse = true
            }
            else if (s == 'x') {
                this.variable = true
            }
            else if (s.length > 3) {
                this.tags.push(s)
            }
        })

        this.variant = (parts.length < 4) ? '' : parts[2]
        this.rate = parts[parts.length - 1]
    }

    toString() {
        return this.taxCode
    }

    _code(flagsAndTags: boolean) {
        const parts = []
        parts.push(this.authorityExtra ? `${this.authority};${this.authorityExtra}` : this.authority)

        const typeParts = [this.type]
        if (flagsAndTags) {
            if (this.reverse) {
                typeParts.push('r')
            }
            if (this.variable) {
                typeParts.push('x')
            }
            if (this.tags.length > 0) {
                typeParts.push(...this.tags.sort())
            }
        }
        parts.push(typeParts.join(';'))

        if (this.variant) {
            parts.push(this.variant)
        }

        parts.push(this.rate)
        return parts.join(':')
    }

    get taxCode() {
        return this._code(true)
    }

    get baseCode() {
        return this._code(false)
    }

    get info() {
        return taxAuthorities[this.authority] ? taxAuthorities[this.authority].taxInfo(this) : { label: this.taxCode, weight: 100 }
    }

    get label() {
        const parts = [this.info.label]
        if (this.rate) {
            parts.push(this.rate + '%')
        }
        return parts.join(' ')
    }

    // Used for sorting taxes from the same authority
    get weight() {
        return this.info.weight
    }

    hasTag(tag: string) {
        return this.tags.indexOf(tag) >= 0
    }
}

type TaxInfo = {
    label: string
    weight: number
}

// This class is not meant to be instantiated
export class TaxAuthority {
    readonly id: string
    readonly title: string
    
    constructor(id: string, title: string) {
        this.id = id
        this.title = title
    }

    // These are stubs that should never be called
    taxesInfo(): Record<string, TaxInfo> { return {} }
    taxes(homeAuthority: string, isSale: boolean): string[] { return [] }

    taxInfo(code: TaxCode) {
        const k = code.variant != '' ? `${code.type}:${code.variant}` : code.type
        return this.taxesInfo()[k] || { label: code.taxCode, weight: 100 }
    }
}

export class TaxAuthorityAU extends TaxAuthority {
    taxesInfo() {
        return {
            'GST': { label: 'GST', weight: 0 },
            'GST:zero': { label: 'GST Free', weight: 1 },
            'GST:export': { label: 'GST Free Export', weight: 2 },
            'GST:input': { label: 'GST (input taxed)', weight: 3 },
            'GST:capital': { label: 'GST (capital purchase)', weight: 4 },
        }
    }

    taxes(homeAuthority: string, isSale: boolean) {
        const common = ['GST:10', 'GST:zero:0']
        const sale = ['GST:export:0', 'GST:input:0']
        const purchase = ['GST:capital:0', 'GST:capital:10']

        const items = homeAuthority == this.id ? common.concat(isSale ? sale : purchase) : common
        return items.map(s => `${this.id}:${s}`)
    }
}

export class TaxAuthorityNZ extends TaxAuthority {
    taxesInfo() {
        return {
            'GST': { label: 'GST', weight: 0 },
            'GST:zero': { label: 'GST (zero-rated)', weight: 1 },
            'GST:import': { label: 'Imported goods', weight: 2 },
        }
    }

    taxes(homeAuthority: string, isSale: boolean) {
        const common = ['GST:15', 'GST:zero:0']
        const purchase = ['GST:import:0']

        const items = homeAuthority == this.id && !isSale ? common.concat(purchase) : common
        return items.map(s => `${this.id}:${s}`)
    }
}

export const taxAuthorities: Record<string, TaxAuthority> = {
    'AU': new TaxAuthorityAU('AU', 'Australian Tax Office'),
    'NZ': new TaxAuthorityNZ('NZ', 'Inland Revenue Department'),
}

export function taxesEU(country?: string) {
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
    const codes: string[] = [] // ['EU:VAT;r:0']

    ;(!country ? Object.keys(data) :
      data[country] ? [country] : []).forEach(cc => {
        data[cc].forEach(suffix => {
            codes.push(`EU-${cc}:VAT:${suffix}`)
        })
        codes.push(`EU-${cc}:VAT:zero:0`)
    })

    return codes
}

/*
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
        codes.push(`US-${ss}:ST;x:${data[ss]}`)
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
*/

// Return an array of base tax codes
export function baseTaxCodes(isSale: boolean) {
    const homeAuthority = Project.variables.get('taxAuthority')
    const codes: string[] = []

    ;[homeAuthority, ...Project.variables.get('otherTaxAuthorities')].forEach(k => {
        if (taxAuthorities[k]) {
            codes.push(...taxAuthorities[k].taxes(homeAuthority, isSale))
        }
    })
    return codes
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
